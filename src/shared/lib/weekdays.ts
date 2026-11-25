/*
 * Weekdays as the API names them (java.time.DayOfWeek) — the days a
 * long-term room booking repeats on, and the days an offline course meets.
 *
 * Dates here are calendar dates (`yyyy-MM-dd`) counted in whole days at UTC,
 * never through the browser's zone, which would move a date across midnight
 * for anyone outside Baku.
 */

/** java.time.DayOfWeek names, as the API sends and accepts them. */
export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

/** Monday first: the Azerbaijani week, and java.time.DayOfWeek's order. */
export const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const satisfies readonly DayOfWeek[];

export const DAY_LABEL: Record<DayOfWeek, { short: string; long: string }> = {
  MONDAY: { short: "Mon", long: "Monday" },
  TUESDAY: { short: "Tue", long: "Tuesday" },
  WEDNESDAY: { short: "Wed", long: "Wednesday" },
  THURSDAY: { short: "Thu", long: "Thursday" },
  FRIDAY: { short: "Fri", long: "Friday" },
  SATURDAY: { short: "Sat", long: "Saturday" },
  SUNDAY: { short: "Sun", long: "Sunday" },
};

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DAY_MS = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days since 1970-01-01 of a yyyy-MM-dd date, or null when it is not a real date ("2026-02-30"). */
export function epochDay(date: string | null | undefined): number | null {
  const m = date ? DATE_RE.exec(date) : null;
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const at = new Date(Date.UTC(y, mo - 1, d));
  // Date.UTC rolls 30 Feb over into March (and maps years below 100 to 19xx): refuse both.
  if (at.getUTCFullYear() !== y || at.getUTCMonth() !== mo - 1 || at.getUTCDate() !== d) return null;
  return Math.round(at.getTime() / DAY_MS);
}

/** The yyyy-MM-dd date of an epoch day. */
export function dateOfEpochDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** The weekday of an epoch day (1970-01-01 was a Thursday). */
export function dayOfWeekOf(day: number): DayOfWeek {
  return DAYS_OF_WEEK[(((day + 3) % 7) + 7) % 7];
}

/** The weekday of a yyyy-MM-dd date, or null when it is not a real date. */
export function dayOfWeekOfDate(date: string): DayOfWeek | null {
  const day = epochDay(date);
  return day === null ? null : dayOfWeekOf(day);
}

/** Weekdays in the week's order (Mon … Sun), duplicates and unknown names dropped — as the API sends them. */
export function sortDays(days: readonly string[] | null | undefined): DayOfWeek[] {
  return days ? DAYS_OF_WEEK.filter((d) => days.includes(d)) : [];
}

const WORKWEEK: readonly DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

/** "Mon, Wed"; the whole week as "Every day" and Monday to Friday as "Mon–Fri". */
export function formatDays(days: readonly string[] | null | undefined): string {
  const sorted = sortDays(days);
  if (sorted.length === 7) return "Every day";
  if (sorted.length === 5 && WORKWEEK.every((d) => sorted.includes(d))) return "Mon–Fri";
  return sorted.map((d) => DAY_LABEL[d].short).join(", ");
}

export interface DaySpan {
  /** How many dates in the range fall on a chosen weekday. */
  count: number;
  /** The first and last of them; null when there are none. */
  first: string | null;
  last: string | null;
}

/**
 * The dates of [startDate, endDate] — both ends included — that fall on one
 * of `days`: how many, the first and the last. Worked out per weekday rather
 * than by walking the range, so a mistyped year (2026 → 9026) costs nothing.
 * Null while there is no range: a date missing or invalid, or the end before
 * the start.
 */
export function daySpan(startDate: string | null | undefined, endDate: string | null | undefined, days: readonly string[]): DaySpan | null {
  const from = epochDay(startDate);
  const to = epochDay(endDate);
  if (from === null || to === null || to < from) return null;
  const fromIndex = DAYS_OF_WEEK.indexOf(dayOfWeekOf(from));
  const toIndex = DAYS_OF_WEEK.indexOf(dayOfWeekOf(to));
  let count = 0;
  let first: number | null = null;
  let last: number | null = null;
  for (const day of sortDays(days)) {
    const index = DAYS_OF_WEEK.indexOf(day);
    const firstOn = from + ((index - fromIndex + 7) % 7);
    if (firstOn > to) continue;
    const lastOn = to - ((toIndex - index + 7) % 7);
    count += Math.floor((lastOn - firstOn) / 7) + 1;
    first = first === null ? firstOn : Math.min(first, firstOn);
    last = last === null ? lastOn : Math.max(last, lastOn);
  }
  return {
    count,
    first: first === null ? null : dateOfEpochDay(first),
    last: last === null ? null : dateOfEpochDay(last),
  };
}

/**
 * A date as "Mon 2 Nov", or "Mon 2 Nov 2026" with the year — spelled out
 * here rather than by the locale, so it reads the same in every browser.
 */
export function formatWeekdayDate(date: string, withYear = true): string {
  const day = epochDay(date);
  if (day === null) return date;
  const [y, m, d] = date.split("-").map(Number);
  return `${DAY_LABEL[dayOfWeekOf(day)].short} ${d} ${MONTH_SHORT[m - 1]}${withYear ? ` ${y}` : ""}`;
}

/** "Mon 2 Nov – Wed 30 Dec 2026"; the year on the first date too only when the two differ. */
export function formatWeekdayRange(first: string, last: string): string {
  if (first === last) return formatWeekdayDate(first);
  return `${formatWeekdayDate(first, first.slice(0, 4) !== last.slice(0, 4))} – ${formatWeekdayDate(last)}`;
}

/** "2 Nov" (or "2 Nov 2026"): a date without its weekday. */
export function formatDayMonth(date: string, withYear = false): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return `${d} ${MONTH_SHORT[m - 1]}${withYear ? ` ${y}` : ""}`;
}
