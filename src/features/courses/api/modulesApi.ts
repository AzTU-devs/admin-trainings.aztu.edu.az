import { baseApi } from "@lib/query/baseApi";
import type { UUID } from "@shared/types/lms";
import type {
  LessonDto,
  LessonUpsertRequest,
  ModuleDto,
  ModuleUpsertRequest,
} from "@features/courses/types";

/**
 * Tutor course-content management — modules & lessons.
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
      invalidatesTags: (_r, _e, a) => [{ type: "Module", id: a.courseId }],
    }),

    updateModule: build.mutation<ModuleDto, { courseId: UUID; moduleId: UUID; body: ModuleUpsertRequest }>({
      query: ({ moduleId, body }) => ({ url: `/portal/modules/${moduleId}`, method: "PUT", data: body }),
      invalidatesTags: (_r, _e, a) => [{ type: "Module", id: a.courseId }],
    }),

    deleteModule: build.mutation<void, { courseId: UUID; moduleId: UUID }>({
      query: ({ moduleId }) => ({ url: `/portal/modules/${moduleId}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, a) => [{ type: "Module", id: a.courseId }],
    }),

    addLesson: build.mutation<LessonDto, { courseId: UUID; moduleId: UUID; body: LessonUpsertRequest }>({
      query: ({ moduleId, body }) => ({
        url: `/portal/modules/${moduleId}/lessons`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (_r, _e, a) => [{ type: "Module", id: a.courseId }],
    }),

    updateLesson: build.mutation<LessonDto, { courseId: UUID; lessonId: UUID; body: LessonUpsertRequest }>({
      query: ({ lessonId, body }) => ({ url: `/portal/lessons/${lessonId}`, method: "PUT", data: body }),
      invalidatesTags: (_r, _e, a) => [{ type: "Module", id: a.courseId }],
    }),

    deleteLesson: build.mutation<void, { courseId: UUID; lessonId: UUID }>({
      query: ({ lessonId }) => ({ url: `/portal/lessons/${lessonId}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, a) => [{ type: "Module", id: a.courseId }],
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
