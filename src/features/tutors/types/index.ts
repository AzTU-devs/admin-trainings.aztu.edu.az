import type { TutorApprovalStatus, UUID } from "@shared/types/lms";

export type { TutorApprovalStatus };

/** Mirror of backend TutorProfileDto. */
export interface TutorProfileDto {
  id: UUID;
  userId: UUID;
  firstName: string;
  lastName: string;
  headline?: string;
  bio?: string;
  yearsExperience?: number;
  websiteUrl?: string;
  linkedinUrl?: string;
  /** The stored photo. Admin screens preview it through the authenticated media route. */
  avatarMediaId?: UUID;
  /**
   * `/api/public/media/{id}/content`, or null without a photo. The API serves it
   * anonymously only while the tutor is APPROVED; for anyone else it is a 404.
   */
  avatarUrl?: string | null;
  academicTitle?: string;
  department?: string;
  /** Free text, one qualification per line. */
  education?: string;
  /** Free text, one certification per line. */
  certifications?: string;
  languages?: string;
  googleScholarUrl?: string;
  researchGateUrl?: string;
  orcid?: string;
  githubUrl?: string;
  approvalStatus: TutorApprovalStatus;
  approvedAt?: string;
  ratingAvg?: number;
  ratingCount: number;
  expertiseCategoryIds: UUID[];
}

/**
 * Mirror of the backend's shared update request for `PATCH /api/portal/tutor/me`
 * and `PATCH /api/admin/tutors/{tutorId}`.
 *
 * Merge-patch: an absent key leaves the stored value alone, while `null` — or
 * `""` for text — clears it. `expertiseCategoryIds` replaces the areas when sent
 * and may not be empty. Approval status is deliberately not here: it moves only
 * through the decision endpoint.
 */
export interface UpdateTutorProfileRequest {
  headline?: string;
  bio?: string;
  yearsExperience?: number | null;
  websiteUrl?: string;
  linkedinUrl?: string;
  avatarMediaId?: UUID | null;
  academicTitle?: string;
  department?: string;
  education?: string;
  certifications?: string;
  languages?: string;
  googleScholarUrl?: string;
  researchGateUrl?: string;
  orcid?: string;
  githubUrl?: string;
  expertiseCategoryIds?: UUID[];
}
