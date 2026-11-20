import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { toast } from "sonner";
import CourseAttendancePage from "./CourseAttendancePage";
import authReducer, { authSuccess } from "@features/auth/store/authSlice";
import uiReducer from "@lib/redux/uiSlice";
import { baseApi } from "@lib/query/baseApi";
import { httpClient } from "@lib/axios/httpClient";
import { ROLES, type Role } from "@shared/constants/roles";
import { ROUTES } from "@shared/constants/routes";
import type { CourseDto } from "@features/courses/types";
import type { AttendanceDaySummary, AttendanceStudent, CourseAttendanceView } from "@features/attendance/types";
import { formatDay } from "@features/attendance/lib/attendance";

/*
 * The page runs on a real store against a fake API: every request goes
 * through the RTK Query endpoints to `httpClient.request`, which answers from
 * the routes below as the contract has it — so the URLs, the bodies and what
 * is refetched after each change are all under test.
 */

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

// The whole page renders here, through the store, the router and every request:
// on a busy machine its first render alone took longer than the default second.
configure({ asyncUtilTimeout: 5_000 });

const COURSE_ID = "c0ffee00-0000-4000-8000-000000000001";
const SLUG = "python-basics";
const VIEW_URL = `/portal/courses/${COURSE_ID}/attendance`;
const DAYS_URL = `/portal/courses/${COURSE_ID}/attendance/days`;
/** Today on the platform clock (Baku is UTC+4): 13 Nov 2026, 12:00. */
const NOW = new Date("2026-11-13T08:00:00Z");
const TODAY = "2026-11-13";

function course(courseType: CourseDto["courseType"] = "OFFLINE"): CourseDto {
  return {
    id: COURSE_ID,
    slug: SLUG,
    title: "Python basics",
    courseType,
    status: "PUBLISHED",
    tutors: [],
    categoryIds: [],
    tagIds: [],
    modules: [],
    offlineDetails: { startDate: "2026-11-02", endDate: "2026-11-27" },
  } as unknown as CourseDto;
}

const student = (id: string, firstName: string, lastName: string, record: AttendanceStudent["record"] = null): AttendanceStudent => ({
  enrollmentId: `e0000000-0000-4000-8000-00000000000${id}`,
  studentId: `50000000-0000-4000-8000-00000000000${id}`,
  firstName,
  lastName,
  email: `${firstName.toLowerCase()}@example.az`,
  avatarUrl: null,
  record,
});

const NIGAR_RECORD = {
  id: "70000000-0000-4000-8000-000000000001",
  status: "LATE" as const,
  markedAt: "2026-11-13T06:05:00Z",
  markedByName: "Kamran Məmmədov",
};
const LEYLA = student("1", "Leyla", "Əliyeva");
const NIGAR = student("2", "Nigar", "Həsənova", NIGAR_RECORD);
const ANAR = student("3", "Anar", "Quliyev");

function dayView(over: Partial<CourseAttendanceView> = {}): CourseAttendanceView {
  return {
    courseId: COURSE_ID,
    date: TODAY,
    firstDate: "2026-11-02",
    lastDate: "2026-11-27",
    canManage: false,
    students: [LEYLA, NIGAR, ANAR],
    ...over,
  };
}

const DAYS: AttendanceDaySummary[] = [
  { date: TODAY, present: 0, late: 1, absent: 0 },
  { date: "2026-11-12", present: 2, late: 0, absent: 1 },
];

/* ───────────────────────────── fake API ───────────────────────────── */

type Handler = (config: AxiosRequestConfig) => unknown;
interface Call {
  method: string;
  url: string;
  params?: Record<string, unknown>;
  data?: unknown;
}

let routes: Record<string, Handler> = {};
let calls: Call[] = [];

function serve(table: Record<string, Handler>) {
  routes = table;
}

/** A refusal, already in the shape the HTTP client hands on. */
function refusal(status: number, code: string, message: string) {
  return { status, code, message, isNormalized: true };
}

const callsTo = (method: string, url: string) => calls.filter((c) => c.method === method && c.url === url);
/** The params of the last day view asked for. */
const lastViewParams = () => callsTo("GET", VIEW_URL).slice(-1)[0]?.params;
/** The day a view request asked for, if any. */
const askedDate = (config: AxiosRequestConfig) => (config.params as { date?: string } | undefined)?.date;
/** The API's own today: the date in Baku on the (mocked) clock. */
const apiToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baku" }).format(new Date());

