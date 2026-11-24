import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { RemoveRequestDialog } from "./RemoveRequestDialog";
import {
  describeBooking,
  describeOccurrence,
  describeSeries,
  type RemovalTarget,
} from "@features/room-requests/lib/removal";
import type { RoomBookingDto, RoomBookingSeriesDto } from "@features/room-requests/types";

const { removeBooking, removeSeries } = vi.hoisted(() => ({
  removeBooking: vi.fn(),
  removeSeries: vi.fn(),
}));

// The two removal endpoints are mocked at the hook: the dialog is tested
// against the contract (`DELETE /api/super/room-bookings/{id}` and
// `…/series/{id}`, 204, 404 when already gone), with no store.
vi.mock("@features/room-requests/api/roomRequestsApi", () => ({
  useRemoveRoomBookingMutation: () => [removeBooking, { isLoading: false }],
  useRemoveRoomBookingSeriesMutation: () => [removeSeries, { isLoading: false }],
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const resolves = () => ({ unwrap: () => Promise.resolve(undefined) });
const rejects = (error: unknown) => ({ unwrap: () => Promise.reject(error) });

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
  roomId: BOOKING.roomId,
  roomName: "Room 301",
  offlineCourseId: null,
  offlineCourseTitle: null,
  tutorId: BOOKING.tutorId,
  tutorName: "Leyla Məmmədova",
  tutorEmail: "leyla@example.az",
  startDate: "2099-11-02",
  endDate: "2099-12-31",
  daysOfWeek: ["MONDAY", "WEDNESDAY"],
  startTime: "10:00",
  endTime: "12:00",
  timezone: "Asia/Baku",
  status: "APPROVED",
  occurrenceCount: 18,
  upcomingCount: 18,
  totalFee: 360,
  currency: "AZN",
  note: null,
  decisionNote: null,
  decidedAt: null,
  createdAt: "2099-10-01T08:00:00Z",
  occurrences: [],
};

function renderDialog(target: RemovalTarget) {
  const onClose = vi.fn();
  const onRemoved = vi.fn();
  render(<RemoveRequestDialog target={target} onClose={onClose} onRemoved={onRemoved} />);
  return { onClose, onRemoved, user: userEvent.setup(), dialog: screen.getByRole("dialog") };
}

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  removeBooking.mockReset();
  removeSeries.mockReset();
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.info).mockClear();
});

describe("RemoveRequestDialog", () => {
  it("names the request in Baku time, says it cannot be undone and frees the slot, and removes it", async () => {
    removeBooking.mockReturnValue(resolves());
    const target: RemovalTarget = {
      kind: "booking",
      id: BOOKING.id,
      what: describeBooking(BOOKING),
    };
    const { user, dialog, onClose, onRemoved } = renderDialog(target);

    expect(
      within(dialog).getByRole("heading", { name: "Remove this booking request?" }),
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent(
      "Room 301 · Leyla Məmmədova · Mon, Nov 2, 2099, 10:00–12:00 Baku time · pending",
    );
    expect(dialog).toHaveTextContent("This cannot be undone.");
    expect(dialog).toHaveTextContent("its time slot is free to book again");

    await user.click(within(dialog).getByRole("button", { name: "Remove request" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(removeBooking).toHaveBeenCalledWith(BOOKING.id);
    expect(removeSeries).not.toHaveBeenCalled();
    expect(onRemoved).toHaveBeenCalledWith(target);
    expect(toast.success).toHaveBeenCalledWith("Booking request removed");
  });

  it("removes one session of a series alone, by its booking id", async () => {
    removeBooking.mockReturnValue(resolves());
    const occurrence = {
      bookingId: "b0000000-0000-4000-8000-000000000009",
      startsAt: "2099-11-04T06:00:00Z",
      endsAt: "2099-11-04T08:00:00Z",
      status: "APPROVED" as const,
    };
    const { user, dialog, onRemoved } = renderDialog({
      kind: "occurrence",
      id: occurrence.bookingId,
      what: describeOccurrence(SERIES, occurrence),
    });

    expect(
      within(dialog).getByRole("heading", { name: "Remove this session?" }),
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Wed, Nov 4, 2099, 10:00–12:00 Baku time · approved");
    expect(dialog).toHaveTextContent(
      "Only this session of the long-term booking is removed; its other sessions stay.",
    );

    await user.click(within(dialog).getByRole("button", { name: "Remove session" }));
    await waitFor(() => expect(onRemoved).toHaveBeenCalled());
    expect(removeBooking).toHaveBeenCalledWith(occurrence.bookingId);
  });

  it("removes a whole series and says how many sessions go with it", async () => {
    removeSeries.mockReturnValue(resolves());
    const { user, dialog, onRemoved } = renderDialog({
      kind: "series",
      id: SERIES.id,
      what: describeSeries(SERIES),
      sessions: SERIES.occurrenceCount,
    });

    expect(
      within(dialog).getByRole("heading", { name: "Remove this long-term booking?" }),
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent(
      "Nov 2 – Dec 31, 2099 · Mon, Wed · 10:00–12:00 Baku time · 18 sessions · approved",
    );
    expect(dialog).toHaveTextContent(
      "The long-term booking and all 18 of its sessions are removed. This cannot be undone.",
    );
    expect(dialog).toHaveTextContent("their time slots are free to book again");

    await user.click(within(dialog).getByRole("button", { name: "Remove whole series" }));
    await waitFor(() => expect(onRemoved).toHaveBeenCalled());
    expect(removeSeries).toHaveBeenCalledWith(SERIES.id);
    expect(removeBooking).not.toHaveBeenCalled();
  });

  it("keeps the dialog open with the API's message when the removal is refused", async () => {
    removeBooking.mockReturnValue(
      rejects({
        status: 403,
        code: "FORBIDDEN",
        message: "Only a super admin can remove room requests",
        isNormalized: true,
      }),
    );
    const { user, dialog, onClose, onRemoved } = renderDialog({
      kind: "booking",
      id: BOOKING.id,
      what: "Room 301",
    });

    await user.click(within(dialog).getByRole("button", { name: "Remove request" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Only a super admin can remove room requests",
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(onRemoved).not.toHaveBeenCalled();
    // It can be tried again.
    expect(within(dialog).getByRole("button", { name: "Remove request" })).toBeEnabled();
  });

  it("closes as removed when the request is gone already (404)", async () => {
    removeSeries.mockReturnValue(
      rejects({
        status: 404,
        code: "ROOM_BOOKING_SERIES_NOT_FOUND",
        message: "Series not found",
        isNormalized: true,
      }),
    );
    const { user, dialog, onClose, onRemoved } = renderDialog({
      kind: "series",
      id: SERIES.id,
      what: "Room 301",
    });

    await user.click(within(dialog).getByRole("button", { name: "Remove whole series" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onRemoved).toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith("It had already been removed");
  });

  it("cancels without removing anything", async () => {
    const { user, dialog, onClose } = renderDialog({
      kind: "booking",
      id: BOOKING.id,
      what: "Room 301",
    });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(removeBooking).not.toHaveBeenCalled();
  });
});
