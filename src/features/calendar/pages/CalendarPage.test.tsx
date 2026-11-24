import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import CalendarPage from "./CalendarPage";
import { useGetAdminCalendarQuery } from "@features/calendar/api/calendarApi";
import type { CalendarEventDto, CalendarResponse } from "@features/calendar/types";

// The calendar endpoint is mocked at the hook; FullCalendar itself is real.
vi.mock("@features/calendar/api/calendarApi", () => ({ useGetAdminCalendarQuery: vi.fn() }));
vi.mock("@features/courses/api/coursesApi", () => ({
  useGetAdminCourseByIdQuery: () => ({
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock("@features/participants/api/participantsApi", () => ({
  useListCourseParticipantsQuery: () => ({ data: undefined, isLoading: true, isError: false }),
}));
vi.mock("@features/auth/hooks/usePermissions", () => ({
  usePermissions: () => ({ isSuperAdmin: true }),
}));
const { removeBooking } = vi.hoisted(() => ({ removeBooking: vi.fn() }));
vi.mock("@features/room-requests/api/roomRequestsApi", () => ({
  useRemoveRoomBookingMutation: () => [removeBooking, { isLoading: false }],
  useRemoveRoomBookingSeriesMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const COURSE_ID = "11111111-2222-4333-8444-555555555555";
const bootcamp: CalendarEventDto = {
  id: `one-time:${COURSE_ID}`,
  kind: "ONE_TIME",
  title: "Python bootcamp",
  start: "2026-11-02T06:00:00Z", // 10:00 in Baku
  end: "2026-11-02T08:00:00Z",
  allDay: false,
  courseId: COURSE_ID,
  courseType: "ONE_TIME",
  courseStatus: "PUBLISHED",
  roomName: "Room 301",
  tutorNames: ["Leyla Məmmədova"],
  seatLimit: 30,
  enrolledCount: 12,
};

/** A pending room booking that belongs to no course, Tue 3 Nov 14:00–16:00 in Baku. */
const pendingBooking: CalendarEventDto = {
  id: "booking:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
  kind: "ROOM_BOOKING",
  title: "Room 301 · Leyla H.",
  start: "2026-11-03T10:00:00Z",
  end: "2026-11-03T12:00:00Z",
  allDay: false,
  courseId: null,
  roomName: "Room 301",
  tutorNames: ["Leyla Həsənova"],
  bookingStatus: "PENDING",
};

function mockCalendar(data: CalendarResponse | undefined, extra: Record<string, unknown> = {}) {
  vi.mocked(useGetAdminCalendarQuery).mockReturnValue({
    currentData: data,
    data,
    isFetching: false,
    isError: false,
    error: undefined,
    refetch: vi.fn(),
    ...extra,
  } as unknown as ReturnType<typeof useGetAdminCalendarQuery>);
}

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

function renderPage() {
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/super/calendar"]}>
        <Routes>
          <Route path="/super/calendar" element={<CalendarPage />} />
          <Route path="/admin/courses/new" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

const lastArgs = () => vi.mocked(useGetAdminCalendarQuery).mock.lastCall;

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  // Only the clock is faked: "today" is 10 Nov 2026, FullCalendar's timers run normally.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-10T08:00:00Z"));
  vi.mocked(useGetAdminCalendarQuery).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CalendarPage", () => {
  it("fetches the visible month, Monday-first, and shows events in Baku time", async () => {
    mockCalendar({ timezone: "Asia/Baku", events: [bootcamp], truncated: false });
    renderPage();

    await waitFor(() => expect(lastArgs()?.[0]).toEqual({ from: "2026-10-26", to: "2026-12-07" }));
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("November 2026");
    expect(screen.getByText("Python bootcamp")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();
    expect(screen.getByText(/Times in Asia\/Baku/)).toHaveTextContent("Times in Asia/Baku (GMT+4)");
    expect(screen.getByRole("list", { name: "Legend" })).toHaveTextContent("One-time training");
  });

  it("refetches for the new range on navigation and view changes", async () => {
    mockCalendar({ timezone: "Asia/Baku", events: [], truncated: false });
    renderPage();
    await waitFor(() => expect(lastArgs()?.[0]).toEqual({ from: "2026-10-26", to: "2026-12-07" }));

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(lastArgs()?.[0]).toEqual({ from: "2026-11-30", to: "2027-01-11" }));

    await userEvent.click(screen.getByRole("button", { name: "Today" }));
    await userEvent.click(screen.getByRole("button", { name: "Week" }));
    await waitFor(() => expect(lastArgs()?.[0]).toEqual({ from: "2026-11-09", to: "2026-11-16" }));
    expect(screen.getByRole("button", { name: "Week" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: "Day" }));
    await waitFor(() => expect(lastArgs()?.[0]).toEqual({ from: "2026-11-10", to: "2026-11-11" }));
  });

  it("opens an event's details on click", async () => {
    mockCalendar({ timezone: "Asia/Baku", events: [bootcamp], truncated: false });
    renderPage();
    await userEvent.click(await screen.findByText("Python bootcamp"));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Mon, 2 Nov 2026 · 10:00–12:00")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Open course" })).toHaveAttribute(
      "href",
      `/admin/courses/${COURSE_ID}`,
    );
  });

  it("says when the period is empty, capped, or failed", async () => {
    mockCalendar({ timezone: "Asia/Baku", events: [], truncated: false });
    renderPage();
    expect(
      await screen.findByText("Nothing is scheduled between 26 Oct 2026 and 6 Dec 2026."),
    ).toBeInTheDocument();

    vi.mocked(useGetAdminCalendarQuery).mockReset();
    mockCalendar({ timezone: "Asia/Baku", events: [bootcamp], truncated: true });
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText(/more entries than the calendar can show/)).toBeInTheDocument();

    const refetch = vi.fn();
    vi.mocked(useGetAdminCalendarQuery).mockReset();
    mockCalendar(undefined, {
      isError: true,
      error: { status: 500, message: "Server error", isNormalized: true },
      refetch,
    });
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Server error");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("draws a pending booking as tentative, and says so in its text", async () => {
    mockCalendar({ timezone: "Asia/Baku", events: [pendingBooking], truncated: false });
    renderPage();

    const entry = (await screen.findByText("Room 301 · Leyla H. (pending)")).closest<HTMLElement>(
      '[role="button"]',
    );
    expect(entry).toHaveClass("cal-ev--pending");
    expect(screen.getByRole("list", { name: "Legend" })).toHaveTextContent("Pending booking");
  });

  it("removes a booking from its details, then puts focus on the period's title", async () => {
    removeBooking.mockReturnValue({ unwrap: () => Promise.resolve(undefined) });
    mockCalendar({ timezone: "Asia/Baku", events: [pendingBooking], truncated: false });
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByText("Room 301 · Leyla H. (pending)"));
    const details = await screen.findByRole("dialog", { name: "Room 301 · Leyla H." });
    await user.click(within(details).getByRole("button", { name: "Remove request" }));
    const confirm = await screen.findByRole("dialog", { name: "Remove this booking request?" });
    await user.click(within(confirm).getByRole("button", { name: "Remove request" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(removeBooking).toHaveBeenCalledWith("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");
    // The entry leaves the grid as the range reloads (cache tags), so focus
    // does not go back to it.
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 2, name: "November 2026" })).toHaveFocus(),
    );
  });

  it("starts a new one-time training", async () => {
    mockCalendar({ timezone: "Asia/Baku", events: [], truncated: false });
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "New one-time training" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/admin/courses/new?type=ONE_TIME");
  });
});

/*
 * The grid runs in Asia/Baku whatever the browser's zone: FullCalendar 7
 * places named zones itself (through Temporal), so the API's instants land at
 * Baku wall time, "today" is Baku's today, and the range asked for is the
 * same local days everywhere. Each case moves the process's own zone, as a
 * browser elsewhere would have it.
 */
describe("CalendarPage in another browser zone", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    // Assigning undefined would set the zone to the string "undefined".
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  const morning: CalendarEventDto = { ...bootcamp, id: "one-time:a", title: "Morning" }; // 10:00–12:00 Mon 2 Nov
  const lateNight: CalendarEventDto = {
    ...pendingBooking,
    id: "booking:b",
    title: "Late",
    bookingStatus: "APPROVED",
    start: "2026-11-02T19:30:00Z", // 23:30 Mon 2 Nov in Baku …
    end: "2026-11-02T21:00:00Z", //   … to 01:00 Tue 3 Nov
  };
  const span: CalendarEventDto = {
    ...bootcamp,
    id: "course:c",
    kind: "COURSE",
    title: "Span",
    allDay: true,
    start: "2026-11-01T20:00:00Z", // Baku midnight starting Mon 2 Nov
    end: "2026-11-04T20:00:00Z", //   Baku midnight after Wed 4 Nov
  };

  /** The day columns an entry is drawn in. */
  const daysOf = (title: string) =>
    screen.getAllByText(title).map((el) => el.closest("[data-date]")?.getAttribute("data-date"));

  it.each(["UTC", "America/New_York", "Pacific/Kiritimati"])(
    "shows Baku times and asks for Baku's days with the browser in %s",
    async (zone) => {
      process.env.TZ = zone;
      // The zone really moved: 06:00Z is not 10:00 on this clock.
      expect(new Date("2026-11-02T06:00:00Z").getHours()).not.toBe(10);
      // 01:00 on Tue 10 Nov in Baku; still Mon 9 Nov in New York and in UTC.
      vi.setSystemTime(new Date("2026-11-09T21:00:00Z"));
      mockCalendar({ timezone: "Asia/Baku", events: [morning, lateNight, span], truncated: false });
      renderPage();
      const user = userEvent.setup();

      await waitFor(() =>
        expect(lastArgs()?.[0]).toEqual({ from: "2026-10-26", to: "2026-12-07" }),
      );
      expect(daysOf("Morning")).toEqual(["2026-11-02"]);
      expect(daysOf("Late")).toEqual(["2026-11-02"]);
      expect(screen.getByText("Span")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Day" }));
      await waitFor(() =>
        expect(lastArgs()?.[0]).toEqual({ from: "2026-11-10", to: "2026-11-11" }),
      );
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("10 November 2026");

      await user.click(screen.getByRole("button", { name: "Week" }));
      await waitFor(() =>
        expect(lastArgs()?.[0]).toEqual({ from: "2026-11-09", to: "2026-11-16" }),
      );
      await user.click(screen.getByRole("button", { name: "Previous" }));
      await waitFor(() =>
        expect(lastArgs()?.[0]).toEqual({ from: "2026-11-02", to: "2026-11-09" }),
      );

      // 10:00–12:00 on Monday, as stored.
      expect(daysOf("Morning")).toEqual(["2026-11-02"]);
      expect(screen.getByText("Morning").parentElement).toHaveTextContent("10:00–12:00");
      // Past midnight: the evening on Monday, the rest on Tuesday, once each.
      expect(daysOf("Late")).toEqual(["2026-11-02", "2026-11-03"]);
      // The all-day course starts on Monday, in the all-day row.
      expect(daysOf("Span")[0]).toBe("2026-11-02");

      await user.click(screen.getByRole("button", { name: "List" }));
      await waitFor(() =>
        expect(lastArgs()?.[0]).toEqual({ from: "2026-11-01", to: "2026-12-01" }),
      );
    },
  );
});
