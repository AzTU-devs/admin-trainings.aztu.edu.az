import { formatEnum } from "@shared/lib/enums";
import { COURSE_TYPE_LABEL, type CourseType } from "@shared/types/lms";
import { formatAmount } from "@features/rooms/lib/money";
import type { IdentityProvider, ProfileAccount, ProfileAttendance } from "@features/user-profile/types";

/*
 * Display helpers for the profile page. Dates follow the browser's locale, as
 * everywhere else on the dashboard; anything missing reads as a dash.
 */

export const DASH = "—";

/** The name a person is shown by: the full name, else first + last, else the email. */
export function displayNameOf(account: Pick<ProfileAccount, "fullName" | "firstName" | "lastName" | "email">): string {
  return (
    account.fullName?.trim() ||
    [account.firstName, account.lastName].filter(Boolean).join(" ").trim() ||
    account.email
  );
}

function toDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "12 Mar 2026, 14:05" (in the viewer's locale), or a dash. */
export function formatDateTime(iso: string | null | undefined): string {
  const d = toDate(iso);
  return d
    ? d.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : DASH;
}

/** "12 Mar 2026" (in the viewer's locale), or a dash. */
export function formatDate(iso: string | null | undefined): string {
  const d = toDate(iso);
  return d ? d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : DASH;
}

/**
 * A start and an end: "12 Mar 2026, 10:00 → 13:30" on one day, both dates
 * written out when it runs past midnight.
 */
export function formatRange(startIso: string | null | undefined, endIso: string | null | undefined): string {
  const start = toDate(startIso);
  const end = toDate(endIso);
  if (!start) return formatDateTime(endIso);
  if (!end) return formatDateTime(startIso);
  const sameDay = start.toDateString() === end.toDateString();
  const endText = sameDay
    ? end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : formatDateTime(endIso);
  return `${formatDateTime(startIso)} → ${endText}`;
}

/** True while `lockedUntil` is still ahead: a lockout that has run out is history, not a state. */
export function isLockedNow(lockedUntil: string | null | undefined, now = Date.now()): boolean {
  const d = toDate(lockedUntil);
  return !!d && d.getTime() > now;
}

/** An amount with its currency, digits grouped as the booking screens group them ("1,250 AZN"). */
export function formatMoney(value: number | null | undefined, currency?: string | null): string {
  if (value === null || value === undefined) return DASH;
  const amount = formatAmount(value);
  return currency ? `${amount} ${currency}` : amount;
}

/** A plain count in the viewer's locale; a dash when there is none. */
export function formatCount(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? DASH : value.toLocaleString();
}

/** 46.7 → "46.7%" (one decimal at most). */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

/** 4.25 → "4.3". */
export function formatRating(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH;
  return value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** "Online", "Offline", "One-time" — the course screens' words for a course type. */
export function courseTypeLabel(type: CourseType | string): string {
  return COURSE_TYPE_LABEL[type as CourseType] ?? formatEnum(type);
}

const PROVIDER_LABEL: Record<IdentityProvider, string> = {
  LOCAL: "Email & password",
  GOOGLE: "Google",
  FACEBOOK: "Facebook",
  APPLE: "Apple",
};

export function providerLabel(provider: string): string {
  return PROVIDER_LABEL[provider as IdentityProvider] ?? formatEnum(provider);
}

/**
 * A link the page may open: an absolute http(s) address with a host and no
 * embedded credentials, or null. Profile links are typed by the expert, so
 * anything else ("javascript:…", "linkedin.com/in/…", "https://x@evil.example")
 * is shown as text and never becomes an href.
 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value || !/^https?:\/\//i.test(value) || /\s/.test(value)) return null;
  try {
    const url = new URL(value);
    const web = url.protocol === "https:" || url.protocol === "http:";
    return web && url.hostname && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

/** A link as a reader wants to see it: host and path, no scheme ("linkedin.com/in/leyla"). */
export function displayUrl(href: string): string {
  try {
    const url = new URL(href);
    const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
    return `${url.host.replace(/^www\./, "")}${path}${url.search}`;
  } catch {
    return href;
  }
}

const ORCID_ID = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i;

/** The orcid.org record for a bare iD (the stored form) or a pasted orcid.org link; null otherwise. */
export function orcidHref(orcid: string | null | undefined): string | null {
  const value = orcid?.trim();
  if (!value) return null;
  if (ORCID_ID.test(value)) return `https://orcid.org/${value.toUpperCase()}`;
  const href = safeExternalUrl(value);
  return href && /^https?:\/\/(www\.)?orcid\.org\//i.test(href) ? href : null;
}

/**
 * A security event's free-form detail as `key: value` pairs, for one compact
 * line: empty values are left out and nested values are shown as JSON.
 */
export function detailEntries(detail: Record<string, unknown> | null | undefined): Array<[string, string]> {
  if (!detail || typeof detail !== "object") return [];
  return Object.entries(detail)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : String(v)]);
}

/** Attendance counts with PRESENT first, then the rest by count — "Present 5 · Absent 1". */
export function attendanceParts(attendance: ProfileAttendance): Array<{ status: string; label: string; count: number }> {
  return Object.entries(attendance.byStatus ?? {})
    .map(([status, count]) => ({ status, label: formatEnum(status), count: Number(count) || 0 }))
    .sort((a, b) => (a.status === "PRESENT" ? -1 : b.status === "PRESENT" ? 1 : b.count - a.count));
}

/** Line breaks kept, blank lines dropped: "one per line" fields read as a list. */
export function lines(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
