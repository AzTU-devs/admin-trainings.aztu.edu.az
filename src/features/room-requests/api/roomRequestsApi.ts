import { baseApi } from "@lib/query/baseApi";
import type { ApiPage, PageRequest } from "@shared/types/api";
import type { BookingDecision, BookingStatus, UUID } from "@shared/types/lms";
import type { BookingCreateRequest, RoomBookingDto } from "@features/room-requests/types";

interface AdminListArgs extends PageRequest {
  status?: BookingStatus;
}

export const roomRequestsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** Tutor creates a booking — backend `POST /api/portal/room-bookings`. */
    createRoomBooking: build.mutation<RoomBookingDto, BookingCreateRequest>({
      query: (body) => ({ url: "/portal/room-bookings", method: "POST", data: body }),
      invalidatesTags: [{ type: "RoomRequest", id: "ADMIN-LIST" }],
    }),
    /** Admin queue — backend `GET /api/portal/room-bookings/admin`. */
    listAdminRoomBookings: build.query<ApiPage<RoomBookingDto>, AdminListArgs | void>({
      query: (params) => ({ url: "/portal/room-bookings/admin", method: "GET", params: params ?? undefined }),
      providesTags: [{ type: "RoomRequest", id: "ADMIN-LIST" }],
    }),
    /** Admin decision — backend `POST /api/portal/room-bookings/admin/{id}/decision`. */
    decideRoomBooking: build.mutation<RoomBookingDto, { id: UUID; decision: BookingDecision; note?: string }>({
      query: ({ id, ...body }) => ({ url: `/portal/room-bookings/admin/${id}/decision`, method: "POST", data: body }),
      invalidatesTags: [{ type: "RoomRequest", id: "ADMIN-LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useCreateRoomBookingMutation,
  useListAdminRoomBookingsQuery,
  useDecideRoomBookingMutation,
} = roomRequestsApi;
