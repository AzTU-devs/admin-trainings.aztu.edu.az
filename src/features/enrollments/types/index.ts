import type {
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
