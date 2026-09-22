import { baseApi } from "@lib/query/baseApi";
import type { ApiPage, PageRequest } from "@shared/types/api";
import type { BookingDecision, CourseStatus, CourseType, UUID } from "@shared/types/lms";
import type {
  AdminCreateCourseRequest,
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
 * response tells us the slug.
 */
const adminCourseTags = (id: UUID, res?: CourseDto): { type: "Course"; id: string }[] => [
  { type: "Course", id },
  { type: "Course", id: "MODERATION" },
  { type: "Course", id: "MINE" },
  { type: "Course", id: "PUBLIC-LIST" },
  ...(res ? [{ type: "Course" as const, id: res.slug }] : []),
];

/**
 * A course detail is cached under both of its keys, id and slug. The tutor page
 * loads it by slug and the admin page by id, while each write knows only what
 * it has: module and lesson edits carry just the course id. Tagged by the
 * lookup key alone, the tutor's cached course kept its old outline after a
 * lesson was added, so "Submit for review" still warned that it had no lessons
 * (and would not warn again after every lesson was deleted) until a reload.
 */
export const courseDetailTags = (key: string, course?: Pick<CourseDto, "id" | "slug">) =>
  [...new Set([key, ...(course ? [course.id, course.slug] : [])])].map((id) => ({ type: "Course" as const, id }));

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
      providesTags: (res, _e, slug) => courseDetailTags(slug, res),
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
    archiveCourse: build.mutation<void, { id: UUID; slug: string }>({
      query: ({ id }) => ({ url: `/portal/courses/${id}/archive`, method: "POST" }),
      // The tutor's edit page reads the course by slug, so that entry must go too
      // or the page keeps showing the old status after archiving.
      invalidatesTags: (_r, _e, { id, slug }) => [
        { type: "Course", id: "PUBLIC-LIST" },
        { type: "Course", id: "MINE" },
        { type: "Course", id: "MODERATION" },
        { type: "Course", id },
        { type: "Course", id: slug },
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
      providesTags: (res, _e, id) => courseDetailTags(id, res),
    }),

    /* Admin authoring — any course, any tutor, any status. Distinct from the
       tutor endpoints above, which are bounded by `course:update_own`. */
    createAdminCourse: build.mutation<CourseDto, AdminCreateCourseRequest>({
      query: (body) => ({ url: "/admin/courses", method: "POST", data: body }),
      invalidatesTags: [
        { type: "Course", id: "MODERATION" },
        { type: "Course", id: "MINE" },
        { type: "Course", id: "PUBLIC-LIST" },
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
    /**
     * `POST /admin/courses/{id}/archive` — staff archive any course. The tutor
     * endpoint above is owner-only, so without this an admin could see the
     * Archived tab but never put a course in it.
     */
    archiveAdminCourse: build.mutation<CourseDto | void, UUID>({
      query: (id) => ({ url: `/admin/courses/${id}/archive`, method: "POST" }),
      invalidatesTags: (res, _e, id) => adminCourseTags(id, res ?? undefined),
    }),
    setCourseTutors: build.mutation<CourseDto, { id: UUID; body: SetCourseTutorsRequest }>({
      query: ({ id, body }) => ({ url: `/admin/courses/${id}/tutors`, method: "PUT", data: body }),
      invalidatesTags: (res, _e, arg) => adminCourseTags(arg.id, res),
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
  useCreateAdminCourseMutation,
  useUpdateAdminCourseMutation,
  usePublishCourseMutation,
  useUnpublishCourseMutation,
  useArchiveAdminCourseMutation,
  useSetCourseTutorsMutation,
  useSubmitForReviewMutation,
  useArchiveCourseMutation,
  useDecideCourseMutation,
} = coursesApi;
