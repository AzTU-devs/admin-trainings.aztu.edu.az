import type { PageRequest } from "@shared/types/api";
import type {
  CourseType,
  EnrollmentSource,
  EnrollmentStatus,
  UUID,
} from "@shared/types/lms";

/** Mirror of backend EnrollmentDto. */
export interface EnrollmentDto {
  id: UUID;
  userId: UUID;
  courseId: UUID;
  courseTitle: string;
  status: EnrollmentStatus;
  source: EnrollmentSource;
  enrolledAt: string;
  completedAt?: string;
  progressPercent: number;
  lastAccessedAt?: string;
}

/** The states an enrolment request is listed in (approved ones leave the list as enrolments). */
export type EnrollmentRequestStatus = Extract<EnrollmentStatus, "PENDING_APPROVAL" | "REJECTED">;

/**
 * Mirror of a row of `GET /api/portal/enrollment-requests`: one student's
 * request to join one course. `decidedAt`, `decidedByName` and
 * `rejectionReason` are null while it waits; the reason may stay null on a
 * rejection (it is optional).
 */
export interface EnrollmentRequestDto {
  enrollmentId: UUID;
  courseId: UUID;
  courseTitle: string;
  courseSlug: string;
  courseType: CourseType;
  studentId: UUID;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  requestedAt: string;
  status: EnrollmentRequestStatus;
  decidedAt: string | null;
  decidedByName: string | null;
  rejectionReason: string | null;
  /** Free seats of an in-person course now; null for an online course (no seat limit). */
  seatsLeft: number | null;
  /** A paid course: approving asks the student to pay before the place is theirs. */
  paid: boolean;
  price: number | null;
  currency: string | null;
}

export interface ListEnrollmentRequestsArgs extends PageRequest {
  status: EnrollmentRequestStatus;
  courseId?: UUID;
}
