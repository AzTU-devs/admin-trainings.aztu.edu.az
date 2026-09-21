import type {
  CourseLevel,
  CourseStatus,
  CourseType,
  LessonContentType,
  UUID,
} from "@shared/types/lms";

/** Mirror of backend LessonDto. */
export interface LessonDto {
  id: UUID;
  title: string;
  description?: string;
  contentType: LessonContentType;
  videoMediaId?: UUID;
  videoUrl?: string;
  durationSeconds: number;
  orderIndex: number;
  preview: boolean;
}

/** Mirror of backend ModuleDto. */
export interface ModuleDto {
  id: UUID;
  title: string;
  description?: string;
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
  videoUrl?: string;
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
  startDate?: string;
  endDate?: string;
  weeklyHours?: number;
  totalHours?: number;
  studentLimit?: number;
  enrolledCount?: number;
  city?: string;
  addressLine?: string;
}

/** Mirror of backend CourseTutorDto — one tutor on a course's teaching roster. */
export interface CourseTutorDto {
  tutorId: UUID;
  displayName?: string;
  /** The single tutor allowed to edit this course. */
  authorized: boolean;
}

/** Mirror of backend CourseDto (full detail). */
export interface CourseDto {
  id: UUID;
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
  status: CourseStatus;
  publishedAt?: string;
  ratingAvg?: number;
  ratingCount: number;
  enrolledCount: number;
  tutorId: UUID;
  tutorDisplayName?: string;
  /** Full teaching roster; `tutorId` above is the one authorised to edit. */
  tutors: CourseTutorDto[];
  categoryIds: UUID[];
  tagIds: UUID[];
  onlineDetails?: OnlineDetailsDto;
  offlineDetails?: OfflineDetailsDto;
  modules: ModuleDto[];
}

/** Mirror of backend CourseSummaryDto (catalog card). */
export interface CourseSummaryDto {
  id: UUID;
  slug: string;
  title: string;
  subtitle?: string;
  courseType: CourseType;
  level: CourseLevel;
  language: string;
  free: boolean;
  price: number;
  currency: string;
  status: CourseStatus;
  ratingAvg?: number;
  ratingCount: number;
  enrolledCount: number;
  tutorId: UUID;
  tutorDisplayName?: string;
  publishedAt?: string;
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
export type UpdateCourseRequest = Partial<
  Omit<CreateCourseRequest, "slug" | "courseType">
>;

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
