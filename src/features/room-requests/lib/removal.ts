import type { BookingStatus, UUID } from "@shared/types/lms";
import type {
  RoomBookingDto,
  RoomBookingOccurrenceDto,
  RoomBookingSeriesDto,
} from "@features/room-requests/types";
import {
  PLATFORM_TIMEZONE,
  formatDateRange,
  formatDays,
  formatLocalDate,
  formatSessions,
  formatTimeRange,
  wallClock,
} from "@features/room-requests/lib/series";

/*
 * What the super admin's "Remove" confirms name. Removal is for good (a soft
 * delete the API never undoes) and frees the time slot, so the confirm says
 * exactly which request goes: room, requester, when, and its status.
 */

/** The API's 404s for a request that is already gone (removed in another tab, say). */
export const REMOVED_ALREADY = new Set(["ROOM_BOOKING_NOT_FOUND", "ROOM_BOOKING_SERIES_NOT_FOUND"]);

/**
 * A request to remove, and the line that names it in the confirm:
 *  - booking     a single request — `DELETE /api/super/room-bookings/{id}`
 *  - occurrence  one session of a long-term booking, by its booking id (same endpoint; only it goes)
 *  - series      a long-term booking with every session — `DELETE /api/super/room-bookings/series/{id}`
 */
export type RemovalTarget =
  | { kind: "booking" | "occurrence"; id: UUID; what: string }
  | { kind: "series"; id: UUID; what: string; sessions?: number };

const STATUS_WORD: Record<BookingStatus, string> = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
};

const statusWord = (status: string | null | undefined) =>
  status ? (STATUS_WORD[status as BookingStatus] ?? status.toLowerCase()) : null;

/**
 * "Mon, Nov 2, 2026, 10:00–12:00", or "Mon, Nov 2, 2026, 23:00 – Tue, Nov 3, 2026, 01:00"
 * past midnight — the wall clock in the platform zone, whatever the browser's.
 */
export function formatBookingWhen(
  startsAt: string,
  endsAt: string,
  timeZone = PLATFORM_TIMEZONE,
): string {
  const start = wallClock(startsAt, timeZone);
  const end = wallClock(endsAt, timeZone);
  if (start.date === end.date)
    return `${formatLocalDate(start.date)}, ${formatTimeRange(start.time, end.time)}`;
  return `${formatLocalDate(start.date)}, ${start.time} – ${formatLocalDate(end.date)}, ${end.time}`;
}

/** "Room 301 · Excel basics · Leyla Məmmədova · Mon, Nov 2, 2026, 10:00–12:00 Baku time · pending". */
export function describeBooking(
  b: Pick<
    RoomBookingDto,
    "roomName" | "startsAt" | "endsAt" | "status" | "tutorName" | "offlineCourseTitle"
  >,
): string {
  return [
    b.roomName,
    b.offlineCourseTitle,
    b.tutorName,
    `${formatBookingWhen(b.startsAt, b.endsAt)} Baku time`,
    statusWord(b.status),
  ]
    .filter((s): s is string => !!s && !!s.trim())
    .join(" · ");
}

/** "Room 301 · Leyla Məmmədova · Nov 2 – Dec 31, 2099 · Mon, Wed · 10:00–12:00 Baku time · 18 sessions · pending". */
export function describeSeries(s: RoomBookingSeriesDto): string {
  return [
    s.roomName,
    s.offlineCourseTitle,
    s.tutorName,
    formatDateRange(s.startDate, s.endDate),
    formatDays(s.daysOfWeek),
    `${formatTimeRange(s.startTime, s.endTime)} Baku time`,
    formatSessions(s.occurrenceCount),
    statusWord(s.status),
  ]
    .filter((v): v is string => !!v && !!v.trim())
    .join(" · ");
}

/** One session of a series: its own day and hours, then the series it belongs to. */
export function describeOccurrence(
  s: RoomBookingSeriesDto,
  o: RoomBookingOccurrenceDto,
  timeZone = PLATFORM_TIMEZONE,
): string {
  return [
    s.roomName,
    s.tutorName,
    `${formatBookingWhen(o.startsAt, o.endsAt, timeZone)} Baku time`,
    statusWord(o.status),
    `a session of the long-term booking ${formatDateRange(s.startDate, s.endDate)}`,
  ]
    .filter((v): v is string => !!v && !!v.trim())
    .join(" · ");
}
