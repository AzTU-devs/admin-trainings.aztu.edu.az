import type { DayOfWeek } from "@shared/lib/weekdays";
import type { CourseType, UUID } from "@shared/types/lms";

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

/** How many students had each mark (on a day, or a student over all days). */
export interface AttendanceCounts {
  present: number;
  late: number;
  absent: number;
  excused: number;
}

/** One column of the register: a course day, or a day with marks. */
export interface AttendanceRegisterDay extends AttendanceCounts {
  date: string;
  /** False for a day with marks that is not one of the course's days (a make-up session). */
  courseDay: boolean;
}

/** A saved mark in the register. */
export interface AttendanceRegisterMark {
  date: string;
  recordId: UUID;
  status: AttendanceStatus;
  markedAt: string;
  markedByName: string | null;
}

/** One row of the register: a student, their marks (marked days only) and their totals. */
export interface AttendanceRegisterStudent extends AttendanceCounts {
  enrollmentId: UUID;
  studentId: UUID;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  /** Only the days with a mark, ascending. */
  marks: AttendanceRegisterMark[];
}

/**
 * Mirror of `GET /api/portal/courses/{courseId}/attendance/register` — the
 * whole course at once: every course day (past and future) and every other
 * day with marks, ascending; the same students in the same order as a day.
 */
export interface AttendanceRegister {
  courseId: UUID;
  courseTitle: string;
  courseType: CourseType;
  firstDate: string;
  lastDate: string;
  /** Monday first; `[]` for a course without days (only its marked days are listed then). */
  daysOfWeek: DayOfWeek[];
  canMark: boolean;
  canManage: boolean;
  days: AttendanceRegisterDay[];
  students: AttendanceRegisterStudent[];
}

/** Body of `POST …/attendance`: new marks only, all for one day. */
export interface MarkAttendanceRequest {
  date: string;
  marks: Array<{ enrollmentId: UUID; status: AttendanceMark }>;
}
