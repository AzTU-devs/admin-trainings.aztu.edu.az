import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { CalendarEventDialog, PARTICIPANT_PREVIEW } from "./CalendarEventDialog";
import { useGetAdminCourseByIdQuery } from "@features/courses/api/coursesApi";
import { useListCourseParticipantsQuery } from "@features/participants/api/participantsApi";
import type { CourseDto } from "@features/courses/types";
import type { CalendarEventDto } from "@features/calendar/types";

// The two existing admin endpoints the dialog reads are mocked at the hook,
// so the dialog is tested against their JSON shapes with no store or network.
vi.mock("@features/courses/api/coursesApi", () => ({ useGetAdminCourseByIdQuery: vi.fn() }));
vi.mock("@features/participants/api/participantsApi", () => ({
  useListCourseParticipantsQuery: vi.fn(),
}));
// The profile link and the removals are the super admin's; the calendar is
// only theirs anyway, but the dialog checks for the removals itself.
const { perms, removeBooking, removeSeries } = vi.hoisted(() => ({
  perms: { isSuperAdmin: true },
  removeBooking: vi.fn(),
  removeSeries: vi.fn(),
}));
vi.mock("@features/auth/hooks/usePermissions", () => ({ usePermissions: () => perms }));
vi.mock("@features/room-requests/api/roomRequestsApi", () => ({
  useRemoveRoomBookingMutation: () => [removeBooking, { isLoading: false }],
  useRemoveRoomBookingSeriesMutation: () => [removeSeries, { isLoading: false }],
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const COURSE_ID = "11111111-2222-4333-8444-555555555555";

const oneTimeEvent: CalendarEventDto = {
  id: `one-time:${COURSE_ID}`,
  kind: "ONE_TIME",
  title: "Python bootcamp",
  start: "2026-11-02T06:00:00Z",
  end: "2026-11-02T08:00:00Z",
  allDay: false,
  courseId: COURSE_ID,
  courseSlug: "python-bootcamp",
  courseType: "ONE_TIME",
  courseStatus: "PUBLISHED",
  roomName: "Room 301",
  city: "Baku",
  addressLine: "H. Javid ave. 25",
  tutorNames: ["Leyla Məmmədova", "Anar Əliyev"],
  seatLimit: 30,
  enrolledCount: 12,
  bookingStatus: null,
};

const bookingEvent: CalendarEventDto = {
  id: "booking:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
  kind: "ROOM_BOOKING",
  title: "Room 301 · Leyla H.",
  start: "2026-11-03T10:00:00Z",
  end: "2026-11-03T12:00:00Z",
  allDay: false,
  courseId: null,
  courseSlug: null,
  courseType: null,
  courseStatus: null,
  roomName: "Room 301",
  city: null,
  addressLine: null,
  tutorNames: ["Leyla Həsənova"],
  seatLimit: null,
  enrolledCount: null,
  bookingStatus: "PENDING",
};

const course = {
  id: COURSE_ID,
  slug: "python-bootcamp",
  title: "Python bootcamp",
  subtitle: "A day of Python for beginners",
  description: "<p>Write your <strong>first program</strong>.</p>",
  courseType: "ONE_TIME",
  level: "BEGINNER",
  language: "az",
  free: false,
  price: 50,
  currency: "AZN",
  status: "PUBLISHED",
  ratingCount: 0,
  enrolledCount: 12,
  tutorId: "t1",
  tutors: [],
  categoryIds: [],
  tagIds: [],
  syllabusItems: [
    { title: "Variables", description: null },
    { title: "Loops", description: "<p>for and while</p>" },
  ],
  offlineDetails: {
    startDate: "2026-11-02",
    endDate: "2026-11-02",
    startTime: "10:00:00",
    endTime: "12:00:00",
    studentLimit: 30,
  },
  modules: [],
} as unknown as CourseDto;

function mockCourse(result: Record<string, unknown>) {
  vi.mocked(useGetAdminCourseByIdQuery).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...result,
  } as unknown as ReturnType<typeof useGetAdminCourseByIdQuery>);
}

function mockParticipants(result: Record<string, unknown>) {
  vi.mocked(useListCourseParticipantsQuery).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...result,
  } as unknown as ReturnType<typeof useListCourseParticipantsQuery>);
}

