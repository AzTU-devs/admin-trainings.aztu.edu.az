import { baseApi } from "@lib/query/baseApi";
import type { UUID } from "@shared/types/lms";

/** Backend RoleCode — broadcast targets the USER (student) role too, not just staff. */
export type RoleCode = "USER" | "TUTOR" | "ADMIN" | "SUPER_ADMIN";

export type BroadcastTarget = "ALL" | "ROLE" | "USERS";

/** Mirror of backend BroadcastRequest. */
export interface BroadcastRequest {
  title: string;
  body: string;
  target: BroadcastTarget;
  role?: RoleCode;
  userIds?: UUID[];
}

export const broadcastApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** Admin broadcast — backend `POST /api/admin/notifications/broadcast`. */
    broadcastNotification: build.mutation<{ recipients: number }, BroadcastRequest>({
      query: (body) => ({ url: "/admin/notifications/broadcast", method: "POST", data: body }),
      invalidatesTags: [{ type: "Notification", id: "LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const { useBroadcastNotificationMutation } = broadcastApi;
