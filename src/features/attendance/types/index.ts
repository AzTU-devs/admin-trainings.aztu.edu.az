import type { UUID } from "@shared/types/lms";

/**
 * The marks the attendance endpoints accept, as the stored enum names. PRESENT
 * is shown as "Joined".
 */
export const ATTENDANCE_MARKS = ["PRESENT", "LATE", "ABSENT"] as const;
export type AttendanceMark = (typeof ATTENDANCE_MARKS)[number];

/** EXCUSED is in the stored enum (records from before) but no endpoint here accepts it. */
export type AttendanceStatus = AttendanceMark | "EXCUSED";

/** A saved mark. Experts may only add these; a super admin may change or delete one. */
export interface AttendanceRecord {
  id: UUID;
  status: AttendanceStatus;
  markedAt: string;
  markedByName: string | null;
}

/** One enrolment on the course (cancelled ones are left out), with its mark for the day. */
export interface AttendanceStudent {
  enrollmentId: UUID;
  studentId: UUID;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  record: AttendanceRecord | null;
}

/** Mirror of `GET /api/portal/courses/{courseId}/attendance?date=` — one course day. */
export interface CourseAttendanceView {
  courseId: UUID;
  /** The day shown: the one asked for, or today clamped into the course's days. */
  date: string;
  /** The days attendance can be taken on (OFFLINE: start to end; ONE_TIME: its date). */
  firstDate: string;
  lastDate: string;
  /** True for a super admin only: may change and delete marks. */
  canManage: boolean;
  /**
   * The caller may add marks: an expert on the course's roster (with
   * attendance:mark), or a super admin. Absent from an API older than it;
   * the page then goes by the route and `canManage`, as it did before.
   */
  canMark?: boolean;
  /** By last name, then first name. */
  students: AttendanceStudent[];
}

/** One entry of `GET …/attendance/days`: a day that has marks, newest first. */
export interface AttendanceDaySummary {
  date: string;
  present: number;
  late: number;
  absent: number;
}

/** Body of `POST …/attendance`: new marks only, all for one day. */
export interface MarkAttendanceRequest {
  date: string;
  marks: Array<{ enrollmentId: UUID; status: AttendanceMark }>;
}
