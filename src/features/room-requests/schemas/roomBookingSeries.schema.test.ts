import { describe, expect, it } from "vitest";
import {
  SERIES_MESSAGES,
  emptySeriesValues,
  makeRoomBookingSeriesSchema,
  toSeriesRequest,
  type RoomBookingSeriesFormValues,
} from "./roomBookingSeries.schema";

const ROOM = "a0000000-0000-4000-8000-000000000001";
const COURSE = "c0000000-0000-4000-8000-000000000002";
// "Now" is fixed so the past-start rule does not drift with the calendar.
const schema = makeRoomBookingSeriesSchema(() => new Date("2026-10-25T08:00:00Z"));

const valid = (over: Partial<RoomBookingSeriesFormValues> = {}): RoomBookingSeriesFormValues => ({
  ...emptySeriesValues(ROOM),
  startDate: "2026-11-02",
  endDate: "2026-12-31",
  daysOfWeek: ["MONDAY", "WEDNESDAY"],
  startTime: "10:00",
  endTime: "12:00",
  ...over,
});

/** The messages zod reports, by field. */
function errors(values: RoomBookingSeriesFormValues): Record<string, string[]> {
  const result = schema.safeParse(values);
  if (result.success) return {};
  const out: Record<string, string[]> = {};
  for (const issue of result.error.issues) (out[String(issue.path[0])] ??= []).push(issue.message);
  return out;
}

describe("roomBookingSeriesSchema", () => {
  it("accepts the contract's example", () => {
    expect(errors(valid())).toEqual({});
  });

  it("asks for every required part", () => {
    const e = errors(emptySeriesValues(""));
    expect(e.roomId).toEqual([SERIES_MESSAGES.roomRequired]);
    expect(e.startDate).toEqual([SERIES_MESSAGES.startDateRequired]);
    expect(e.endDate).toEqual([SERIES_MESSAGES.endDateRequired]);
    expect(e.startTime).toEqual([SERIES_MESSAGES.startTimeRequired]);
    expect(e.endTime).toEqual([SERIES_MESSAGES.endTimeRequired]);
    expect(e.daysOfWeek).toEqual([SERIES_MESSAGES.daysRequired]);
  });

  it("refuses an end before the start, and a range over 366 days (INVALID_DATE_RANGE)", () => {
    expect(errors(valid({ endDate: "2026-11-01" })).endDate).toEqual([SERIES_MESSAGES.endBeforeStart]);
    // 2 Nov 2026 … 2 Nov 2027 is 366 days counting both ends: the longest accepted.
    expect(errors(valid({ endDate: "2027-11-02" })).endDate).toBeUndefined();
    expect(errors(valid({ endDate: "2027-11-03" })).endDate).toEqual([SERIES_MESSAGES.rangeTooLong]);
    // Same day is a valid range (a Monday, so one session).
    expect(errors(valid({ endDate: "2026-11-02" }))).toEqual({});
  });

  it("refuses an end time that is not after the start (INVALID_TIME_RANGE)", () => {
    expect(errors(valid({ endTime: "10:00" })).endTime).toEqual([SERIES_MESSAGES.endTimeNotAfter]);
    expect(errors(valid({ endTime: "09:00" })).endTime).toEqual([SERIES_MESSAGES.endTimeNotAfter]);
  });

  it("flags a pattern with no sessions, and one over 200 (NO_OCCURRENCES, TOO_MANY_OCCURRENCES)", () => {
    expect(errors(valid({ endDate: "2026-11-03", daysOfWeek: ["FRIDAY"] })).daysOfWeek).toEqual([
      SERIES_MESSAGES.noOccurrences,
    ]);
    const everyDay = valid({
      endDate: "2027-10-31",
      daysOfWeek: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
    });
    expect(errors(everyDay).daysOfWeek).toEqual([SERIES_MESSAGES.tooMany(364)]);
  });

  it("refuses a first session that has already started (PAST_START)", () => {
    // Now is 12:00 in Baku on Sun 25 Oct; a Sunday 11:00 session today has started.
    const today = valid({ startDate: "2026-10-25", endDate: "2026-11-30", daysOfWeek: ["SUNDAY"], startTime: "11:00" });
    expect(errors(today).startDate).toEqual([SERIES_MESSAGES.pastStart("2026-10-25")]);
    // At 13:00 it is still ahead.
    expect(errors({ ...today, startTime: "13:00", endTime: "14:00" })).toEqual({});
  });

  it("caps the note at 500 characters and checks the course id", () => {
    expect(errors(valid({ note: "x".repeat(501) })).note).toEqual([SERIES_MESSAGES.noteTooLong]);
    expect(errors(valid({ note: "x".repeat(500) }))).toEqual({});
    expect(errors(valid({ offlineCourseId: "not-a-uuid" })).offlineCourseId).toEqual([SERIES_MESSAGES.courseInvalid]);
  });
});

describe("toSeriesRequest", () => {
  it("sends weekdays Monday first, times as HH:mm and blanks as null", () => {
    expect(
      toSeriesRequest(valid({ daysOfWeek: ["WEDNESDAY", "MONDAY"], startTime: "10:00:00", note: "   " })),
    ).toEqual({
      roomId: ROOM,
      offlineCourseId: null,
      startDate: "2026-11-02",
      endDate: "2026-12-31",
      daysOfWeek: ["MONDAY", "WEDNESDAY"],
      startTime: "10:00",
      endTime: "12:00",
      note: null,
    });
    expect(toSeriesRequest(valid({ offlineCourseId: COURSE, note: " Group B " }))).toMatchObject({
      offlineCourseId: COURSE,
      note: "Group B",
    });
  });
});
