import { dayOfWeekOfDate, DAY_LABEL, formatDayMonth, formatDays, formatWeekdayDate } from "@shared/lib/weekdays";
import type {
  AttendanceCounts,
  AttendanceRegister,
  AttendanceRegisterDay,
  AttendanceRegisterMark,
  AttendanceStatus,
} from "@features/attendance/types";

/*
 * The register table's wording and arithmetic. The counts are the API's; only
 * the rate and the totals of the totals are worked out here, the way the
 * Excel export works them out.
 */

/** The letter in a mark's badge: J(oined), L(ate), A(bsent), E(xcused). */
export const MARK_LETTER: Record<AttendanceStatus, string> = {
  PRESENT: "J",
  LATE: "L",
  ABSENT: "A",
  EXCUSED: "E",
};

/** A count the API may leave out (an older API has no EXCUSED anywhere). */
const n = (value: number | null | undefined) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

/**
 * Joined and late over every marked day, in percent — the export's
 * "Attendance %". Null when nothing is marked: no mark is not 0 %.
 */
export function attendanceRate(c: AttendanceCounts): number | null {
  const attended = n(c.present) + n(c.late);
  const marked = attended + n(c.absent) + n(c.excused);
  return marked === 0 ? null : (attended / marked) * 100;
}

/** "92.3%", "100%" (one decimal at most, as in the export). */
export function formatRate(rate: number): string {
  return `${(Math.round(rate * 10) / 10).toLocaleString("en-GB", { maximumFractionDigits: 1 })}%`;
}

/** Whether any record holds EXCUSED: the Excused column shows only then, as in the export. */
export function hasExcused(register: Pick<AttendanceRegister, "days" | "students">): boolean {
  return register.days.some((d) => n(d.excused) > 0) || register.students.some((s) => n(s.excused) > 0);
}

/** Every student's counts added up: the register's bottom-right corner. */
export function totalCounts(register: Pick<AttendanceRegister, "students">): AttendanceCounts {
  return register.students.reduce<AttendanceCounts>(
    (sum, s) => ({
      present: sum.present + n(s.present),
      late: sum.late + n(s.late),
      absent: sum.absent + n(s.absent),
      excused: sum.excused + n(s.excused),
    }),
    { present: 0, late: 0, absent: 0, excused: 0 },
  );
}

/** A student's marks by date, for the cells. */
export function marksByDate(marks: readonly AttendanceRegisterMark[]): Map<string, AttendanceRegisterMark> {
  return new Map(marks.map((m) => [m.date, m]));
}

/** How many marks a day has. */
export function markedOn(day: AttendanceCounts): number {
  return n(day.present) + n(day.late) + n(day.absent) + n(day.excused);
}

/** A column's header, in parts: "Mon", "2 Nov", and the year where the reader needs it. */
export function dayHeading(date: string, withYear: boolean): { weekday: string; dayMonth: string; full: string } {
  const dow = dayOfWeekOfDate(date);
  return {
    weekday: dow ? DAY_LABEL[dow].short : "",
    dayMonth: formatDayMonth(date, withYear),
    full: formatWeekdayDate(date),
  };
}

/**
 * Which columns show their year: every one whose year differs from the
 * column before it, once the register spans more than one year (a course
 * from November to February). Within one year, none: the course's dates say it.
 */
export function yearShown(days: readonly AttendanceRegisterDay[]): Set<string> {
  const shown = new Set<string>();
  if (days.length === 0 || days[0].date.slice(0, 4) === days[days.length - 1].date.slice(0, 4)) return shown;
  let year = "";
  for (const d of days) {
    if (d.date.slice(0, 4) !== year) shown.add(d.date);
    year = d.date.slice(0, 4);
  }
  return shown;
}

/**
 * The register's subtitle: who, how many course days and on which weekdays.
 *   "12 students · 18 course days, Mon, Wed"
 *   "12 students · one day, Fri 13 Nov 2026"                  (ONE_TIME)
 *   "12 students · no course days set: the days with marks"   (an older course)
 */
export function registerSummary(register: AttendanceRegister): string {
  const students = `${register.students.length} ${register.students.length === 1 ? "student" : "students"}`;
  if (register.courseType === "ONE_TIME") return `${students} · one day, ${formatWeekdayDate(register.firstDate)}`;
  if (!register.daysOfWeek?.length) return `${students} · no course days set, so the days with marks are listed`;
  const courseDays = register.days.filter((d) => d.courseDay).length;
  return `${students} · ${courseDays} ${courseDays === 1 ? "course day" : "course days"}, ${formatDays(register.daysOfWeek)}`;
}
