import { baseApi } from "@lib/query/baseApi";
import type { ApiPage, PageRequest } from "@shared/types/api";
import type { BookingDecision, BookingStatus, UUID } from "@shared/types/lms";
import type {
  BookingCreateRequest,
  RoomBookingDto,
  RoomBookingSeriesCreateRequest,
  RoomBookingSeriesDecisionRequest,
  RoomBookingSeriesDto,
} from "@features/room-requests/types";

interface AdminListArgs extends PageRequest {
  status?: BookingStatus;
}

/*
 * Long-term bookings share the RoomRequest tag type with single bookings, under
 * their own ids: the single lists leave series rows out, so a series change has
 * nothing to refresh there, and vice versa.
 */
const SERIES_MINE = { type: "RoomRequest", id: "SERIES-MINE" } as const;
const SERIES_ADMIN = { type: "RoomRequest", id: "SERIES-ADMIN-LIST" } as const;
const seriesTag = (id: UUID) => ({ type: "RoomRequest", id: `SERIES-${id}` }) as const;
const ADMIN_LIST = { type: "RoomRequest", id: "ADMIN-LIST" } as const;
const MINE = { type: "RoomRequest", id: "MINE" } as const;
/*
 * The super admin's calendar shows approved and pending bookings (pending as
 * tentative), so every write below that adds, decides, cancels or removes one
 * refreshes it too — an open calendar, and any range still cached.
 */
const CALENDAR = "Calendar" as const;

