import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router";
import AdminRoomRequestsPage from "./AdminRoomRequestsPage";
import type { RoomBookingDto, RoomBookingSeriesDto } from "@features/room-requests/types";

const { removeBooking, removeSeries, perms } = vi.hoisted(() => ({
  removeBooking: vi.fn(),
  removeSeries: vi.fn(),
  perms: { isSuperAdmin: true },
}));

const BOOKING: RoomBookingDto = {
  id: "b0000000-0000-4000-8000-000000000001",
  roomId: "a0000000-0000-4000-8000-000000000301",
  roomName: "Room 301",
  tutorId: "c0000000-0000-4000-8000-000000000001",
  tutorName: "Leyla Məmmədova",
  startsAt: "2099-11-02T06:00:00Z", // 10:00 in Baku
  endsAt: "2099-11-02T08:00:00Z",
  status: "PENDING",
  totalFee: 20,
  currency: "AZN",
  createdAt: "2099-10-01T08:00:00Z",
  seriesId: null,
};

const SERIES: RoomBookingSeriesDto = {
  id: "5e000000-0000-4000-8000-000000000001",
  roomId: "a0000000-0000-4000-8000-000000000302",
  roomName: "Room 302",
  offlineCourseId: null,
  offlineCourseTitle: null,
  tutorId: BOOKING.tutorId,
  tutorName: "Anar Əliyev",
  tutorEmail: "anar@example.az",
  startDate: "2099-11-02",
  endDate: "2099-11-11",
  daysOfWeek: ["MONDAY", "WEDNESDAY"],
  startTime: "14:00",
  endTime: "16:00",
  timezone: "Asia/Baku",
  status: "PENDING",
  occurrenceCount: 4,
  upcomingCount: 4,
  totalFee: 80,
  currency: "AZN",
  note: null,
  decisionNote: null,
  decidedAt: null,
  createdAt: "2099-10-01T08:00:00Z",
  occurrences: [],
};

const OCCURRENCES = ["02", "04", "09", "11"].map((d, i) => ({
  bookingId: `b0000000-0000-4000-8000-00000000010${i}`,
  startsAt: `2099-11-${d}T10:00:00Z`,
  endsAt: `2099-11-${d}T12:00:00Z`,
  status: "PENDING" as const,
}));

const page = <T,>(content: T[]) => ({
  content,
  page: 0,
  size: 10,
  totalElements: content.length,
  totalPages: 1,
});

// Every endpoint is mocked at the hook: the page is tested against the
// contract's JSON, with no store. The removals' cache tags (lists and the
// calendar refetch) are tested in calendarApi.test.ts against a real store.
vi.mock("@features/room-requests/api/roomRequestsApi", () => ({
  useListAdminRoomBookingsQuery: () => ({ data: page([BOOKING]), isFetching: false }),
  useListAdminRoomBookingSeriesQuery: () => ({ data: page([SERIES]), isFetching: false }),
  useGetRoomBookingSeriesQuery: (id: unknown) =>
    typeof id === "string"
      ? { data: { ...SERIES, occurrences: OCCURRENCES }, isFetching: false, isError: false }
      : { data: undefined, isFetching: false, isError: false },
  useDecideRoomBookingMutation: () => [vi.fn(), { isLoading: false }],
  useDecideRoomBookingSeriesMutation: () => [vi.fn(), { isLoading: false }],
  useRemoveRoomBookingMutation: () => [removeBooking, { isLoading: false }],
  useRemoveRoomBookingSeriesMutation: () => [removeSeries, { isLoading: false }],
}));
vi.mock("@features/auth/hooks/usePermissions", () => ({ usePermissions: () => perms }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const resolves = () => ({ unwrap: () => Promise.resolve(undefined) });

function renderPage() {
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/admin/room-requests"]}>
        <AdminRoomRequestsPage />
      </MemoryRouter>
    </HelmetProvider>,
  );
  return userEvent.setup();
}

const section = (name: RegExp) => screen.getByRole("region", { name });
const dialogNamed = (name: string | RegExp) => screen.findByRole("dialog", { name });

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  perms.isSuperAdmin = true;
  removeBooking.mockReset().mockReturnValue(resolves());
  removeSeries.mockReset().mockReturnValue(resolves());
});

