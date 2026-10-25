import type { NormalizedError } from "@lib/axios/httpClient";
import { MAX_SERIES_OCCURRENCES, MAX_SERIES_RANGE_DAYS } from "@features/room-requests/lib/series";
import { SERIES_MESSAGES } from "@features/room-requests/schemas/roomBookingSeries.schema";

/** 409 when a session overlaps an approved booking; the API's message lists the clashing dates. */
export const ROOM_BOOKING_CONFLICT = "ROOM_BOOKING_CONFLICT";

type SeriesField = "startDate" | "endDate" | "daysOfWeek" | "endTime" | "offlineCourseId" | "note";

/**
 * The API's 400s for a long-term request, each on the field that fixes it,
 * in the form's own words. The form checks the same rules first, so these
 * show only when the two disagree (a stale tab across midnight, a rule
 * changed on the server).
 */
const SERIES_FIELD_ERRORS: Record<string, { field: SeriesField; message?: string }> = {
  INVALID_DATE_RANGE: {
    field: "endDate",
    message: `The end date must be on or after the start date, and the period at most ${MAX_SERIES_RANGE_DAYS} days long`,
  },
  INVALID_TIME_RANGE: { field: "endTime", message: SERIES_MESSAGES.endTimeNotAfter },
  DAYS_REQUIRED: { field: "daysOfWeek", message: SERIES_MESSAGES.daysRequired },
  NO_OCCURRENCES: { field: "daysOfWeek", message: SERIES_MESSAGES.noOccurrences },
  TOO_MANY_OCCURRENCES: {
    field: "daysOfWeek",
    message: `More than ${MAX_SERIES_OCCURRENCES} sessions; shorten the period or pick fewer weekdays`,
  },
  PAST_START: { field: "startDate", message: "The first session must be in the future; pick a later start date or time" },
  // The single-booking checks the series reuses: the API's own message is the clearest.
  OFFLINE_COURSE_NOT_FOUND: { field: "offlineCourseId" },
  NOT_COURSE_TUTOR: { field: "offlineCourseId" },
};

export interface SeriesErrorOutcome {
  /** Put this message on that field. */
  field?: { name: SeriesField; message: string };
  /** The ROOM_BOOKING_CONFLICT message, to keep on screen (it lists the dates). */
  conflict?: string;
  /** One line for the toast. */
  toast: string;
}

/** How the request form answers a failed `POST …/series`. */
export function describeSeriesCreateError(e: unknown): SeriesErrorOutcome {
  const err = (e ?? {}) as Partial<NormalizedError>;
  if (err.code === ROOM_BOOKING_CONFLICT) {
    return {
      conflict: err.message || "Some sessions overlap bookings that are already approved.",
      toast: "Some sessions clash with approved bookings",
    };
  }
  const mapped = err.code ? SERIES_FIELD_ERRORS[err.code] : undefined;
  if (mapped) {
    const message = mapped.message ?? err.message ?? "Check this field";
    return { field: { name: mapped.field, message }, toast: message };
  }
  // Bean validation (e.g. a note over 500 characters) answers with a field map.
  const note = err.fieldErrors?.note;
  if (note) return { field: { name: "note", message: SERIES_MESSAGES.noteTooLong }, toast: SERIES_MESSAGES.noteTooLong };
  return { toast: err.message || "Could not request the long-term booking" };
}

/** The toast for a refused single-booking action (cancel, decide) on a session of a series. */
export function singleBookingErrorMessage(e: unknown, fallback: string): string {
  const err = (e ?? {}) as Partial<NormalizedError>;
  if (err.code === "PART_OF_SERIES") {
    return "This session belongs to a long-term booking; manage it from the long-term list.";
  }
  return err.message || fallback;
}