export const roomRequestsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** Tutor creates a booking — backend `POST /api/portal/room-bookings`. */
    createRoomBooking: build.mutation<RoomBookingDto, BookingCreateRequest>({
      query: (body) => ({ url: "/portal/room-bookings", method: "POST", data: body }),
      invalidatesTags: [ADMIN_LIST, MINE, CALENDAR],
    }),
    /** Tutor's own bookings (history) — backend `GET /api/portal/room-bookings/mine`. */
    listMyRoomBookings: build.query<ApiPage<RoomBookingDto>, PageRequest | void>({
      query: (params) => ({ url: "/portal/room-bookings/mine", method: "GET", params: params ?? undefined }),
      providesTags: [MINE],
    }),
    /** Tutor cancels one of their bookings — backend `DELETE /api/portal/room-bookings/{id}`. */
    cancelRoomBooking: build.mutation<void, UUID>({
      query: (id) => ({ url: `/portal/room-bookings/${id}`, method: "DELETE" }),
      invalidatesTags: [MINE, ADMIN_LIST, CALENDAR],
    }),
    /** Admin queue — backend `GET /api/portal/room-bookings/admin`. */
    listAdminRoomBookings: build.query<ApiPage<RoomBookingDto>, AdminListArgs | void>({
      query: (params) => ({ url: "/portal/room-bookings/admin", method: "GET", params: params ?? undefined }),
      providesTags: [ADMIN_LIST],
    }),
    /** Admin decision — backend `POST /api/portal/room-bookings/admin/{id}/decision`. */
    decideRoomBooking: build.mutation<RoomBookingDto, { id: UUID; decision: BookingDecision; note?: string }>({
      query: ({ id, ...body }) => ({ url: `/portal/room-bookings/admin/${id}/decision`, method: "POST", data: body }),
      invalidatesTags: [ADMIN_LIST, CALENDAR],
    }),

    /** Tutor requests a long-term booking — backend `POST /api/portal/room-bookings/series`. */
    createRoomBookingSeries: build.mutation<RoomBookingSeriesDto, RoomBookingSeriesCreateRequest>({
      query: (body) => ({ url: "/portal/room-bookings/series", method: "POST", data: body }),
      invalidatesTags: [SERIES_MINE, SERIES_ADMIN, CALENDAR],
    }),
    /** Tutor's long-term bookings, newest first, without their sessions — `GET …/series/mine`. */
    listMyRoomBookingSeries: build.query<ApiPage<RoomBookingSeriesDto>, PageRequest | void>({
      query: (params) => ({ url: "/portal/room-bookings/series/mine", method: "GET", params: params ?? undefined }),
      providesTags: [SERIES_MINE],
    }),
    /** One long-term booking with every session — `GET …/series/{id}` (owner or `room:approve`). */
    getRoomBookingSeries: build.query<RoomBookingSeriesDto, UUID>({
      query: (id) => ({ url: `/portal/room-bookings/series/${id}`, method: "GET" }),
      providesTags: (_r, _e, id) => [seriesTag(id)],
    }),
    /** Tutor cancels a long-term booking; sessions that have started keep their status — `DELETE …/series/{id}`. */
    cancelRoomBookingSeries: build.mutation<void, UUID>({
      query: (id) => ({ url: `/portal/room-bookings/series/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [SERIES_MINE, SERIES_ADMIN, seriesTag(id), CALENDAR],
    }),
    /** Admin queue of long-term bookings by status, oldest first — `GET …/series/admin`. */
    listAdminRoomBookingSeries: build.query<ApiPage<RoomBookingSeriesDto>, AdminListArgs | void>({
      query: (params) => ({ url: "/portal/room-bookings/series/admin", method: "GET", params: params ?? undefined }),
      providesTags: [SERIES_ADMIN],
    }),
    /** Admin approves or rejects a whole series at once — `POST …/series/admin/{id}/decision`. */
    decideRoomBookingSeries: build.mutation<RoomBookingSeriesDto, { id: UUID } & RoomBookingSeriesDecisionRequest>({
      query: ({ id, ...body }) => ({ url: `/portal/room-bookings/series/admin/${id}/decision`, method: "POST", data: body }),
      invalidatesTags: (_r, _e, { id }) => [SERIES_ADMIN, SERIES_MINE, seriesTag(id), CALENDAR],
    }),

    /*
     * Super admin only (`room:booking_remove`): a request removed for good — a
     * soft delete on the server, gone from every list, the calendar and the
     * conflict checks, so its time slot is free again. Any status. Tags are
     * invalidated on a refusal too, so a 404 (removed meanwhile) refreshes the
     * lists that still showed it.
     */
    /**
     * One request, or one session of a long-term booking (only that session
     * goes) — `DELETE /api/super/room-bookings/{id}`. Everything that lists
     * bookings is refreshed, series details included: a session's series
     * changes with it, and from the calendar its series may not be known.
     */
    removeRoomBooking: build.mutation<void, UUID>({
      query: (id) => ({ url: `/super/room-bookings/${id}`, method: "DELETE" }),
      invalidatesTags: ["RoomRequest", CALENDAR],
    }),
    /**
     * A long-term booking and every session of it — `DELETE /api/super/room-bookings/series/{id}`.
     * Its own details are not refreshed: they could only come back as a 404
     * while the dialog showing them closes.
     */
    removeRoomBookingSeries: build.mutation<void, UUID>({
      query: (id) => ({ url: `/super/room-bookings/series/${id}`, method: "DELETE" }),
      invalidatesTags: [SERIES_ADMIN, SERIES_MINE, ADMIN_LIST, MINE, CALENDAR],
    }),
  }),
  overrideExisting: false,
});

export const {
  useCreateRoomBookingMutation,
  useListMyRoomBookingsQuery,
  useCancelRoomBookingMutation,
  useListAdminRoomBookingsQuery,
  useDecideRoomBookingMutation,
  useCreateRoomBookingSeriesMutation,
  useListMyRoomBookingSeriesQuery,
  useGetRoomBookingSeriesQuery,
  useCancelRoomBookingSeriesMutation,
  useListAdminRoomBookingSeriesQuery,
  useDecideRoomBookingSeriesMutation,
  useRemoveRoomBookingMutation,
  useRemoveRoomBookingSeriesMutation,
} = roomRequestsApi;
