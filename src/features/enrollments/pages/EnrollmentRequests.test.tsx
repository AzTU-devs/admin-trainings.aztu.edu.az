import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { toast } from "sonner";
import EnrollmentsListPage from "./EnrollmentsListPage";
import EnrollmentRequestsPage from "./EnrollmentRequestsPage";
import authReducer, { authSuccess } from "@features/auth/store/authSlice";
import uiReducer from "@lib/redux/uiSlice";
import { baseApi } from "@lib/query/baseApi";
import { httpClient } from "@lib/axios/httpClient";
import { ROLES, type Role } from "@shared/constants/roles";
import { ROUTES } from "@shared/constants/routes";
import { useListCourseParticipantsQuery } from "@features/participants/api/participantsApi";
import { certificatesApi } from "@features/certificates/api/certificatesApi";
import type { EnrollmentDto, EnrollmentRequestDto } from "@features/enrollments/types";

/*
 * Enrolment requests, decided by the course's owner on their Enrollments page
 * and by the super admin on theirs. A real store against a fake API: the
 * URLs, the bodies, the refusals and what is asked for again are under test.
 */

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

configure({ asyncUtilTimeout: 5_000 });

const LIST_URL = "/portal/enrollment-requests";
const COURSE_ID = "c1111111-1111-4111-8111-111111111111";
const PAID_COURSE_ID = "c2222222-2222-4222-8222-222222222222";

const FREE_IN_PERSON: EnrollmentRequestDto = {
  enrollmentId: "e1111111-1111-4111-8111-111111111111",
  courseId: COURSE_ID,
  courseTitle: "Robotics workshop",
  courseSlug: "robotics-workshop",
  courseType: "OFFLINE",
  studentId: "s1111111-1111-4111-8111-111111111111",
  firstName: "Leyla",
  lastName: "Əliyeva",
  email: "leyla@example.az",
  avatarUrl: null,
  requestedAt: "2026-11-20T08:00:00Z",
  status: "PENDING_APPROVAL",
  decidedAt: null,
  decidedByName: null,
  rejectionReason: null,
  seatsLeft: 3,
  paid: false,
  price: null,
  currency: null,
};

const PAID_ONLINE: EnrollmentRequestDto = {
  ...FREE_IN_PERSON,
  enrollmentId: "e2222222-2222-4222-8222-222222222222",
  courseId: PAID_COURSE_ID,
  courseTitle: "Python for data",
  courseSlug: "python-for-data",
  courseType: "ONLINE",
  studentId: "s2222222-2222-4222-8222-222222222222",
  firstName: "Kamran",
  lastName: "Quliyev",
  email: "kamran@example.az",
  requestedAt: "2026-11-21T09:30:00Z",
  seatsLeft: null,
  paid: true,
  price: 50,
  currency: "AZN",
};

const REJECTED_REQUEST: EnrollmentRequestDto = {
  ...FREE_IN_PERSON,
  enrollmentId: "e3333333-3333-4333-8333-333333333333",
  firstName: "Orxan",
  lastName: "Məmmədli",
  email: "orxan@example.az",
  status: "REJECTED",
  decidedAt: "2026-11-22T10:00:00Z",
  decidedByName: "Aysel Tutor",
  rejectionReason: "The group is for second-year students",
};

const MY_ENROLLMENT: EnrollmentDto = {
  id: "m1111111-1111-4111-8111-111111111111",
  userId: "u1",
  courseId: "c9999999-9999-4999-8999-999999999999",
  courseTitle: "Teaching online",
  status: "ACTIVE",
  source: "FREE",
  enrolledAt: "2026-09-01T08:00:00Z",
  progressPercent: 30,
};

type Handler = (config: AxiosRequestConfig) => unknown;
let routes: Record<string, Handler> = {};
let calls: Array<{
  method: string;
  url: string;
  params?: Record<string, unknown>;
  data?: unknown;
}> = [];
const callsTo = (method: string, url: string) =>
  calls.filter((c) => c.method === method && c.url === url);
