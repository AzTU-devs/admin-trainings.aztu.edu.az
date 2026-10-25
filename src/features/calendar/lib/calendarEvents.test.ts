import { afterEach, describe, expect, it } from "vitest";
import {
  addDays,
  formatEventWhen,
  normalizeCalendarResponse,
  placeOf,
  rangeFromView,
  seatsText,
  toCalendarEvent,
  toCalendarEvents,
  zonedDate,
  zonedTime,
} from "./calendarEvents";
import type { CalendarEventDto } from "@features/calendar/types";

const COURSE_ID = "11111111-2222-4333-8444-555555555555";

/** A one-time training on Mon 2 Nov 2026, 10:00–12:00 Baku (06:00–08:00 UTC), as the API sends it. */
const oneTime: CalendarEventDto = {
  id: `one-time:${COURSE_ID}`,
  kind: "ONE_TIME",
  title: "Python bootcamp",
  start: "2026-11-02T06:00:00Z",
  end: "2026-11-02T08:00:00Z",
  allDay: false,
  courseId: COURSE_ID,
  courseSlug: "python-bootcamp",
  courseType: "ONE_TIME",
  courseStatus: "PUBLISHED",
  roomName: "Room 301",
  city: "Baku",
  addressLine: "H. Javid ave. 25",
  tutorNames: ["Leyla Məmmədova"],
  seatLimit: 30,
  enrolledCount: 12,
  bookingStatus: null,
};

/** An offline course with no sessions: all day, Mon 2 – Wed 4 Nov (end = local midnight after the last day). */
const courseSpan: CalendarEventDto = {
  ...oneTime,
  id: `course:${COURSE_ID}`,
  kind: "COURSE",
  title: "Excel (10:00–12:00)",
  start: "2026-11-01T20:00:00Z",
  end: "2026-11-04T20:00:00Z",
  allDay: true,
  courseType: "OFFLINE",
};

const booking: CalendarEventDto = {
  id: "booking:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
  kind: "ROOM_BOOKING",
  title: "Room 301 · Leyla H.",
  start: "2026-11-03T10:00:00Z",
  end: "2026-11-03T12:00:00Z",
  allDay: false,
  courseId: null,
  roomName: "Room 301",
  tutorNames: ["Leyla Həsənova"],
  seatLimit: null,
  enrolledCount: null,
  bookingStatus: "PENDING",
};

describe("normalizeCalendarResponse", () => {
  it("reads the envelope, with the cap as a field beside events", () => {
    const res = normalizeCalendarResponse({
      data: { timezone: "Asia/Baku", events: [oneTime], truncated: true },
      meta: null,
      timestamp: "2026-10-25T10:00:00Z",
    });
    expect(res).toEqual({ timezone: "Asia/Baku", events: [oneTime], truncated: true });
  });

  it("reads the cap from meta.truncated too", () => {
    const res = normalizeCalendarResponse({
      data: { timezone: "Asia/Baku", events: [] },
      meta: { truncated: true },
    });
    expect(res.truncated).toBe(true);
  });

  it("is not truncated unless the API says so, and defaults the zone to Asia/Baku", () => {
    const res = normalizeCalendarResponse({ data: { events: [oneTime] } });
    expect(res.truncated).toBe(false);
    expect(res.timezone).toBe("Asia/Baku");
  });

  it("drops entries the grid cannot place instead of failing the view", () => {
    const res = normalizeCalendarResponse({
      events: [
        oneTime,
        { id: "x", kind: "MEETING", start: "a", end: "b" },
        { kind: "ONE_TIME" },
        null,
      ],
    });
    expect(res.events).toEqual([oneTime]);
  });
});

