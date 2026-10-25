import type { EventInput } from "@fullcalendar/react";
import type {
  CalendarEventDto,
  CalendarEventKind,
  CalendarRange,
  CalendarResponse,
} from "@features/calendar/types";

/*
 * The calendar's data layer: the API's events as FullCalendar inputs, and the
 * local-time wording the details dialog uses. Everything here is pure, so the
 * Baku-time rules can be tested without a browser zone of Asia/Baku.
 *
 * Every date and time is shown in the platform's zone (the API's `timezone`,
 * Asia/Baku), never the viewer's: a training at 10:00 in Baku is "10:00" to a
 * super admin travelling in Berlin too, because that is the time on the
 * participants' invitations.
 */

/** The platform zone (`app.timezone`); the API repeats it as `timezone`. */
export const PLATFORM_TIME_ZONE = "Asia/Baku";

/** The API refuses a wider window (400 RANGE_TOO_LONG). */
export const MAX_RANGE_DAYS = 62;

/** One colour role per kind; the CSS variables live in calendar.css. */
export const KIND_META: Record<CalendarEventKind, { label: string; slug: string }> = {
  ONE_TIME: { label: "One-time training", slug: "one-time" },
  SESSION: { label: "Course session", slug: "session" },
  COURSE: { label: "Course (all day)", slug: "course" },
  ROOM_BOOKING: { label: "Room booking", slug: "booking" },
};

export const KIND_ORDER: CalendarEventKind[] = ["ONE_TIME", "SESSION", "COURSE", "ROOM_BOOKING"];

const KINDS = new Set<string>(KIND_ORDER);

/** The CSS colour pair of a kind: the fill and the text drawn on it. */
export function kindColors(kind: CalendarEventKind): { color: string; contrastColor: string } {
  const slug = KIND_META[kind]?.slug ?? "session";
  return { color: `var(--cal-${slug})`, contrastColor: `var(--cal-${slug}-ink)` };
}

/* ───────────────────────────── response ───────────────────────────── */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/**
 * The calendar body, from either the full `{ data, meta }` envelope or an
 * already-unwrapped payload. The cap may be reported as `truncated` beside
 * `events` or as `meta.truncated`; either counts. Entries without the fields
 * the grid needs are dropped rather than breaking the whole view.
 */
export function normalizeCalendarResponse(body: unknown): CalendarResponse {
  const envelope = isRecord(body) && "data" in body ? body : null;
  const payload = envelope ? envelope.data : body;
  const meta = envelope && isRecord(envelope.meta) ? envelope.meta : null;
  const data = isRecord(payload) ? payload : {};

  const events = Array.isArray(data.events)
    ? (data.events as unknown[]).filter(
        (e): e is CalendarEventDto =>
          isRecord(e) &&
          typeof e.id === "string" &&
          typeof e.start === "string" &&
          typeof e.end === "string" &&
          typeof e.kind === "string" &&
          KINDS.has(e.kind),
      )
    : [];

  return {
    timezone:
      typeof data.timezone === "string" && data.timezone ? data.timezone : PLATFORM_TIME_ZONE,
    events,
    truncated: data.truncated === true || meta?.truncated === true,
  };
}

/* ───────────────────────────── zoned dates ───────────────────────────── */

const partsCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    partsCache.set(timeZone, f);
  }
  return f;
}

function zonedParts(instant: string | Date, timeZone: string) {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  const parts: Record<string, string> = {};
  for (const p of partsFormatter(timeZone).formatToParts(d)) parts[p.type] = p.value;
  return parts;
}

