import { toNormalizedError } from "@shared/lib/apiError";

export type QueryErrorKind = "forbidden" | "network" | "notFound" | "server";

export interface DescribedQueryError {
  kind: QueryErrorKind;
  title: string;
  description: string;
  /**
   * Whether sending the same request again can succeed: a network failure, a
   * 5xx, 408 or 429 can; any other 4xx is about the request itself (a malformed
   * id is 400 every time), so a Retry button there is a dead end.
   */
  retryable: boolean;
}

/** Statuses a later identical request may get past. 0 is "no response" (offline, CORS, timeout). */
function isRetryableStatus(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

/**
 * For a page that loads one thing by the id or slug in its URL: the thing does
 * not exist. The API answers 404 for an unknown id and 400 for one that cannot
 * be an id at all (/admin/courses/not-a-uuid); to the person who followed the
 * link both mean the same, and neither gets better by retrying.
 */
export function isLookupNotFound(error: unknown): boolean {
  const status = toNormalizedError(error).status;
  return status === 404 || status === 400;
}

/**
 * What to say when a read fails. A failed list used to render as the empty
 * state — "No users yet", "No approved bookings" — which is a false statement
 * about the data rather than a report that it could not be fetched.
 *
 * 403 gets its own wording because on this portal it almost always means the
 * user's roles changed under a still-valid token: the fix is to sign in again,
 * not to retry.
 */
export function describeQueryError(error: unknown, what = "this list"): DescribedQueryError {
  const err = toNormalizedError(error);
  if (err.status === 403) {
    return {
      kind: "forbidden",
      title: "Your access has changed",
      description: "You no longer have permission to see this. Sign in again to refresh your roles.",
      retryable: false,
    };
  }
  if (err.status === 0) {
    return {
      kind: "network",
      title: "Can't reach the server",
      description: err.message || "Check your connection and try again.",
      retryable: true,
    };
  }
  if (err.status === 404) {
    return {
      kind: "notFound",
      title: "Not found",
      description: err.message || "It may have been deleted.",
      retryable: false,
    };
  }
  return {
    kind: "server",
    title: `Couldn't load ${what}`,
    description: `${err.message || "The server returned an error."} (HTTP ${err.status})`,
    retryable: isRetryableStatus(err.status),
  };
}
