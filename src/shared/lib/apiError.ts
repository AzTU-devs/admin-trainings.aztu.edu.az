import { toast } from "sonner";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { normalizeError, type NormalizedError } from "@lib/axios/httpClient";

/**
 * Turning a failed request into words a person can act on.
 *
 * Most screens used to end every write in `catch { toast.error("Save failed") }`.
 * The API had already said why — SLUG_ALREADY_EXISTS, INVALID_TIME_RANGE,
 * UPLOAD_TOO_LARGE, "Title must not be blank" — and the catch threw it away, so a
 * taken slug and a dropped connection looked the same. These helpers keep the
 * fallback for the rare error with nothing to say, and otherwise show the server.
 */

/** RTK Query hands back whatever the base query rejected with; normalize defensively. */
export function toNormalizedError(e: unknown): NormalizedError {
  // RTK Query wraps some failures (e.g. a thrown queryFn) as { error: … }.
  if (e && typeof e === "object" && "error" in e && !("isNormalized" in e)) {
    const inner = (e as { error: unknown }).error;
    if (inner && typeof inner === "object") return normalizeError(inner);
  }
  return normalizeError(e);
}

/** Readable label for an API field path: `offlineDetails.startDate` → "Start date". */
export function humanizeField(path: string): string {
  const last = path.split(".").pop() ?? path;
  const spaced = last.replace(/\[\d+\]/g, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/**
 * The sentence to show for a failed request. A bare "Request validation failed"
 * is replaced by the first field's own message, which is the part that says what
 * to change.
 */
export function apiErrorMessage(e: unknown, fallback: string): string {
  const err = toNormalizedError(e);
  const first = err.fieldErrors ? Object.entries(err.fieldErrors)[0] : undefined;
  if (first && (err.code === "VALIDATION_FAILED" || !err.message)) {
    return `${humanizeField(first[0])}: ${first[1]}`;
  }
  return err.message || fallback;
}

interface ToastApiErrorOptions {
  /**
   * Maps an API field path onto the form's field name, or null to leave it to the
   * toast. The admin course endpoints nest the course under `course.`, for one.
   */
  mapField?: (apiField: string) => string | null;
}

/**
 * Shows the server's reason for a failed write and, given the form, pins each
 * field error under its input. Returns the normalized error so a caller can still
 * branch on `status` or `code`.
 */
export function toastApiError<T extends FieldValues>(
  e: unknown,
  fallback: string,
  form?: UseFormReturn<T>,
  opts: ToastApiErrorOptions = {},
): NormalizedError {
  const err = toNormalizedError(e);
  if (form && err.fieldErrors) applyFieldErrors(form, err.fieldErrors, opts.mapField);
  toast.error(apiErrorMessage(err, fallback));
  return err;
}

/**
 * Marks each server field error on the matching form field. Errors for fields the
 * form does not have are skipped rather than set: `setError("0", …)` on a name
 * nothing renders is how validation failures used to vanish.
 */
export function applyFieldErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  fieldErrors: Record<string, string>,
  mapField: (apiField: string) => string | null = (f) => f,
): void {
  const values = form.getValues() as Record<string, unknown>;
  for (const [apiField, message] of Object.entries(fieldErrors)) {
    const name = mapField(apiField);
    if (!name || !hasPath(values, name)) continue;
    form.setError(name as Path<T>, { type: "server", message });
  }
}

function hasPath(obj: Record<string, unknown>, path: string): boolean {
  let cur: unknown = obj;
  for (const part of path.split(".")) {
    if (cur === null || typeof cur !== "object" || !(part in (cur as object))) return false;
    cur = (cur as Record<string, unknown>)[part];
  }
  return true;
}
