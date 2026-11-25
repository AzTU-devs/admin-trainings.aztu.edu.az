import type { CourseType, EnrollmentStatus, UUID } from "@shared/types/lms";

/**
 * A student's certificate as the graduation view lists it. A revoked one
 * stays listed (with `revokedAt`) until the student is graduated again and a
 * new one takes its place.
 */
export interface CertificateRef {
  id: UUID;
  /** The public identifier: 12 Crockford base32 characters, printed AZTU-XXXX-XXXX-XXXX. */
  code: string;
  issuedAt: string;
  revokedAt: string | null;
}

/** An expert whose name the super admin chose to print on the course's certificates. */
export interface CertificateTutor {
  tutorId: UUID;
  displayName: string;
}

/** The register's counts for an in-person course; `percent` is null while nothing is marked. */
export interface GraduationAttendance {
  present: number;
  late: number;
  absent: number;
  excused: number;
  percent: number | null;
}

/** One ACTIVE or COMPLETED enrolment, in the attendance register's order. */
export interface GraduationStudent {
  enrollmentId: UUID;
  studentId: UUID;
  firstName: string;
  lastName: string;
  email: string;
  enrollmentStatus: EnrollmentStatus;
  /** In-person courses only. */
  attendance: GraduationAttendance | null;
  /** ONLINE courses only. */
  progressPercent: number | null;
  certificate: CertificateRef | null;
}

/**
 * Mirror of `GET /api/portal/courses/{courseId}/graduation`, which the end,
 * issue and reopen calls answer with as well.
 */
export interface CourseGraduationView {
  courseId: UUID;
  courseTitle: string;
  courseType: CourseType;
  startDate: string | null;
  endDate: string | null;
  /** Null while the course runs. */
  endedAt: string | null;
  endedByName: string | null;
  /** May end the course now (a roster expert with course:end, or the super admin). */
  canEnd: boolean;
  /** May graduate more students of an ended course. */
  canIssue: boolean;
  /** certificate:manage — revoke, reopen, choose the printed names. */
  canManage: boolean;
  /** The super admin's choice, in order; empty means the default (the course's editor). */
  certificateTutors: CertificateTutor[];
  students: GraduationStudent[];
}

/** Body of `POST /api/portal/courses/{courseId}/end`; an empty list ends it without graduating anyone. */
export interface EndCourseRequest {
  graduateEnrollmentIds: UUID[];
}

/** Body of `POST /api/portal/courses/{courseId}/certificates`. */
export interface IssueCertificatesRequest {
  enrollmentIds: UUID[];
}

/** Body of `PUT /api/super/courses/{courseId}/certificate-tutors`; `[]` goes back to the default. */
export interface SetCertificateTutorsRequest {
  tutorIds: UUID[];
}

/** What `POST /api/super/certificates/{id}/revoke` answers with (only the fields read here). */
export type RevokedCertificate = CertificateRef & { revokeReason?: string | null };
