import { baseApi } from "@lib/query/baseApi";
import type { ApiPage, PageRequest } from "@shared/types/api";
import type { UUID } from "@shared/types/lms";
import type {
  AddParticipantRequest,
  CourseParticipantDto,
} from "@features/participants/types";

interface ListArgs extends PageRequest {
  courseId: UUID;
}

/**
 * Admin roster management for a single course (`enrollment:manage`). Granting
 * access here is deliberate: it bypasses payment and the free-only rule, so it
 * is the sanctioned way to seat someone on a paid or unpublished course.
 */
export const participantsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listCourseParticipants: build.query<ApiPage<CourseParticipantDto>, ListArgs>({
      query: ({ courseId, ...params }) => ({ url: `/admin/courses/${courseId}/participants`, method: "GET", params }),
      providesTags: (_r, _e, a) => [{ type: "Enrollment", id: `COURSE-${a.courseId}` }],
    }),
    addCourseParticipant: build.mutation<CourseParticipantDto, { courseId: UUID; body: AddParticipantRequest }>({
      query: ({ courseId, body }) => ({ url: `/admin/courses/${courseId}/participants`, method: "POST", data: body }),
      // The course carries the enrolled count, so its cached copy goes stale too.
      invalidatesTags: (_r, _e, a) => [
        { type: "Enrollment", id: `COURSE-${a.courseId}` },
        { type: "Course", id: a.courseId },
      ],
    }),
    removeCourseParticipant: build.mutation<void, { courseId: UUID; userId: UUID }>({
      query: ({ courseId, userId }) => ({ url: `/admin/courses/${courseId}/participants/${userId}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, a) => [
        { type: "Enrollment", id: `COURSE-${a.courseId}` },
        { type: "Course", id: a.courseId },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListCourseParticipantsQuery,
  useAddCourseParticipantMutation,
  useRemoveCourseParticipantMutation,
} = participantsApi;
