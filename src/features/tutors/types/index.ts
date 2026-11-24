import type { TutorApprovalStatus, UUID } from "@shared/types/lms";

export type { TutorApprovalStatus };

/** One place the expert studied, in the order the expert lists them. */
export interface EducationEntry {
  institution: string;
  degree: string | null;
  startYear: number;
  /** Null while still studying ("present"); may be up to ten years ahead (expected graduation). */
  endYear: number | null;
}

/** One position the expert held, in the order the expert lists them. */
export interface ExperienceEntry {
  company: string;
  position: string;
  startYear: number;
  /** Null for the role held now ("present"). */
  endYear: number | null;
  /** Plain text. */
  description: string | null;
}

/**
 * One certificate on the expert profile, with its PDF. Added and deleted one at
 * a time through its own endpoints, never through the profile PATCH.
 */
export interface TutorCertificate {
  id: UUID;
  title: string;
  issuer: string | null;
  issuedYear: number | null;
  mediaId: UUID;
  /** `/api/public/media/{mediaId}/content`: public only while the expert is APPROVED. */
  fileUrl: string;
  createdAt: string;
}

/** Body of `POST …/certificates`; the PDF is uploaded to `/media` first. */
export interface CreateCertificateRequest {
  title: string;
  issuer?: string;
  issuedYear?: number;
  mediaId: UUID;
}

/** What an award's file is, as the API derives it from the stored type. */
export type AwardFileKind = "PDF" | "IMAGE";

/**
 * One award (Təltif) on the expert profile, named in both languages, with an
 * optional PDF or image. Like a certificate, added and deleted one at a time
 * through its own endpoints, never through the profile PATCH.
 */
export interface TutorAward {
  id: UUID;
  nameAz: string;
  nameEn: string;
  /** Null for an award without a file; then `fileUrl` and `fileKind` are null too. */
  mediaId: UUID | null;
  /** `/api/public/media/{mediaId}/content`: public only while the expert is APPROVED. */
  fileUrl: string | null;
  fileKind: AwardFileKind | null;
  createdAt: string;
}

/** Body of `POST …/awards`; a file is uploaded to `/media` first, and left out when there is none. */
export interface CreateAwardRequest {
  nameAz: string;
  nameEn: string;
  mediaId?: UUID;
}

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
  /** The stored CV (a PDF). Like the photo, it is public only while the expert is APPROVED. */
  cvMediaId?: UUID | null;
  /** `/api/public/media/{id}/content`, or null without a CV. */
  cvUrl?: string | null;
  /**
   * The structured lists. Always arrays from an API that has them, absent from
   * older builds — read them as `?? []`. Where a list is empty, the public page
   * still shows the old free-text `education` / `certifications` above.
   */
  educationEntries?: EducationEntry[];
  experienceEntries?: ExperienceEntry[];
  /** Oldest first, as the API sorts them. */
  certificates?: TutorCertificate[];
  /** Oldest first, like the certificates. Absent from builds before awards: read as `?? []`. */
  awards?: TutorAward[];
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
  /** An uploaded PDF, or null to remove the CV. */
  cvMediaId?: UUID | null;
  /** Each replaces its whole list when sent, in the order given; `[]` clears it. */
  educationEntries?: EducationEntry[];
  experienceEntries?: ExperienceEntry[];
}
