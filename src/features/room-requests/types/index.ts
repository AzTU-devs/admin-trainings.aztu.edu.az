import type { BookingStatus, RoomStatus, UUID } from "@shared/types/lms";

/** Mirror of backend RoomBookingDto. */
export interface RoomBookingDto {
  id: UUID;
  roomId: UUID;
  roomName: string;
  /** The room's status now; null once the room was deleted. */
  roomStatus?: RoomStatus | null;
  offlineCourseId?: UUID | null;
  offlineCourseTitle?: string | null;
  tutorId: UUID;
  /** Who asked for the room — shown to the moderator instead of a profile id. */
  tutorName?: string | null;
  tutorEmail?: string | null;
  startsAt: string;
  endsAt: string;
  recurrenceRule?: string | null;
  status: BookingStatus;
  totalFee: number;
  currency: string;
  createdAt: string;
}

/**
 * Mirror of backend BookingCreateRequest. There is no recurrence field on
 * purpose: the API refuses any RRULE (RECURRENCE_NOT_SUPPORTED) — each session
 * is requested separately.
 */
export interface BookingCreateRequest {
  roomId: UUID;
  /** The course id of one of the tutor's OFFLINE courses. */
  offlineCourseId?: UUID;
  startsAt: string;
  endsAt: string;
}
