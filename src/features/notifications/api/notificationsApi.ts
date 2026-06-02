import { baseApi } from "@lib/query/baseApi";
import type { ApiPage, PageRequest } from "@shared/types/api";
import type { NotificationDto } from "@features/notifications/types";
import type { UUID } from "@shared/types/lms";

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listNotifications: build.query<ApiPage<NotificationDto>, PageRequest | void>({
      query: (params) => ({ url: "/portal/notifications", method: "GET", params: params ?? undefined }),
      providesTags: [{ type: "Notification", id: "LIST" }],
    }),
    unreadCount: build.query<{ count: number }, void>({
      query: () => ({ url: "/portal/notifications/unread-count", method: "GET" }),
      providesTags: [{ type: "Notification", id: "UNREAD" }],
    }),
    markRead: build.mutation<void, UUID>({
      query: (id) => ({ url: `/portal/notifications/${id}/read`, method: "POST" }),
      invalidatesTags: [
        { type: "Notification", id: "LIST" },
        { type: "Notification", id: "UNREAD" },
      ],
    }),
    markAllRead: build.mutation<{ updated: number }, void>({
      query: () => ({ url: "/portal/notifications/read-all", method: "POST" }),
      invalidatesTags: [
        { type: "Notification", id: "LIST" },
        { type: "Notification", id: "UNREAD" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListNotificationsQuery,
  useUnreadCountQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
} = notificationsApi;