const refusal = (status: number, code: string, message: string) => ({
  status,
  code,
  message,
  isNormalized: true,
});
const pageOf = <T,>(content: T[], size = 10) => ({
  content: content.slice(0, size),
  page: 0,
  size,
  totalElements: content.length,
  totalPages: Math.ceil(content.length / size),
});
const approveUrl = (r: EnrollmentRequestDto) => `/portal/enrollments/${r.enrollmentId}/approve`;
const rejectUrl = (r: EnrollmentRequestDto) => `/portal/enrollments/${r.enrollmentId}/reject`;
const listCalls = (status: string, size = 10) =>
  callsTo("GET", LIST_URL).filter((c) => c.params?.status === status && c.params?.size === size);

let pending: EnrollmentRequestDto[] = [];

/** What another screen of the session has open: the course's participants. */
function OtherScreens() {
  useListCourseParticipantsQuery({ courseId: COURSE_ID, page: 0, size: 5 });
  return null;
}

function renderAt(entry: string, roles: Role[], permissions?: string[]) {
  const store = configureStore({
    reducer: { auth: authReducer, ui: uiReducer, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm({ serializableCheck: false }).concat(baseApi.middleware),
  });
  store.dispatch(
    authSuccess({
      user: {
        id: 1,
        email: "aysel@aztu.edu.az",
        fullName: "Aysel",
        roles,
        ...(permissions ? { permissions } : {}),
      },
      accessToken: "t",
    }),
  );
  render(
    <Provider store={store}>
      <HelmetProvider>
        <MemoryRouter initialEntries={[entry]}>
          <OtherScreens />
          <Routes>
            <Route path={ROUTES.tutorEnrollments} element={<EnrollmentsListPage />} />
            <Route path={ROUTES.superEnrollmentRequests} element={<EnrollmentRequestsPage />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    </Provider>,
  );
  return store;
}

const renderTutor = (permissions?: string[]) =>
  renderAt(ROUTES.tutorEnrollments, [ROLES.TUTOR], permissions);

const realMatchMedia = window.matchMedia;
/** The table layout (from 768px); the test environment otherwise matches no media query (phone cards). */
function wide() {
  window.matchMedia = ((query: string) => ({
    ...realMatchMedia(query),
    matches: true,
  })) as typeof window.matchMedia;
}

beforeEach(() => {
  calls = [];
  pending = [FREE_IN_PERSON, PAID_ONLINE];
  routes = {
    [`GET ${LIST_URL}`]: (config) => {
      const { status, size } = config.params as { status: string; size: number };
      return pageOf(status === "REJECTED" ? [REJECTED_REQUEST] : pending, size);
    },
    [`POST ${approveUrl(FREE_IN_PERSON)}`]: () => {
      pending = pending.filter((r) => r !== FREE_IN_PERSON);
      return { id: FREE_IN_PERSON.enrollmentId, status: "ACTIVE" };
    },
    [`POST ${approveUrl(PAID_ONLINE)}`]: () => {
      pending = pending.filter((r) => r !== PAID_ONLINE);
      return { id: PAID_ONLINE.enrollmentId, status: "PENDING_PAYMENT" };
    },
    [`POST ${rejectUrl(FREE_IN_PERSON)}`]: () => {
      pending = pending.filter((r) => r !== FREE_IN_PERSON);
      return { id: FREE_IN_PERSON.enrollmentId, status: "REJECTED" };
    },
    ["GET /portal/enrollments/mine"]: () => pageOf([MY_ENROLLMENT]),
    [`GET /admin/courses/${COURSE_ID}/participants`]: () => pageOf([], 5),
  };
  vi.spyOn(httpClient, "request").mockImplementation(async (config: AxiosRequestConfig) => {
    const method = (config.method ?? "GET").toUpperCase();
    const url = config.url ?? "";
    calls.push({
      method,
      url,
      params: config.params as Record<string, unknown>,
      data: config.data,
    });
    const handler = routes[`${method} ${url}`];
    if (!handler) throw refusal(404, "NOT_FOUND", `No route for ${method} ${url}`);
    return { data: { data: await handler(config) } } as AxiosResponse;
  });
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.info).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.matchMedia = realMatchMedia;
});

async function openDecision(kind: "Approve" | "Reject", name: string, title: string) {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: `${kind} ${name}` }));
  const dialog = await screen.findByRole("dialog", { name: title });
  return { user, dialog };
}