const participants = {
  content: [
    {
      userId: "u1",
      fullName: "Nigar Quliyeva",
      email: "nigar@example.az",
      status: "ACTIVE",
      source: "ADMIN_GRANT",
      enrolledAt: "2026-10-20T10:00:00Z",
    },
    {
      userId: "u2",
      fullName: "Rauf Hüseynov",
      email: "rauf@example.az",
      status: "ACTIVE",
      source: "ADMIN_GRANT",
      enrolledAt: "2026-10-20T10:00:00Z",
    },
  ],
  page: 0,
  size: PARTICIPANT_PREVIEW,
  totalElements: 12,
  totalPages: 3,
};

function renderDialog(event: CalendarEventDto | null, onOpenChange = vi.fn()) {
  render(
    <MemoryRouter>
      <CalendarEventDialog event={event} onOpenChange={onOpenChange} timeZone="Asia/Baku" />
    </MemoryRouter>,
  );
  return onOpenChange;
}

beforeEach(() => {
  vi.mocked(useGetAdminCourseByIdQuery).mockReset();
  vi.mocked(useListCourseParticipantsQuery).mockReset();
  perms.isSuperAdmin = true;
  removeBooking.mockReset().mockReturnValue({ unwrap: () => Promise.resolve(undefined) });
  removeSeries.mockReset().mockReturnValue({ unwrap: () => Promise.resolve(undefined) });
});

const BOOKING_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const SERIES_ID = "5e000000-0000-4000-8000-000000000001";

function renderRemovable(event: CalendarEventDto) {
  const onOpenChange = vi.fn();
  const onRemoved = vi.fn();
  render(
    <MemoryRouter>
      <CalendarEventDialog
        event={event}
        onOpenChange={onOpenChange}
        onRemoved={onRemoved}
        timeZone="Asia/Baku"
      />
    </MemoryRouter>,
  );
  return { onOpenChange, onRemoved, user: userEvent.setup() };
}

