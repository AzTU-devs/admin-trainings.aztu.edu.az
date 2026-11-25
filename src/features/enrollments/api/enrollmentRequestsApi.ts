import { baseApi } from "@lib/query/baseApi";
import type { ApiPage } from "@shared/types/api";
import type { EnrollmentRequestDto, ListEnrollmentRequestsArgs } from "@features/enrollments/types";

/**
 * Every list and count of enrolment requests. Ending a course (it rejects the
 * pending ones) invalidates it too; deleting one invalidates every Enrollment
 * entry, this included.
 */
export const ENROLLMENT_REQUESTS_TAG = { type: "Enrollment" as const, id: "REQUESTS" };

const courseEnrollmentsTag = (courseId: string) => ({
  type: "Enrollment" as const,
  id: `COURSE-${courseId}`,
});

/**
 * What a decision changes elsewhere. Both: the course's participants (the
 * row's status) and the student's profile page. An approval also seats the
 * student — or, on a paid course, starts their payment — so the course's
 * enrolled and seat counts, the expert's students, the attendance sheet and
 * register, and the dashboards' figures go stale as well. Invalidated on a
 * refusal too: a 409 means the request or the course changed meanwhile.
 */
const decidedTags = (
  r: Pick<EnrollmentRequestDto, "courseId" | "studentId">,
  approved: boolean,
) => [
  ENROLLMENT_REQUESTS_TAG,
  courseEnrollmentsTag(r.courseId),
  { type: "User" as const, id: `PROFILE-${r.studentId}` },
  ...(approved
    ? [
        { type: "Course" as const, id: r.courseId },
        { type: "Course" as const, id: "MINE" },
        { type: "Course" as const, id: "MODERATION" },
        { type: "Attendance" as const, id: `VIEW-${r.courseId}` },
        { type: "Attendance" as const, id: `REGISTER-${r.courseId}` },
        "Student" as const,
        "Analytics" as const,
      ]
    : []),
];

/**
 * Enrolment requests, decided by the course's owner (its editor, holding
 * `enrollment:approve` with an approval that stands) or the super admin.
 * Every enrolment a student asks for starts as PENDING_APPROVAL: no seat, no
 * order and no access until it is approved.
 */
export const enrollmentRequestsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * Backend `GET /api/portal/enrollment-requests` — the caller's own
     * courses (a super admin: every course), pending ones oldest first. A
     * roster co-expert's list leaves out the courses they do not own; anyone
     * who may not decide at all gets a 403.
     */
    listEnrollmentRequests: build.query<ApiPage<EnrollmentRequestDto>, ListEnrollmentRequestsArgs>({
      query: (params) => ({ url: "/portal/enrollment-requests", method: "GET", params }),
      // The courses shown too, so a participant added on one of them (the
      // admin's grant, which skips approval) refreshes the list.
      providesTags: (res) => [
        ENROLLMENT_REQUESTS_TAG,
        ...[...new Set(res?.content.map((r) => r.courseId) ?? [])].map(courseEnrollmentsTag),
      ],
    }),
    /**
     * Backend `POST /api/portal/enrollments/{enrollmentId}/approve`: a free
     * course → ACTIVE at once (an in-person one takes a seat, 409 COURSE_FULL
     * when none is left); a paid course → PENDING_PAYMENT and the payment flow.
     * The whole row goes in so its course and student can be refreshed.
     */
    approveEnrollmentRequest: build.mutation<unknown, EnrollmentRequestDto>({
      query: (r) => ({ url: `/portal/enrollments/${r.enrollmentId}/approve`, method: "POST" }),
      invalidatesTags: (_res, error, r) => decidedTags(r, !error),
    }),
    /** Backend `POST /api/portal/enrollments/{enrollmentId}/reject` — REJECTED, the reason optional. */
    rejectEnrollmentRequest: build.mutation<
      unknown,
      { request: EnrollmentRequestDto; reason?: string }
    >({
      query: ({ request, reason }) => ({
        url: `/portal/enrollments/${request.enrollmentId}/reject`,
        method: "POST",
        // `{}` without a reason: the body is optional in the contract, but
        // always sending one keeps the request well-formed for the API.
        data: reason ? { reason } : {},
      }),
      invalidatesTags: (_res, _error, { request }) => decidedTags(request, false),
    }),
  }),
  overrideExisting: false,
});

export const {
  useListEnrollmentRequestsQuery,
  useApproveEnrollmentRequestMutation,
  useRejectEnrollmentRequestMutation,
} = enrollmentRequestsApi;
