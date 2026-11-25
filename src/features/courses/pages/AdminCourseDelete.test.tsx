import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { toast } from "sonner";
import AdminCourseEditPage from "./AdminCourseEditPage";
import authReducer, { authSuccess } from "@features/auth/store/authSlice";
import uiReducer from "@lib/redux/uiSlice";
import { baseApi } from "@lib/query/baseApi";
import { httpClient } from "@lib/axios/httpClient";
import { ROLES, type Role } from "@shared/constants/roles";
import { ROUTES } from "@shared/constants/routes";
import { useListModerationCoursesQuery } from "@features/courses/api/coursesApi";
import { useListCourseParticipantsQuery } from "@features/participants/api/participantsApi";
import { useListAdminRoomBookingsQuery } from "@features/room-requests/api/roomRequestsApi";
import type { CourseDeletionImpact, CourseDto } from "@features/courses/types";

/*
 * The super admin deletes a course from its admin page. A real store against
 * a fake API, as the attendance page is tested: the URLs, the confirm's
 * counts and what is refetched afterwards are all under test. The editors
 * under the header are not, so they are left out.
 */

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@features/courses/components/CourseDetailsForm", () => ({ CourseDetailsForm: () => null }));
vi.mock("@features/courses/components/CourseSummaryCard", () => ({ CourseSummaryCard: () => null }));
vi.mock("@features/courses/components/TutorRosterPicker", () => ({ TutorRosterPicker: () => null }));

configure({ asyncUtilTimeout: 5_000 });

const COURSE_ID = "c0ffee00-0000-4000-8000-000000000001";
const COURSE_URL = `/admin/courses/${COURSE_ID}`;
const IMPACT_URL = `/super/courses/${COURSE_ID}/deletion-impact`;
const DELETE_URL = `/super/courses/${COURSE_ID}`;

const COURSE = {
  id: COURSE_ID,
  slug: "python-basics",
  title: "Python basics",
  courseType: "OFFLINE",
  status: "PUBLISHED",
  tutors: [],
  categoryIds: [],
  tagIds: [],
  modules: [],
} as unknown as CourseDto;

const IMPACT: CourseDeletionImpact = {
  courseId: COURSE_ID,
  title: "Python basics",
  slug: "python-basics",
  status: "PUBLISHED",
  activeEnrollments: 3,
  paidEnrollments: 1,
  upcomingRoomBookings: 2,
  roomBookingSeries: 1,
};

type Handler = (config: AxiosRequestConfig) => unknown;
let routes: Record<string, Handler> = {};
let calls: Array<{ method: string; url: string }> = [];
const callsTo = (method: string, url: string) => calls.filter((c) => c.method === method && c.url === url);
const refusal = (status: number, code: string, message: string) => ({ status, code, message, isNormalized: true });

/** What other screens of the session have open: the course list, a roster, the room requests. */
function OtherScreens() {
  useListModerationCoursesQuery({ status: "PUBLISHED", page: 0, size: 10 });
  useListCourseParticipantsQuery({ courseId: COURSE_ID, page: 0, size: 5 });
  useListAdminRoomBookingsQuery();
  return null;
}

