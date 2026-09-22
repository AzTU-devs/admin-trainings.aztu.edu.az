import { baseApi } from "@lib/query/baseApi";
import type { UUID } from "@shared/types/lms";
import type {
  LessonDto,
  LessonUpsertRequest,
  ModuleDto,
  ModuleUpsertRequest,
} from "@features/courses/types";

/**
 * Course-content management — modules & lessons. Tutors edit their own
 * courses; staff (`course:manage`) any course, on an API that allows it.
 * Backs the existing backend endpoints under `/portal`:
 *   GET/POST  /portal/courses/{courseId}/modules
 *   PUT/DELETE /portal/modules/{moduleId}
 *   GET/POST  /portal/modules/{moduleId}/lessons
 *   PUT/DELETE /portal/lessons/{lessonId}
 *
 * The module list (with nested lessons) is cached per course under the
 * `Module` tag keyed by courseId; every mutation invalidates that key so the
 * editor re-fetches the whole tree. `courseId` is threaded through lesson
 * mutations purely for that invalidation (it is not sent to the backend).
 */
/**
 * A content change also refreshes the course itself: both course screens read
 * the lesson count (the empty-course publish and submit warnings, the co-tutor
 * outline) from the course DTO. The id tag reaches the tutor's slug-keyed copy
 * too, because every course detail is also tagged with its id (courseDetailTags).
 */
const contentTags = (courseId: UUID) => [
  { type: "Module" as const, id: courseId },
  { type: "Course" as const, id: courseId },
];

export const modulesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listModules: build.query<ModuleDto[], UUID>({
      query: (courseId) => ({ url: `/portal/courses/${courseId}/modules`, method: "GET" }),
      providesTags: (_r, _e, courseId) => [{ type: "Module", id: courseId }],
    }),

    addModule: build.mutation<ModuleDto, { courseId: UUID; body: ModuleUpsertRequest }>({
      query: ({ courseId, body }) => ({
        url: `/portal/courses/${courseId}/modules`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (_r, _e, a) => contentTags(a.courseId),
    }),

    updateModule: build.mutation<ModuleDto, { courseId: UUID; moduleId: UUID; body: ModuleUpsertRequest }>({
      query: ({ moduleId, body }) => ({ url: `/portal/modules/${moduleId}`, method: "PUT", data: body }),
      invalidatesTags: (_r, _e, a) => contentTags(a.courseId),
    }),

    deleteModule: build.mutation<void, { courseId: UUID; moduleId: UUID }>({
      query: ({ moduleId }) => ({ url: `/portal/modules/${moduleId}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, a) => contentTags(a.courseId),
    }),

    addLesson: build.mutation<LessonDto, { courseId: UUID; moduleId: UUID; body: LessonUpsertRequest }>({
      query: ({ moduleId, body }) => ({
        url: `/portal/modules/${moduleId}/lessons`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (_r, _e, a) => contentTags(a.courseId),
    }),

    updateLesson: build.mutation<LessonDto, { courseId: UUID; lessonId: UUID; body: LessonUpsertRequest }>({
      query: ({ lessonId, body }) => ({ url: `/portal/lessons/${lessonId}`, method: "PUT", data: body }),
      invalidatesTags: (_r, _e, a) => contentTags(a.courseId),
    }),

    deleteLesson: build.mutation<void, { courseId: UUID; lessonId: UUID }>({
      query: ({ lessonId }) => ({ url: `/portal/lessons/${lessonId}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, a) => contentTags(a.courseId),
    }),
  }),
  overrideExisting: false,
});

export const {
  useListModulesQuery,
  useAddModuleMutation,
  useUpdateModuleMutation,
  useDeleteModuleMutation,
  useAddLessonMutation,
  useUpdateLessonMutation,
  useDeleteLessonMutation,
} = modulesApi;