function makeStore(roles: Role[]) {
  const store = configureStore({
    reducer: { auth: authReducer, ui: uiReducer, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm({ serializableCheck: false }).concat(baseApi.middleware),
  });
  store.dispatch(authSuccess({ user: { id: 1, email: "user@aztu.edu.az", fullName: "User", roles }, accessToken: "t" }));
  return store;
}

function renderPage(scope: "tutor" | "admin", roles: Role[]) {
  const path = scope === "tutor" ? ROUTES.tutorCourseAttendance(SLUG) : ROUTES.adminCourseAttendance(COURSE_ID);
  const pattern = scope === "tutor" ? ROUTES.tutorCourseAttendance() : ROUTES.adminCourseAttendance();
  render(
    <Provider store={makeStore(roles)}>
      <HelmetProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={pattern} element={<CourseAttendancePage scope={scope} />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    </Provider>,
  );
}

/** A student's row, found by name. */
const row = (name: string) => screen.getByText(name, { selector: "p" }).closest("li") as HTMLElement;
const picker = (name: string) => screen.getByRole("radiogroup", { name: `Mark for ${name}` });
/** The day card's heading: the day shown, and "Today" when it is. */
const dayHeading = () => screen.getAllByRole("heading", { level: 2 })[0];
const markedDays = () => screen.getByRole("list", { name: "Marked days" });

const originalTz = process.env.TZ;

beforeEach(() => {
  vi.setSystemTime(NOW);
  calls = [];
  vi.spyOn(httpClient, "request").mockImplementation(async (config: AxiosRequestConfig) => {
    const method = (config.method ?? "GET").toUpperCase();
    const url = config.url ?? "";
    calls.push({ method, url, params: config.params, data: config.data });
    const handler = routes[`${method} ${url}`];
    if (!handler) throw refusal(404, "NOT_FOUND", `No route for ${method} ${url}`);
    return { data: { data: await handler(config) } } as AxiosResponse;
  });
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
});

afterEach(() => {
  process.env.TZ = originalTz;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/* ───────────────────────────── tests ───────────────────────────── */

describe("CourseAttendancePage — an expert", () => {
  it("marks the students without a mark and saves all the new marks in one POST", async () => {
    const user = userEvent.setup();
    let current = dayView();
    serve({
      [`GET /public/courses/${SLUG}`]: () => course("OFFLINE"),
      [`GET ${VIEW_URL}`]: () => current,
      [`GET ${DAYS_URL}`]: () => DAYS,
      [`POST ${VIEW_URL}`]: () => {
        const by = { markedAt: "2026-11-13T08:00:00Z", markedByName: "Leyla Məmmədova" };
        current = dayView({
          students: [
            { ...LEYLA, record: { id: "71", status: "PRESENT", ...by } },
            NIGAR,
            { ...ANAR, record: { id: "73", status: "ABSENT", ...by } },
          ],
        });
        return current;
      },
    });
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("list", { name: "Students" });
    // Today, asked for without a date: the API clamps it into the course's days.
    expect(callsTo("GET", VIEW_URL)[0].params).toBeUndefined();
    expect(screen.getByText("3 students · 1 marked · 2 not marked")).toBeInTheDocument();
    // Saved marks are final for an expert: the warning, and no way to change one.
    expect(screen.getByText("Saved marks are final: only a super admin can change or delete one.")).toBeInTheDocument();

    await user.click(within(picker("Leyla Əliyeva")).getByRole("radio", { name: "Joined" }));
    await user.click(within(picker("Anar Quliyev")).getByRole("radio", { name: "Absent" }));
    await user.click(screen.getByRole("button", { name: "Save 2 marks" }));

    await waitFor(() => expect(callsTo("POST", VIEW_URL)).toHaveLength(1));
    expect(callsTo("POST", VIEW_URL)[0].data).toEqual({
      date: TODAY,
      marks: [
        { enrollmentId: LEYLA.enrollmentId, status: "PRESENT" },
        { enrollmentId: ANAR.enrollmentId, status: "ABSENT" },
      ],
    });

    // The answer is the day as saved: the rows show their marks at once.
    await waitFor(() => expect(within(row("Leyla Əliyeva")).queryByRole("radiogroup")).not.toBeInTheDocument());
    expect(within(row("Leyla Əliyeva")).getByText("Joined")).toBeInTheDocument();
    expect(within(row("Anar Quliyev")).getByText("Absent")).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith("2 marks saved");
    expect(screen.getByRole("heading", { name: "Students" })).toHaveFocus();
    // …and the marked days are reloaded for their counts.
    await waitFor(() => expect(callsTo("GET", DAYS_URL)).toHaveLength(2));
  });

  it("shows a saved mark read-only: what it is, who saved it and when", async () => {
    // A viewer outside Baku still reads the time on Baku's clock, as the platform does.
    process.env.TZ = "America/New_York";
    serve({
      [`GET /public/courses/${SLUG}`]: () => course("ONE_TIME"),
      [`GET ${VIEW_URL}`]: () => dayView({ firstDate: TODAY, lastDate: TODAY }),
      [`GET ${DAYS_URL}`]: () => DAYS,
    });
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("list", { name: "Students" });
    const nigar = row("Nigar Həsənova");
    expect(within(nigar).getByText("Late")).toBeInTheDocument();
    expect(within(nigar).getByText("Kamran Məmmədov")).toBeInTheDocument();
    // Saved at 06:05 UTC: 10:05 in Baku (01:05 in New York).
    expect(within(nigar).getByText(/\b10:05\b/)).toBeInTheDocument();
    expect(within(nigar).queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(within(nigar).queryByRole("button")).not.toBeInTheDocument();
    // A one-day course has nothing to pick between.
    expect(screen.getByText("A one-day course.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Day")).not.toBeInTheDocument();
  });

  it("refreshes and says so when someone else marked first (409), keeping the choices still open", async () => {
    const user = userEvent.setup();
    let current = dayView();
    serve({
      [`GET /public/courses/${SLUG}`]: () => course(),
      [`GET ${VIEW_URL}`]: () => current,
      [`GET ${DAYS_URL}`]: () => DAYS,
      [`POST ${VIEW_URL}`]: () => {
        // Another expert's save for Leyla landed first; nothing of this one is kept.
        current = dayView({
          students: [
            { ...LEYLA, record: { id: "75", status: "PRESENT", markedAt: "2026-11-13T07:59:00Z", markedByName: "Aysel Quliyeva" } },
            NIGAR,
            ANAR,
          ],
        });
        throw refusal(409, "ATTENDANCE_ALREADY_MARKED", "Already marked");
      },
    });
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("list", { name: "Students" });
    await user.click(within(picker("Leyla Əliyeva")).getByRole("radio", { name: "Late" }));
    await user.click(within(picker("Anar Quliyev")).getByRole("radio", { name: "Joined" }));
    await user.click(screen.getByRole("button", { name: "Save 2 marks" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Someone else marked some of these students first")),
    );
    // The day is fetched again and shows the other expert's mark…
    await waitFor(() => expect(within(row("Leyla Əliyeva")).getByText("Aysel Quliyeva")).toBeInTheDocument());
    expect(callsTo("GET", VIEW_URL)).toHaveLength(2);
    // …while Anar's choice stands, ready to save on its own.
    expect(within(picker("Anar Quliyev")).getByRole("radio", { name: "Joined" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Save 1 mark" })).toBeEnabled();
  });

  it("shows the API's message for any other refusal", async () => {
    const user = userEvent.setup();
    serve({
      [`GET /public/courses/${SLUG}`]: () => course(),
      [`GET ${VIEW_URL}`]: () => dayView(),
      [`GET ${DAYS_URL}`]: () => [],
      [`POST ${VIEW_URL}`]: () => {
        throw refusal(400, "ENROLLMENT_NOT_IN_COURSE", "Anar is no longer enrolled on this course");
      },
    });
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("list", { name: "Students" });
    expect(screen.getByText("No marks saved yet.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mark the rest as joined" }));
    expect(within(picker("Leyla Əliyeva")).getByRole("radio", { name: "Joined" })).toBeChecked();
    // The next step takes the focus, as the button just pressed is now disabled.
    expect(screen.getByRole("button", { name: "Save 2 marks" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Save 2 marks" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Anar is no longer enrolled on this course"));
  });

  it("jumps to a marked day, asking for that date", async () => {
    const user = userEvent.setup();
    serve({
      [`GET /public/courses/${SLUG}`]: () => course(),
      [`GET ${VIEW_URL}`]: (config) => dayView({ date: (config.params as { date?: string } | undefined)?.date ?? TODAY }),
      [`GET ${DAYS_URL}`]: () => DAYS,
    });
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("list", { name: "Students" });
    const days = screen.getByRole("list", { name: "Marked days" });
    const earlier = within(days).getByRole("button", { name: /2 joined, 0 late, 1 absent/ });
    await user.click(earlier);

    await waitFor(() => {
      const views = callsTo("GET", VIEW_URL);
      expect(views[views.length - 1].params).toEqual({ date: "2026-11-12" });
    });
    await waitFor(() => expect(earlier).toHaveAttribute("aria-current", "date"));
    expect(screen.getByLabelText("Day")).toHaveValue("2026-11-12");
  });

  it("offers no attendance for an online course, and never asks for it", async () => {
    serve({ [`GET /public/courses/${SLUG}`]: () => course("ONLINE") });
    renderPage("tutor", [ROLES.TUTOR]);

    expect(await screen.findByText("Online courses have no attendance")).toBeInTheDocument();
    expect(calls.some((c) => c.url.includes("/attendance"))).toBe(false);
  });
});

describe("CourseAttendancePage — staff", () => {
  it("lets an admin read attendance only", async () => {
    serve({
      [`GET /admin/courses/${COURSE_ID}`]: () => course(),
      [`GET ${VIEW_URL}`]: () => dayView(),
      [`GET ${DAYS_URL}`]: () => DAYS,
    });
    renderPage("admin", [ROLES.ADMIN]);

    await screen.findByRole("list", { name: "Students" });
    expect(screen.getByText(/You can see attendance here/)).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(within(row("Leyla Əliyeva")).getByText("Not marked")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mark/i })).not.toBeInTheDocument();
  });

  it("lets a super admin change a mark (PATCH) and delete one after a confirm (DELETE)", async () => {
    const user = userEvent.setup();
    const recordUrl = `/super/attendance/${NIGAR_RECORD.id}`;
    let current = dayView({ canManage: true });
    serve({
      [`GET /admin/courses/${COURSE_ID}`]: () => course(),
      [`GET ${VIEW_URL}`]: () => current,
      [`GET ${DAYS_URL}`]: () => DAYS,
      [`PATCH ${recordUrl}`]: () => {
        const changed = { ...NIGAR_RECORD, status: "ABSENT" as const };
        current = dayView({ canManage: true, students: [LEYLA, { ...NIGAR, record: changed }, ANAR] });
        return changed;
      },
      [`DELETE ${recordUrl}`]: () => {
        current = dayView({ canManage: true, students: [LEYLA, { ...NIGAR, record: null }, ANAR] });
        return "";
      },
    });
    renderPage("admin", [ROLES.SUPER_ADMIN]);

    await screen.findByRole("list", { name: "Students" });
    // A super admin may also add marks.
    expect(picker("Leyla Əliyeva")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Change Nigar Həsənova's mark" }));
    const dialog = await screen.findByRole("dialog", { name: "Change mark" });
    const save = within(dialog).getByRole("button", { name: "Save mark" });
    expect(save).toBeDisabled();
    await user.click(within(dialog).getByRole("radio", { name: "Absent" }));
    await user.click(save);

    await waitFor(() => expect(callsTo("PATCH", recordUrl)).toHaveLength(1));
    expect(callsTo("PATCH", recordUrl)[0].data).toEqual({ status: "ABSENT" });
    await waitFor(() => expect(within(row("Nigar Həsənova")).getByText("Absent")).toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledWith("Nigar Həsənova is now marked absent");

    await user.click(screen.getByRole("button", { name: "Delete Nigar Həsənova's mark" }));
    const confirm = await screen.findByRole("dialog", { name: "Delete this mark?" });
    expect(callsTo("DELETE", recordUrl)).toHaveLength(0);
    await user.click(within(confirm).getByRole("button", { name: "Delete mark" }));

    await waitFor(() => expect(callsTo("DELETE", recordUrl)).toHaveLength(1));
    // Unmarked again, so it can be marked anew.
    expect(await screen.findByRole("radiogroup", { name: "Mark for Nigar Həsənova" })).toBeInTheDocument();
  });

  it("says when the caller may not see the course's attendance", async () => {
    serve({
      [`GET /admin/courses/${COURSE_ID}`]: () => course(),
      [`GET ${VIEW_URL}`]: () => {
        throw refusal(403, "FORBIDDEN", "You are not on this course's roster");
      },
      [`GET ${DAYS_URL}`]: () => [],
    });
    renderPage("admin", [ROLES.ADMIN]);

    expect(await screen.findByText("No access to this course's attendance")).toBeInTheDocument();
    expect(screen.getByText("You are not on this course's roster")).toBeInTheDocument();
  });
});

describe("CourseAttendancePage — when the day turns in Baku", () => {
  /** 18:00 on the 12th in Baku, and 09:00 the next morning. */
  const EVENING = new Date("2026-11-12T14:00:00Z");
  const MORNING = new Date("2026-11-13T05:00:00Z");

  function serveRunningCourse() {
    serve({
      [`GET /public/courses/${SLUG}`]: () => course(),
      // As the API does: no date is today, clamped into the course's days.
      [`GET ${VIEW_URL}`]: (config) => dayView({ date: askedDate(config) ?? apiToday() }),
      [`GET ${DAYS_URL}`]: () => [],
      [`POST ${VIEW_URL}`]: (config) => dayView({ date: (config.data as { date: string }).date }),
    });
  }

  it("moves on to the new day when the tab comes back after midnight", async () => {
    const user = userEvent.setup();
    vi.setSystemTime(EVENING);
    serveRunningCourse();
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("list", { name: "Students" });
    expect(dayHeading()).toHaveTextContent(`${formatDay("2026-11-12")}Today`);

    // Left open overnight; in the morning the window gets the focus back.
    vi.setSystemTime(MORNING);
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    // The default view is asked for again — still without a date: the API's today has moved on.
    await waitFor(() => expect(callsTo("GET", VIEW_URL)).toHaveLength(2));
    expect(lastViewParams()).toBeUndefined();
    await waitFor(() => expect(dayHeading()).toHaveTextContent(`${formatDay("2026-11-13")}Today`));

    await user.click(within(picker("Leyla Əliyeva")).getByRole("radio", { name: "Joined" }));
    await user.click(screen.getByRole("button", { name: "Save 1 mark" }));
    await waitFor(() => expect(callsTo("POST", VIEW_URL)).toHaveLength(1));
    expect(callsTo("POST", VIEW_URL)[0].data).toMatchObject({ date: "2026-11-13" });
  });

  it("saves nothing for a day that is no longer today, and moves on to the new one", async () => {
    const user = userEvent.setup();
    vi.setSystemTime(EVENING);
    serveRunningCourse();
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("list", { name: "Students" });
    await user.click(within(picker("Leyla Əliyeva")).getByRole("radio", { name: "Joined" }));
    // Past midnight, before the page has looked at the clock again (a laptop that slept, say).
    vi.setSystemTime(MORNING);
    await user.click(screen.getByRole("button", { name: "Save 1 mark" }));

    expect(callsTo("POST", VIEW_URL)).toHaveLength(0);
    expect(toast.error).toHaveBeenCalledWith(
      `It's ${formatDay("2026-11-13")} in Baku now, so nothing was saved for ${formatDay("2026-11-12")}. Check the day and save again.`,
    );
    await waitFor(() => expect(dayHeading()).toHaveTextContent(`${formatDay("2026-11-13")}Today`));
    // The choice was made for the 12th: the 13th starts with none.
    expect(within(await screen.findByRole("radiogroup", { name: "Mark for Leyla Əliyeva" })).getByRole("radio", { name: "Joined" })).not.toBeChecked();
  });
});

describe("CourseAttendancePage — days", () => {
  it("keeps the date box on the day shown, however the day was changed", async () => {
    const user = userEvent.setup();
    serve({
      [`GET /public/courses/${SLUG}`]: () => course(),
      [`GET ${VIEW_URL}`]: (config) => dayView({ date: askedDate(config) ?? TODAY }),
      [`GET ${DAYS_URL}`]: () => DAYS,
    });
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("list", { name: "Students" });
    const box = screen.getByLabelText("Day");
    expect(box).toHaveValue(TODAY);

    fireEvent.change(box, { target: { value: "2026-11-05" } });
    await waitFor(() => expect(lastViewParams()).toEqual({ date: "2026-11-05" }));
    await user.click(screen.getByRole("button", { name: "Today" }));
    await waitFor(() => expect(lastViewParams()).toEqual({ date: TODAY }));
    await waitFor(() => expect(dayHeading()).toHaveTextContent(`${formatDay(TODAY)}Today`));
    expect(box).toHaveValue(TODAY);

    // A cleared box is flagged while it stays cleared…
    fireEvent.change(box, { target: { value: "" } });
    expect(screen.getByText(/^Pick a day from/)).toBeInTheDocument();
    // …not once the day has been changed another way and changed back.
    await user.click(screen.getByRole("button", { name: "Previous day" }));
    await waitFor(() => expect(box).toHaveValue("2026-11-12"));
    await user.click(screen.getByRole("button", { name: "Next day" }));
    await waitFor(() => expect(box).toHaveValue(TODAY));
    expect(screen.queryByText(/^Pick a day from/)).not.toBeInTheDocument();
  });

  it("tells the marks on each marked day apart by icon as well as colour", async () => {
    serve({
      [`GET /public/courses/${SLUG}`]: () => course(),
      [`GET ${VIEW_URL}`]: () => dayView(),
      [`GET ${DAYS_URL}`]: () => DAYS,
    });
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("list", { name: "Marked days" });
    const chip = within(markedDays()).getByRole("button", { name: /2 joined, 0 late, 1 absent/ });
    const counts = Array.from(
      chip.querySelectorAll("svg"),
      (icon) => `${[...icon.classList].find((c) => c.startsWith("lucide-"))} ${icon.parentElement?.textContent}`,
    );
    // The shapes of the Joined, Late and Absent badges and pickers.
    expect(counts).toEqual(["lucide-check 2", "lucide-clock 0", "lucide-x 1"]);
  });

  it("opens a marked day outside the course's days, where a super admin can still correct its marks", async () => {
    const user = userEvent.setup();
    // Marked before the course's start moved from 30 Oct to 2 Nov.
    const OCT_30 = "2026-10-30";
    const leylaThen = {
      ...LEYLA,
      record: { id: "70000000-0000-4000-8000-000000000030", status: "PRESENT" as const, markedAt: "2026-10-30T07:00:00Z", markedByName: "Kamran Məmmədov" },
    };
    serve({
      [`GET /admin/courses/${COURSE_ID}`]: () => course(),
      [`GET ${VIEW_URL}`]: (config) => {
        const date = askedDate(config) ?? TODAY;
        return dayView({ date, canManage: true, students: date === OCT_30 ? [leylaThen, { ...NIGAR, record: null }, ANAR] : [LEYLA, NIGAR, ANAR] });
      },
      [`GET ${DAYS_URL}`]: () => [...DAYS, { date: OCT_30, present: 1, late: 0, absent: 0 }],
    });
    renderPage("admin", [ROLES.SUPER_ADMIN]);

    await screen.findByRole("list", { name: "Students" });
    await user.click(within(markedDays()).getByRole("button", { name: /1 joined, 0 late, 0 absent/ }));

    await waitFor(() => expect(lastViewParams()).toEqual({ date: OCT_30 }));
    // Its marks can still be changed or deleted (Leyla's was saved that day)…
    expect(await screen.findByRole("button", { name: "Change Leyla Əliyeva's mark" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Leyla Əliyeva's mark" })).toBeInTheDocument();
    expect(within(row("Leyla Əliyeva")).getByText("Joined")).toBeInTheDocument();
    expect(dayHeading()).toHaveTextContent(formatDay(OCT_30));
    expect(screen.getByText(/This day is outside the course’s days/)).toBeInTheDocument();
    // …but nothing can be added on it.
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(within(row("Anar Quliyev")).getByText("Not marked")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Save/ })).not.toBeInTheDocument();

    // Next leads into the course's days, from their first.
    expect(screen.getByRole("button", { name: "Previous day" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Next day" }));
    await waitFor(() => expect(lastViewParams()).toEqual({ date: "2026-11-02" }));
  });

  it("leads back to a one-day course's day from a marked day outside it", async () => {
    const user = userEvent.setup();
    serve({
      [`GET /public/courses/${SLUG}`]: () => course("ONE_TIME"),
      [`GET ${VIEW_URL}`]: (config) => dayView({ date: askedDate(config) ?? TODAY, firstDate: TODAY, lastDate: TODAY }),
      // Its date moved from the 6th to the 13th after the marks were saved.
      [`GET ${DAYS_URL}`]: () => [{ date: "2026-11-06", present: 3, late: 0, absent: 0 }],
    });
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("list", { name: "Students" });
    await user.click(within(markedDays()).getByRole("button", { name: /3 joined/ }));
    await waitFor(() => expect(lastViewParams()).toEqual({ date: "2026-11-06" }));

    // No date box or arrows on a one-day course: the note has the way back.
    await user.click(await screen.findByRole("button", { name: `Go to ${formatDay(TODAY)}` }));
    await waitFor(() => expect(lastViewParams()).toEqual({ date: TODAY }));
    await waitFor(() => expect(screen.queryByText(/This day is outside the course’s days/)).not.toBeInTheDocument());
    expect(await screen.findByRole("radiogroup", { name: "Mark for Leyla Əliyeva" })).toBeInTheDocument();
  });

  it("offers no marking on a one-day course that is still to come", async () => {
    // Next week: the API's default day is the course's one day.
    serve({
      [`GET /public/courses/${SLUG}`]: () => course("ONE_TIME"),
      [`GET ${VIEW_URL}`]: () => dayView({ date: "2026-11-20", firstDate: "2026-11-20", lastDate: "2026-11-20" }),
      [`GET ${DAYS_URL}`]: () => [],
    });
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("list", { name: "Students" });
    expect(screen.getByText(/The course hasn’t started yet/)).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark the rest as joined" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Save/ })).not.toBeInTheDocument();
    expect(within(row("Leyla Əliyeva")).getByText("Not marked")).toBeInTheDocument();
    expect(within(row("Anar Quliyev")).getByText("Not marked")).toBeInTheDocument();
    expect(callsTo("POST", VIEW_URL)).toHaveLength(0);
  });

  it("lets a course that starts next week be looked at on its first day only", async () => {
    serve({
      [`GET /public/courses/${SLUG}`]: () => course(),
      [`GET ${VIEW_URL}`]: () => dayView({ date: "2026-11-20", firstDate: "2026-11-20", lastDate: "2026-12-04" }),
      [`GET ${DAYS_URL}`]: () => [],
    });
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("list", { name: "Students" });
    expect(screen.getByText(/The course hasn’t started yet/)).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous day" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next day" })).toBeDisabled();
    expect(screen.getByLabelText("Day")).toHaveAttribute("max", "2026-11-20");
  });

  it("stops the days at today on a course that is still running", async () => {
    serve({
      [`GET /public/courses/${SLUG}`]: () => course(),
      [`GET ${VIEW_URL}`]: () => dayView(),
      [`GET ${DAYS_URL}`]: () => [],
    });
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("list", { name: "Students" });
    expect(screen.getByLabelText("Day")).toHaveAttribute("min", "2026-11-02");
    expect(screen.getByLabelText("Day")).toHaveAttribute("max", TODAY);
    expect(screen.getByRole("button", { name: "Next day" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous day" })).toBeEnabled();
  });
});

describe("CourseAttendancePage — who may mark", () => {
  it("shows the day read-only when the API says the caller may not mark it", async () => {
    // An admin who is also an expert, on the expert's route of a course they don't teach.
    serve({
      [`GET /public/courses/${SLUG}`]: () => course(),
      [`GET ${VIEW_URL}`]: () => dayView({ canMark: false }),
      [`GET ${DAYS_URL}`]: () => DAYS,
    });
    renderPage("tutor", [ROLES.ADMIN, ROLES.TUTOR]);

    await screen.findByRole("list", { name: "Students" });
    expect(screen.getByText(/You can see attendance here/)).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark the rest as joined" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Save/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Saved marks are final/)).not.toBeInTheDocument();
  });

  it("offers marking wherever the API says the caller may mark", async () => {
    // A course's expert who is also an admin, from the admin course page.
    serve({
      [`GET /admin/courses/${COURSE_ID}`]: () => course(),
      [`GET ${VIEW_URL}`]: () => dayView({ canMark: true }),
      [`GET ${DAYS_URL}`]: () => DAYS,
    });
    renderPage("admin", [ROLES.ADMIN, ROLES.TUTOR]);

    await screen.findByRole("list", { name: "Students" });
    expect(picker("Leyla Əliyeva")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save marks" })).toBeDisabled();
    expect(screen.queryByText(/You can see attendance here/)).not.toBeInTheDocument();
  });
});

describe("CourseAttendancePage — focus after a super admin's dialogs", () => {
  const recordUrl = `/super/attendance/${NIGAR_RECORD.id}`;

  it("goes back to the button that opened the dialog", async () => {
    const user = userEvent.setup();
    let current = dayView({ canManage: true });
    serve({
      [`GET /admin/courses/${COURSE_ID}`]: () => course(),
      [`GET ${VIEW_URL}`]: () => current,
      [`GET ${DAYS_URL}`]: () => DAYS,
      [`PATCH ${recordUrl}`]: () => {
        const changed = { ...NIGAR_RECORD, status: "ABSENT" as const };
        current = dayView({ canManage: true, students: [LEYLA, { ...NIGAR, record: changed }, ANAR] });
        return changed;
      },
    });
    renderPage("admin", [ROLES.SUPER_ADMIN]);

    await screen.findByRole("list", { name: "Students" });
    const change = screen.getByRole("button", { name: "Change Nigar Həsənova's mark" });
    await user.click(change);
    const dialog = await screen.findByRole("dialog", { name: "Change mark" });
    await user.click(within(dialog).getByRole("radio", { name: "Absent" }));
    await user.click(within(dialog).getByRole("button", { name: "Save mark" }));
    await waitFor(() => expect(within(row("Nigar Həsənova")).getByText("Absent")).toBeInTheDocument());
    await waitFor(() => expect(change).toHaveFocus());

    const remove = screen.getByRole("button", { name: "Delete Nigar Həsənova's mark" });
    await user.click(remove);
    await user.click(within(await screen.findByRole("dialog", { name: "Delete this mark?" })).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(remove).toHaveFocus());
    expect(callsTo("DELETE", recordUrl)).toHaveLength(0);
  });

  /** The day, served until Nigar's mark is found deleted by another super admin meanwhile. */
  function serveMarkDeletedElsewhere() {
    let current = dayView({ canManage: true });
    const gone = () => {
      current = dayView({ canManage: true, students: [LEYLA, { ...NIGAR, record: null }, ANAR] });
      throw refusal(404, "ATTENDANCE_RECORD_NOT_FOUND", "Attendance record does not exist");
    };
    serve({
      [`GET /admin/courses/${COURSE_ID}`]: () => course(),
      [`GET ${VIEW_URL}`]: () => current,
      [`GET ${DAYS_URL}`]: () => DAYS,
      [`PATCH ${recordUrl}`]: gone,
      [`DELETE ${recordUrl}`]: gone,
    });
  }

  it("goes to the list's heading when the mark to delete is gone already", async () => {
    const user = userEvent.setup();
    serveMarkDeletedElsewhere();
    renderPage("admin", [ROLES.SUPER_ADMIN]);

    await screen.findByRole("list", { name: "Students" });
    await user.click(screen.getByRole("button", { name: "Delete Nigar Həsənova's mark" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Delete this mark?" })).getByRole("button", { name: "Delete mark" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Attendance record does not exist"));
    // Its row's buttons go with the reload; the focus does not go with them.
    await waitFor(() => expect(screen.queryByRole("button", { name: "Delete Nigar Həsənova's mark" })).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Students" })).toHaveFocus();
  });

  it("closes Change mark and goes to the list's heading when the mark is gone already", async () => {
    const user = userEvent.setup();
    serveMarkDeletedElsewhere();
    renderPage("admin", [ROLES.SUPER_ADMIN]);

    await screen.findByRole("list", { name: "Students" });
    await user.click(screen.getByRole("button", { name: "Change Nigar Həsənova's mark" }));
    const dialog = await screen.findByRole("dialog", { name: "Change mark" });
    await user.click(within(dialog).getByRole("radio", { name: "Absent" }));
    await user.click(within(dialog).getByRole("button", { name: "Save mark" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Attendance record does not exist"));
    // Nothing is left to change.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByRole("button", { name: "Change Nigar Həsənova's mark" })).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Students" })).toHaveFocus();
    expect(await screen.findByRole("radiogroup", { name: "Mark for Nigar Həsənova" })).toBeInTheDocument();
  });
});