/** The local date (`yyyy-MM-dd`) of an instant in `timeZone`. */
export function zonedDate(instant: string | Date, timeZone = PLATFORM_TIME_ZONE): string {
  const p = zonedParts(instant, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

/** The local wall time (`HH:mm`, 24-hour) of an instant in `timeZone`. */
export function zonedTime(instant: string | Date, timeZone = PLATFORM_TIME_ZONE): string {
  const p = zonedParts(instant, timeZone);
  // Some engines write midnight as "24" even with h23.
  return `${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}

/** `yyyy-MM-dd` plus `n` days, on the calendar (no zone involved). */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const [y0, m0, d0] = from.split("-").map(Number);
  const [y1, m1, d1] = to.split("-").map(Number);
  return Math.round((Date.UTC(y1, m1 - 1, d1) - Date.UTC(y0, m0 - 1, d0)) / 86_400_000);
}

/**
 * The fetch window for what the calendar shows. FullCalendar reports its
 * range in the calendar's own zone ("2026-10-26T00:00:00+04:00"), so the
 * leading date is already the local one. The API caps a request at 62 days;
 * no view is that wide (a month grid is six weeks), but a wider one is cut
 * rather than sent to fail.
 */
export function rangeFromView(startStr: string, endStr: string): CalendarRange {
  const from = startStr.slice(0, 10);
  let to = endStr.slice(0, 10);
  if (daysBetween(from, to) > MAX_RANGE_DAYS) to = addDays(from, MAX_RANGE_DAYS);
  if (to <= from) to = addDays(from, 1);
  return { from, to };
}

/* ───────────────────────────── grid events ───────────────────────────── */

/** The API event a grid entry was made from (kept in `extendedProps`). */
export interface CalendarEventProps {
  dto: CalendarEventDto;
}

/**
 * One API event as a FullCalendar input.
 *
 * Timed events keep their instants: the calendar runs in the platform zone
 * and places them itself. All-day events become local dates instead. The API
 * marks them with local midnights, and Baku's midnight is 20:00 UTC the day
 * before — as a date that instant reads as the wrong day, so the grid is given
 * the local date outright. `end` stays exclusive, as both sides define it.
 */
export function toCalendarEvent(dto: CalendarEventDto, timeZone = PLATFORM_TIME_ZONE): EventInput {
  const meta = KIND_META[dto.kind];
  const pending = dto.kind === "ROOM_BOOKING" && dto.bookingStatus === "PENDING";
  const className = ["cal-ev", `cal-ev--${meta.slug}`, pending ? "cal-ev--pending" : ""]
    .filter(Boolean)
    .join(" ");
  const base = {
    id: dto.id,
    title: dto.title || meta.label,
    className,
    ...kindColors(dto.kind),
    extendedProps: { dto } satisfies CalendarEventProps,
  };

  if (dto.allDay) {
    const start = zonedDate(dto.start, timeZone);
    let end = zonedDate(dto.end, timeZone);
    if (end <= start) end = addDays(start, 1);
    return { ...base, allDay: true, start, end };
  }
  return { ...base, allDay: false, start: dto.start, end: dto.end };
}

export function toCalendarEvents(
  dtos: CalendarEventDto[],
  timeZone = PLATFORM_TIME_ZONE,
): EventInput[] {
  return dtos.map((dto) => toCalendarEvent(dto, timeZone));
}

/* ───────────────────────────── wording ───────────────────────────── */

const DAY_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
};

function formatDay(date: string): string {
  // A local date is a calendar day, not an instant: format it at UTC noon in
  // UTC so no zone can move it.
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-GB", {
    ...DAY_FORMAT,
    timeZone: "UTC",
  });
}

/**
 * When an event happens, in local time:
 *   "Mon, 2 Nov 2026 · 10:00–12:00"
 *   "Mon, 2 Nov 2026, 22:00 – Tue, 3 Nov 2026, 01:00"   (past midnight)
 *   "Mon, 2 Nov 2026 · all day"
 *   "Mon, 2 Nov 2026 – Wed, 4 Nov 2026 · all day"         (end inclusive)
 */
export function formatEventWhen(
  dto: Pick<CalendarEventDto, "start" | "end" | "allDay">,
  timeZone = PLATFORM_TIME_ZONE,
): string {
  if (dto.allDay) {
    const first = zonedDate(dto.start, timeZone);
    const endExclusive = zonedDate(dto.end, timeZone);
    const last = endExclusive > first ? addDays(endExclusive, -1) : first;
    return first === last
      ? `${formatDay(first)} · all day`
      : `${formatDay(first)} – ${formatDay(last)} · all day`;
  }
  const startDay = zonedDate(dto.start, timeZone);
  const endDay = zonedDate(dto.end, timeZone);
  const startTime = zonedTime(dto.start, timeZone);
  const endTime = zonedTime(dto.end, timeZone);
  if (startDay === endDay) return `${formatDay(startDay)} · ${startTime}–${endTime}`;
  return `${formatDay(startDay)}, ${startTime} – ${formatDay(endDay)}, ${endTime}`;
}

/** "GMT+4" for the zone right now (Baku keeps no daylight saving), or "" if the engine cannot say. */
export function zoneOffsetLabel(timeZone = PLATFORM_TIME_ZONE, at: Date = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat("en-GB", { timeZone, timeZoneName: "shortOffset" })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName");
    return part?.value ?? "";
  } catch {
    return "";
  }
}

/** Room, city and street on one line, skipping what is missing. */
export function placeOf(dto: Pick<CalendarEventDto, "roomName" | "city" | "addressLine">): string {
  return [dto.roomName, dto.addressLine, dto.city]
    .filter((s): s is string => !!s && !!s.trim())
    .join(" · ");
}

/** "12 / 30 seats", "12 enrolled", or null when the event says nothing about seats. */
export function seatsText(
  dto: Pick<CalendarEventDto, "seatLimit" | "enrolledCount">,
): string | null {
  const enrolled = dto.enrolledCount;
  const limit = dto.seatLimit;
  if (enrolled == null && limit == null) return null;
  if (limit == null) return `${enrolled} enrolled`;
  return `${enrolled ?? 0} / ${limit} seats`;
}
