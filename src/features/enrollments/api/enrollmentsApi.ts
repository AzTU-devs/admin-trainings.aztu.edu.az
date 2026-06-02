import { baseApi } from "@lib/query/baseApi";
import type { ApiPage, PageRequest } from "@shared/types/api";
import type { EnrollmentDto } from "@features/enrollments/types";

export const enrollmentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** The current user's own enrollments — backend `GET /api/portal/enrollments/mine`. */
    listMyEnrollments: build.query<ApiPage<EnrollmentDto>, PageRequest | void>({
      query: (params) => ({ url: "/portal/enrollments/mine", method: "GET", params: params ?? undefined }),
      providesTags: [{ type: "Enrollment", id: "MINE" }],
    }),
  }),
  overrideExisting: false,
});

export const { useListMyEnrollmentsQuery } = enrollmentsApi;