function renderPage(roles: Role[], permissions?: string[]) {
  const store = configureStore({
    reducer: { auth: authReducer, ui: uiReducer, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm({ serializableCheck: false }).concat(baseApi.middleware),
  });
  store.dispatch(
    authSuccess({
      user: { id: 1, email: "user@aztu.edu.az", fullName: "User", roles, ...(permissions ? { permissions } : {}) },
      accessToken: "t",
    }),
  );
  render(
    <Provider store={store}>
      <HelmetProvider>
        <MemoryRouter initialEntries={["/somewhere", ROUTES.adminCourseEdit(COURSE_ID)]} initialIndex={1}>
          <OtherScreens />
          <Routes>
            <Route path={ROUTES.adminCourseEdit()} element={<AdminCourseEditPage />} />
            <Route path={ROUTES.adminCourses} element={<h1>All courses</h1>} />
            <Route path="/somewhere" element={<h1>Before</h1>} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    </Provider>,
  );
}

beforeEach(() => {
  calls = [];
  routes = {
    [`GET ${COURSE_URL}`]: () => COURSE,
    [`GET ${IMPACT_URL}`]: () => IMPACT,
    [`DELETE ${DELETE_URL}`]: () => "",
    ["GET /admin/courses"]: () => ({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 }),
    [`GET ${COURSE_URL}/participants`]: () => ({ content: [], page: 0, size: 5, totalElements: 0, totalPages: 0 }),
    ["GET /portal/room-bookings/admin"]: () => ({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 }),
  };
  vi.spyOn(httpClient, "request").mockImplementation(async (config: AxiosRequestConfig) => {
    const method = (config.method ?? "GET").toUpperCase();
    const url = config.url ?? "";
    calls.push({ method, url });
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

const deleteAction = () => screen.queryByRole("button", { name: "Delete course" });

async function openConfirm() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Delete course" }));
  const dialog = await screen.findByRole("dialog", { name: "Delete this course?" });
  return { user, dialog };
}

describe("AdminCourseEditPage — Delete course", () => {
  it("is offered to a super admin only", async () => {
    renderPage([ROLES.ADMIN]);
    expect(await screen.findByRole("heading", { name: "Python basics", level: 1 })).toBeInTheDocument();
    expect(deleteAction()).not.toBeInTheDocument();
  });

  it("is not offered to a super admin whose permissions leave course:delete out", async () => {
    renderPage([ROLES.SUPER_ADMIN], ["course:read", "course:approve"]);
    expect(await screen.findByRole("heading", { name: "Python basics", level: 1 })).toBeInTheDocument();
    expect(deleteAction()).not.toBeInTheDocument();
  });

  it("says plainly what deleting does, with the API's counts", async () => {
    renderPage([ROLES.SUPER_ADMIN], ["course:delete"]);
    const { dialog } = await openConfirm();

    const list = await within(dialog).findByRole("list", { name: "What deleting does" });
    expect(callsTo("GET", IMPACT_URL)).toHaveLength(1);
    expect(list).toHaveTextContent(
      "It disappears from the website, the dashboard and the calendar for everyone, and cannot be restored.",
    );
    expect(list).toHaveTextContent("3 active enrolments are cancelled, and the students are notified.");
    expect(list).toHaveTextContent("1 of them was paid. No refund is made automatically.");
    expect(list).toHaveTextContent("2 upcoming room bookings are released, and 1 long-term booking is removed.");
    // Nothing is sent before the title is typed.
    expect(callsTo("DELETE", DELETE_URL)).toHaveLength(0);
  });

  it("says when no one is enrolled and nothing is booked", async () => {
    routes[`GET ${IMPACT_URL}`] = () => ({ ...IMPACT, activeEnrollments: 0, paidEnrollments: 0, upcomingRoomBookings: 0, roomBookingSeries: 0 });
    renderPage([ROLES.SUPER_ADMIN]);
    const { dialog } = await openConfirm();

    const list = await within(dialog).findByRole("list", { name: "What deleting does" });
    expect(list).toHaveTextContent("No one is enrolled, so no enrolment is cancelled.");
    expect(list).toHaveTextContent("No upcoming room bookings to release.");
    expect(list).not.toHaveTextContent("paid");
  });

  it("enables Delete only once the course's title is typed exactly", async () => {
    renderPage([ROLES.SUPER_ADMIN]);
    const { user, dialog } = await openConfirm();
    await within(dialog).findByRole("list", { name: "What deleting does" });

    const confirm = within(dialog).getByRole("button", { name: "Delete course" });
    const box = within(dialog).getByLabelText(/to confirm/);
    expect(confirm).toBeDisabled();
    await user.type(box, "python basics");
    expect(confirm).toBeDisabled();
    await user.clear(box);
    await user.type(box, "Python basic");
    expect(confirm).toBeDisabled();
    await user.type(box, "s");
    expect(confirm).toBeEnabled();
  });

  it("deletes it, goes back to the courses list and refreshes what showed it", async () => {
    renderPage([ROLES.SUPER_ADMIN]);
    const { user, dialog } = await openConfirm();
    await within(dialog).findByRole("list", { name: "What deleting does" });
    const before = {
      list: callsTo("GET", "/admin/courses").length,
      participants: callsTo("GET", `${COURSE_URL}/participants`).length,
      bookings: callsTo("GET", "/portal/room-bookings/admin").length,
    };

    await user.type(within(dialog).getByLabelText(/to confirm/), "Python basics");
    await user.click(within(dialog).getByRole("button", { name: "Delete course" }));

    await waitFor(() => expect(callsTo("DELETE", DELETE_URL)).toHaveLength(1));
    expect(await screen.findByRole("heading", { name: "All courses" })).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith("“Python basics” was deleted");
    // The lists, the enrolments and the room requests are asked for again.
    await waitFor(() => expect(callsTo("GET", "/admin/courses").length).toBeGreaterThan(before.list));
    await waitFor(() => expect(callsTo("GET", `${COURSE_URL}/participants`).length).toBeGreaterThan(before.participants));
    await waitFor(() => expect(callsTo("GET", "/portal/room-bookings/admin").length).toBeGreaterThan(before.bookings));
  });

  it("shows the API's message when deleting is refused, and stays", async () => {
    routes[`DELETE ${DELETE_URL}`] = () => {
      throw refusal(409, "COURSE_DELETE_FAILED", "The course could not be deleted right now");
    };
    renderPage([ROLES.SUPER_ADMIN]);
    const { user, dialog } = await openConfirm();
    await within(dialog).findByRole("list", { name: "What deleting does" });

    await user.type(within(dialog).getByLabelText(/to confirm/), "Python basics");
    await user.click(within(dialog).getByRole("button", { name: "Delete course" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("The course could not be deleted right now"));
    expect(screen.getByRole("dialog", { name: "Delete this course?" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "All courses" })).not.toBeInTheDocument();
  });

  it("leaves the page of a course found deleted already", async () => {
    routes[`DELETE ${DELETE_URL}`] = () => {
      throw refusal(404, "COURSE_NOT_FOUND", "Course not found");
    };
    renderPage([ROLES.SUPER_ADMIN]);
    const { user, dialog } = await openConfirm();
    await within(dialog).findByRole("list", { name: "What deleting does" });

    await user.type(within(dialog).getByLabelText(/to confirm/), "Python basics");
    await user.click(within(dialog).getByRole("button", { name: "Delete course" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Course not found"));
    expect(await screen.findByRole("heading", { name: "All courses" })).toBeInTheDocument();
  });

  it("says why when what deleting affects cannot be counted, and offers no Delete", async () => {
    routes[`GET ${IMPACT_URL}`] = () => {
      throw refusal(403, "FORBIDDEN", "Only a super admin may delete a course");
    };
    renderPage([ROLES.SUPER_ADMIN]);
    const { dialog } = await openConfirm();

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Only a super admin may delete a course");
    expect(within(dialog).getByRole("button", { name: "Delete course" })).toBeDisabled();
    expect(within(dialog).getByLabelText(/to confirm/)).toBeDisabled();
  });
});
