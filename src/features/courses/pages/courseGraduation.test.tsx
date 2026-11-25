import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { toast } from "sonner";
import AdminCourseEditPage from "./AdminCourseEditPage";
import CourseEditPage from "./CourseEditPage";
import AdminCoursesListPage from "./AdminCoursesListPage";
import CoursesListPage from "./CoursesListPage";
import authReducer, { authSuccess } from "@features/auth/store/authSlice";
import uiReducer from "@lib/redux/uiSlice";
import { baseApi } from "@lib/query/baseApi";
import { httpClient } from "@lib/axios/httpClient";
import { env } from "@shared/config/env";
import { ROLES, type Role } from "@shared/constants/roles";
import { ROUTES } from "@shared/constants/routes";
import type { CourseDto, CourseSummaryDto } from "@features/courses/types";
import type { CourseGraduationView, GraduationStudent } from "@features/certificates/types";

/*
 * Ending a course, graduating its students and their certificates, on the
 * course pages experts and staff use. A real store against a fake API, as the
 * delete and attendance pages are tested: who is offered what, the dialog's
 * selection and the bodies sent, revoking, reopening and the signatures. The
 * editors under the header are not under test, so they are left out.
 */

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@features/courses/components/CourseDetailsForm", () => ({ CourseDetailsForm: () => null }));
vi.mock("@features/courses/components/CourseSummaryCard", () => ({ CourseSummaryCard: () => null }));
vi.mock("@features/courses/components/TutorRosterPicker", () => ({ TutorRosterPicker: () => null }));
vi.mock("@features/courses/components/ModulesEditor", () => ({ ModulesEditor: () => null }));
vi.mock("@features/courses/hooks/useCourseCategories", () => ({
  useCourseCategories: () => [],
  courseHue: () => "k-navy",
}));

configure({ asyncUtilTimeout: 5_000 });

const COURSE_ID = "c0ffee00-0000-4000-8000-000000000001";
const SLUG = "python-basics";
const GRADUATION_URL = `/portal/courses/${COURSE_ID}/graduation`;
const END_URL = `/portal/courses/${COURSE_ID}/end`;
const ISSUE_URL = `/portal/courses/${COURSE_ID}/certificates`;
const REOPEN_URL = `/super/courses/${COURSE_ID}/reopen`;
const SIGNATURES_URL = `/super/courses/${COURSE_ID}/certificate-tutors`;

const T_EDITOR = "a0000000-0000-4000-8000-000000000001";
const T_RASHAD = "a0000000-0000-4000-8000-000000000002";
const T_NIGAR = "a0000000-0000-4000-8000-000000000003";
const T_ORKHAN = "a0000000-0000-4000-8000-000000000004";

const COURSE = {
  id: COURSE_ID,
  slug: SLUG,
  title: "Python basics",
  courseType: "OFFLINE",
  status: "PUBLISHED",
  endedAt: null,
  tutorId: T_EDITOR,
  tutorDisplayName: "Aysel Quliyeva",
  tutors: [
    { tutorId: T_EDITOR, displayName: "Aysel Quliyeva", authorized: true },
    { tutorId: T_RASHAD, displayName: "Rəşad Əliyev", authorized: false },
    { tutorId: T_NIGAR, displayName: "Nigar Həsənova", authorized: false },
    { tutorId: T_ORKHAN, displayName: "Orxan Babayev", authorized: false },
  ],
  categoryIds: [],
  tagIds: [],
  modules: [],
} as unknown as CourseDto;

const E_LEYLA = "e0000000-0000-4000-8000-000000000001";
const E_KAMRAN = "e0000000-0000-4000-8000-000000000002";
const E_SABINA = "e0000000-0000-4000-8000-000000000003";

