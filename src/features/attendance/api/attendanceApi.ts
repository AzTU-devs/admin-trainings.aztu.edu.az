import { baseApi } from "@lib/query/baseApi";
import type { UUID } from "@shared/types/lms";
import type {
  AttendanceDaySummary,
  AttendanceMark,
  AttendanceRecord,
  CourseAttendanceView,
  MarkAttendanceRequest,
} from "@features/attendance/types";

/** Every day of one course's attendance (each date is its own cache entry). */
const viewTag = (courseId: UUID) => ({ type: "Attendance" as const, id: `VIEW-${courseId}` });
/** The course's list of marked days and their counts. */
const daysTag = (courseId: UUID) => ({ type: "Attendance" as const, id: `DAYS-${courseId}` });

/**
 * Attendance for in-person (OFFLINE and ONE_TIME) courses, one course day at a
 * time. Experts on the course's roster read and add marks; admins read; a
 * super admin also changes and deletes them (`attendance:manage`).
 */
export const attendanceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * Backend `GET /api/portal/courses/{courseId}/attendance?date=YYYY-MM-DD`;
     * no date means today, clamped. `today` is not sent: the default view
     * names the Baku day it is asked on, so once the day turns it is a new
     * request (the API's today has moved on), not yesterday's from the cache.
     */
    getCourseAttendance: build.query<CourseAttendanceView, { courseId: UUID; date?: string; today?: string }>({
      query: ({ courseId, date }) => ({
        url: `/portal/courses/${courseId}/attendance`,
        method: "GET",
        params: date ? { date } : undefined,
      }),
      providesTags: (_r, _e, { courseId }) => [viewTag(courseId)],
    }),
    /** Backend `GET /api/portal/courses/{courseId}/attendance/days`. */
    listAttendanceDays: build.query<AttendanceDaySummary[], UUID>({
      query: (courseId) => ({ url: `/portal/courses/${courseId}/attendance/days`, method: "GET" }),
      providesTags: (_r, _e, courseId) => [daysTag(courseId)],
    }),
    /**
     * Backend `POST /api/portal/courses/{courseId}/attendance` — new marks for
     * one day, all or nothing. It answers with that day's view, which goes
     * straight into the cache (below), so only the marked days are refetched.
     * Refused — above all 409 ATTENDANCE_ALREADY_MARKED, when someone else
     * marked one of these students first — the day is refetched too, to show
     * what is there now.
     */
    markAttendance: build.mutation<CourseAttendanceView, { courseId: UUID; body: MarkAttendanceRequest }>({
      query: ({ courseId, body }) => ({ url: `/portal/courses/${courseId}/attendance`, method: "POST", data: body }),
      invalidatesTags: (result, _e, { courseId }) =>
        result ? [daysTag(courseId)] : [viewTag(courseId), daysTag(courseId)],
      async onQueryStarted({ courseId }, { dispatch, getState, queryFulfilled }): Promise<void> {
        let view: CourseAttendanceView;
        try {
          ({ data: view } = await queryFulfilled);
        } catch {
          return;
        }
        // The same day can be cached twice: asked for by date, and as the default "today".
        for (const args of attendanceApi.util.selectCachedArgsForQuery(getState(), "getCourseAttendance")) {
          if (args.courseId !== courseId) continue;
          dispatch(
            attendanceApi.util.updateQueryData("getCourseAttendance", args, (draft) =>
              draft.date === view.date ? view : undefined,
            ),
          );
        }
      },
    }),
    /** Backend `PATCH /api/super/attendance/{recordId}` — super admin only, audited. */
    changeAttendanceMark: build.mutation<AttendanceRecord, { courseId: UUID; recordId: UUID; status: AttendanceMark }>({
      query: ({ recordId, status }) => ({ url: `/super/attendance/${recordId}`, method: "PATCH", data: { status } }),
      // Success or not (a mark deleted meanwhile is a 404), the day is reloaded.
      invalidatesTags: (_r, _e, { courseId }) => [viewTag(courseId), daysTag(courseId)],
    }),
    /** Backend `DELETE /api/super/attendance/{recordId}` — super admin only, audited. */
    deleteAttendanceMark: build.mutation<void, { courseId: UUID; recordId: UUID }>({
      query: ({ recordId }) => ({ url: `/super/attendance/${recordId}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, { courseId }) => [viewTag(courseId), daysTag(courseId)],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCourseAttendanceQuery,
  useListAttendanceDaysQuery,
  useMarkAttendanceMutation,
  useChangeAttendanceMarkMutation,
  useDeleteAttendanceMarkMutation,
} = attendanceApi;
