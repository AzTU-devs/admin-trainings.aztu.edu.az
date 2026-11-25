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
import type {
  AttendanceRegister,
  AttendanceRegisterStudent,
  AttendanceStatus,
  AttendanceStudent,
  CourseAttendanceView,
} from "@features/attendance/types";
import { formatDay } from "@features/attendance/lib/attendance";
import type { DayOfWeek } from "@shared/lib/weekdays";

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
const REGISTER_URL = `/portal/courses/${COURSE_ID}/attendance/register`;
const EXPORT_URL = `/portal/courses/${COURSE_ID}/attendance/export`;
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

/* ───────────────────────────── the register ───────────────────────────── */

/** Mon, Wed and Fri from 2 to 27 Nov 2026: twelve course days, today (Fri 13) among them. */
const MWF: DayOfWeek[] = ["MONDAY", "WEDNESDAY", "FRIDAY"];
const WEEKDAY_OF: DayOfWeek[] = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

/** The dates in [first, last] on the given weekdays: the API's course days. */
function courseDates(first: string, last: string, days: DayOfWeek[]): string[] {
  const out: string[] = [];
  for (let d = new Date(`${first}T00:00:00Z`); d.toISOString().slice(0, 10) <= last; d.setUTCDate(d.getUTCDate() + 1)) {
    if (days.includes(WEEKDAY_OF[d.getUTCDay()])) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

type RegisterMark = [student: AttendanceStudent, date: string, status: AttendanceStatus];

/**
 * A register as the API builds it from marks: the course days ∪ the dates with
 * marks (ascending, `courseDay` false for the others), each day's counts and
 * each student's marks and counts.
 */
function register({
  marks = [],
  students = [LEYLA, NIGAR, ANAR],
  firstDate = "2026-11-02",
  lastDate = "2026-11-27",
  daysOfWeek = MWF,
  courseType = "OFFLINE",
  ...over
}: Partial<Omit<AttendanceRegister, "students">> & { marks?: RegisterMark[]; students?: AttendanceStudent[] } = {}): AttendanceRegister {
  const courseDays = courseType === "ONE_TIME" ? [firstDate] : courseDates(firstDate, lastDate, daysOfWeek);
  const dates = [...new Set([...courseDays, ...marks.map(([, date]) => date)])].sort();
  const count = (list: RegisterMark[]) => ({
    present: list.filter((m) => m[2] === "PRESENT").length,
    late: list.filter((m) => m[2] === "LATE").length,
    absent: list.filter((m) => m[2] === "ABSENT").length,
    excused: list.filter((m) => m[2] === "EXCUSED").length,
  });
  return {
    courseId: COURSE_ID,
    courseTitle: "Python basics",
    courseType,
    firstDate,
    lastDate,
    daysOfWeek: courseType === "ONE_TIME" ? [] : daysOfWeek,
    canMark: true,
    canManage: false,
    days: dates.map((date) => ({ date, courseDay: courseDays.includes(date), ...count(marks.filter((m) => m[1] === date)) })),
    students: students.map((st): AttendanceRegisterStudent => {
      const own = marks.filter((m) => m[0].enrollmentId === st.enrollmentId).sort((a, b) => a[1].localeCompare(b[1]));
      return {
        enrollmentId: st.enrollmentId,
        studentId: st.studentId,
        firstName: st.firstName,
        lastName: st.lastName,
        email: st.email,
        avatarUrl: st.avatarUrl,
        marks: own.map(([, date, status], i) => ({
          date,
          recordId: `7${i}000000-0000-4000-8000-${st.enrollmentId.slice(-12)}`,
          status,
          markedAt: `${date}T06:05:00Z`,
          markedByName: "Kamran Məmmədov",
        })),
        ...count(own),
      };
    }),
    ...over,
  };
}

/** Thu 12 Nov, a make-up day (two joined, one absent), and today, Nigar late. */
const MARKS: RegisterMark[] = [
  [LEYLA, "2026-11-12", "PRESENT"],
  [NIGAR, "2026-11-12", "PRESENT"],
  [ANAR, "2026-11-12", "ABSENT"],
  [NIGAR, TODAY, "LATE"],
];
const REGISTER = register({ marks: MARKS });

/* ───────────────────────────── fake API ───────────────────────────── */

type Handler = (config: AxiosRequestConfig) => unknown;
interface Call {
  method: string;
  url: string;
  params?: Record<string, unknown>;
  data?: unknown;
  responseType?: string;
}

let routes: Record<string, Handler> = {};
let calls: Call[] = [];

function serve(table: Record<string, Handler>) {
  routes = table;
}

/** A whole response (a file download), handed on as it is rather than in the `{ data }` envelope. */
const RAW = Symbol("raw response");
function raw(response: Partial<AxiosResponse>) {
  return { [RAW]: response };
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
/** The day under the register: its card, the roster and their notes. */
const daySection = () => screen.getByRole("region", { name: "The day's attendance" });
/** The day card's heading: the day shown, and "Today" when it is. */
const dayHeading = () => within(daySection()).getAllByRole("heading", { level: 2 })[0];
/** The register table. */
const registerTable = () => screen.getByRole("table");
/** A day's column header (its button, for a day that has come), by a part of its name ("12 Nov 2026"). */
const dayColumn = (name: string | RegExp) =>
  within(registerTable()).getByRole("button", { name: typeof name === "string" ? new RegExp(name) : name });
/** A student's row in the register. */
const registerRow = (name: string) =>
  within(registerTable()).getByRole("rowheader", { name: new RegExp(name) }).closest("tr") as HTMLTableRowElement;
/** The register's column headers, in order, as a screen reader names them. */
const columnNames = () =>
  within(registerTable())
    .getAllByRole("columnheader")
    .map((th) => th.getAttribute("aria-label") ?? th.textContent ?? "");
/** The cell of a student's row under a column (its index among the column headers). */
const registerCell = (name: string, column: number) => registerRow(name).cells[column];

const originalTz = process.env.TZ;

beforeEach(() => {
  vi.setSystemTime(NOW);
  calls = [];
  vi.spyOn(httpClient, "request").mockImplementation(async (config: AxiosRequestConfig) => {
    const method = (config.method ?? "GET").toUpperCase();
    const url = config.url ?? "";
    calls.push({ method, url, params: config.params, data: config.data, responseType: config.responseType });
    const handler = routes[`${method} ${url}`];
    if (!handler) throw refusal(404, "NOT_FOUND", `No route for ${method} ${url}`);
    const body = await handler(config);
    if (body && typeof body === "object" && RAW in body) return (body as Record<symbol, AxiosResponse>)[RAW];
    return { data: { data: body } } as AxiosResponse;
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
      [`GET ${REGISTER_URL}`]: () => REGISTER,
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
    // …and the register is reloaded for its cells and counts.
    await waitFor(() => expect(callsTo("GET", REGISTER_URL)).toHaveLength(2));
  });

  it("shows a saved mark read-only: what it is, who saved it and when", async () => {
    // A viewer outside Baku still reads the time on Baku's clock, as the platform does.
    process.env.TZ = "America/New_York";
    serve({
      [`GET /public/courses/${SLUG}`]: () => course("ONE_TIME"),
      [`GET ${VIEW_URL}`]: () => dayView({ firstDate: TODAY, lastDate: TODAY }),
      [`GET ${REGISTER_URL}`]: () =>
        register({ courseType: "ONE_TIME", firstDate: TODAY, lastDate: TODAY, marks: [[NIGAR, TODAY, "LATE"]] }),
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
      [`GET ${REGISTER_URL}`]: () => REGISTER,
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
      [`GET ${REGISTER_URL}`]: () => register(),
      [`POST ${VIEW_URL}`]: () => {
        throw refusal(400, "ENROLLMENT_NOT_IN_COURSE", "Anar is no longer enrolled on this course");
      },
    });
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("list", { name: "Students" });
    await user.click(screen.getByRole("button", { name: "Mark the rest as joined" }));
    expect(within(picker("Leyla Əliyeva")).getByRole("radio", { name: "Joined" })).toBeChecked();
    // The next step takes the focus, as the button just pressed is now disabled.
    expect(screen.getByRole("button", { name: "Save 2 marks" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Save 2 marks" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Anar is no longer enrolled on this course"));
  });

  it("opens a day from its header in the register, asking for that date", async () => {
    const user = userEvent.setup();
    serve({
      [`GET /public/courses/${SLUG}`]: () => course(),
      [`GET ${VIEW_URL}`]: (config) => dayView({ date: (config.params as { date?: string } | undefined)?.date ?? TODAY }),
      [`GET ${REGISTER_URL}`]: () => REGISTER,
    });
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("list", { name: "Students" });
    // Today's column is the one open below, as the page opens on today.
    expect(await screen.findByRole("button", { name: /13 Nov 2026, today, open below/ })).toBeInTheDocument();
    await user.click(dayColumn("12 Nov 2026"));

    await waitFor(() => {
      const views = callsTo("GET", VIEW_URL);
      expect(views[views.length - 1].params).toEqual({ date: "2026-11-12" });
    });
    expect(dayColumn("12 Nov 2026")).toHaveAccessibleName(/open below$/);
    expect(screen.getByLabelText("Day")).toHaveValue("2026-11-12");
    // Focus goes with the reader, to the day now shown.
    expect(dayHeading()).toHaveTextContent(formatDay("2026-11-12"));
    expect(dayHeading()).toHaveFocus();
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
      [`GET ${REGISTER_URL}`]: () => REGISTER,
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
      [`GET ${REGISTER_URL}`]: () => REGISTER,
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
      [`GET ${REGISTER_URL}`]: () => register(),
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
      [`GET ${REGISTER_URL}`]: () => register(),
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
      [`GET ${REGISTER_URL}`]: () => REGISTER,
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

  it("tells the marks on each day's totals apart by icon as well as colour", async () => {
    serve({
      [`GET /public/courses/${SLUG}`]: () => course(),
      [`GET ${VIEW_URL}`]: () => dayView(),
      [`GET ${REGISTER_URL}`]: () => REGISTER,
    });
    renderPage("tutor", [ROLES.TUTOR]);

    const totals = (await screen.findByText("2 joined, 0 late, 1 absent")).closest("td") as HTMLElement;
    const counts = Array.from(
      totals.querySelectorAll("svg"),
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
      [`GET ${REGISTER_URL}`]: () => register({ marks: [...MARKS, [LEYLA, OCT_30, "PRESENT"]], canManage: true }),
    });
    renderPage("admin", [ROLES.SUPER_ADMIN]);

    await screen.findByRole("list", { name: "Students" });
    // Listed first, as a day that is not one of the course's.
    expect(columnNames()[1]).toMatch(/30 Oct 2026, not a course day/);
    await user.click(dayColumn("30 Oct 2026"));

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
      [`GET ${REGISTER_URL}`]: () =>
        register({
          courseType: "ONE_TIME",
          firstDate: TODAY,
          lastDate: TODAY,
          marks: [LEYLA, NIGAR, ANAR].map((st): RegisterMark => [st, "2026-11-06", "PRESENT"]),
        }),
    });
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("list", { name: "Students" });
    await user.click(dayColumn("6 Nov 2026"));
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
      [`GET ${REGISTER_URL}`]: () => register(),
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
      [`GET ${REGISTER_URL}`]: () => register(),
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
      [`GET ${REGISTER_URL}`]: () => register(),
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
      [`GET ${REGISTER_URL}`]: () => REGISTER,
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
      [`GET ${REGISTER_URL}`]: () => REGISTER,
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
      [`GET ${REGISTER_URL}`]: () => REGISTER,
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
      [`GET ${REGISTER_URL}`]: () => REGISTER,
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

describe("CourseAttendancePage — the register", () => {
  /** The register's columns: Student, the 13 days (12 course days and Thu 12 Nov), then the totals. */
  const NOV_12 = 6;
  const NOV_13 = 7;
  const NOV_16 = 8;
  const JOINED = 14;

  function serveRegister(reg: AttendanceRegister = REGISTER, scope: "tutor" | "admin" = "tutor") {
    serve({
      [`GET /public/courses/${SLUG}`]: () => course(),
      [`GET /admin/courses/${COURSE_ID}`]: () => course(),
      [`GET ${VIEW_URL}`]: (config) => dayView({ date: askedDate(config) ?? TODAY, canMark: scope === "tutor" }),
      [`GET ${REGISTER_URL}`]: () => reg,
    });
  }

  it("lists every student against every day: today marked, a make-up day tagged, the days to come quiet", async () => {
    serveRegister();
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("table");
    expect(screen.getByText("3 students · 12 course days, Mon, Wed, Fri")).toBeInTheDocument();
    const columns = columnNames();
    expect(columns).toHaveLength(18);
    expect(columns[0]).toBe("Student");
    expect(columns[1]).toBe("Mon 2 Nov 2026");
    expect(columns[NOV_12]).toBe("Thu 12 Nov 2026, not a course day");
    expect(columns[NOV_13]).toBe("Fri 13 Nov 2026, today, open below");
    expect(columns[NOV_16]).toBe("Mon 16 Nov 2026, still to come");
    expect(columns.slice(JOINED)).toEqual(["Joined", "Late", "Absent", "Attendance"]);
    // Today is the current date; a day still to come has nothing to open.
    expect(dayColumn("13 Nov 2026")).toHaveAttribute("aria-current", "date");
    const headers = within(registerTable()).getAllByRole("columnheader");
    expect(within(headers[NOV_16]).queryByRole("button")).not.toBeInTheDocument();
    expect(within(headers[NOV_13]).getByText("Today")).toBeInTheDocument();
    expect(within(headers[NOV_12]).getByText("Extra")).toBeInTheDocument();

    // One row per student, in the API's order, then the day totals.
    const rows = within(registerTable()).getAllByRole("rowheader");
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveAccessibleName("Leyla Əliyeva leyla@example.az");
    expect(rows[1]).toHaveAccessibleName("Nigar Həsənova nigar@example.az");
    expect(rows[2]).toHaveAccessibleName("Anar Quliyev anar@example.az");
    expect(rows[3]).toHaveAccessibleName("Day totals");
    // No Excused column while no record holds it.
    expect(screen.queryByRole("columnheader", { name: "Excused" })).not.toBeInTheDocument();
  });

  it("shows each mark as a coloured letter with its name, and the unmarked days apart from those to come", async () => {
    serveRegister();
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("table");
    const leylaOn12 = registerCell("Leyla Əliyeva", NOV_12);
    expect(within(leylaOn12).getByText("J")).toHaveClass("bg-ok-tint");
    expect(within(leylaOn12).getByText("Joined")).toHaveClass("sr-only");
    expect(within(registerCell("Anar Quliyev", NOV_12)).getByText("A")).toHaveClass("bg-danger-tint");
    expect(within(registerCell("Anar Quliyev", NOV_12)).getByText("Absent")).toBeInTheDocument();
    expect(within(registerCell("Nigar Həsənova", NOV_13)).getByText("L")).toHaveClass("bg-warn-tint");
    // Who saved it and when, on hover (Baku time).
    expect(within(registerCell("Nigar Həsənova", NOV_13)).getByText("L").parentElement).toHaveAttribute(
      "title",
      expect.stringMatching(/^Late · by Kamran Məmmədov · .*10:05/),
    );
    expect(registerCell("Leyla Əliyeva", NOV_13)).toHaveTextContent("Not marked");
    expect(registerCell("Leyla Əliyeva", NOV_16)).toHaveTextContent("No mark yet");
  });

  it("adds up each student and each day, with the attendance rate", async () => {
    serveRegister();
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("table");
    const totals = (name: string) => Array.from(registerRow(name).cells).slice(JOINED).map((c) => c.textContent);
    expect(totals("Leyla Əliyeva")).toEqual(["1", "0", "0", "100%"]);
    expect(totals("Nigar Həsənova")).toEqual(["1", "1", "0", "100%"]);
    expect(totals("Anar Quliyev")).toEqual(["0", "0", "1", "0%"]);
    // The bottom row: each day's counts, then the course's (3 of 4 marks joined or late).
    const dayTotals = registerRow("Day totals");
    expect(dayTotals.cells[NOV_12]).toHaveTextContent("2 joined, 0 late, 1 absent");
    expect(dayTotals.cells[NOV_13]).toHaveTextContent("0 joined, 1 late, 0 absent");
    expect(dayTotals.cells[1]).toHaveTextContent("Nothing marked");
    expect(dayTotals.cells[NOV_16]).toHaveTextContent("Still to come");
    expect(Array.from(dayTotals.cells).slice(JOINED).map((c) => c.textContent)).toEqual(["2", "1", "1", "75%"]);
  });

  it("adds the Excused column once a record holds it", async () => {
    serveRegister(register({ marks: [...MARKS, [ANAR, TODAY, "EXCUSED"]] }));
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("table");
    expect(columnNames().slice(JOINED)).toEqual(["Joined", "Late", "Absent", "Excused", "Attendance"]);
    expect(within(registerCell("Anar Quliyev", NOV_13)).getByText("E")).toBeInTheDocument();
    expect(Array.from(registerRow("Anar Quliyev").cells).slice(JOINED).map((c) => c.textContent)).toEqual([
      "0",
      "0",
      "1",
      "1",
      "0%",
    ]);
    expect(within(screen.getByRole("list", { name: "Legend" })).getByText("Excused")).toBeInTheDocument();
  });

  it("opens a day from any of its cells, and says when it is not one of the course's days", async () => {
    const user = userEvent.setup();
    serveRegister();
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("table");
    await user.click(registerCell("Anar Quliyev", NOV_12));
    await waitFor(() => expect(lastViewParams()).toEqual({ date: "2026-11-12" }));
    expect(dayHeading()).toHaveTextContent(formatDay("2026-11-12"));
    expect(screen.getByText(/Not one of the course’s days \(Mon, Wed, Fri\)/)).toBeInTheDocument();
    // A make-up day can still be marked.
    expect(await screen.findByRole("radiogroup", { name: "Mark for Leyla Əliyeva" })).toBeInTheDocument();

    // A day still to come opens nothing.
    const asked = callsTo("GET", VIEW_URL).length;
    await user.click(registerCell("Anar Quliyev", NOV_16));
    expect(callsTo("GET", VIEW_URL)).toHaveLength(asked);
  });

  it("lets those who may mark open a day the register does not list", async () => {
    const user = userEvent.setup();
    serveRegister();
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Open another day" }));
    expect(screen.getByLabelText("Day")).toHaveFocus();
  });

  it("offers an admin who only reads no other day to open", async () => {
    serveRegister(REGISTER, "admin");
    renderPage("admin", [ROLES.ADMIN]);

    await screen.findByRole("table");
    expect(screen.queryByRole("button", { name: "Open another day" })).not.toBeInTheDocument();
    // …but the register can be read and exported.
    expect(screen.getByRole("button", { name: "Export to Excel" })).toBeEnabled();
  });

  it("lists only the marked days of a course without course days, and says why", async () => {
    serveRegister(register({ daysOfWeek: [], marks: [[LEYLA, "2026-11-05", "PRESENT"]] }));
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("table");
    expect(screen.getByText("3 students · no course days set, so the days with marks are listed")).toBeInTheDocument();
    // Every day listed is a marked one: none is tagged as "not a course day".
    expect(columnNames()).toEqual(["Student", "Thu 5 Nov 2026", "Joined", "Late", "Absent", "Attendance"]);
  });

  it("says when there is no day to show yet", async () => {
    serveRegister(register({ daysOfWeek: [] }));
    renderPage("tutor", [ROLES.TUTOR]);

    expect(await screen.findByText("No days to show yet.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("is refetched after a super admin changes or deletes a mark", async () => {
    const user = userEvent.setup();
    const recordUrl = `/super/attendance/${NIGAR_RECORD.id}`;
    serve({
      [`GET /admin/courses/${COURSE_ID}`]: () => course(),
      [`GET ${VIEW_URL}`]: () => dayView({ canManage: true }),
      [`GET ${REGISTER_URL}`]: () => REGISTER,
      [`PATCH ${recordUrl}`]: () => ({ ...NIGAR_RECORD, status: "ABSENT" }),
      [`DELETE ${recordUrl}`]: () => "",
    });
    renderPage("admin", [ROLES.SUPER_ADMIN]);

    await screen.findByRole("table");
    expect(callsTo("GET", REGISTER_URL)).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Change Nigar Həsənova's mark" }));
    const dialog = await screen.findByRole("dialog", { name: "Change mark" });
    await user.click(within(dialog).getByRole("radio", { name: "Absent" }));
    await user.click(within(dialog).getByRole("button", { name: "Save mark" }));
    await waitFor(() => expect(callsTo("GET", REGISTER_URL)).toHaveLength(2));

    await user.click(await screen.findByRole("button", { name: "Delete Nigar Həsənova's mark" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Delete this mark?" })).getByRole("button", { name: "Delete mark" }));
    await waitFor(() => expect(callsTo("GET", REGISTER_URL)).toHaveLength(3));
  });
});

describe("CourseAttendancePage — Export to Excel", () => {
  const FILE = "attendance-python-basics-2026-11-13.xlsx";
  const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let saved: Array<{ name: string; href: string }>;

  beforeEach(() => {
    saved = [];
    URL.createObjectURL = vi.fn(() => "blob:http://localhost/register");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      saved.push({ name: this.download, href: this.href });
    });
  });

  afterEach(() => {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  function serveExport(handler: Handler) {
    serve({
      [`GET /public/courses/${SLUG}`]: () => course(),
      [`GET ${VIEW_URL}`]: () => dayView(),
      [`GET ${REGISTER_URL}`]: () => REGISTER,
      [`GET ${EXPORT_URL}`]: handler,
    });
  }

  it("downloads the API's workbook through the signed-in client, under the server's file name", async () => {
    const user = userEvent.setup();
    let release: () => void = () => {};
    const answered = new Promise<void>((resolve) => (release = resolve));
    serveExport(async () => {
      await answered;
      return raw({
        data: new Blob(["PK"], { type: XLSX }),
        headers: { "content-disposition": `attachment; filename="${FILE}"` },
      });
    });
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Export to Excel" }));

    // Busy while the file is made: one export at a time.
    const busy = await screen.findByRole("button", { name: "Exporting…" });
    expect(busy).toBeDisabled();
    expect(callsTo("GET", EXPORT_URL)).toHaveLength(1);
    expect(callsTo("GET", EXPORT_URL)[0].responseType).toBe("blob");

    release();
    await waitFor(() => expect(saved).toEqual([{ name: FILE, href: "blob:http://localhost/register" }]));
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    expect(blob.type).toBe(XLSX);
    expect(toast.success).toHaveBeenCalledWith("Attendance exported");
    expect(await screen.findByRole("button", { name: "Export to Excel" })).toBeEnabled();
  });

  it("names the file itself when the server's name cannot be read", async () => {
    const user = userEvent.setup();
    serveExport(() => raw({ data: new Blob(["PK"], { type: XLSX }), headers: {} }));
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Export to Excel" }));
    await waitFor(() => expect(saved.map((f) => f.name)).toEqual([FILE]));
  });

  it("says the API's message when the export is refused", async () => {
    const user = userEvent.setup();
    serveExport(() => {
      throw refusal(403, "FORBIDDEN", "You are not on this course's roster");
    });
    renderPage("tutor", [ROLES.TUTOR]);

    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Export to Excel" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("You are not on this course's roster"));
    expect(saved).toEqual([]);
    expect(screen.getByRole("button", { name: "Export to Excel" })).toBeEnabled();
  });
});
