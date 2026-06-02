import { baseApi } from "@lib/query/baseApi";
import type { ApiPage, PageRequest } from "@shared/types/api";
import type { BookingDecision, CourseType, UUID } from "@shared/types/lms";
import type {
  CourseDto,
  CourseSummaryDto,
  CreateCourseRequest,
  UpdateCourseRequest,
} from "@features/courses/types";

interface BrowseArgs extends PageRequest {
  type?: CourseType;
}

export const coursesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /* Public catalog (PUBLISHED only) — the only list endpoints the backend exposes. */
    browseCourses: build.query<ApiPage<CourseSummaryDto>, BrowseArgs | void>({
      query: (params) => ({ url: "/public/courses", method: "GET", params: params ?? undefined }),
      providesTags: [{ type: "Course", id: "PUBLIC-LIST" }],
    }),
    searchCourses: build.query<ApiPage<CourseSummaryDto>, { q: string } & PageRequest>({
      query: (params) => ({ url: "/public/courses/search", method: "GET", params }),
      providesTags: [{ type: "Course", id: "SEARCH" }],
    }),
    getCourseBySlug: build.query<CourseDto, string>({
      query: (slug) => ({ url: `/public/courses/${slug}`, method: "GET" }),
      providesTags: (_r, _e, slug) => [{ type: "Course", id: slug }],
    }),

    /* Tutor portal */
    createCourse: build.mutation<CourseDto, CreateCourseRequest>({
      query: (body) => ({ url: "/portal/courses", method: "POST", data: body }),
      invalidatesTags: [{ type: "Course", id: "PUBLIC-LIST" }],
    }),
    updateCourse: build.mutation<CourseDto, { id: UUID; body: UpdateCourseRequest }>({
      query: ({ id, body }) => ({ url: `/portal/courses/${id}`, method: "PATCH", data: body }),
      invalidatesTags: (res) => (res ? [{ type: "Course", id: res.slug }] : []),
    }),
    submitForReview: build.mutation<CourseDto, UUID>({
      query: (id) => ({ url: `/portal/courses/${id}/submit`, method: "POST" }),
      invalidatesTags: (res) => (res ? [{ type: "Course", id: res.slug }] : []),
    }),
    archiveCourse: build.mutation<void, UUID>({
      query: (id) => ({ url: `/portal/courses/${id}/archive`, method: "POST" }),
      invalidatesTags: [{ type: "Course", id: "PUBLIC-LIST" }],
    }),

    /* Admin moderation (single-course decision; no list endpoint yet) */
    decideCourse: build.mutation<CourseDto, { id: UUID; decision: BookingDecision; note?: string }>({
      query: ({ id, ...body }) => ({ url: `/admin/courses/${id}/decision`, method: "POST", data: body }),
      invalidatesTags: (res) => (res ? [{ type: "Course", id: res.slug }] : []),
    }),
  }),
  overrideExisting: false,
});

export const {
  useBrowseCoursesQuery,
  useSearchCoursesQuery,
  useGetCourseBySlugQuery,
  useLazyGetCourseBySlugQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useSubmitForReviewMutation,
  useArchiveCourseMutation,
  useDecideCourseMutation,
} = coursesApi;
