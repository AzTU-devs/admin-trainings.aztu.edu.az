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

  it("starts a new one-time training", async () => {
    mockCalendar({ timezone: "Asia/Baku", events: [], truncated: false });
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "New one-time training" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/admin/courses/new?type=ONE_TIME");
  });
});
