import { baseApi } from "@lib/query/baseApi";
import type { ApiPage, PageRequest } from "@shared/types/api";
import type { BookingDecision, TutorApprovalStatus, UUID } from "@shared/types/lms";
import type { TutorProfileDto, UpdateTutorProfileRequest } from "@features/tutors/types";

interface ListArgs extends PageRequest {
  status?: TutorApprovalStatus;
}

export const tutorsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** Admin review queue — backend `GET /api/portal/tutor/admin`. */
    listTutors: build.query<ApiPage<TutorProfileDto>, ListArgs | void>({
      query: (params) => ({ url: "/portal/tutor/admin", method: "GET", params: params ?? undefined }),
      providesTags: [{ type: "Tutor", id: "LIST" }],
    }),
    /** Approve / reject — backend `POST /api/portal/tutor/admin/{tutorId}/decision`. */
    decideTutor: build.mutation<TutorProfileDto, { id: UUID; decision: BookingDecision; note?: string }>({
      query: ({ id, ...body }) => ({ url: `/portal/tutor/admin/${id}/decision`, method: "POST", data: body }),
      invalidatesTags: [{ type: "Tutor", id: "LIST" }],
    }),
    /** The caller's own expert profile — backend `GET /api/portal/tutor/me`. */
    getMyTutorProfile: build.query<TutorProfileDto, void>({
      query: () => ({ url: "/portal/tutor/me", method: "GET" }),
      providesTags: [{ type: "Tutor", id: "ME" }],
    }),
    /** The expert edits their own profile — backend `PATCH /api/portal/tutor/me`. */
    updateMyTutorProfile: build.mutation<TutorProfileDto, UpdateTutorProfileRequest>({
      query: (body) => ({ url: "/portal/tutor/me", method: "PATCH", data: body }),
      // LIST too: an admin who is also a tutor sees their own row in the tutors table.
      invalidatesTags: [{ type: "Tutor", id: "ME" }, { type: "Tutor", id: "LIST" }],
    }),
    /** An admin edits any expert's profile — backend `PATCH /api/admin/tutors/{tutorId}`. */
    updateTutorProfile: build.mutation<TutorProfileDto, { id: UUID; body: UpdateTutorProfileRequest }>({
      query: ({ id, body }) => ({ url: `/admin/tutors/${id}`, method: "PATCH", data: body }),
      invalidatesTags: [{ type: "Tutor", id: "LIST" }, { type: "Tutor", id: "ME" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListTutorsQuery,
  useDecideTutorMutation,
  useGetMyTutorProfileQuery,
  useUpdateMyTutorProfileMutation,
  useUpdateTutorProfileMutation,
} = tutorsApi;
