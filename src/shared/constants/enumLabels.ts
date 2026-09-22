import type {
  BookingStatus,
  CourseLevel,
  CourseStatus,
  CourseType,
  EnrollmentSource,
  EnrollmentStatus,
  LessonContentType,
  NotificationChannel,
  NotificationStatus,
  RoomStatus,
  TutorApprovalStatus,
} from "@shared/types/lms";
import type { Role } from "@shared/constants/roles";

/*
 * How every API enum code is named on screen: one map for the whole dashboard.
 *
 * Tables and badges printed the raw codes (ACTIVE, IN_APP, READY, FAILED LOGIN,
 * ADMIN GRANT) beside forms that said "Active", and each screen that did fix it
 * kept its own little map, so the same status could read three ways. Every
 * label lives here now; screens keep only their colours.
 *
 * `satisfies Record<Code, string>` makes the compiler insist on a label for
 * every code the dashboard knows. Codes the API has and the dashboard's types
 * don't (yet) still get a label here, and `enumLabel` humanizes anything else
 * rather than print it raw.
 */
export const ENUM_LABELS = {
  /** İştirakçi (participant) is the platform's own term. */
  role: {
    USER: "İştirakçi",
    TUTOR: "Tutor",
    ADMIN: "Admin",
    SUPER_ADMIN: "Super admin",
  } satisfies Record<Role, string>,

  courseType: {
    ONLINE: "Online",
    OFFLINE: "Offline",
  } satisfies Record<CourseType, string>,

  courseLevel: {
    BEGINNER: "Beginner",
    INTERMEDIATE: "Intermediate",
    ADVANCED: "Advanced",
    ALL: "All levels",
  } satisfies Record<CourseLevel, string>,

  courseStatus: {
    DRAFT: "Draft",
    IN_REVIEW: "In review",
    PUBLISHED: "Published",
    REJECTED: "Rejected",
    ARCHIVED: "Archived",
  } satisfies Record<CourseStatus, string>,

  lessonContentType: {
    VIDEO: "Video",
    TEXT: "Text",
    PDF: "PDF",
    QUIZ: "Quiz",
    LIVE_SESSION: "Live session",
  } satisfies Record<LessonContentType, string>,

  enrollmentStatus: {
    PENDING_PAYMENT: "Awaiting payment",
    ACTIVE: "Active",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    REFUNDED: "Refunded",
  } satisfies Record<EnrollmentStatus, string>,

  /** How someone came to be on a course. */
  enrollmentSource: {
    PURCHASE: "Paid",
    FREE: "Free enrolment",
    ADMIN_GRANT: "Added by an admin",
  } satisfies Record<EnrollmentSource, string>,

  bookingStatus: {
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    CANCELLED: "Cancelled",
  } satisfies Record<BookingStatus, string>,

  roomStatus: {
    AVAILABLE: "Available",
    MAINTENANCE: "Maintenance",
    RESERVED: "Reserved",
    RETIRED: "Retired",
  } satisfies Record<RoomStatus, string>,

  tutorApprovalStatus: {
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    SUSPENDED: "Suspended",
  } satisfies Record<TutorApprovalStatus, string>,

  /**
   * An account's status. The admin user list says DISABLED for what /auth/me
   * (the profile) calls SUSPENDED; both are the same switch, so both read "Disabled".
   */
  userStatus: {
    ACTIVE: "Active",
    DISABLED: "Disabled",
    SUSPENDED: "Disabled",
    LOCKED: "Locked out",
    PENDING: "Pending",
    DELETED: "Deleted",
  },

  notificationChannel: {
    IN_APP: "In-app",
    EMAIL: "Email",
    SMS: "SMS",
    WEBSOCKET: "Live",
  } satisfies Record<NotificationChannel, string>,

  notificationStatus: {
    PENDING: "Pending",
    SENT: "Sent",
    FAILED: "Failed",
    READ: "Read",
  } satisfies Record<NotificationStatus, string>,

  /** The video library's view of an upload (the API folds UPLOADED into PROCESSING). */
  videoStatus: {
    UPLOADING: "Uploading",
    PROCESSING: "Processing",
    READY: "Ready",
    FAILED: "Failed",
  },

  /** Security events and system incidents share one scale. */
  severity: {
    INFO: "Info",
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
  },

  securityEventKind: {
    FAILED_LOGIN: "Failed sign-in",
    LOCKOUT: "Account locked out",
    ACCOUNT_UNLOCKED: "Account unlocked",
    PASSWORD_CHANGE: "Password changed",
    TOKEN_REVOKED: "Session revoked",
    SUSPICIOUS_LOGIN: "Suspicious sign-in",
    IP_BLOCKED: "IP address blocked",
    IP_UNBLOCKED: "IP address unblocked",
    MFA_ENROLLED: "Two-factor sign-in turned on",
    MFA_REMOVED: "Two-factor sign-in turned off",
    RATE_LIMIT_TRIPPED: "Rate limit reached",
    ROLE_CHANGED: "Roles changed",
  },

  auditAction: {
    CREATE: "Created",
    UPDATE: "Updated",
    DELETE: "Deleted",
    LOGIN: "Signed in",
    LOGOUT: "Signed out",
    APPROVE: "Approved",
    REJECT: "Rejected",
    PUBLISH: "Published",
    ARCHIVE: "Archived",
    OTHER: "Other",
  },

  /** What an audit entry is about. */
  auditResource: {
    USER: "User",
    COURSE: "Course",
    COURSE_MODULE: "Module",
    LESSON: "Lesson",
    COURSE_REVIEW: "Review",
    CATEGORY: "Category",
    TUTOR_PROFILE: "Expert profile",
    ROOM: "Room",
    ROOM_PRICING_RULE: "Room pricing rule",
    ENROLLMENT: "Enrolment",
    BLOCKED_IP: "Blocked IP address",
    NOTIFICATION_BROADCAST: "Broadcast",
  },

  serviceState: {
    UP: "Up",
    DEGRADED: "Degraded",
    DOWN: "Down",
  },

  incidentState: {
    OPEN: "Open",
    ACKNOWLEDGED: "Acknowledged",
    RESOLVED: "Resolved",
  },
} as const;

export type EnumFamily = keyof typeof ENUM_LABELS;

/** "RATE_LIMIT_TRIPPED" → "Rate limit tripped": the last resort for a code with no label yet. */
export function humanizeCode(code: string): string {
  const words = code.trim().toLowerCase().replace(/[_\s]+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The on-screen name of an API code. A code missing from the map (the API grew
 * a new one) is humanized instead of shown raw, so a new value degrades to
 * readable English rather than to SHOUTING_SNAKE_CASE.
 */
export function enumLabel(family: EnumFamily, code: string): string {
  const labels: Readonly<Record<string, string>> = ENUM_LABELS[family];
  return Object.prototype.hasOwnProperty.call(labels, code) ? labels[code] : humanizeCode(code);
}
