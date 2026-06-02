import type {
  NotificationChannel,
  NotificationStatus,
  UUID,
} from "@shared/types/lms";

export type { NotificationChannel, NotificationStatus };

/** Mirror of backend NotificationDto. */
export interface NotificationDto {
  id: UUID;
  templateCode?: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  status: NotificationStatus;
  sentAt?: string;
  readAt?: string;
  createdAt: string;
}