function student(enrollmentId: string, firstName: string, lastName: string, extra: Partial<GraduationStudent> = {}): GraduationStudent {
  return {
    enrollmentId,
    studentId: enrollmentId.replace(/^e/, "5"),
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}@example.com`,
    enrollmentStatus: "ACTIVE",
    attendance: { present: 0, late: 0, absent: 0, excused: 0, percent: null },
    progressPercent: null,
    certificate: null,
    ...extra,
  };
}

const RUNNING: CourseGraduationView = {
  courseId: COURSE_ID,
  courseTitle: "Python basics",
  courseType: "OFFLINE",
  startDate: "2020-01-06",
  endDate: "2020-01-31",
  endedAt: null,
  endedByName: null,
  canEnd: true,
  canIssue: true,
  canManage: false,
  certificateTutors: [],
  students: [
    student(E_LEYLA, "Leyla", "Məmmədova", { attendance: { present: 10, late: 1, absent: 2, excused: 0, percent: 84.6 } }),
    student(E_KAMRAN, "Kamran", "Əhmədov", { attendance: { present: 3, late: 0, absent: 9, excused: 0, percent: 25 } }),
    student(E_SABINA, "Səbinə", "İsmayılova"),
  ],
};

const ENDED_AT = "2026-11-24T08:30:00Z"; // 12:30 in Baku
const CERT_LEYLA = { id: "f0000000-0000-4000-8000-000000000001", code: "7K3M9QXR2D4T", issuedAt: ENDED_AT, revokedAt: null };
const CERT_KAMRAN = {
  id: "f0000000-0000-4000-8000-000000000002",
  code: "ABCD1234EFGH",
  issuedAt: ENDED_AT,
  revokedAt: "2026-11-25T09:00:00Z",
};

const ENDED: CourseGraduationView = {
  ...RUNNING,
  endedAt: ENDED_AT,
  endedByName: "Aysel Quliyeva",
  canEnd: false,
  students: [
    { ...RUNNING.students[0], enrollmentStatus: "COMPLETED", certificate: CERT_LEYLA },
    { ...RUNNING.students[1], enrollmentStatus: "COMPLETED", certificate: CERT_KAMRAN },
    RUNNING.students[2],
  ],
};

type Handler = (config: AxiosRequestConfig) => unknown;
let routes: Record<string, Handler> = {};
let calls: Array<{ method: string; url: string; data?: unknown }> = [];
const callsTo = (method: string, url: string) => calls.filter((c) => c.method === method && c.url === url);
const refusal = (status: number, code: string, message: string) => ({ status, code, message, isNormalized: true });
const page = <T,>(content: T[]) => ({ content, page: 0, size: 10, totalElements: content.length, totalPages: 1 });
/** A write's answer, which the view also reads from now on (writes refetch it). */
const answer = (view: CourseGraduationView) => () => {
  routes[`GET ${GRADUATION_URL}`] = () => view;
  return view;
};

function makeStore(roles: Role[], permissions?: string[]) {
  const store = configureStore({
    reducer: { auth: authReducer, ui: uiReducer, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm({ serializableCheck: false }).concat(baseApi.middleware),
  });
  store.dispatch(
    authSuccess({
      user: { id: 1, email: "user@example.com", fullName: "User", roles, ...(permissions ? { permissions } : {}) },
      accessToken: "t",
    }),
  );
  return store;
}

function renderAt(roles: Role[], path: string, element: React.ReactNode, pattern: string, permissions?: string[]) {
  render(
    <Provider store={makeStore(roles, permissions)}>
      <HelmetProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={pattern} element={element} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    </Provider>,
  );
}

const renderAdminPage = (roles: Role[], permissions?: string[]) =>
  renderAt(roles, ROUTES.adminCourseEdit(COURSE_ID), <AdminCourseEditPage />, ROUTES.adminCourseEdit(), permissions);
const renderExpertPage = () =>
  renderAt([ROLES.TUTOR], ROUTES.tutorCourseEdit(SLUG), <CourseEditPage />, ROUTES.tutorCourseEdit());

beforeEach(() => {
  calls = [];
  routes = {
    [`GET /admin/courses/${COURSE_ID}`]: () => COURSE,
    [`GET /public/courses/${SLUG}`]: () => COURSE,
    [`GET ${GRADUATION_URL}`]: () => RUNNING,
  };
  vi.spyOn(httpClient, "request").mockImplementation(async (config: AxiosRequestConfig) => {
    const method = (config.method ?? "GET").toUpperCase();
    const url = config.url ?? "";
    calls.push({ method, url, data: config.data });
    const handler = routes[`${method} ${url}`];
    if (!handler) throw refusal(404, "NOT_FOUND", `No route for ${method} ${url}`);
    return { data: { data: await handler(config) } } as AxiosResponse;
  });
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const heading = () => screen.findByRole("heading", { name: "Python basics", level: 1 });
const endAction = () => screen.queryByRole("button", { name: "End course & graduate" });

async function openEndDialog() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "End course & graduate" }));
  const dialog = await screen.findByRole("dialog", { name: "End course & graduate" });
  return { user, dialog };
}

async function openCertificatesTab() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("tab", { name: "Certificates" }));
  const list = await screen.findByRole("list", { name: "Students' certificates" });
  return { user, list };
}

describe("End course & graduate — who is offered it", () => {
  it("is offered to an expert the view says may end the course", async () => {
    renderExpertPage();
    expect(await screen.findByRole("button", { name: "End course & graduate" })).toBeInTheDocument();
    expect(callsTo("GET", GRADUATION_URL)).toHaveLength(1);
  });

  it("is offered to a super admin on the admin page", async () => {
    routes[`GET ${GRADUATION_URL}`] = () => ({ ...RUNNING, canManage: true });
    renderAdminPage([ROLES.SUPER_ADMIN]);
    expect(await screen.findByRole("button", { name: "End course & graduate" })).toBeInTheDocument();
  });

  it("is not offered to an admin, who only reads the view", async () => {
    routes[`GET ${GRADUATION_URL}`] = () => ({ ...RUNNING, canEnd: false, canIssue: false });
    renderAdminPage([ROLES.ADMIN]);
    await heading();
    await waitFor(() => expect(callsTo("GET", GRADUATION_URL)).toHaveLength(1));
    expect(endAction()).not.toBeInTheDocument();
  });

  it("is not offered when the API refuses the view, and the page still works", async () => {
    routes[`GET ${GRADUATION_URL}`] = () => {
      throw refusal(403, "FORBIDDEN", "Not on this course's roster");
    };
    renderExpertPage();
    await heading();
    await waitFor(() => expect(callsTo("GET", GRADUATION_URL)).toHaveLength(1));
    expect(endAction()).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit for review" })).toBeInTheDocument();
  });

  it("asks nothing about graduation for an expert's draft", async () => {
    routes[`GET /public/courses/${SLUG}`] = () => ({ ...COURSE, status: "DRAFT" });
    renderExpertPage();
    await heading();
    expect(callsTo("GET", GRADUATION_URL)).toHaveLength(0);
    expect(endAction()).not.toBeInTheDocument();
  });
});

describe("End course & graduate — the dialog", () => {
  it("lists the students with their attendance, all ticked, and warns about enrolments", async () => {
    renderExpertPage();
    const { dialog } = await openEndDialog();

    const list = within(dialog).getByRole("list", { name: "Students to graduate" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Leyla Məmmədova");
    expect(rows[0]).toHaveTextContent("Joined10");
    expect(rows[0]).toHaveTextContent("Late1");
    expect(rows[0]).toHaveTextContent("Absent2");
    expect(rows[0]).toHaveTextContent("84.6%");
    expect(rows[2]).toHaveTextContent("No marks");
    for (const name of ["Leyla Məmmədova", "Kamran Əhmədov", "Səbinə İsmayılova"]) {
      expect(within(dialog).getByRole("checkbox", { name: `Graduate ${name}` })).toBeChecked();
    }
    expect(dialog).toHaveTextContent("3 of 3 will graduate and receive a certificate");
    expect(dialog).toHaveTextContent("Ending the course stops it taking enrolments");
  });

  it("counts the selection, selects all or none, and sends the ticked enrolments in order", async () => {
    routes[`POST ${END_URL}`] = answer({
      ...ENDED,
      students: [
        { ...RUNNING.students[0], certificate: CERT_LEYLA },
        RUNNING.students[1],
        { ...RUNNING.students[2], certificate: { ...CERT_LEYLA, id: "f2", code: "ZZZZ9999YYYY" } },
      ],
    });
    renderExpertPage();
    const { user, dialog } = await openEndDialog();

    await user.click(within(dialog).getByRole("button", { name: "Select none" }));
    expect(dialog).toHaveTextContent("None of 3 selected");
    expect(within(dialog).getByRole("button", { name: "End course only" })).toBeEnabled();
    await user.click(within(dialog).getByRole("button", { name: "Select all" }));
    expect(dialog).toHaveTextContent("3 of 3 will graduate");

    await user.click(within(dialog).getByRole("checkbox", { name: "Graduate Kamran Əhmədov" }));
    expect(dialog).toHaveTextContent("2 of 3 will graduate and receive a certificate");
    await user.click(within(dialog).getByRole("button", { name: "End course & graduate" }));

    await waitFor(() => expect(callsTo("POST", END_URL)).toHaveLength(1));
    expect(callsTo("POST", END_URL)[0].data).toEqual({ graduateEnrollmentIds: [E_LEYLA, E_SABINA] });
    expect(toast.success).toHaveBeenCalledWith("Course ended · 2 certificates issued");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    // The view the API answered with is on the page at once.
    expect(await screen.findByRole("status")).toHaveTextContent("Ended on Tue 24 Nov 2026 by Aysel Quliyeva");
    expect(endAction()).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Certificates" })).toBeInTheDocument();
  });

  it("ends the course without graduating anyone when none is ticked", async () => {
    routes[`POST ${END_URL}`] = answer({ ...ENDED, students: RUNNING.students });
    renderExpertPage();
    const { user, dialog } = await openEndDialog();
    await user.click(within(dialog).getByRole("button", { name: "Select none" }));
    await user.click(within(dialog).getByRole("button", { name: "End course only" }));

    await waitFor(() => expect(callsTo("POST", END_URL)).toHaveLength(1));
    expect(callsTo("POST", END_URL)[0].data).toEqual({ graduateEnrollmentIds: [] });
    expect(toast.success).toHaveBeenCalledWith("Course ended");
  });

  it("shows an online course's progress instead of attendance", async () => {
    routes[`GET /public/courses/${SLUG}`] = () => ({ ...COURSE, courseType: "ONLINE" });
    routes[`GET ${GRADUATION_URL}`] = () => ({
      ...RUNNING,
      courseType: "ONLINE",
      startDate: null,
      endDate: null,
      students: [
        student(E_LEYLA, "Leyla", "Məmmədova", { attendance: null, progressPercent: 75 }),
        student(E_KAMRAN, "Kamran", "Əhmədov", { attendance: null, progressPercent: null }),
      ],
    });
    renderExpertPage();
    const { dialog } = await openEndDialog();
    const rows = within(dialog).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("75% progress");
    expect(rows[0]).not.toHaveTextContent("Joined");
    expect(rows[1]).toHaveTextContent("No progress yet");
  });

  it("tells an expert an in-person course can only be ended from its last day", async () => {
    routes[`GET ${GRADUATION_URL}`] = () => ({ ...RUNNING, endDate: "2099-12-31" });
    renderExpertPage();
    const { dialog } = await openEndDialog();
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "This course runs until Thu 31 Dec 2099. Experts can end it from that day on",
    );
    expect(within(dialog).getByRole("button", { name: "End course & graduate" })).toBeDisabled();
  });

  it("lets a super admin end it before its last day", async () => {
    routes[`GET ${GRADUATION_URL}`] = () => ({ ...RUNNING, endDate: "2099-12-31", canManage: true });
    routes[`POST ${END_URL}`] = answer(ENDED);
    renderAdminPage([ROLES.SUPER_ADMIN]);
    const { user, dialog } = await openEndDialog();
    expect(dialog).toHaveTextContent("you are ending it early");
    await user.click(within(dialog).getByRole("button", { name: "End course & graduate" }));
    await waitFor(() => expect(callsTo("POST", END_URL)).toHaveLength(1));
  });

  it("shows the API's refusal, refreshes the list and stays open", async () => {
    routes[`POST ${END_URL}`] = () => {
      throw refusal(400, "INVALID_GRADUATES", "Kamran Əhmədov's enrolment was cancelled");
    };
    renderExpertPage();
    const { user, dialog } = await openEndDialog();
    const before = callsTo("GET", GRADUATION_URL).length;
    await user.click(within(dialog).getByRole("button", { name: "End course & graduate" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Kamran Əhmədov's enrolment was cancelled The list has been refreshed.",
    );
    await waitFor(() => expect(callsTo("GET", GRADUATION_URL).length).toBeGreaterThan(before));
    expect(screen.getByRole("dialog", { name: "End course & graduate" })).toBeInTheDocument();
  });
});

describe("An ended course's certificates", () => {
  beforeEach(() => {
    routes[`GET ${GRADUATION_URL}`] = () => ENDED;
    routes[`GET /admin/courses/${COURSE_ID}`] = () => ({ ...COURSE, endedAt: ENDED_AT });
  });

  it("says when and by whom it ended, with an Ended badge", async () => {
    renderAdminPage([ROLES.ADMIN]);
    const notice = await screen.findByRole("status");
    expect(notice).toHaveTextContent("Ended on Tue 24 Nov 2026 by Aysel Quliyeva");
    expect(notice).toHaveTextContent("It takes no new enrolments. 1 certificate is valid.");
    expect(screen.getByText("Ended")).toBeInTheDocument();
  });

  it("lists each student's certificate with links to the website", async () => {
    renderAdminPage([ROLES.ADMIN]);
    const { list } = await openCertificatesTab();

    const leyla = within(list).getByRole("listitem", { name: "Leyla Məmmədova" });
    expect(leyla).toHaveTextContent("AZTU-7K3M-9QXR-2D4T");
    expect(leyla).toHaveTextContent("Valid");
    expect(leyla).toHaveTextContent("Issued 24 Nov 2026");
    expect(within(leyla).getByRole("link", { name: /^View/ })).toHaveAttribute(
      "href",
      `${env.site.url}/az/certificates/7K3M9QXR2D4T`,
    );
    expect(within(leyla).getByRole("link", { name: /^Download PDF/ })).toHaveAttribute(
      "href",
      `${env.site.url}/az/certificates/7K3M9QXR2D4T/pdf`,
    );

    // Revoked: still viewable (the page says so), no PDF.
    const kamran = within(list).getByRole("listitem", { name: "Kamran Əhmədov" });
    expect(kamran).toHaveTextContent("Revoked 25 Nov 2026");
    expect(within(kamran).getByRole("link", { name: /^View/ })).toBeInTheDocument();
    expect(within(kamran).queryByRole("link", { name: /^Download PDF/ })).not.toBeInTheDocument();

    expect(within(list).getByRole("listitem", { name: "Səbinə İsmayılova" })).toHaveTextContent("Not graduated");
  });

  it("offers an admin nothing to change", async () => {
    routes[`GET ${GRADUATION_URL}`] = () => ({ ...ENDED, canIssue: false });
    renderAdminPage([ROLES.ADMIN]);
    const { list } = await openCertificatesTab();
    expect(screen.queryByRole("button", { name: "Graduate more students" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reopen course" })).not.toBeInTheDocument();
    expect(within(list).queryByRole("button", { name: /^Revoke/ })).not.toBeInTheDocument();
  });

  it("lets an expert graduate the remaining students: the revoked and the never graduated", async () => {
    routes[`POST ${ISSUE_URL}`] = answer(ENDED);
    renderExpertPage();
    const { user } = await openCertificatesTab();
    expect(screen.queryByRole("button", { name: "Reopen course" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Graduate more students" }));
    const dialog = await screen.findByRole("dialog", { name: "Graduate more students" });
    expect(within(dialog).queryByRole("checkbox", { name: "Graduate Leyla Məmmədova" })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("checkbox", { name: "Graduate Kamran Əhmədov" })).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: "Graduate Səbinə İsmayılova" })).toBeChecked();
    expect(dialog).toHaveTextContent("Their earlier certificate was revoked.");
    expect(dialog).not.toHaveTextContent("stops it taking enrolments");

    await user.click(within(dialog).getByRole("checkbox", { name: "Graduate Kamran Əhmədov" }));
    await user.click(within(dialog).getByRole("button", { name: "Graduate selected" }));
    await waitFor(() => expect(callsTo("POST", ISSUE_URL)).toHaveLength(1));
    expect(callsTo("POST", ISSUE_URL)[0].data).toEqual({ enrollmentIds: [E_SABINA] });
    expect(toast.success).toHaveBeenCalledWith("1 certificate issued");
  });

  it("lets the super admin revoke a certificate, with a reason", async () => {
    routes[`GET ${GRADUATION_URL}`] = () => ({ ...ENDED, canManage: true });
    routes[`POST /super/certificates/${CERT_LEYLA.id}/revoke`] = () => ({ ...CERT_LEYLA, revokedAt: "2026-11-26T09:00:00Z" });
    renderAdminPage([ROLES.SUPER_ADMIN]);
    const { user, list } = await openCertificatesTab();

    const leyla = within(list).getByRole("listitem", { name: "Leyla Məmmədova" });
    // Only a live certificate can be revoked.
    expect(within(within(list).getByRole("listitem", { name: "Kamran Əhmədov" })).queryByRole("button", { name: /^Revoke/ })).not.toBeInTheDocument();
    await user.click(within(leyla).getByRole("button", { name: /^Revoke/ }));
    const dialog = await screen.findByRole("dialog", { name: "Revoke this certificate?" });
    expect(dialog).toHaveTextContent("AZTU-7K3M-9QXR-2D4T");

    // A reason is required.
    await user.click(within(dialog).getByRole("button", { name: "Revoke certificate" }));
    expect(await within(dialog).findByText("Say why the certificate is revoked")).toBeInTheDocument();
    expect(callsTo("POST", `/super/certificates/${CERT_LEYLA.id}/revoke`)).toHaveLength(0);

    const before = callsTo("GET", GRADUATION_URL).length;
    await user.type(within(dialog).getByLabelText(/Reason/), "  Issued to the wrong person  ");
    await user.click(within(dialog).getByRole("button", { name: "Revoke certificate" }));
    await waitFor(() => expect(callsTo("POST", `/super/certificates/${CERT_LEYLA.id}/revoke`)).toHaveLength(1));
    expect(callsTo("POST", `/super/certificates/${CERT_LEYLA.id}/revoke`)[0].data).toEqual({
      reason: "Issued to the wrong person",
    });
    expect(toast.success).toHaveBeenCalledWith("Certificate AZTU-7K3M-9QXR-2D4T revoked");
    await waitFor(() => expect(callsTo("GET", GRADUATION_URL).length).toBeGreaterThan(before));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("lets the super admin reopen the course", async () => {
    routes[`GET ${GRADUATION_URL}`] = () => ({ ...ENDED, canManage: true });
    routes[`POST ${REOPEN_URL}`] = answer({ ...ENDED, canManage: true, canEnd: true, endedAt: null, endedByName: null });
    renderAdminPage([ROLES.SUPER_ADMIN]);
    const { user } = await openCertificatesTab();
    const courseReads = callsTo("GET", `/admin/courses/${COURSE_ID}`).length;

    await user.click(screen.getByRole("button", { name: "Reopen course" }));
    const dialog = await screen.findByRole("dialog", { name: "Reopen this course?" });
    expect(dialog).toHaveTextContent("The certificates already issued stay valid.");
    await user.click(within(dialog).getByRole("button", { name: "Reopen course" }));

    await waitFor(() => expect(callsTo("POST", REOPEN_URL)).toHaveLength(1));
    expect(toast.success).toHaveBeenCalledWith("Course reopened");
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    // It can be ended again, and the course itself (its endedAt) is read afresh.
    expect(await screen.findByRole("button", { name: "End course & graduate" })).toBeInTheDocument();
    await waitFor(() => expect(callsTo("GET", `/admin/courses/${COURSE_ID}`).length).toBeGreaterThan(courseReads));
    // Certificates issued before stay listed.
    expect(screen.getByRole("tab", { name: "Certificates" })).toBeInTheDocument();
  });
});

describe("Certificate signatures", () => {
  async function openSignatures() {
    const user = userEvent.setup();
    await user.click(await screen.findByRole("tab", { name: "Tutors" }));
    const card = (await screen.findByRole("heading", { name: "Certificate signatures" })).closest("section")!;
    return { user, card: card as HTMLElement };
  }

  it("is for the super admin only", async () => {
    routes[`GET ${GRADUATION_URL}`] = () => ({ ...RUNNING, canEnd: false, canIssue: false });
    renderAdminPage([ROLES.ADMIN]);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("tab", { name: "Tutors" }));
    await screen.findByRole("heading", { name: "Teaching roster" });
    expect(screen.queryByRole("heading", { name: "Certificate signatures" })).not.toBeInTheDocument();
  });

  it("can be set on a draft, before the course is published", async () => {
    routes[`GET /admin/courses/${COURSE_ID}`] = () => ({ ...COURSE, status: "DRAFT" });
    routes[`GET ${GRADUATION_URL}`] = () => ({ ...RUNNING, canEnd: false, canManage: true });
    renderAdminPage([ROLES.SUPER_ADMIN]);
    await openSignatures();
    expect(callsTo("GET", GRADUATION_URL)).toHaveLength(1);
  });

  it("shows the default, picks experts in order and saves them", async () => {
    routes[`GET ${GRADUATION_URL}`] = () => ({ ...RUNNING, canManage: true });
    routes[`PUT ${SIGNATURES_URL}`] = () => [
      { tutorId: T_NIGAR, displayName: "Nigar Həsənova" },
      { tutorId: T_RASHAD, displayName: "Rəşad Əliyev" },
    ];
    renderAdminPage([ROLES.SUPER_ADMIN]);
    const { user, card } = await openSignatures();

    expect(card).toHaveTextContent("Course editor: Aysel Quliyeva");
    expect(card).toHaveTextContent("A change applies to certificates issued from now on");
    expect(within(card).getByRole("button", { name: "Save signatures" })).toBeDisabled();

    await user.click(within(card).getByRole("button", { name: "Rəşad Əliyev" }));
    await user.click(within(card).getByRole("button", { name: "Nigar Həsənova" }));
    await user.click(within(card).getByRole("button", { name: "Move Nigar Həsənova up" }));
    const chosen = within(card).getByRole("list", { name: "Named on certificates" });
    expect(within(chosen).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      expect.stringContaining("Nigar Həsənova"),
      expect.stringContaining("Rəşad Əliyev"),
    ]);

    await user.click(within(card).getByRole("button", { name: "Save signatures" }));
    await waitFor(() => expect(callsTo("PUT", SIGNATURES_URL)).toHaveLength(1));
    expect(callsTo("PUT", SIGNATURES_URL)[0].data).toEqual({ tutorIds: [T_NIGAR, T_RASHAD] });
    expect(toast.success).toHaveBeenCalledWith("Certificate signatures saved");
    // Saved: nothing left to save.
    await waitFor(() => expect(within(card).getByRole("button", { name: "Save signatures" })).toBeDisabled());
  });

  it("takes at most three, and goes back to the default with none", async () => {
    routes[`GET ${GRADUATION_URL}`] = () => ({
      ...RUNNING,
      canManage: true,
      certificateTutors: [
        { tutorId: T_EDITOR, displayName: "Aysel Quliyeva" },
        { tutorId: T_RASHAD, displayName: "Rəşad Əliyev" },
      ],
    });
    routes[`PUT ${SIGNATURES_URL}`] = () => [];
    renderAdminPage([ROLES.SUPER_ADMIN]);
    const { user, card } = await openSignatures();

    await user.click(within(card).getByRole("button", { name: "Nigar Həsənova" }));
    expect(card).toHaveTextContent("At most 3 names");
    expect(within(card).getByRole("button", { name: "Orxan Babayev" })).toBeDisabled();

    for (const name of ["Aysel Quliyeva", "Rəşad Əliyev", "Nigar Həsənova"]) {
      await user.click(within(card).getByRole("button", { name: `Remove ${name}` }));
    }
    expect(card).toHaveTextContent("Course editor: Aysel Quliyeva");
    await user.click(within(card).getByRole("button", { name: "Save signatures" }));
    await waitFor(() => expect(callsTo("PUT", SIGNATURES_URL)).toHaveLength(1));
    expect(callsTo("PUT", SIGNATURES_URL)[0].data).toEqual({ tutorIds: [] });
    expect(toast.success).toHaveBeenCalledWith("Certificates will name the course editor");
  });

  it("shows the API's refusal", async () => {
    routes[`GET ${GRADUATION_URL}`] = () => ({ ...RUNNING, canManage: true });
    routes[`PUT ${SIGNATURES_URL}`] = () => {
      throw refusal(400, "INVALID_CERTIFICATE_TUTORS", "Orxan Babayev is not on this course");
    };
    renderAdminPage([ROLES.SUPER_ADMIN]);
    const { user, card } = await openSignatures();
    await user.click(within(card).getByRole("button", { name: "Orxan Babayev" }));
    await user.click(within(card).getByRole("button", { name: "Save signatures" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Orxan Babayev is not on this course"));
  });
});

describe("Ended badge in the course lists", () => {
  const row = (title: string, endedAt: string | null) =>
    ({
      id: `id-${title}`,
      slug: title.toLowerCase().replace(/\s+/g, "-"),
      title,
      courseType: "OFFLINE",
      level: "BEGINNER",
      language: "az",
      free: true,
      price: 0,
      currency: "AZN",
      status: "PUBLISHED",
      ratingCount: 0,
      enrolledCount: 3,
      tutorId: T_EDITOR,
      tutorDisplayName: "Aysel Quliyeva",
      endedAt,
    }) as CourseSummaryDto;

  const ROWS = [row("Python basics", ENDED_AT), row("Data science", null)];

  it("marks an ended course in the admin list", async () => {
    routes["GET /admin/courses"] = () => page(ROWS);
    renderAt([ROLES.ADMIN], ROUTES.adminCourses, <AdminCoursesListPage />, ROUTES.adminCourses);
    // Twice in a row: the status column, and the meta line phones show under the title.
    const ended = (await screen.findByText("Python basics")).closest("tr")!;
    expect(within(ended).getAllByText("Ended")[0]).toHaveAttribute("title", "Ended on Tue 24 Nov 2026");
    expect(within(screen.getByText("Data science").closest("tr")!).queryAllByText("Ended")).toHaveLength(0);
  });

  it("marks an ended course in the expert's list", async () => {
    routes["GET /portal/courses"] = () => page(ROWS);
    renderAt([ROLES.TUTOR], ROUTES.tutorCourses, <CoursesListPage />, ROUTES.tutorCourses);
    const ended = (await screen.findByText("Python basics")).closest("tr")!;
    expect(within(ended).getAllByText("Ended").length).toBeGreaterThan(0);
    expect(within(screen.getByText("Data science").closest("tr")!).queryAllByText("Ended")).toHaveLength(0);
  });
});
