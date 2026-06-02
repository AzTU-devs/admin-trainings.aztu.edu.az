/**
 * Cross-feature LMS enums — mirror the Spring Boot `common.enums` package exactly.
 */

export const COURSE_STATUS = {
  DRAFT: "DRAFT",
  IN_REVIEW: "IN_REVIEW",
  PUBLISHED: "PUBLISHED",
  REJECTED: "REJECTED",
  ARCHIVED: "ARCHIVED",
} as const;
export type CourseStatus = (typeof COURSE_STATUS)[keyof typeof COURSE_STATUS];

export const COURSE_TYPE = {
  ONLINE: "ONLINE",
  OFFLINE: "OFFLINE",
} as const;
export type CourseType = (typeof COURSE_TYPE)[keyof typeof COURSE_TYPE];

export const COURSE_LEVEL = {
  BEGINNER: "BEGINNER",
  INTERMEDIATE: "INTERMEDIATE",
  ADVANCED: "ADVANCED",
  ALL: "ALL",
} as const;
export type CourseLevel = (typeof COURSE_LEVEL)[keyof typeof COURSE_LEVEL];

export const ROOM_STATUS = {
  AVAILABLE: "AVAILABLE",
  MAINTENANCE: "MAINTENANCE",
  RESERVED: "RESERVED",
  RETIRED: "RETIRED",
} as const;
export type RoomStatus = (typeof ROOM_STATUS)[keyof typeof ROOM_STATUS];

export const BOOKING_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;
export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export type BookingDecision = "APPROVED" | "REJECTED";

export const TUTOR_APPROVAL_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
} as const;
export type TutorApprovalStatus =
  (typeof TUTOR_APPROVAL_STATUS)[keyof typeof TUTOR_APPROVAL_STATUS];

export const ENROLLMENT_STATUS = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
} as const;
export type EnrollmentStatus =
  (typeof ENROLLMENT_STATUS)[keyof typeof ENROLLMENT_STATUS];

export type EnrollmentSource = "PURCHASE" | "FREE" | "ADMIN_GRANT";

export const NOTIFICATION_CHANNEL = {
  IN_APP: "IN_APP",
  EMAIL: "EMAIL",
  SMS: "SMS",
  WEBSOCKET: "WEBSOCKET",
} as const;
export type NotificationChannel =
  (typeof NOTIFICATION_CHANNEL)[keyof typeof NOTIFICATION_CHANNEL];

export const NOTIFICATION_STATUS = {
  PENDING: "PENDING",
  SENT: "SENT",
  FAILED: "FAILED",
  READ: "READ",
} as const;
export type NotificationStatus =
  (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS];

export type LessonProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export const LESSON_CONTENT_TYPE = {
  VIDEO: "VIDEO",
  TEXT: "TEXT",
  PDF: "PDF",
  QUIZ: "QUIZ",
  LIVE_SESSION: "LIVE_SESSION",
} as const;
export type LessonContentType =
  (typeof LESSON_CONTENT_TYPE)[keyof typeof LESSON_CONTENT_TYPE];

/** Common UUID alias — all backend identifiers are UUID strings. */
export type UUID = string;
