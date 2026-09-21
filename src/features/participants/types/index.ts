import type {
  EnrollmentSource,
  EnrollmentStatus,
  UUID,
} from "@shared/types/lms";

/**
 * Mirror of the backend course-participant row — one person enrolled on a
 * course. `userId` identifies the row: the roster is unique per user+course,
 * and it is what the remove call addresses.
 */
export interface CourseParticipantDto {
  userId: UUID;
  fullName: string;
  email: string;
  avatarUrl?: string;
  status: EnrollmentStatus;
  source?: EnrollmentSource;
  enrolledAt: string;
}

/** The backend takes either identifier; the dashboard always sends the email. */
export interface AddParticipantRequest {
  userId?: UUID;
  email?: string;
}
