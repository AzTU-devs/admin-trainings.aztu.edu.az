import { baseApi } from "@lib/query/baseApi";
import type { ApiPage, PageRequest } from "@shared/types/api";
import type { BookingDecision, CourseStatus, CourseType, UUID } from "@shared/types/lms";
import type {
  AdminCreateCourseRequest,
  CourseDeletionImpact,
  CourseDto,
  CourseSummaryDto,
  CreateCourseRequest,
  SetCourseTutorsRequest,
  UpdateCourseRequest,
} from "@features/courses/types";

interface BrowseArgs extends PageRequest {
  type?: CourseType;
}

interface MyCoursesArgs extends PageRequest {
  status?: CourseStatus;
  /** Free text over title, subtitle and slug, matched server-side across every page. */
  q?: string;
}

interface ModerationArgs extends PageRequest {
  status?: CourseStatus;
}

/**
 * Cache keys an admin write touches. Keyed off the course id rather than the
 * response body so the lists still refresh for a write that answers with less
 * than a full course, and the public slug entry is dropped too whenever the
 * response tells us the slug. The super admin's calendar shows courses (their
 * dates, sessions, status and tutors), so it is refreshed as well.
 */
const adminCourseTags = (id: UUID, res?: CourseDto): ({ type: "Course"; id: string } | "Calendar")[] => [
  { type: "Course", id },
  { type: "Course", id: "MODERATION" },
  { type: "Course", id: "MINE" },
  { type: "Course", id: "PUBLIC-LIST" },
  ...(res ? [{ type: "Course" as const, id: res.slug }] : []),
  "Calendar",
];

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
        // An archived course leaves the calendar.
        "Calendar",
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

    /* Admin authoring — any course, any tutor, any status. Distinct from the
       tutor endpoints above, which are bounded by `course:update_own`. */
    createAdminCourse: build.mutation<CourseDto, AdminCreateCourseRequest>({
      query: (body) => ({ url: "/admin/courses", method: "POST", data: body }),
      invalidatesTags: [
        { type: "Course", id: "MODERATION" },
        { type: "Course", id: "MINE" },
        { type: "Course", id: "PUBLIC-LIST" },
        "Calendar",
      ],
    }),
    updateAdminCourse: build.mutation<CourseDto, { id: UUID; body: UpdateCourseRequest }>({
      query: ({ id, body }) => ({ url: `/admin/courses/${id}`, method: "PATCH", data: body }),
      invalidatesTags: (res, _e, arg) => adminCourseTags(arg.id, res),
    }),
    publishCourse: build.mutation<CourseDto, UUID>({
      query: (id) => ({ url: `/admin/courses/${id}/publish`, method: "POST" }),
      invalidatesTags: (res, _e, id) => adminCourseTags(id, res),
    }),
    unpublishCourse: build.mutation<CourseDto, UUID>({
      query: (id) => ({ url: `/admin/courses/${id}/unpublish`, method: "POST" }),
      invalidatesTags: (res, _e, id) => adminCourseTags(id, res),
    }),
    setCourseTutors: build.mutation<CourseDto, { id: UUID; body: SetCourseTutorsRequest }>({
      query: ({ id, body }) => ({ url: `/admin/courses/${id}/tutors`, method: "PUT", data: body }),
      invalidatesTags: (res, _e, arg) => adminCourseTags(arg.id, res),
    }),

    /* Super admin: delete a course for good (`course:delete`). */
    getCourseDeletionImpact: build.query<CourseDeletionImpact, UUID>({
      query: (id) => ({ url: `/super/courses/${id}/deletion-impact`, method: "GET" }),
      // Counted afresh each time the confirm opens: enrolments come and go.
      keepUnusedDataFor: 0,
    }),
    /**
     * Backend `DELETE /api/super/courses/{courseId}` (204). The course leaves
     * every list, page and calendar; its enrolments are cancelled and its room
     * bookings released. So every cache that may show any of them is
     * refreshed — also on a 404, which means it was deleted already.
     */
    deleteCourse: build.mutation<void, UUID>({
      query: (id) => ({ url: `/super/courses/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, error) =>
        error && error.status !== 404
          ? []
          : ["Course", "Enrollment", "Student", "Attendance", "Calendar", "RoomRequest", "Room", "Analytics"],
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
              "Calendar",
            ]
          : [{ type: "Course", id: arg.id }, { type: "Course", id: "MODERATION" }, "Calendar"],
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
  useCreateAdminCourseMutation,
  useUpdateAdminCourseMutation,
  usePublishCourseMutation,
  useUnpublishCourseMutation,
  useSetCourseTutorsMutation,
  useSubmitForReviewMutation,
  useArchiveCourseMutation,
  useDecideCourseMutation,
  useGetCourseDeletionImpactQuery,
  useDeleteCourseMutation,
} = coursesApi;
