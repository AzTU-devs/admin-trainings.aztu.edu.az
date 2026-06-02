import type { RoomStatus, UUID } from "@shared/types/lms";

export type { RoomStatus };

/** Mirror of backend RoomDto. */
export interface RoomDto {
  id: UUID;
  name: string;
  roomNumber: string;
  building?: string;
  capacity: number;
  description?: string;
  status: RoomStatus;
  hourlyRate: number;
  currency: string;
  imageMediaIds: UUID[];
}

/** Mirror of backend RoomUpsertRequest. */
export interface RoomUpsertRequest {
  name: string;
  roomNumber: string;
  building?: string;
  capacity: number;
  description?: string;
  status: RoomStatus;
  hourlyRate: number;
  currency: string;
  imageMediaIds?: UUID[];
}
