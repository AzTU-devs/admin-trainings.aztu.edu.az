import { PLATFORM_TIME_ZONE, addDays, zonedDate, zonedTime } from "@features/calendar/lib/calendarEvents";
import type { AttendanceStatus, AttendanceStudent } from "@features/attendance/types";

/*
 * The attendance screen's day rules and wording. Days are calendar dates
 * (`yyyy-MM-dd`) on the platform's clock, Asia/Baku — the API's "today" —
 * whatever the viewer's own zone is.
 */

/** "Joined" is the screen's word for PRESENT. */
export const MARK_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: "Joined",
  LATE: "Late",
  ABSENT: "Absent",
  EXCUSED: "Excused",
};

/** Today in Baku. */
export function bakuToday(now: Date = new Date()): string {
  return zonedDate(now, PLATFORM_TIME_ZONE);
}

/** How long until the next day begins in Baku (it keeps UTC+4 all year: every day is 24 hours). */
export function msUntilNextBakuDay(now: Date = new Date()): number {
  const [hours, minutes] = zonedTime(now, PLATFORM_TIME_ZONE).split(":").map(Number);
  const intoDay = ((hours * 60 + minutes) * 60 + now.getUTCSeconds()) * 1000 + now.getUTCMilliseconds();
  return 86_400_000 - intoDay;
}

/** The last day marks can be saved for: the course's last day, or today while it still runs. */
export function lastMarkableDay(lastDate: string, today: string): string {
  return lastDate < today ? lastDate : today;
}

/** The API's rule (400 ATTENDANCE_DATE_OUT_OF_RANGE otherwise): firstDate ≤ day ≤ min(lastDate, today). */
export function isMarkableDay(date: string, firstDate: string, lastDate: string, today: string): boolean {
  return date >= firstDate && date <= lastMarkableDay(lastDate, today);
}

/** A complete `yyyy-MM-dd` that names a real day (a date box gives partial values while typing). */
export function isIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return addDays(value, 0) === value;
}

export { addDays as shiftDay };

function dayValue(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * A course day in the viewer's language: "Fri, 13 Nov 2026" (`short` drops
 * the year). Formatted at UTC because it is a date, not an instant: no zone
 * may move it to the day before.
 */
export function formatDay(date: string, style: "long" | "short" = "long"): string {
  return dayValue(date).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(style === "long" ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

/** When a mark was saved, on Baku's clock like the rest of the platform: "13 Nov 2026, 10:42". */
export function formatMarkedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: PLATFORM_TIME_ZONE,
  });
}

/** The name a student is listed by: first and last name, else the email. */
export function studentName(s: Pick<AttendanceStudent, "firstName" | "lastName" | "email">): string {
  return [s.firstName, s.lastName].filter(Boolean).join(" ").trim() || s.email;
}
