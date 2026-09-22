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
    /**
     * The notifications page's list, a page at a time. An infinite query keeps
     * every loaded page: the page used to pass a single `page` number to
     * listNotifications, so "Load more" swapped the first 20 for the next 3.
     * Size 20 of the API's 100 maximum; the bell keeps its own 6-item query.
     */
    listNotificationsFeed: build.infiniteQuery<ApiPage<NotificationDto>, void, number>({
      infiniteQueryOptions: {
        initialPageParam: 0,
        getNextPageParam: (lastPage, _all, lastPageParam) =>
          lastPageParam + 1 < lastPage.totalPages ? lastPageParam + 1 : undefined,
      },
      query: ({ pageParam }) => ({
        url: "/portal/notifications",
        method: "GET",
        params: { page: pageParam, size: 20 },
      }),
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
  useListNotificationsFeedInfiniteQuery,
  useUnreadCountQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
} = notificationsApi;
