import { baseApi } from "@lib/query/baseApi";
import type { UUID } from "@shared/types/lms";
import type {
  CertificateTutor,
  CourseGraduationView,
  EndCourseRequest,
  IssueCertificatesRequest,
  RevokedCertificate,
} from "@features/certificates/types";

/** The course's graduation view. */
const graduationTag = (courseId: UUID) => ({ type: "Certificate" as const, id: `COURSE-${courseId}` });

/**
 * What ending a course or graduating students changes elsewhere: every course
 * read carries `endedAt` (the lists' "Ended" badge, the expert's page by its
 * slug, which is not known here — hence the whole type), and the graduates'
 * enrolments are COMPLETED now (the course's participants, the students lists,
 * the dashboards' completion figures). Ending a course also rejects its
 * pending enrolment requests, so the request lists and counts go stale too.
 */
const graduatedTags = (courseId: UUID) =>
  [
    "Course",
    { type: "Enrollment" as const, id: `COURSE-${courseId}` },
    { type: "Enrollment" as const, id: "REQUESTS" },
    "Student",
    "Analytics",
  ] as const;

/**
 * Ending a course, graduating its students and their certificates. The
 * certificates themselves are drawn, verified and turned into PDFs by the
 * website; the dashboard keeps the records and links there.
 */
export const certificatesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * Backend `GET /api/portal/courses/{courseId}/graduation` — the course's
     * roster experts with course:end, the super admin, and admins (read only).
     * The students' attendance is the register's, so a change of a mark
     * refreshes this too; so does a participant added or removed.
     */
    getCourseGraduation: build.query<CourseGraduationView, UUID>({
      query: (courseId) => ({ url: `/portal/courses/${courseId}/graduation`, method: "GET" }),
      providesTags: (_r, _e, courseId) => [
        graduationTag(courseId),
        { type: "Attendance", id: `REGISTER-${courseId}` },
        { type: "Enrollment", id: `COURSE-${courseId}` },
      ],
    }),
    /**
     * Backend `POST /api/portal/courses/{courseId}/end` — ends the course and
     * graduates the listed enrolments. It answers with the view, which goes
     * straight into the cache. Refused (ended meanwhile, a student no longer
     * graduatable), the view is fetched again to show what is there now.
     */
    endCourse: build.mutation<CourseGraduationView, { courseId: UUID; body: EndCourseRequest }>({
      query: ({ courseId, body }) => ({ url: `/portal/courses/${courseId}/end`, method: "POST", data: body }),
      invalidatesTags: (result, _e, { courseId }) => (result ? [...graduatedTags(courseId)] : [graduationTag(courseId)]),
      onQueryStarted: putViewInCache,
    }),
    /** Backend `POST /api/portal/courses/{courseId}/certificates` — graduates more students of an ended course. */
    issueCertificates: build.mutation<CourseGraduationView, { courseId: UUID; body: IssueCertificatesRequest }>({
      query: ({ courseId, body }) => ({ url: `/portal/courses/${courseId}/certificates`, method: "POST", data: body }),
      invalidatesTags: (result, _e, { courseId }) => (result ? [...graduatedTags(courseId)] : [graduationTag(courseId)]),
      onQueryStarted: putViewInCache,
    }),
    /**
     * Backend `POST /api/super/courses/{courseId}/reopen` — undoes an ending
     * made by mistake; certificates issued stay valid. The course takes
     * enrolments again, so every course read is refreshed.
     */
    reopenCourse: build.mutation<CourseGraduationView, { courseId: UUID }>({
      query: ({ courseId }) => ({ url: `/super/courses/${courseId}/reopen`, method: "POST" }),
      invalidatesTags: (result, _e, { courseId }) => (result ? ["Course"] : [graduationTag(courseId)]),
      onQueryStarted: putViewInCache,
    }),
    /**
     * Backend `PUT /api/super/courses/{courseId}/certificate-tutors` — the
     * experts printed on certificates issued from now on, in order; `[]` goes
     * back to the default. The answer is the new list, written into the view.
     */
    setCertificateTutors: build.mutation<CertificateTutor[], { courseId: UUID; tutorIds: UUID[] }>({
      query: ({ courseId, tutorIds }) => ({
        url: `/super/courses/${courseId}/certificate-tutors`,
        method: "PUT",
        data: { tutorIds },
      }),
      invalidatesTags: (result, _e, { courseId }) => (result ? [] : [graduationTag(courseId)]),
      async onQueryStarted({ courseId }, { dispatch, queryFulfilled }): Promise<void> {
        let tutors: CertificateTutor[];
        try {
          ({ data: tutors } = await queryFulfilled);
        } catch {
          return;
        }
        dispatch(
          certificatesApi.util.updateQueryData("getCourseGraduation", courseId, (draft) => {
            draft.certificateTutors = tutors;
          }),
        );
      },
    }),
    /**
     * Backend `POST /api/super/certificates/{certificateId}/revoke`. The
     * enrolment stays COMPLETED and the student can be graduated again. The
     * course id is only for refreshing its view, success or not (revoked
     * meanwhile is a 409).
     */
    revokeCertificate: build.mutation<RevokedCertificate, { courseId: UUID; certificateId: UUID; reason: string }>({
      query: ({ certificateId, reason }) => ({
        url: `/super/certificates/${certificateId}/revoke`,
        method: "POST",
        data: { reason },
      }),
      invalidatesTags: (_r, _e, { courseId }) => [graduationTag(courseId)],
    }),
  }),
  overrideExisting: false,
});

/** The view a write answered with replaces the cached one, so the page changes without a refetch. */
async function putViewInCache(
  { courseId }: { courseId: UUID },
  {
    dispatch,
    queryFulfilled,
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch: (action: any) => unknown;
    queryFulfilled: Promise<{ data: CourseGraduationView }>;
  },
): Promise<void> {
  let view: CourseGraduationView;
  try {
    ({ data: view } = await queryFulfilled);
  } catch {
    return;
  }
  dispatch(certificatesApi.util.upsertQueryData("getCourseGraduation", courseId, view));
}

export const {
  useGetCourseGraduationQuery,
  useEndCourseMutation,
  useIssueCertificatesMutation,
  useReopenCourseMutation,
  useSetCertificateTutorsMutation,
  useRevokeCertificateMutation,
} = certificatesApi;
