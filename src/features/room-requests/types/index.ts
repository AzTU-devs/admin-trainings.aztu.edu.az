import type { BookingStatus, UUID } from "@shared/types/lms";

/** Mirror of backend RoomBookingDto. */
export interface RoomBookingDto {
  id: UUID;
  roomId: UUID;
  roomName: string;
  offlineCourseId?: UUID;
  tutorId: UUID;
  startsAt: string;
  endsAt: string;
  recurrenceRule?: string;
  status: BookingStatus;
  totalFee: number;
  currency: string;
  createdAt: string;
}

export interface BookingCreateRequest {
  roomId: UUID;
  offlineCourseId?: UUID;
  startsAt: string;
  endsAt: string;
  recurrenceRule?: string;
}