describe("AdminRoomRequestsPage — removing requests", () => {
  it("lets the super admin remove a single request, after a confirm that names it", async () => {
    const user = renderPage();
    const singles = section(/Single bookings/);

    await user.click(within(singles).getByRole("button", { name: "Remove" }));
    const confirm = await dialogNamed("Remove this booking request?");
    expect(confirm).toHaveTextContent(
      "Room 301 · Leyla Məmmədova · Mon, Nov 2, 2099, 10:00–12:00 Baku time · pending",
    );
    expect(confirm).toHaveTextContent("This cannot be undone.");

    await user.click(within(confirm).getByRole("button", { name: "Remove request" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(removeBooking).toHaveBeenCalledWith(BOOKING.id);
    // The pressed button goes with its row: focus is on the list's status tab.
    await waitFor(() => expect(screen.getByRole("tab", { name: "Pending" })).toHaveFocus());
  });

  it("keeps focus on Remove when the confirm is cancelled", async () => {
    const user = renderPage();
    const remove = within(section(/Single bookings/)).getByRole("button", { name: "Remove" });
    await user.click(remove);
    await user.click(
      within(await dialogNamed("Remove this booking request?")).getByRole("button", {
        name: "Cancel",
      }),
    );
    await waitFor(() => expect(remove).toHaveFocus());
    expect(removeBooking).not.toHaveBeenCalled();
  });

  it("lets the super admin remove a whole long-term booking from its row, without opening it", async () => {
    const user = renderPage();

    await user.click(within(section(/Long-term requests/)).getByRole("button", { name: "Remove" }));
    const confirm = await dialogNamed("Remove this long-term booking?");
    expect(
      screen.queryByRole("dialog", { name: /Long-term booking · Room 302/ }),
    ).not.toBeInTheDocument();
    expect(confirm).toHaveTextContent(
      "Room 302 · Anar Əliyev · Nov 2 – Nov 11, 2099 · Mon, Wed · 14:00–16:00 Baku time · 4 sessions · pending",
    );
    expect(confirm).toHaveTextContent("all 4 of its sessions are removed");

    await user.click(within(confirm).getByRole("button", { name: "Remove whole series" }));
    await waitFor(() => expect(removeSeries).toHaveBeenCalledWith(SERIES.id));
    await waitFor(() => expect(screen.getByRole("tab", { name: "Pending" })).toHaveFocus());
  });

  it("removes one session from the series details, which stay open", async () => {
    const user = renderPage();
    await user.click(
      within(section(/Long-term requests/)).getByRole("button", { name: "Details" }),
    );
    const details = await dialogNamed(/Long-term booking · Room 302/);

    const sessions = within(details).getByRole("list", { name: "Sessions" });
    expect(within(sessions).getAllByRole("button", { name: /^Remove session on / })).toHaveLength(
      4,
    );
    await user.click(
      within(sessions).getByRole("button", { name: "Remove session on Wed, Nov 4, 2099" }),
    );

    const confirm = await dialogNamed("Remove this session?");
    expect(confirm).toHaveTextContent(
      "Room 302 · Anar Əliyev · Wed, Nov 4, 2099, 14:00–16:00 Baku time · pending",
    );
    await user.click(within(confirm).getByRole("button", { name: "Remove session" }));

    await waitFor(() => expect(removeBooking).toHaveBeenCalledWith(OCCURRENCES[1].bookingId));
    expect(screen.queryByRole("dialog", { name: "Remove this session?" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: /Long-term booking · Room 302/ }),
    ).toBeInTheDocument();
    // The session's own button goes with it once the list reloads.
    await waitFor(() => expect(screen.getByRole("list", { name: "Sessions" })).toHaveFocus());
  });

  it("removes the whole series from its details and closes them", async () => {
    const user = renderPage();
    await user.click(
      within(section(/Long-term requests/)).getByRole("button", { name: "Details" }),
    );
    const details = await dialogNamed(/Long-term booking · Room 302/);

    await user.click(within(details).getByRole("button", { name: "Remove whole series" }));
    const confirm = await dialogNamed("Remove this long-term booking?");
    await user.click(within(confirm).getByRole("button", { name: "Remove whole series" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(removeSeries).toHaveBeenCalledWith(SERIES.id);
    await waitFor(() => expect(screen.getByRole("tab", { name: "Pending" })).toHaveFocus());
  });

  it("shows no Remove to an admin who is not the super admin", async () => {
    perms.isSuperAdmin = false;
    const user = renderPage();

    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
    // The decisions are still there.
    expect(
      within(section(/Single bookings/)).getByRole("button", { name: "Approve" }),
    ).toBeInTheDocument();

    await user.click(
      within(section(/Long-term requests/)).getByRole("button", { name: "Details" }),
    );
    const details = await dialogNamed(/Long-term booking · Room 302/);
    expect(within(details).queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument();
    expect(
      within(details).getByRole("button", { name: "Approve all sessions" }),
    ).toBeInTheDocument();
  });
});
