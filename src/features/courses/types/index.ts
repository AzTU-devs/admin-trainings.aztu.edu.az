import type { DayOfWeek } from "@shared/lib/weekdays";
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

/**
 * In-person schedule, shared by OFFLINE (a date range) and ONE_TIME (a single
 * date with start and end times) courses. The API sends `null` for anything
 * unset, which the types say out loud: a form that trusted `?:` here passed
 * those nulls straight to zod and blocked the save.
 */
export interface OfflineDetailsDto {
  startDate?: string | null;
  endDate?: string | null;
  /** "HH:mm" or "HH:mm:ss". */
  startTime?: string | null;
  endTime?: string | null;
  weeklyHours?: number | null;
  totalHours?: number | null;
  studentLimit?: number | null;
  enrolledCount?: number | null;
  city?: string | null;
  addressLine?: string | null;
  /**
   * The weekdays an OFFLINE course meets, Monday first; `[]` when not set (a
   * course from before they were asked for, and every ONE_TIME course).
   * Absent from an API older than it.
   */
  daysOfWeek?: DayOfWeek[] | null;
}

/** One entry of a course's syllabus; `description` is rich-text HTML. */
export interface SyllabusItemDto {
  title: string;
  description?: string | null;
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
  subtitle?: string | null;
  /** Rich-text HTML (or plain text on older courses), as are the next two. */
  description?: string | null;
  requirements?: string | null;
  learningOutcomes?: string | null;
  /** Legacy free-text syllabus; superseded by `syllabusItems`. */
  syllabus?: string | null;
  /** Ordered syllabus. Absent from APIs that predate it. */
  syllabusItems?: SyllabusItemDto[];
  thumbnailMediaId?: UUID | null;
  trailerMediaId?: UUID | null;
  courseType: CourseType;
  level: CourseLevel;
  language: string;
  free: boolean;
  price: number;
  currency: string;
  status: CourseStatus;
  publishedAt?: string;
  /**
   * When the course was ended (its students graduated); null while it runs.
   * Ending does not change `status`. Absent from an API older than it.
   */
  endedAt?: string | null;
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
  /** When the course was ended; null while it runs (see CourseDto). */
  endedAt?: string | null;
}

export interface CreateCourseRequest {
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  requirements?: string;
  learningOutcomes?: string;
  syllabus?: string;
  syllabusItems?: SyllabusItemDto[];
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
  /** Required when `courseType` is OFFLINE or ONE_TIME; rejected when it is ONLINE. */
  offlineDetails?: OfflineDetailsRequest;
  /** Optional for ONLINE; rejected for an in-person (OFFLINE / ONE_TIME) course. */
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
  /** "HH:mm". Required for ONE_TIME, optional daily times for OFFLINE. */
  startTime?: string;
  endTime?: string;
  weeklyHours?: number;
  totalHours?: number;
  studentLimit?: number;
  city?: string;
  addressLine?: string;
  /**
   * OFFLINE: the weekdays the course meets, Monday first, at least one
   * (400 OFFLINE_DAYS_REQUIRED), at least one of them within the dates
   * (400 NO_COURSE_DAYS_IN_RANGE). ONE_TIME: not sent; the API ignores it.
   */
  daysOfWeek?: DayOfWeek[];
}

/**
 * The backend's UpdateCourseRequest has no `courseType` — a course's type is
 * fixed at creation — but it does accept the type-specific detail blocks.
 */
export type UpdateCourseRequest = Partial<
  Omit<CreateCourseRequest, "slug" | "courseType">
> & {
  /**
   * A partial update reads a missing media id as "leave it", so removing the
   * cover or trailer needs these explicit flags.
   */
  clearThumbnail?: boolean;
  clearTrailer?: boolean;
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
  /**
   * Users seated on the course as it is created, each exactly as the admin
   * "add participant" action does (ADMIN_GRANT). At most 500; an unknown or
   * deleted user fails the whole create with 400 USER_NOT_FOUND.
   */
  participantUserIds?: UUID[];
}

/** Mirror of backend SetCourseTutorsRequest — a full roster replacement. */
export interface SetCourseTutorsRequest {
  tutorIds: UUID[];
  authorizedTutorId: UUID;
}

/**
 * Mirror of `GET /api/super/courses/{courseId}/deletion-impact` — what
 * deleting the course does, for the super admin's confirm.
 */
export interface CourseDeletionImpact {
  courseId: UUID;
  title: string;
  slug: string;
  status: CourseStatus;
  /** Enrolments that are cancelled, each student notified. */
  activeEnrollments: number;
  /** How many of those were paid: no refund is made automatically. */
  paidEnrollments: number;
  /** The course's room bookings still to come, released. */
  upcomingRoomBookings: number;
  /** Its long-term room bookings, removed with their sessions. */
  roomBookingSeries: number;
}
