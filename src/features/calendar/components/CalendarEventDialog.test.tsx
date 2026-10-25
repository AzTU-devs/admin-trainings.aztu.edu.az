import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
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
// The profile link is the super admin's; the calendar is only theirs anyway.
vi.mock("@features/auth/hooks/usePermissions", () => ({
  usePermissions: () => ({ isSuperAdmin: true }),
}));

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
