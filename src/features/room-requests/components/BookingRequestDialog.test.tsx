import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { BookingRequestDialog } from "./BookingRequestDialog";
import { SERIES_MESSAGES } from "@features/room-requests/schemas/roomBookingSeries.schema";
import type { RoomDto } from "@features/rooms/types";

const { createSeries, createBooking } = vi.hoisted(() => ({ createSeries: vi.fn(), createBooking: vi.fn() }));

// The endpoints are mocked at the hook: the form is tested against the
// contract's request body, with no store and no network.
vi.mock("@features/room-requests/api/roomRequestsApi", () => ({
  useCreateRoomBookingMutation: () => [createBooking],
  useCreateRoomBookingSeriesMutation: () => [createSeries],
}));
vi.mock("@features/rooms/api/roomsApi", () => ({
  useListPortalRoomsQuery: () => ({ data: undefined, isLoading: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const ROOM: RoomDto = {
  id: "a0000000-0000-4000-8000-000000000301",
  name: "Room 301",
  roomNumber: "301",
  capacity: 30,
  status: "AVAILABLE",
  hourlyRate: 10,
  currency: "AZN",
  imageMediaIds: [],
};

/** The mutation trigger's shape: a call that returns `{ unwrap }`. */
const resolves = (value: unknown) => ({ unwrap: () => Promise.resolve(value) });
const rejects = (error: unknown) => ({ unwrap: () => Promise.reject(error) });

beforeAll(() => {
  // Radix measures itself; jsdom has no layout.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
});

beforeEach(() => {
  createSeries.mockReset();
  createBooking.mockReset();
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
});

async function openLongTerm() {
  const onOpenChange = vi.fn();
  const user = userEvent.setup();
  render(<BookingRequestDialog open onOpenChange={onOpenChange} room={ROOM} />);
  await user.click(screen.getByRole("tab", { name: /Long-term \(repeating\)/ }));
  return { user, onOpenChange };
}

/** Date and time inputs: set the value the way the browser's picker does. */
function set(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

async function fillPattern(
  user: ReturnType<typeof userEvent.setup>,
  { start = "2099-11-02", end = "2099-12-31", days = ["Monday", "Wednesday"], from = "10:00", to = "12:00" } = {},
) {
  set(/^Start date/, start);
  set(/^End date/, end);
  for (const day of days) await user.click(screen.getByRole("button", { name: day }));
  set(/^Start time/, from);
  set(/^End time/, to);
}

describe("BookingRequestDialog — long-term booking", () => {
  it("offers single and long-term as one choice, single first", async () => {
    render(<BookingRequestDialog open onOpenChange={vi.fn()} room={ROOM} />);
    expect(screen.getByRole("tab", { name: /Single booking/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Long-term \(repeating\)/ })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByLabelText(/^Starts at/)).toBeInTheDocument();
  });

  it("previews the sessions the pattern makes, and folds the dates after ten", async () => {
    const { user } = await openLongTerm();
    // Monday first, as the Azerbaijani week starts.
    const days = within(screen.getByRole("group", { name: "Weekdays" })).getAllByRole("button");
    expect(days.map((b) => b.textContent)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(screen.getByLabelText(/^Start time \(Baku time\)/)).toBeInTheDocument();

    await fillPattern(user);
    expect(screen.getByRole("button", { name: "Monday" })).toHaveAttribute("aria-pressed", "true");

    const preview = screen.getByRole("region", { name: "Sessions preview" });
    expect(preview).toHaveTextContent("18 sessions");
    expect(preview).toHaveTextContent("36 h");
    expect(preview).toHaveTextContent("Baku time");
    // 18 sessions × 2 h at 10 AZN/h.
    expect(preview).toHaveTextContent("360 AZN");
    const list = within(preview).getByRole("list", { name: "Session dates" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(10);
    await user.click(within(preview).getByRole("button", { name: "Show all 18 dates" }));
    expect(within(list).getAllByRole("listitem")).toHaveLength(18);
    expect(screen.getByRole("button", { name: "Request 18 sessions" })).toBeInTheDocument();
  });

  it("sends the contract's body and closes", async () => {
    createSeries.mockReturnValue(resolves({ id: "s1", occurrenceCount: 18 }));
    const { user, onOpenChange } = await openLongTerm();
    // Picked out of order: the request still lists them Monday first.
    await fillPattern(user, { days: ["Wednesday", "Monday"] });
    await user.type(screen.getByLabelText(/^Note for the reviewer/), "  Python course, group B ");

    await user.click(screen.getByRole("button", { name: "Request 18 sessions" }));

    await waitFor(() => expect(createSeries).toHaveBeenCalledTimes(1));
    expect(createSeries).toHaveBeenCalledWith({
      roomId: ROOM.id,
      offlineCourseId: null,
      startDate: "2099-11-02",
      endDate: "2099-12-31",
      daysOfWeek: ["MONDAY", "WEDNESDAY"],
      startTime: "10:00",
      endTime: "12:00",
      note: "Python course, group B",
    });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("18 sessions"));
  });

  it("explains what is wrong before sending anything", async () => {
    const { user } = await openLongTerm();
    await user.click(screen.getByRole("button", { name: "Request" }));
    expect(await screen.findByText(SERIES_MESSAGES.startDateRequired)).toBeInTheDocument();
    expect(screen.getByText(SERIES_MESSAGES.daysRequired)).toBeInTheDocument();
    expect(screen.getByText(SERIES_MESSAGES.startTimeRequired)).toBeInTheDocument();

    await fillPattern(user, { start: "2099-12-31", end: "2099-11-02", from: "12:00", to: "10:00" });
    await user.click(screen.getByRole("button", { name: "Request" }));
    expect(await screen.findByText(SERIES_MESSAGES.endBeforeStart)).toBeInTheDocument();
    expect(screen.getByText(SERIES_MESSAGES.endTimeNotAfter)).toBeInTheDocument();
    expect(createSeries).not.toHaveBeenCalled();
  });

  it("warns past 200 sessions and refuses to send them", async () => {
    const { user } = await openLongTerm();
    await fillPattern(user, {
      start: "2099-01-05",
      end: "2099-12-31",
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    });
    expect(screen.getByText("361 sessions is over the limit of 200")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Request" }));
    expect(await screen.findByText(SERIES_MESSAGES.tooMany(361))).toBeInTheDocument();
    expect(createSeries).not.toHaveBeenCalled();
  });

  it("keeps a 409 conflict's dates on screen and stays open", async () => {
    const message = "Room 301 is already booked on 2099-11-04, 2099-11-09 and 2 more";
    createSeries.mockReturnValue(rejects({ status: 409, code: "ROOM_BOOKING_CONFLICT", message, isNormalized: true }));
    const { user, onOpenChange } = await openLongTerm();
    await fillPattern(user);

    await user.click(screen.getByRole("button", { name: "Request 18 sessions" }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByText("Some sessions clash with approved bookings", { selector: "p" })).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("Some sessions clash with approved bookings");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("puts the API's 400 codes on the field that fixes them", async () => {
    createSeries.mockReturnValue(
      rejects({ status: 400, code: "PAST_START", message: "First occurrence must be in the future", isNormalized: true }),
    );
    const { user } = await openLongTerm();
    await fillPattern(user);

    await user.click(screen.getByRole("button", { name: "Request 18 sessions" }));

    const message = "The first session must be in the future; pick a later start date or time";
    // Under the start date, where it is fixed.
    const field = (await screen.findByText(message)).closest("div");
    expect(within(field!).getByLabelText(/^Start date/)).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith(message);
  });
});
