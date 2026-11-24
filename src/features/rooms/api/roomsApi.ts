import { baseApi } from "@lib/query/baseApi";
import type { ApiPage, PageRequest } from "@shared/types/api";
import type { UUID } from "@shared/types/lms";
import type { RoomDto, RoomUpsertRequest } from "@features/rooms/types";

export const roomsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listRooms: build.query<ApiPage<RoomDto>, PageRequest | void>({
      query: (params) => ({ url: "/admin/rooms", method: "GET", params: params ?? undefined }),
      providesTags: [{ type: "Room", id: "LIST" }],
    }),
    /** Tutor catalog of available rooms — backend `GET /api/portal/rooms`. */
    listPortalRooms: build.query<ApiPage<RoomDto>, PageRequest | void>({
      query: (params) => ({ url: "/portal/rooms", method: "GET", params: params ?? undefined }),
      providesTags: [{ type: "Room", id: "PORTAL-LIST" }],
    }),
    createRoom: build.mutation<RoomDto, RoomUpsertRequest>({
      query: (body) => ({ url: "/admin/rooms", method: "POST", data: body }),
      invalidatesTags: [{ type: "Room", id: "LIST" }],
    }),
    updateRoom: build.mutation<RoomDto, { id: UUID; body: RoomUpsertRequest }>({
      query: ({ id, body }) => ({ url: `/admin/rooms/${id}`, method: "PUT", data: body }),
      invalidatesTags: [{ type: "Room", id: "LIST" }],
    }),
    deleteRoom: build.mutation<void, UUID>({
      query: (id) => ({ url: `/admin/rooms/${id}`, method: "DELETE" }),
      // A deleted room's bookings leave the super admin's calendar.
      invalidatesTags: [{ type: "Room", id: "LIST" }, "Calendar"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListRoomsQuery,
  useListPortalRoomsQuery,
  useCreateRoomMutation,
  useUpdateRoomMutation,
  useDeleteRoomMutation,
} = roomsApi;
