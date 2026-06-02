import { baseApi } from "@lib/query/baseApi";
import type { ApiPage, PageRequest } from "@shared/types/api";
import type { BookingDecision, TutorApprovalStatus, UUID } from "@shared/types/lms";
import type { TutorProfileDto } from "@features/tutors/types";

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
  }),
  overrideExisting: false,
});

export const { useListTutorsQuery, useDecideTutorMutation } = tutorsApi;
