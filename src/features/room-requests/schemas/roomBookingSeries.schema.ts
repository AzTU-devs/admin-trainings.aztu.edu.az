import { z } from "zod";
import {
  DAYS_OF_WEEK,
  MAX_SERIES_OCCURRENCES,
  MAX_SERIES_RANGE_DAYS,
  epochDay,
  formatLocalDate,
  minutesOf,
  occurrenceDates,
  sortDays,
  zonedInstant,
} from "@features/room-requests/lib/series";
import type { RoomBookingSeriesCreateRequest } from "@features/room-requests/types";

export const SERIES_NOTE_MAX = 500;

const uuid = z.string().uuid();
/**
 * An optional id typed by hand: empty, or a UUID. A refine, not `.or(z.literal(""))`:
 * a failed union reports zod's generic "Invalid input" instead of this message.
 */
export const optionalUuid = (message: string) =>
  z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || uuid.safeParse(v).success, { message });

/** The form's messages, shared with the API error mapping so both say the same thing. */
export const SERIES_MESSAGES = {
  roomRequired: "Pick a room",
  courseInvalid: "Enter a valid course ID, or leave it empty",
  startDateRequired: "Start date is required",
  endDateRequired: "End date is required",
  dateInvalid: "Enter a valid date",
  endBeforeStart: "The end date can't be before the start date",
  rangeTooLong: `A long-term booking can cover at most ${MAX_SERIES_RANGE_DAYS} days`,
  daysRequired: "Pick at least one weekday",
  noOccurrences: "None of the chosen weekdays falls between these dates",
  tooMany: (count: number) =>
    `This makes ${count} sessions; at most ${MAX_SERIES_OCCURRENCES} can be requested at once. Shorten the period or pick fewer weekdays.`,
  startTimeRequired: "Start time is required",
  endTimeRequired: "End time is required",
  timeInvalid: "Enter a valid time",
  endTimeNotAfter: "The end time must be after the start time",
  pastStart: (firstDate: string) =>
    `The first session (${formatLocalDate(firstDate)}) has already started. Pick a later start date or time.`,
  noteTooLong: `At most ${SERIES_NOTE_MAX} characters`,
} as const;

/**
 * The long-term request form: the API's 400 rules (INVALID_DATE_RANGE,
 * INVALID_TIME_RANGE, DAYS_REQUIRED, NO_OCCURRENCES, TOO_MANY_OCCURRENCES,
 * PAST_START) checked before anything is sent, each on the field that fixes
 * it. `now` is a parameter so the past-start rule can be tested.
 */
export function makeRoomBookingSeriesSchema(now: () => Date = () => new Date()) {
  return z
    .object({
      roomId: z.string().uuid(SERIES_MESSAGES.roomRequired),
      offlineCourseId: optionalUuid(SERIES_MESSAGES.courseInvalid),
      startDate: z.string().min(1, SERIES_MESSAGES.startDateRequired),
      endDate: z.string().min(1, SERIES_MESSAGES.endDateRequired),
      daysOfWeek: z.array(z.enum(DAYS_OF_WEEK)),
      startTime: z.string().min(1, SERIES_MESSAGES.startTimeRequired),
      endTime: z.string().min(1, SERIES_MESSAGES.endTimeRequired),
      note: z.string().max(SERIES_NOTE_MAX, SERIES_MESSAGES.noteTooLong).optional(),
    })
    .superRefine((v, ctx) => {
      const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

      const from = epochDay(v.startDate);
      const to = epochDay(v.endDate);
      if (v.startDate && from === null) issue("startDate", SERIES_MESSAGES.dateInvalid);
      if (v.endDate && to === null) issue("endDate", SERIES_MESSAGES.dateInvalid);
      if (from !== null && to !== null) {
        if (to < from) issue("endDate", SERIES_MESSAGES.endBeforeStart);
        else if (to - from + 1 > MAX_SERIES_RANGE_DAYS) issue("endDate", SERIES_MESSAGES.rangeTooLong);
      }

      const start = minutesOf(v.startTime);
      const end = minutesOf(v.endTime);
      if (v.startTime && start === null) issue("startTime", SERIES_MESSAGES.timeInvalid);
      if (v.endTime && end === null) issue("endTime", SERIES_MESSAGES.timeInvalid);
      if (start !== null && end !== null && end <= start) issue("endTime", SERIES_MESSAGES.endTimeNotAfter);

      if (v.daysOfWeek.length === 0) {
        issue("daysOfWeek", SERIES_MESSAGES.daysRequired);
        return;
      }
      const dates = occurrenceDates(v);
      if (!dates) return; // the date range is already flagged
      if (dates.length === 0) issue("daysOfWeek", SERIES_MESSAGES.noOccurrences);
      else if (dates.length > MAX_SERIES_OCCURRENCES) issue("daysOfWeek", SERIES_MESSAGES.tooMany(dates.length));
      else if (start !== null) {
        const first = zonedInstant(dates[0], v.startTime);
        if (first && first.getTime() <= now().getTime()) issue("startDate", SERIES_MESSAGES.pastStart(dates[0]));
      }
    });
}

export const roomBookingSeriesSchema = makeRoomBookingSeriesSchema();

export type RoomBookingSeriesFormValues = z.infer<typeof roomBookingSeriesSchema>;

export const emptySeriesValues = (roomId = ""): RoomBookingSeriesFormValues => ({
  roomId,
  offlineCourseId: "",
  startDate: "",
  endDate: "",
  daysOfWeek: [],
  startTime: "",
  endTime: "",
  note: "",
});

/** The request body for valid form values: weekdays Mon … Sun, times as HH:mm, blanks as null. */
export function toSeriesRequest(v: RoomBookingSeriesFormValues): RoomBookingSeriesCreateRequest {
  return {
    roomId: v.roomId,
    offlineCourseId: v.offlineCourseId?.trim() || null,
    startDate: v.startDate,
    endDate: v.endDate,
    daysOfWeek: sortDays(v.daysOfWeek),
    startTime: v.startTime.slice(0, 5),
    endTime: v.endTime.slice(0, 5),
    note: v.note?.trim() || null,
  };
}
