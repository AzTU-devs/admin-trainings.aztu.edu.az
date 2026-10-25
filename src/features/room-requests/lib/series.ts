import type { DayOfWeek } from "@features/room-requests/types";

/*
 * Long-term room bookings ("series"): the API's occurrence arithmetic, done
 * here as well so the request form can show what a pattern produces before it
 * is sent.
 *
 * Dates are calendar dates in the platform zone, handled as plain yyyy-MM-dd
 * values counted in whole days — never through the browser's zone, which
 * would move a date across midnight for anyone outside Baku (and across a DST
 * change, add or lose an hour in the day count).
 */

/** The platform's local zone (the API's `app.timezone`). Every series date and time is in it. */
export const PLATFORM_TIMEZONE = "Asia/Baku";
/** INVALID_DATE_RANGE: a series may span at most this many days, both ends counted (the API's `DAYS.between + 1`). */
export const MAX_SERIES_RANGE_DAYS = 366;
/** TOO_MANY_OCCURRENCES: more sessions than this are refused. */
export const MAX_SERIES_OCCURRENCES = 200;

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

const DAY_MS = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

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

/** Minutes after midnight of `HH:mm` or `HH:mm:ss`, or null. */
export function minutesOf(time: string | null | undefined): number | null {
  const m = time ? TIME_RE.exec(time) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** `HH:mm` of an `HH:mm` / `HH:mm:ss` value (the API accepts and may send either). */
export function hhmm(time: string): string {
  return TIME_RE.test(time) ? time.slice(0, 5) : time;
}

export interface SeriesPattern {
  startDate: string;
  endDate: string;
  daysOfWeek: readonly string[];
}

/**
 * Every date in [startDate, endDate] — both ends included — whose weekday is
 * listed, in order: the API's expansion. Null when there is no range to
 * expand: a date missing or invalid, the end before the start, or a range
 * longer than the API accepts (which also keeps a mistyped year from looping
 * over centuries on every keystroke).
 */
export function occurrenceDates(pattern: SeriesPattern): string[] | null {
  const from = epochDay(pattern.startDate);
  const to = epochDay(pattern.endDate);
  if (from === null || to === null || to < from || to - from + 1 > MAX_SERIES_RANGE_DAYS) return null;
  const wanted = new Set(pattern.daysOfWeek);
  const dates: string[] = [];
  for (let day = from; day <= to; day++) {
    if (wanted.has(dayOfWeekOf(day))) dates.push(dateOfEpochDay(day));
  }
  return dates;
}

/** Weekdays in the week's order (Mon … Sun), duplicates dropped — as the request sends them. */
export function sortDays(days: readonly string[]): DayOfWeek[] {
  return DAYS_OF_WEEK.filter((d) => days.includes(d));
}

// One formatter per zone: building an Intl.DateTimeFormat is the slow part.
const partsFormatters = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatters.set(timeZone, f);
  }
  return f;
}

interface WallClock {
  date: string;
  time: string;
  /** The wall clock read as if it were UTC, in ms (for offset arithmetic). */
  asUtc: number;
}

/** What a clock in `timeZone` shows at `instant`. */
export function wallClock(instant: Date | string | number, timeZone = PLATFORM_TIMEZONE): WallClock {
  const at = instant instanceof Date ? instant : new Date(instant);
  const parts: Record<string, string> = {};
  for (const p of partsFormatter(timeZone).formatToParts(at)) parts[p.type] = p.value;
  const [y, mo, d, h, mi, s] = [parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second].map(Number);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    asUtc: Date.UTC(y, mo - 1, d, h % 24, mi, s),
  };
}

/**
 * The instant a wall-clock date and time in `timeZone` names (10:00 on
 * 2026-11-02 in Baku is 06:00Z). Null when either part is invalid.
 */
export function zonedInstant(date: string, time: string, timeZone = PLATFORM_TIMEZONE): Date | null {
  const day = epochDay(date);
  const minutes = minutesOf(time);
  if (day === null || minutes === null) return null;
  const wall = day * DAY_MS + minutes * 60_000;
  // The zone's offset at a first guess, then again at the corrected instant —
  // which settles it when the guess and the answer straddle a DST change.
  const offsetAt = (t: number) => wallClock(Math.floor(t / 1000) * 1000, timeZone).asUtc - Math.floor(t / 1000) * 1000;
  let t = wall - offsetAt(wall);
  t = wall - offsetAt(t);
  return new Date(t);
}

/** Today's date in `timeZone`, as yyyy-MM-dd. */
export function todayIn(timeZone = PLATFORM_TIMEZONE, now: Date = new Date()): string {
  return wallClock(now, timeZone).date;
}

/** A yyyy-MM-dd date in the reader's locale ("Mon, Nov 2, 2026"), never shifted by their zone. */
export function formatLocalDate(
  date: string,
  options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", year: "numeric" },
): string {
  const day = epochDay(date);
  if (day === null) return date;
  return new Date(day * DAY_MS).toLocaleDateString(undefined, { ...options, timeZone: "UTC" });
}

/** "Nov 2 – Dec 31, 2026"; the year on both ends only when they differ. */
export function formatDateRange(startDate: string, endDate: string): string {
  const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);
  const start = formatLocalDate(startDate, sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
  return `${start} – ${formatLocalDate(endDate, { month: "short", day: "numeric", year: "numeric" })}`;
}

/** "10:00–12:00". */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${hhmm(startTime)}–${hhmm(endTime)}`;
}

const WORKWEEK: readonly DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

/** "Mon, Wed"; the whole week as "Every day" and Monday to Friday as "Mon–Fri". */
export function formatDays(days: readonly string[]): string {
  const sorted = sortDays(days);
  if (sorted.length === 7) return "Every day";
  if (sorted.length === 5 && WORKWEEK.every((d) => sorted.includes(d))) return "Mon–Fri";
  return sorted.map((d) => DAY_LABEL[d].short).join(", ");
}

/** Hours between two `HH:mm` times on one day, or null while either is missing or the end is not after the start. */
export function sessionHours(startTime: string, endTime: string): number | null {
  const s = minutesOf(startTime);
  const e = minutesOf(endTime);
  return s === null || e === null || e <= s ? null : (e - s) / 60;
}

/** "2 h", "1.5 h", "36 h". */
export function formatHours(hours: number): string {
  return `${hours.toLocaleString(undefined, { maximumFractionDigits: 2 })} h`;
}

/** "18 sessions", and how many are still to come when that differs ("18 sessions · 6 upcoming"). */
export function formatSessions(count: number, upcoming?: number): string {
  const total = `${count} ${count === 1 ? "session" : "sessions"}`;
  return upcoming === undefined || upcoming === count ? total : `${total} · ${upcoming} upcoming`;
}

/** `timeZone` when the runtime knows it, else the platform zone — a bad zone string makes Intl throw. */
export function safeTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return PLATFORM_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return PLATFORM_TIMEZONE;
  }
}
