import type { BookingStatus, CourseStatus, CourseType, UUID } from "@shared/types/lms";

/**
 * What a calendar entry is:
 *  - ONE_TIME      a one-time training (one timed block on its date)
 *  - SESSION       one meeting of an offline course (an offline session, or a
 *                  room booking linked to the course)
 *  - COURSE        an offline course with no sessions or bookings, shown as an
 *                  all-day bar over its date range
 *  - ROOM_BOOKING  a room booking that belongs to no course
 */
export type CalendarEventKind = "ONE_TIME" | "COURSE" | "SESSION" | "ROOM_BOOKING";

/** Mirror of one entry of `GET /api/admin/calendar`. */
export interface CalendarEventDto {
  /** "one-time:<courseId>", "course:<courseId>", "session:<sessionId>" or "booking:<bookingId>". */
  id: string;
  kind: CalendarEventKind;
  title: string;
  /**
   * Instants (ISO-8601 UTC). For an all-day event `start` is local midnight of
   * the first day and `end` local midnight after the last day.
   */
  start: string;
  end: string;
  allDay: boolean;
  courseId?: UUID | null;
  courseSlug?: string | null;
  courseType?: CourseType | null;
  courseStatus?: CourseStatus | null;
  roomName?: string | null;
  city?: string | null;
  addressLine?: string | null;
  tutorNames?: string[] | null;
  seatLimit?: number | null;
  enrolledCount?: number | null;
  bookingStatus?: BookingStatus | string | null;
}

/** The calendar payload after unwrapping `{ data, meta }`. */
export interface CalendarResponse {
  /** The zone every local date and time is in — the platform's `app.timezone`. */
  timezone: string;
  events: CalendarEventDto[];
  /** More than the cap (2000) matched; only the first ones were returned. */
  truncated: boolean;
}

/** Local dates (`yyyy-MM-dd`) in the platform zone; `to` is exclusive. */
export interface CalendarRange {
  from: string;
  to: string;
}
