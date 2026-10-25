import type { BookingDecision, BookingStatus, UUID } from "@shared/types/lms";

/** Mirror of backend RoomBookingDto. */
export interface RoomBookingDto {
  id: UUID;
  roomId: UUID;
  roomName: string;
  offlineCourseId?: UUID;
  offlineCourseTitle?: string | null;
  tutorId: UUID;
  tutorName?: string | null;
  tutorEmail?: string | null;
  startsAt: string;
  endsAt: string;
  recurrenceRule?: string;
  status: BookingStatus;
  totalFee: number;
  currency: string;
  createdAt: string;
  /**
   * The long-term booking this row is a session of; null for a single booking.
   * The single-booking lists leave series rows out (they are managed through
   * the series), and the single-booking actions refuse them with 409 PART_OF_SERIES.
   */
  seriesId: UUID | null;
}

export interface BookingCreateRequest {
  roomId: UUID;
  offlineCourseId?: UUID;
  startsAt: string;
  endsAt: string;
  recurrenceRule?: string;
}

/** java.time.DayOfWeek names, as the API sends and accepts them. */
export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

/** One session of a long-term booking: an ordinary room booking linked to the series. */
export interface RoomBookingOccurrenceDto {
  bookingId: UUID;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
}

/**
 * Mirror of backend RoomBookingSeriesDto — a room on chosen weekdays between
 * two dates, at the same local times (in `timezone`, the platform's Asia/Baku).
 * Dates are `yyyy-MM-dd`, times `HH:mm` (or `HH:mm:ss`). List endpoints send
 * `occurrences: []`; the detail endpoint sends every session, sorted.
 */
export interface RoomBookingSeriesDto {
  id: UUID;
  roomId: UUID;
  roomName: string;
  offlineCourseId: UUID | null;
  offlineCourseTitle: string | null;
  tutorId: UUID;
  tutorName: string;
  tutorEmail: string;
  startDate: string;
  endDate: string;
  daysOfWeek: DayOfWeek[];
  startTime: string;
  endTime: string;
  timezone: string;
  status: BookingStatus;
  occurrenceCount: number;
  upcomingCount: number;
  totalFee: number;
  currency: string;
  note: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  occurrences: RoomBookingOccurrenceDto[];
}

/** Body of `POST /api/portal/room-bookings/series`. */
export interface RoomBookingSeriesCreateRequest {
  roomId: UUID;
  offlineCourseId: UUID | null;
  startDate: string;
  endDate: string;
  daysOfWeek: DayOfWeek[];
  startTime: string;
  endTime: string;
  note: string | null;
}

/** Body of `POST /api/portal/room-bookings/series/admin/{id}/decision`; a rejection needs the note. */
export interface RoomBookingSeriesDecisionRequest {
  decision: BookingDecision;
  note: string | null;
}
