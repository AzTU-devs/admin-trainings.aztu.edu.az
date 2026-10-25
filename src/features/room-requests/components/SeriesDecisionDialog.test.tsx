import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { REJECT_NOTE_REQUIRED, SeriesDecisionDialog, type SeriesDecisionKind } from "./SeriesDecisionDialog";
import type { RoomBookingSeriesDto } from "@features/room-requests/types";

const { decide } = vi.hoisted(() => ({ decide: vi.fn() }));
vi.mock("@features/room-requests/api/roomRequestsApi", () => ({
  useDecideRoomBookingSeriesMutation: () => [decide, { isLoading: false }],
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const SERIES: RoomBookingSeriesDto = {
  id: "b0000000-0000-4000-8000-000000000001",
  roomId: "a0000000-0000-4000-8000-000000000301",
  roomName: "Room 301",
  offlineCourseId: null,
  offlineCourseTitle: null,
  tutorId: "c0000000-0000-4000-8000-000000000001",
  tutorName: "Leyla Məmmədova",
  tutorEmail: "leyla@aztu.edu.az",
  startDate: "2099-11-02",
  endDate: "2099-12-31",
  daysOfWeek: ["MONDAY", "WEDNESDAY"],
  startTime: "10:00",
  endTime: "12:00",
  timezone: "Asia/Baku",
  status: "PENDING",
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

function renderDecision(kind: SeriesDecisionKind) {
  const onClose = vi.fn();
  render(<SeriesDecisionDialog decision={{ series: SERIES, kind }} onClose={onClose} />);
  return { onClose, user: userEvent.setup() };
}

beforeEach(() => decide.mockReset());

describe("SeriesDecisionDialog", () => {
  it("approves the whole series with an optional note", async () => {
    decide.mockReturnValue({ unwrap: () => Promise.resolve(SERIES) });
    const { user, onClose } = renderDecision("APPROVED");
    expect(screen.getByText(/Mon, Wed · 10:00–12:00 Baku time · 18 sessions/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Approve all sessions" }));

    await waitFor(() => expect(decide).toHaveBeenCalledWith({ id: SERIES.id, decision: "APPROVED", note: null }));
    expect(onClose).toHaveBeenCalled();
  });

  it("needs a reason to reject", async () => {
    decide.mockReturnValue({ unwrap: () => Promise.resolve(SERIES) });
    const { user } = renderDecision("REJECTED");

    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(screen.getByText(REJECT_NOTE_REQUIRED)).toBeInTheDocument();
    expect(decide).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/Reason for rejection/), " Room is closed for repairs ");
    await user.click(screen.getByRole("button", { name: "Reject" }));
    await waitFor(() =>
      expect(decide).toHaveBeenCalledWith({ id: SERIES.id, decision: "REJECTED", note: "Room is closed for repairs" }),
    );
  });

  it("shows the conflicting dates of a refused approval and stays open", async () => {
    const message = "Already booked on 2099-11-04 and 2099-11-09";
    decide.mockReturnValue({
      unwrap: () => Promise.reject({ status: 409, code: "ROOM_BOOKING_CONFLICT", message, isNormalized: true }),
    });
    const { user, onClose } = renderDecision("APPROVED");

    await user.click(screen.getByRole("button", { name: "Approve all sessions" }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByText(/Nothing was changed/)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
