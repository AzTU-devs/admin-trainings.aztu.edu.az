import { baseApi } from "@lib/query/baseApi";
import type { ApiPage, PageRequest } from "@shared/types/api";
import type { BookingDecision, CourseStatus, CourseType, UUID } from "@shared/types/lms";
import type {
  CourseDto,
  CourseSummaryDto,
  CreateCourseRequest,
  UpdateCourseRequest,
} from "@features/courses/types";

interface BrowseArgs extends PageRequest {
  type?: CourseType;
}

interface MyCoursesArgs extends PageRequest {
  status?: CourseStatus;
}

interface ModerationArgs extends PageRequest {
  status?: CourseStatus;
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

    /* Tutor portal — MY OWN courses (all statuses), optionally filtered by status. */
    listMyCourses: build.query<ApiPage<CourseSummaryDto>, MyCoursesArgs | void>({
      query: (params) => ({ url: "/portal/courses", method: "GET", params: params ?? undefined }),
      providesTags: (res) =>
        res
          ? [...res.content.map((c) => ({ type: "Course" as const, id: c.id })), { type: "Course" as const, id: "MINE" }]
          : [{ type: "Course", id: "MINE" }],
    }),

    /* Tutor portal */
    createCourse: build.mutation<CourseDto, CreateCourseRequest>({
      query: (body) => ({ url: "/portal/courses", method: "POST", data: body }),
      invalidatesTags: [{ type: "Course", id: "PUBLIC-LIST" }, { type: "Course", id: "MINE" }],
    }),
    updateCourse: build.mutation<CourseDto, { id: UUID; body: UpdateCourseRequest }>({
      query: ({ id, body }) => ({ url: `/portal/courses/${id}`, method: "PATCH", data: body }),
      invalidatesTags: (res) =>
        res ? [{ type: "Course", id: res.slug }, { type: "Course", id: res.id }, { type: "Course", id: "MINE" }] : [],
    }),
    submitForReview: build.mutation<CourseDto, UUID>({
      query: (id) => ({ url: `/portal/courses/${id}/submit`, method: "POST" }),
      invalidatesTags: (res) =>
        res ? [{ type: "Course", id: res.slug }, { type: "Course", id: res.id }, { type: "Course", id: "MINE" }] : [],
    }),
    archiveCourse: build.mutation<void, UUID>({
      query: (id) => ({ url: `/portal/courses/${id}/archive`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Course", id: "PUBLIC-LIST" },
        { type: "Course", id: "MINE" },
        { type: "Course", id },
      ],
    }),

    /* Admin moderation queue (courses awaiting review, by status). */
    listModerationCourses: build.query<ApiPage<CourseSummaryDto>, ModerationArgs | void>({
      query: (params) => ({ url: "/admin/courses", method: "GET", params: params ?? undefined }),
      providesTags: [{ type: "Course", id: "MODERATION" }],
    }),

    /* Admin course detail — full CourseDto for ANY status (requires course:approve). */
    getAdminCourseById: build.query<CourseDto, UUID>({
      query: (id) => ({ url: `/admin/courses/${id}`, method: "GET" }),
      providesTags: (_r, _e, id) => [{ type: "Course", id }],
    }),

    /* Admin moderation (single-course decision). */
    decideCourse: build.mutation<CourseDto, { id: UUID; decision: BookingDecision; note?: string }>({
      query: ({ id, ...body }) => ({ url: `/admin/courses/${id}/decision`, method: "POST", data: body }),
      invalidatesTags: (res, _e, arg) =>
        res
          ? [
              { type: "Course", id: res.slug },
              { type: "Course", id: res.id },
              { type: "Course", id: "MODERATION" },
              { type: "Course", id: "MINE" },
            ]
          : [{ type: "Course", id: arg.id }, { type: "Course", id: "MODERATION" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useBrowseCoursesQuery,
  useSearchCoursesQuery,
  useGetCourseBySlugQuery,
  useLazyGetCourseBySlugQuery,
  useListMyCoursesQuery,
  useListModerationCoursesQuery,
  useGetAdminCourseByIdQuery,
  useLazyGetAdminCourseByIdQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useSubmitForReviewMutation,
  useArchiveCourseMutation,
  useDecideCourseMutation,
} = coursesApi;
