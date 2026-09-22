import type {
  CourseLevel,
  CourseStatus,
  CourseType,
  LessonContentType,
  UUID,
} from "@shared/types/lms";

/*
 * Nullability: the API serializes an unset column as an explicit JSON `null`,
 * never by leaving the key out. Typing those fields `?: T` told the compiler they
 * could only be absent, so `thumbnailMediaId: initial?.thumbnailMediaId` passed
 * the type check while handing zod a null its `.optional()` schema rejects —
 * which silently blocked "Update course" for almost every course. Fields the API
 * can return as null are typed `T | null` so every consumer has to decide.
 */

/** Mirror of backend LessonDto. */
export interface LessonDto {
  id: UUID;
  title: string;
  description?: string | null;
  contentType: LessonContentType;
  videoMediaId?: UUID | null;
  /** Meeting link / external video. A lesson PUT is a full replacement: resend it. */
  videoUrl?: string | null;
  durationSeconds: number;
  orderIndex: number;
  preview: boolean;
}

/** Mirror of backend ModuleDto. */
export interface ModuleDto {
  id: UUID;
  title: string;
  description?: string | null;
  orderIndex: number;
  lessons: LessonDto[];
}

/** Mirror of backend ModuleUpsertRequest. */
export interface ModuleUpsertRequest {
  title: string;
  description?: string;
  orderIndex: number;
}

/** Mirror of backend LessonUpsertRequest. */
export interface LessonUpsertRequest {
  title: string;
  description?: string;
  contentType: LessonContentType;
  videoMediaId?: UUID;
  /** null clears it — the PUT replaces the whole lesson. */
  videoUrl?: string | null;
  durationSeconds: number;
  orderIndex: number;
  preview: boolean;
}

export interface OnlineDetailsDto {
  totalVideoSeconds: number;
  hasCertificate: boolean;
  dripEnabled: boolean;
}

export interface OfflineDetailsDto {
  startDate?: string | null;
  endDate?: string | null;
  weeklyHours?: number | null;
  totalHours?: number | null;
  studentLimit?: number | null;
  enrolledCount?: number | null;
  city?: string | null;
  addressLine?: string | null;
}

/** Mirror of backend CourseTutorDto — one tutor on a course's teaching roster. */
export interface CourseTutorDto {
  tutorId: UUID;
  displayName?: string | null;
  /** The single tutor allowed to edit this course. */
  authorized: boolean;
}

/** Mirror of backend CourseDto (full detail). */
export interface CourseDto {
  id: UUID;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  requirements?: string | null;
  learningOutcomes?: string | null;
  syllabus?: string | null;
  thumbnailMediaId?: UUID | null;
  trailerMediaId?: UUID | null;
  courseType: CourseType;
  level: CourseLevel;
  language: string;
  free: boolean;
  price: number;
  currency: string;
  status: CourseStatus;
  publishedAt?: string | null;
  /** When it was last submitted for review; null if never. */
  submittedAt?: string | null;
  /** The moderator's note when it was sent back — for its tutors and staff only. */
  rejectionReason?: string | null;
  ratingAvg?: number | null;
  ratingCount: number;
  enrolledCount: number;
  tutorId: UUID;
  tutorDisplayName?: string | null;
  /** Full teaching roster; `tutorId` above is the one authorised to edit. */
  tutors: CourseTutorDto[];
  categoryIds: UUID[];
  tagIds: UUID[];
  onlineDetails?: OnlineDetailsDto | null;
  offlineDetails?: OfflineDetailsDto | null;
  modules: ModuleDto[];
  /**
   * Optimistic-lock version. Sent back on PATCH, a save based on an out-of-date
   * copy is refused with 409 STALE_RESOURCE. Absent on an API that predates it.
   */
  version?: number;
}

/** Mirror of backend CourseSummaryDto (catalog card). */
export interface CourseSummaryDto {
  id: UUID;
  slug: string;
  title: string;
  subtitle?: string | null;
  courseType: CourseType;
  level: CourseLevel;
  language: string;
  free: boolean;
  price: number;
  currency: string;
  status: CourseStatus;
  ratingAvg?: number | null;
  ratingCount: number;
  enrolledCount: number;
  tutorId: UUID;
  tutorDisplayName?: string | null;
  publishedAt?: string | null;
  submittedAt?: string | null;
  rejectionReason?: string | null;
  /** Present on the API's summary; lets the tutor list tell owned rows from co-taught ones. */
  tutors?: CourseTutorDto[] | null;
}

export interface CreateCourseRequest {
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  requirements?: string;
  learningOutcomes?: string;
  syllabus?: string;
  thumbnailMediaId?: UUID;
  trailerMediaId?: UUID;
  courseType: CourseType;
  level: CourseLevel;
  language: string;
  free: boolean;
  price: number;
  currency: string;
  categoryIds: UUID[];
  tagIds?: UUID[];
  /** Required when `courseType` is OFFLINE; rejected when it is ONLINE. */
  offlineDetails?: OfflineDetailsRequest;
  /** Optional for ONLINE; rejected when the course is OFFLINE. */
  onlineDetails?: OnlineDetailsRequest;
}

/** Write shape — `totalVideoSeconds` is derived from the lessons server-side. */
export interface OnlineDetailsRequest {
  hasCertificate: boolean;
  dripEnabled: boolean;
}

/** Write shape — `enrolledCount` is owned by the server. */
export interface OfflineDetailsRequest {
  startDate?: string;
  endDate?: string;
  weeklyHours?: number;
  totalHours?: number;
  studentLimit?: number;
  city?: string;
  addressLine?: string;
}

/**
 * The backend's UpdateCourseRequest has no `courseType` — a course's type is
 * fixed at creation — but it does accept the type-specific detail blocks.
 */
export type UpdateCourseRequest = Partial<Omit<CreateCourseRequest, "slug" | "courseType">> & {
  /**
   * Remove the cover / the trailer. An absent media id means "keep", so without
   * these a removal saved as "keep" and the form said "Saved".
   */
  clearThumbnail?: boolean;
  clearTrailer?: boolean;
  /** The course version this edit is based on (see CourseDto.version). */
  version?: number;
};

/**
 * Mirror of backend AdminCreateCourseRequest. The tutors are stated explicitly
 * rather than inferred from the caller: an admin has no tutor profile of their
 * own, and the course belongs to the university whoever teaches it.
 */
export interface AdminCreateCourseRequest {
  course: CreateCourseRequest;
  tutorIds: UUID[];
  /** The tutor allowed to edit the course. Must be one of `tutorIds`. */
  authorizedTutorId: UUID;
}

/** Mirror of backend SetCourseTutorsRequest — a full roster replacement. */
export interface SetCourseTutorsRequest {
  tutorIds: UUID[];
  authorizedTutorId: UUID;
}
