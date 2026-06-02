import type { UUID } from "@shared/types/lms";

export type MediaStorage = "S3" | "LOCAL" | "CDN";
export type MediaStatus = "PENDING" | "UPLOADED" | "PROCESSING" | "READY" | "FAILED";
export type MediaVisibility = "PRIVATE" | "PUBLIC" | "SIGNED";

/** Mirror of backend MediaFileDto. */
export interface MediaFileDto {
  id: UUID;
  storage: MediaStorage;
  mimeType: string;
  byteSize: number;
  width?: number;
  height?: number;
  durationSec?: number;
  status: MediaStatus;
  visibility: MediaVisibility;
  createdAt: string;
}