describe("toCalendarEvent", () => {
  it("keeps a timed event's instants for the calendar to place in its zone", () => {
    const ev = toCalendarEvent(oneTime);
    expect(ev).toMatchObject({
      id: oneTime.id,
      title: "Python bootcamp",
      start: "2026-11-02T06:00:00Z",
      end: "2026-11-02T08:00:00Z",
      allDay: false,
      color: "var(--cal-one-time)",
      contrastColor: "var(--cal-one-time-ink)",
    });
    expect(ev.className).toContain("cal-ev--one-time");
    expect(ev.extendedProps).toEqual({ dto: oneTime });
  });

  it("turns an all-day event's local midnights into local dates, end exclusive", () => {
    // 20:00 UTC is midnight in Baku: the bar runs 2–4 Nov, so the exclusive end is 5 Nov.
    const ev = toCalendarEvent(courseSpan);
    expect(ev).toMatchObject({
      allDay: true,
      start: "2026-11-02",
      end: "2026-11-05",
      color: "var(--cal-course)",
    });
  });

  it("gives an all-day event with no length one day", () => {
    const ev = toCalendarEvent({ ...courseSpan, end: courseSpan.start });
    expect(ev).toMatchObject({ start: "2026-11-02", end: "2026-11-03" });
  });

  it("colours each kind and marks a pending booking as tentative", () => {
    const [s, c, b] = toCalendarEvents([{ ...oneTime, kind: "SESSION" }, courseSpan, booking]);
    expect(s.color).toBe("var(--cal-session)");
    expect(c.color).toBe("var(--cal-course)");
    expect(b.color).toBe("var(--cal-booking)");
    expect(b.className).toContain("cal-ev--pending");
    expect(toCalendarEvent({ ...booking, bookingStatus: "APPROVED" }).className).not.toContain(
      "cal-ev--pending",
    );
  });
});

describe("Baku time", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("reads instants as Baku wall time, across midnight too", () => {
    expect(zonedTime("2026-11-02T06:00:00Z")).toBe("10:00");
    expect(zonedDate("2026-11-01T20:30:00Z")).toBe("2026-11-02");
    expect(zonedTime("2026-11-01T20:30:00Z")).toBe("00:30");
  });

  it("does not depend on the browser's zone", () => {
    process.env.TZ = "America/Los_Angeles";
    expect(zonedTime("2026-11-02T06:00:00Z")).toBe("10:00");
    expect(formatEventWhen(oneTime)).toBe("Mon, 2 Nov 2026 · 10:00–12:00");
    expect(toCalendarEvent(courseSpan)).toMatchObject({ start: "2026-11-02", end: "2026-11-05" });
  });

  it("words timed, overnight and all-day events", () => {
    expect(formatEventWhen(oneTime)).toBe("Mon, 2 Nov 2026 · 10:00–12:00");
    expect(
      formatEventWhen({
        start: "2026-11-02T18:00:00Z",
        end: "2026-11-02T21:00:00Z",
        allDay: false,
      }),
    ).toBe("Mon, 2 Nov 2026, 22:00 – Tue, 3 Nov 2026, 01:00");
    expect(formatEventWhen(courseSpan)).toBe("Mon, 2 Nov 2026 – Wed, 4 Nov 2026 · all day");
    expect(
      formatEventWhen({ start: "2026-11-01T20:00:00Z", end: "2026-11-02T20:00:00Z", allDay: true }),
    ).toBe("Mon, 2 Nov 2026 · all day");
  });
});

describe("rangeFromView", () => {
  it("takes the local dates of the visible range (a six-week month grid)", () => {
    expect(rangeFromView("2026-10-26T00:00:00+04:00", "2026-12-07T00:00:00+04:00")).toEqual({
      from: "2026-10-26",
      to: "2026-12-07",
    });
  });

  it("never asks for more than the API's 62 days", () => {
    expect(rangeFromView("2026-01-01", "2026-06-01")).toEqual({
      from: "2026-01-01",
      to: addDays("2026-01-01", 62),
    });
  });
});

describe("details wording", () => {
  it("puts room, street and city on one line, skipping blanks", () => {
    expect(placeOf(oneTime)).toBe("Room 301 · H. Javid ave. 25 · Baku");
    expect(placeOf({ roomName: null, city: "Baku", addressLine: " " })).toBe("Baku");
  });

  it("says seats only when the event has them", () => {
    expect(seatsText(oneTime)).toBe("12 / 30 seats");
    expect(seatsText({ seatLimit: null, enrolledCount: 4 })).toBe("4 enrolled");
    expect(seatsText(booking)).toBeNull();
  });
});
