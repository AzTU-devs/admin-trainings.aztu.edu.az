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
  /**
   * The expert's own areas: free-text labels beside the catalogue categories
   * (they create no category). Always an array from an API that has the field;
   * absent from older builds, so read it as `?? []`.
   */
  customExpertise?: string[];
}

/**
 * Mirror of the backend's shared update request for `PATCH /api/portal/tutor/me`
 * and `PATCH /api/admin/tutors/{tutorId}`.
 *
 * Merge-patch: an absent key leaves the stored value alone, while `null` — or
 * `""` for text — clears it. `expertiseCategoryIds` and `customExpertise` each
 * replace their list when sent (`[]` clears it); together they must leave at
 * least one area. Approval status is deliberately not here: it moves only
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
  /** The expert's own areas, normalised by the API (trimmed, de-duplicated). */
  customExpertise?: string[];
}
