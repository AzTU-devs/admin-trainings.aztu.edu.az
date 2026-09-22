/**
 * Display helpers for the API's enum values (ACTIVE, ADMIN_GRANT, IN_APP …).
 *
 * The screens showed them raw — all-caps pills next to sentence-case ones
 * ("Published", "Pending") — and the same value changed colour from page to
 * page. These give every screen one spelling and one tone per value. They
 * format the value; they do not reword it (same words, same order).
 */

/** The Badge tones a status can take (a subset of Badge's `tone`). */
export type StatusTone = "neutral" | "brand" | "gold" | "success" | "warning" | "danger" | "outline";

/** Words that stay upper-case inside a formatted value ("IP_BLOCKED" → "IP blocked"). */
const ACRONYMS = new Set(["API", "IP", "URL", "SMS", "PDF", "HTTP", "HTTPS", "ID", "AI", "IT", "OTP", "JWT", "2FA", "MFA", "CSV", "AZN", "USD", "EUR"]);

/**
 * "SUPER_ADMIN" → "Super admin", "IN_APP" → "In app", "ACTIVE" → "Active".
 * Lower-cases, turns underscores into spaces and capitalises the first
 * letter; known acronyms keep their capitals. Anything that is not an
 * upper-case enum (already human text, a number) is returned unchanged.
 */
export function formatEnum(value: string | null | undefined): string {
  if (value == null) return "";
  if (!/^[A-Z0-9]+(?:[_ -][A-Z0-9]+)*$/.test(value)) return value;
  return value
    .split(/[_ -]+/)
    .map((word, i) => {
      if (ACRONYMS.has(word)) return word;
      const lower = word.toLowerCase();
      return i === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
    })
    .join(" ");
}

/**
 * One tone per status value, wherever it appears: done/good is success,
 * waiting or in flight is warning, failed/refused/blocked is danger. Sources
 * (FREE, ADMIN_GRANT), channels (IN_APP, EMAIL), actions (LOGIN) and quiet
 * states (DRAFT, DISABLED, SUSPENDED, INFO, LOW) fall through to neutral.
 */
const TONE: Record<string, StatusTone> = {
  ACTIVE: "success",
  AVAILABLE: "success",
  APPROVED: "success",
  PUBLISHED: "success",
  COMPLETED: "success",
  READY: "success",
  SENT: "success",
  DELIVERED: "success",
  SUCCESS: "success",
  HEALTHY: "success",
  UP: "success",
  PAID: "success",

  PENDING: "warning",
  PENDING_PAYMENT: "warning",
  IN_REVIEW: "warning",
  UPLOADING: "warning",
  PROCESSING: "warning",
  MAINTENANCE: "warning",
  DEGRADED: "warning",
  MEDIUM: "warning",
  WARN: "warning",
  WARNING: "warning",

  REJECTED: "danger",
  FAILED: "danger",
  ERROR: "danger",
  LOCKED: "danger",
  BLOCKED: "danger",
  CANCELLED: "danger",
  DOWN: "danger",
  HIGH: "danger",
  CRITICAL: "danger",

  RESERVED: "brand",
  ARCHIVED: "outline",
};

/** The tone for a status value (see TONE); `fallback` (neutral) when the value has none. */
export function statusTone(value: string | null | undefined, fallback: StatusTone = "neutral"): StatusTone {
  return (value && TONE[value]) || fallback;
}
