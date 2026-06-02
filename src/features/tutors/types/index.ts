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
  approvalStatus: TutorApprovalStatus;
  approvedAt?: string;
  ratingAvg?: number;
  ratingCount: number;
  expertiseCategoryIds: UUID[];
}
