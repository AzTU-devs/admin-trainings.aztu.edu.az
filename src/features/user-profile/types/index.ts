import type {
  BookingStatus,
  CourseStatus,
  CourseType,
  EnrollmentSource,
  EnrollmentStatus,
  TutorApprovalStatus,
  UUID,
} from "@shared/types/lms";

/*
 * Mirror of the backend's UserProfileDto — the super admin's deep view of one
 * account, from `GET /api/super/users/{userId}/profile` (authority
 * `user:inspect`, SUPER_ADMIN only). Every field is always present; the ones
 * typed `| null` are the ones the API may send as null. Lists come newest
 * first. Instants are ISO-8601 UTC strings.
 *
 * Soft-deleted accounts are returned too (`account.deletedAt` set): the point
 * of the page is inspection.
 */

/** The account's own status — the backend's UserStatus, not the Users table's vocabulary. */
export type ProfileAccountStatus = "ACTIVE" | "LOCKED" | "SUSPENDED" | "DELETED";

/** Role codes as the API spells them. USER is the participant (İştirakçi) role. */
export type ProfileRole = "USER" | "TUTOR" | "ADMIN" | "SUPER_ADMIN";

export type IdentityProvider = "LOCAL" | "GOOGLE" | "FACEBOOK" | "APPLE";

/** A sign-in method linked to the account (password, or an OAuth provider). */
export interface ProfileIdentity {
  provider: IdentityProvider;
  emailAtProvider: string | null;
  displayName: string | null;
  emailVerified: boolean;
  linkedAt: string | null;
  lastLoginAt: string | null;
}

export interface ProfileAccount {
  id: UUID;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  finKod: string | null;
  locale: string;
  status: ProfileAccountStatus;
  roles: ProfileRole[];
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  failedLogins: number;
  /** When a failed-login lockout ends; in the past once it has ended. */
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
  /** `/api/media/{id}/content` — the authenticated media route, so never a bare <img src>. */
  avatarUrl: string | null;
  identities: ProfileIdentity[];
}

/** A catalogue category the expert teaches in. */
export interface ProfileExpertiseArea {
  id: UUID;
  name: string;
}

/** One expert application and what was decided on it. */
export interface ProfileApprovalEntry {
  id: UUID;
  status: "PENDING" | "APPROVED" | "REJECTED";
  decisionNote: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  submittedAt: string | null;
}

/** A course the expert is on the teaching roster of. */
export interface ProfileTaughtCourse {
  id: UUID;
  slug: string;
  title: string;
  courseType: CourseType;
  status: CourseStatus;
  /** The roster's authorised editor (the one who may edit the course). */
  editor: boolean;
  enrolledCount: number;
  ratingAvg: number;
  ratingCount: number;
  publishedAt: string | null;
  createdAt: string;
}

export interface ProfileRoomBooking {
  id: UUID;
  roomName: string;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  totalFee: number;
  currency: string;
}

export interface ProfileExpertStats {
  courseCount: number;
  publishedCourseCount: number;
  totalEnrolled: number;
  distinctParticipants: number;
}

/** The expert (tutor) side of the account; null when the account has no expert profile. */
export interface ProfileExpert {
  /** The tutor profile's id (not the user's). */
  id: UUID;
  displayName: string;
  headline: string | null;
  /** Plain text; paragraph breaks are meaningful. */
  bio: string | null;
  yearsExperience: number | null;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  academicTitle: string | null;
  department: string | null;
  /** Free text, one qualification per line. */
  education: string | null;
  /** Free text, one certification per line. */
  certifications: string | null;
  languages: string | null;
  googleScholarUrl: string | null;
  researchGateUrl: string | null;
  orcid: string | null;
  githubUrl: string | null;
  avatarUrl: string | null;
  approvalStatus: TutorApprovalStatus;
  approvedAt: string | null;
  rejectionReason: string | null;
  ratingAvg: number;
  ratingCount: number;
  expertise: ProfileExpertiseArea[];
  /** The expert's own areas: free-text labels beside the catalogue categories. */
  customExpertise: string[];
  approvalHistory: ProfileApprovalEntry[];
  courses: ProfileTaughtCourse[];
  roomBookings: ProfileRoomBooking[];
  stats: ProfileExpertStats;
}

/** Offline / one-time session attendance: a count per status (PRESENT, ABSENT, …). */
export interface ProfileAttendance {
  total: number;
  byStatus: Record<string, number>;
}

export interface ProfileEnrollment {
  id: UUID;
  courseId: UUID;
  courseSlug: string;
  courseTitle: string;
  courseType: CourseType;
  status: EnrollmentStatus;
  source: EnrollmentSource;
  progressPercent: number;
  enrolledAt: string | null;
  completedAt: string | null;
  lastAccessedAt: string | null;
  lessonsCompleted: number;
  lessonsTotal: number;
  /** Null for a course with no attendance taken (an online course). */
  attendance: ProfileAttendance | null;
}

export interface ProfileOrderItem {
  itemType: string;
  description: string | null;
  courseTitle: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
}

export interface ProfilePayment {
  provider: string;
  status: string;
  amount: number;
  currency: string;
  method: string | null;
  createdAt: string;
  errorMessage: string | null;
}

export interface ProfileOrder {
  id: UUID;
  orderNumber: string;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
  placedAt: string | null;
  paidAt: string | null;
  items: ProfileOrderItem[];
  payments: ProfilePayment[];
}

export interface ProfileReview {
  id: UUID;
  courseId: UUID;
  courseTitle: string;
  rating: number;
  title: string | null;
  body: string | null;
  visible: boolean;
  createdAt: string;
}

export interface ProfileLearnerStats {
  enrollmentCount: number;
  activeCount: number;
  completedCount: number;
  /** 0–100, may carry a decimal (46.7). */
  averageProgress: number;
}

/** The participant side of the account: always present, empty lists when unused. */
export interface ProfileLearner {
  enrollments: ProfileEnrollment[];
  orders: ProfileOrder[];
  reviews: ProfileReview[];
  stats: ProfileLearnerStats;
}

export interface ProfileSession {
  id: UUID;
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  active: boolean;
}

export interface ProfileSecurityEvent {
  id: UUID;
  eventType: string;
  ipAddress: string | null;
  userAgent: string | null;
  /** Free-form context the event was logged with. */
  detail: Record<string, unknown> | null;
  occurredAt: string;
}

export interface ProfileAuditEntry {
  id: UUID;
  action: string;
  entityType: string;
  entityId: UUID | null;
  actorId: UUID | null;
  actorRole: string | null;
  occurredAt: string;
  ipAddress: string | null;
}

/** Capped by the API: sessions newest 20, security events and audit trail newest 50. */
export interface ProfileActivity {
  sessions: ProfileSession[];
  securityEvents: ProfileSecurityEvent[];
  /** Rows where the user is the actor, or the entity is this user. */
  auditTrail: ProfileAuditEntry[];
}

export interface UserProfileDto {
  account: ProfileAccount;
  expert: ProfileExpert | null;
  learner: ProfileLearner;
  activity: ProfileActivity;
}
