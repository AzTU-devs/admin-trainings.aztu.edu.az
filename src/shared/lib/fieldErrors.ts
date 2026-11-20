import type { NormalizedError } from "@lib/axios/httpClient";

/**
 * Per-field messages from a failed save. The API's validation body lists them
 * as `errors: [{ field, message }]`, which the HTTP client passes through as
 * `fieldErrors` unchanged; a `{ field: message }` map is accepted too.
 *
 * A field inside a list comes back in the API's binding notation
 * (`educationEntries[0].institution`); it is returned as the dotted path a
 * react-hook-form field array uses (`educationEntries.0.institution`), so the
 * message lands on the input it is about.
 */
export function serverFieldErrors(err: NormalizedError): Array<[string, string]> {
  const raw: unknown = err.fieldErrors;
  let pairs: Array<[string, string]> = [];
  if (Array.isArray(raw)) {
    pairs = raw.flatMap((item: unknown): Array<[string, string]> => {
      const { field, message } = (item ?? {}) as { field?: unknown; message?: unknown };
      return typeof field === "string" && typeof message === "string" ? [[field, message]] : [];
    });
  } else if (raw && typeof raw === "object") {
    pairs = Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === "string");
  }
  return pairs.map(([field, message]) => [field.replace(/\[(\d+)\]/g, ".$1"), message]);
}
