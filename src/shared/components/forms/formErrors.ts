import type { FieldErrors, FieldValues } from "react-hook-form";

export interface FlatFieldError {
  path: string;
  message: string;
}

/**
 * Walks react-hook-form's error tree into `{ path, message }` pairs, in the order
 * the resolver reported them. Nested objects (`offlineDetails.startDate`) and
 * array elements (`roles.0`) are both reached — the top-level lookup the pages
 * used to do missed both, which is how a failing `roles.0` rendered as an empty
 * red line and `offlineDetails.weeklyHours` failed without a word.
 */
export function flattenFieldErrors<T extends FieldValues>(errors: FieldErrors<T>): FlatFieldError[] {
  const out: FlatFieldError[] = [];
  const walk = (node: unknown, path: string) => {
    if (!node || typeof node !== "object") return;
    const rec = node as Record<string, unknown>;
    if (typeof rec.message === "string" && rec.message) {
      out.push({ path, message: rec.message });
      return;
    }
    for (const [k, v] of Object.entries(rec)) {
      // `ref` is the DOM element RHF attaches; `root` holds array-level errors.
      if (k === "ref" || k === "type" || k === "types") continue;
      walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(errors, "");
  return out;
}

/** The first message anywhere in the tree, or undefined. */
export function firstFieldErrorMessage<T extends FieldValues>(errors: FieldErrors<T> | undefined): string | undefined {
  return errors ? flattenFieldErrors(errors)[0]?.message : undefined;
}