describe("Enrollments page — the expert's Requests", () => {
  it("opens on the requests to their courses, with the count, the seats left and the price", async () => {
    wide();
    renderTutor();

    const table = await screen.findByRole("table");
    expect(await within(table).findByText("Leyla Əliyeva")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Enrollments" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Requests/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Requests/ })).toHaveTextContent("Requests2");
    expect(listCalls("PENDING_APPROVAL")[0].params).toMatchObject({
      status: "PENDING_APPROVAL",
      page: 0,
      size: 10,
    });

    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Student", "Course", "Requested", "Seats left", "Price", ""]);
    const leyla = within(table).getByText("Leyla Əliyeva").closest("tr")!;
    expect(leyla).toHaveTextContent("3 seats left");
    expect(leyla).toHaveTextContent("Free");
    // The course opens the expert's own course page, by its slug.
    expect(within(leyla).getByRole("link", { name: "Robotics workshop" })).toHaveAttribute(
      "href",
      ROUTES.tutorCourseEdit("robotics-workshop"),
    );
    const kamran = within(table).getByText("Kamran Quliyev").closest("tr")!;
    expect(kamran).toHaveTextContent("Paid · 50 AZN");
    expect(kamran).toHaveTextContent("—");
  });

  it("approves a free in-person request: the student joins and takes a seat, and the lists refresh", async () => {
    renderTutor();
    const { user, dialog } = await openDecision(
      "Approve",
      "Leyla Əliyeva",
      "Approve this enrolment request?",
    );
    expect(dialog).toHaveTextContent(
      "Leyla joins the course straight away and is notified. This takes one of the 3 seats left.",
    );
    const before = {
      list: listCalls("PENDING_APPROVAL").length,
      count: listCalls("PENDING_APPROVAL", 1).length,
      participants: callsTo("GET", `/admin/courses/${COURSE_ID}/participants`).length,
    };

    await user.click(within(dialog).getByRole("button", { name: "Approve request" }));

    await waitFor(() => expect(callsTo("POST", approveUrl(FREE_IN_PERSON))).toHaveLength(1));
    expect(callsTo("POST", approveUrl(FREE_IN_PERSON))[0].data).toBeUndefined();
    expect(toast.success).toHaveBeenCalledWith("Leyla Əliyeva is enrolled");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(listCalls("PENDING_APPROVAL").length).toBeGreaterThan(before.list));
    await waitFor(() =>
      expect(listCalls("PENDING_APPROVAL", 1).length).toBeGreaterThan(before.count),
    );
    await waitFor(() =>
      expect(callsTo("GET", `/admin/courses/${COURSE_ID}/participants`).length).toBeGreaterThan(
        before.participants,
      ),
    );
    await waitFor(() => expect(screen.queryByText("Leyla Əliyeva")).not.toBeInTheDocument());
    expect(screen.getByRole("tab", { name: /Requests/ })).toHaveTextContent("Requests1");
  });

  it("says a paid approval asks the student to pay first", async () => {
    renderTutor();
    const { user, dialog } = await openDecision(
      "Approve",
      "Kamran Quliyev",
      "Approve this enrolment request?",
    );
    expect(dialog).toHaveTextContent("Kamran is notified and asked to pay 50 AZN on the website");
    await user.click(within(dialog).getByRole("button", { name: "Approve request" }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Kamran Quliyev is asked to pay"),
    );
  });

  it("warns when no seat is left, and keeps the API's COURSE_FULL in the dialog", async () => {
    pending = [{ ...FREE_IN_PERSON, seatsLeft: 0 }];
    routes[`POST ${approveUrl(FREE_IN_PERSON)}`] = () => {
      throw refusal(409, "COURSE_FULL", "All 20 seats of this course are taken.");
    };
    renderTutor();
    const { user, dialog } = await openDecision(
      "Approve",
      "Leyla Əliyeva",
      "Approve this enrolment request?",
    );
    expect(within(dialog).getByText("No seats left")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Approve request" }));
    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent("The course is full");
    expect(alert).toHaveTextContent("All 20 seats of this course are taken.");
    expect(
      screen.getByRole("dialog", { name: "Approve this enrolment request?" }),
    ).toBeInTheDocument();
  });

  it("shows the API's 403 to someone who does not own the course", async () => {
    routes[`POST ${approveUrl(FREE_IN_PERSON)}`] = () => {
      throw refusal(
        403,
        "FORBIDDEN",
        "Only the course's owner can decide on its enrolment requests.",
      );
    };
    renderTutor();
    const { user, dialog } = await openDecision(
      "Approve",
      "Leyla Əliyeva",
      "Approve this enrolment request?",
    );
    await user.click(within(dialog).getByRole("button", { name: "Approve request" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Only the course's owner can decide on its enrolment requests.",
    );
  });

  it("closes with the API's message on a request that is no longer waiting", async () => {
    routes[`POST ${approveUrl(FREE_IN_PERSON)}`] = () => {
      throw refusal(409, "ENROLLMENT_NOT_PENDING", "This request has already been decided.");
    };
    renderTutor();
    const { user, dialog } = await openDecision(
      "Approve",
      "Leyla Əliyeva",
      "Approve this enrolment request?",
    );
    const before = listCalls("PENDING_APPROVAL").length;
    await user.click(within(dialog).getByRole("button", { name: "Approve request" }));

    await waitFor(() =>
      expect(toast.info).toHaveBeenCalledWith("This request has already been decided."),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(listCalls("PENDING_APPROVAL").length).toBeGreaterThan(before));
  });

  it("rejects without a reason, or with one", async () => {
    renderTutor();
    let { user, dialog } = await openDecision(
      "Reject",
      "Leyla Əliyeva",
      "Reject this enrolment request?",
    );
    expect(dialog).toHaveTextContent(
      "Leyla is notified, with your reason if you give one, and may ask to enrol again later.",
    );
    await user.click(within(dialog).getByRole("button", { name: "Reject request" }));
    await waitFor(() => expect(callsTo("POST", rejectUrl(FREE_IN_PERSON))).toHaveLength(1));
    expect(callsTo("POST", rejectUrl(FREE_IN_PERSON))[0].data).toEqual({});
    expect(toast.success).toHaveBeenCalledWith("Leyla Əliyeva's request is rejected");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    pending = [FREE_IN_PERSON];
    routes[`POST ${rejectUrl(PAID_ONLINE)}`] = () => ({ status: "REJECTED" });
    ({ user, dialog } = await openDecision(
      "Reject",
      "Kamran Quliyev",
      "Reject this enrolment request?",
    ));
    await user.type(within(dialog).getByLabelText(/Reason/), "  The course is for staff  ");
    await user.click(within(dialog).getByRole("button", { name: "Reject request" }));
    await waitFor(() => expect(callsTo("POST", rejectUrl(PAID_ONLINE))).toHaveLength(1));
    expect(callsTo("POST", rejectUrl(PAID_ONLINE))[0].data).toEqual({
      reason: "The course is for staff",
    });
  });

  it("lists rejected requests with who decided and why, read only", async () => {
    wide();
    const user = userEvent.setup();
    renderTutor();
    await screen.findByText("Leyla Əliyeva");
    await user.click(screen.getByRole("tab", { name: "Rejected requests" }));

    const table = await screen.findByRole("table");
    const row = (await within(table).findByText("Orxan Məmmədli")).closest("tr")!;
    expect(listCalls("REJECTED")).toHaveLength(1);
    expect(row).toHaveTextContent("by Aysel Tutor");
    expect(row).toHaveTextContent("The group is for second-year students");
    expect(within(row).queryByRole("button", { name: /Approve|Reject/ })).not.toBeInTheDocument();
  });

  it("keeps the expert's own enrolments on their own tab", async () => {
    const user = userEvent.setup();
    renderTutor();
    await screen.findByText("Leyla Əliyeva");
    await user.click(screen.getByRole("tab", { name: "My enrollments" }));
    expect(await screen.findByText("Teaching online")).toBeInTheDocument();
    expect(callsTo("GET", "/portal/enrollments/mine")).toHaveLength(1);
  });

  it("says plainly when the API refuses the list (an expert whose approval does not stand)", async () => {
    routes[`GET ${LIST_URL}`] = () => {
      throw refusal(403, "TUTOR_NOT_APPROVED", "Your expert profile is not approved yet.");
    };
    renderTutor();
    expect(await screen.findByText("You can't decide on enrolment requests")).toBeInTheDocument();
    expect(screen.getByText("Your expert profile is not approved yet.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Requests/ })).toHaveTextContent(/^Requests$/);
  });

  it("asks for the requests again when the course ends (ending rejects the pending ones)", async () => {
    // The paid course: not on the menu count's one-row page, which must refresh all the same.
    routes[`POST /portal/courses/${PAID_COURSE_ID}/end`] = () => ({
      courseId: PAID_COURSE_ID,
      students: [],
    });
    const store = renderTutor();
    await screen.findByText("Leyla Əliyeva");
    const before = {
      list: listCalls("PENDING_APPROVAL").length,
      count: listCalls("PENDING_APPROVAL", 1).length,
    };

    await store.dispatch(
      certificatesApi.endpoints.endCourse.initiate({
        courseId: PAID_COURSE_ID,
        body: { graduateEnrollmentIds: [] },
      }),
    );

    await waitFor(() => expect(listCalls("PENDING_APPROVAL").length).toBeGreaterThan(before.list));
    await waitFor(() =>
      expect(listCalls("PENDING_APPROVAL", 1).length).toBeGreaterThan(before.count),
    );
  });

  it("is the expert's own enrolments alone, as before, without enrollment:approve", async () => {
    renderTutor(["course:read"]);
    expect(
      await screen.findByRole("heading", { level: 1, name: "My enrollments" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Teaching online")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(callsTo("GET", LIST_URL)).toHaveLength(0);
  });
});

describe("Enrolment requests — the super admin's page", () => {
  it("lists every course's requests, linking each course to its admin page", async () => {
    wide();
    renderAt(ROUTES.superEnrollmentRequests, [ROLES.SUPER_ADMIN]);

    const table = await screen.findByRole("table");
    const row = (await within(table).findByText("Leyla Əliyeva")).closest("tr")!;
    expect(
      screen.getByRole("heading", { level: 1, name: "Enrolment requests" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Pending/ })).toHaveTextContent("Pending2");
    expect(within(row).getByRole("link", { name: "Robotics workshop" })).toHaveAttribute(
      "href",
      ROUTES.adminCourseEdit(COURSE_ID),
    );
    // The student's profile is a super admin's.
    expect(within(row).getByRole("link", { name: "View profile" })).toHaveAttribute(
      "href",
      ROUTES.superUserProfile(FREE_IN_PERSON.studentId),
    );
  });

  it("decides the same way an owner does", async () => {
    renderAt(ROUTES.superEnrollmentRequests, [ROLES.SUPER_ADMIN]);
    const { user, dialog } = await openDecision(
      "Approve",
      "Leyla Əliyeva",
      "Approve this enrolment request?",
    );
    await user.click(within(dialog).getByRole("button", { name: "Approve request" }));
    await waitFor(() => expect(callsTo("POST", approveUrl(FREE_IN_PERSON))).toHaveLength(1));
  });

  it("opens on the Rejected tab from the URL", async () => {
    renderAt(`${ROUTES.superEnrollmentRequests}?tab=rejected`, [ROLES.SUPER_ADMIN]);
    expect(await screen.findByText("Orxan Məmmədli")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Rejected" })).toHaveAttribute("aria-selected", "true");
  });
});