describe("CalendarEventDialog — removing the room request", () => {
  beforeEach(() => {
    mockCourse({ data: course });
    mockParticipants({ data: participants });
  });

  it("offers the super admin Remove request on a booking, behind the confirm", async () => {
    const { user, onOpenChange, onRemoved } = renderRemovable(bookingEvent);
    const details = screen.getByRole("dialog", { name: "Room 301 · Leyla H." });
    expect(within(details).queryByRole("button", { name: "Remove whole series" })).not.toBeInTheDocument();

    await user.click(within(details).getByRole("button", { name: "Remove request" }));
    const confirm = await screen.findByRole("dialog", { name: "Remove this booking request?" });
    expect(confirm).toHaveTextContent(
      "Room 301 · Leyla H. · Tue, 3 Nov 2026 · 14:00–16:00 (Asia/Baku time) · pending",
    );
    expect(confirm).toHaveTextContent("This cannot be undone.");
    expect(confirm).toHaveTextContent("its time slot is free to book again");

    await user.click(within(confirm).getByRole("button", { name: "Remove request" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(removeBooking).toHaveBeenCalledWith(BOOKING_ID);
    expect(onRemoved).toHaveBeenCalled();
  });

  it("offers Remove whole series for a session of a long-term booking", async () => {
    const { user, onRemoved } = renderRemovable({ ...bookingEvent, seriesId: SERIES_ID });
    const details = screen.getByRole("dialog", { name: "Room 301 · Leyla H." });

    // The one session first: only it goes.
    await user.click(within(details).getByRole("button", { name: "Remove request" }));
    const one = await screen.findByRole("dialog", { name: "Remove this session?" });
    await user.click(within(one).getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Remove this session?" })).not.toBeInTheDocument(),
    );
    // Back on the button that opened it.
    expect(within(details).getByRole("button", { name: "Remove request" })).toHaveFocus();

    await user.click(within(details).getByRole("button", { name: "Remove whole series" }));
    const all = await screen.findByRole("dialog", { name: "Remove this long-term booking?" });
    expect(all).toHaveTextContent(
      "Room 301 · Leyla H. · the long-term booking with the session on Tue, 3 Nov 2026 · 14:00–16:00 (Asia/Baku time)",
    );
    expect(all).toHaveTextContent("every session of it are removed");
    await user.click(within(all).getByRole("button", { name: "Remove whole series" }));

    await waitFor(() => expect(removeSeries).toHaveBeenCalledWith(SERIES_ID));
    expect(removeBooking).not.toHaveBeenCalled();
    expect(onRemoved).toHaveBeenCalled();
  });

  it("offers Remove request on a course meeting that is the course's room booking", async () => {
    const { user } = renderRemovable({
      ...oneTimeEvent,
      id: `booking:${BOOKING_ID}`,
      kind: "SESSION",
      courseType: "OFFLINE",
      bookingStatus: "APPROVED",
    });
    await user.click(screen.getByRole("button", { name: "Remove request" }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Remove this booking request?" })).getByRole(
        "button",
        { name: "Remove request" },
      ),
    );
    await waitFor(() => expect(removeBooking).toHaveBeenCalledWith(BOOKING_ID));
  });

  it("offers no removal on an entry that is not a room booking", () => {
    renderRemovable(oneTimeEvent);
    expect(screen.queryByRole("button", { name: /^Remove/ })).not.toBeInTheDocument();
  });

  it("offers no removal to an admin who is not the super admin", () => {
    perms.isSuperAdmin = false;
    renderRemovable({ ...bookingEvent, seriesId: SERIES_ID });
    expect(screen.queryByRole("button", { name: /^Remove/ })).not.toBeInTheDocument();
  });
});

describe("CalendarEventDialog", () => {
  it("shows a course event's facts in Baku time and loads the course and its first İştirakçilər", () => {
    mockCourse({ data: course });
    mockParticipants({ data: participants });
    renderDialog(oneTimeEvent);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Python bootcamp" })).toBeInTheDocument();
    expect(within(dialog).getByText("One-time training")).toBeInTheDocument();
    expect(within(dialog).getByText("Published")).toBeInTheDocument();
    expect(within(dialog).getByText("Mon, 2 Nov 2026 · 10:00–12:00")).toBeInTheDocument();
    expect(within(dialog).getByText("Asia/Baku time")).toBeInTheDocument();
    expect(within(dialog).getByText("Room 301 · H. Javid ave. 25 · Baku")).toBeInTheDocument();
    expect(within(dialog).getByText("Leyla Məmmədova, Anar Əliyev")).toBeInTheDocument();
    expect(within(dialog).getByText("12 / 30 seats")).toBeInTheDocument();

    // The course, from GET /api/admin/courses/{id}.
    expect(useGetAdminCourseByIdQuery).toHaveBeenCalledWith(COURSE_ID);
    expect(within(dialog).getByText("A day of Python for beginners")).toBeInTheDocument();
    expect(within(dialog).getByText("first program").tagName).toBe("STRONG"); // rich text, sanitised and rendered
    expect(within(dialog).getByText("One-time")).toBeInTheDocument();
    expect(within(dialog).getByText("50")).toBeInTheDocument();
    expect(within(dialog).getByText("2 Nov 2026, 10:00–12:00")).toBeInTheDocument();
    expect(within(dialog).getByText("Variables")).toBeInTheDocument();
    expect(within(dialog).getByText("Loops")).toBeInTheDocument();

    // The first page of the roster, from the participants endpoint.
    expect(useListCourseParticipantsQuery).toHaveBeenCalledWith({
      courseId: COURSE_ID,
      page: 0,
      size: PARTICIPANT_PREVIEW,
    });
    expect(within(dialog).getByText("Nigar Quliyeva")).toBeInTheDocument();
    expect(within(dialog).getByText("rauf@example.az")).toBeInTheDocument();
    expect(within(dialog).getByText("and 10 more on the İştirakçilər page")).toBeInTheDocument();
    expect(within(dialog).getAllByRole("link", { name: "View profile" })[0]).toHaveAttribute(
      "href",
      "/super/users/u1",
    );

    expect(within(dialog).getByRole("link", { name: "Open course" })).toHaveAttribute(
      "href",
      `/admin/courses/${COURSE_ID}`,
    );
    expect(within(dialog).getByRole("link", { name: "İştirakçilər" })).toHaveAttribute(
      "href",
      `/admin/courses/${COURSE_ID}/participants`,
    );
    // An in-person course: its attendance is one step away, beside İştirakçilər.
    expect(within(dialog).getByRole("link", { name: "Attendance" })).toHaveAttribute(
      "href",
      `/admin/courses/${COURSE_ID}/attendance`,
    );
  });

  it("names the days an offline course meets under its dates", () => {
    mockCourse({
      data: {
        ...course,
        courseType: "OFFLINE",
        offlineDetails: { ...course.offlineDetails, endDate: "2026-12-30", daysOfWeek: ["WEDNESDAY", "MONDAY"] },
      },
    });
    mockParticipants({ data: participants });
    renderDialog({ ...oneTimeEvent, id: `course:${COURSE_ID}:2026-11-02`, kind: "COURSE", courseType: "OFFLINE" });

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Course dates")).toBeInTheDocument();
    expect(within(dialog).getByText("2 Nov 2026 – 30 Dec 2026, 10:00–12:00")).toBeInTheDocument();
    expect(within(dialog).getByText("Mon, Wed")).toBeInTheDocument();
  });

  it("says no days for an offline course that has none yet", () => {
    mockCourse({
      data: { ...course, courseType: "OFFLINE", offlineDetails: { ...course.offlineDetails, endDate: "2026-12-30", daysOfWeek: [] } },
    });
    mockParticipants({ data: participants });
    renderDialog({ ...oneTimeEvent, id: `course:${COURSE_ID}`, kind: "COURSE", courseType: "OFFLINE" });

    expect(within(screen.getByRole("dialog")).getByText("2 Nov 2026 – 30 Dec 2026, 10:00–12:00")).toBeInTheDocument();
    expect(screen.queryByText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(, [A-Z][a-z]{2})*$/)).not.toBeInTheDocument();
  });

  it("shows a booking that belongs to no course without loading a course", () => {
    mockCourse({});
    mockParticipants({});
    renderDialog(bookingEvent);

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Room 301 · Leyla H." }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Room booking")).toBeInTheDocument();
    expect(within(dialog).getByText("Pending")).toBeInTheDocument();
    expect(within(dialog).getByText("Tue, 3 Nov 2026 · 14:00–16:00")).toBeInTheDocument();
    expect(within(dialog).getByText("Room 301")).toBeInTheDocument();
    expect(within(dialog).getByText("Leyla Həsənova")).toBeInTheDocument();
    expect(within(dialog).queryByText(/seats/)).not.toBeInTheDocument();

    expect(useGetAdminCourseByIdQuery).not.toHaveBeenCalled();
    expect(useListCourseParticipantsQuery).not.toHaveBeenCalled();
    expect(within(dialog).queryByRole("link", { name: "Open course" })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Booking requests" })).toHaveAttribute(
      "href",
      "/admin/room-requests",
    );
  });

  it("offers a retry when the course cannot be loaded", async () => {
    const refetch = vi.fn();
    mockCourse({ isError: true, refetch });
    mockParticipants({});
    renderDialog(oneTimeEvent);

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load the course.");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
    // The calendar's own facts still show.
    expect(screen.getByText("Mon, 2 Nov 2026 · 10:00–12:00")).toBeInTheDocument();
  });

  it("is closed with no event, and reports a close", async () => {
    mockCourse({ data: course });
    mockParticipants({ data: participants });
    const { rerender } = render(
      <MemoryRouter>
        <CalendarEventDialog event={null} onOpenChange={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const onOpenChange = vi.fn();
    rerender(
      <MemoryRouter>
        <CalendarEventDialog event={oneTimeEvent} onOpenChange={onOpenChange} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
