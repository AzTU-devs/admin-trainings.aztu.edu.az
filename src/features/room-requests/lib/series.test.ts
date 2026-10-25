import { describe, expect, it } from "vitest";
import {
  MAX_SERIES_RANGE_DAYS,
  dayOfWeekOf,
  epochDay,
  formatDays,
  formatSessions,
  occurrenceDates,
  sessionHours,
  sortDays,
  todayIn,
  wallClock,
  zonedInstant,
} from "./series";

const MON_WED = ["MONDAY", "WEDNESDAY"];

describe("occurrenceDates — the API's expansion of a series", () => {
  it("keeps only the chosen weekdays (the contract's example: 18 sessions)", () => {
    const dates = occurrenceDates({ startDate: "2026-11-02", endDate: "2026-12-31", daysOfWeek: MON_WED });
    expect(dates).toHaveLength(18);
    expect(dates?.slice(0, 4)).toEqual(["2026-11-02", "2026-11-04", "2026-11-09", "2026-11-11"]);
    expect(dates?.[dates.length - 1]).toBe("2026-12-30");
    for (const d of dates ?? []) expect(MON_WED).toContain(dayOfWeekOf(epochDay(d)!));
  });

  it("includes both ends of the range", () => {
    // Mon 2 Nov … Mon 30 Nov 2026: five Mondays, the first and last day among them.
    expect(occurrenceDates({ startDate: "2026-11-02", endDate: "2026-11-30", daysOfWeek: ["MONDAY"] })).toEqual([
      "2026-11-02",
      "2026-11-09",
      "2026-11-16",
      "2026-11-23",
      "2026-11-30",
    ]);
    // A one-day range is one session on the right weekday, none on another.
    expect(occurrenceDates({ startDate: "2026-11-02", endDate: "2026-11-02", daysOfWeek: ["MONDAY"] })).toEqual(["2026-11-02"]);
    expect(occurrenceDates({ startDate: "2026-11-02", endDate: "2026-11-02", daysOfWeek: ["TUESDAY"] })).toEqual([]);
  });

  it("returns an empty list when no chosen weekday falls in the range (NO_OCCURRENCES)", () => {
    // Tue 3 … Fri 6 Nov 2026 has no weekend day.
    expect(occurrenceDates({ startDate: "2026-11-03", endDate: "2026-11-06", daysOfWeek: ["SATURDAY", "SUNDAY"] })).toEqual([]);
  });

  it("crosses month, year and DST boundaries by whole days", () => {
    // Europe's clocks change on 28 Mar 2027 — irrelevant to Baku, and to calendar dates.
    const dates = occurrenceDates({ startDate: "2026-12-28", endDate: "2027-04-05", daysOfWeek: ["MONDAY"] });
    expect(dates?.[0]).toBe("2026-12-28");
    expect(dates).toContain("2027-01-04");
    expect(dates).toContain("2027-03-29");
    expect(dates?.[dates.length - 1]).toBe("2027-04-05");
    expect(dates).toHaveLength(15);
  });

  it("refuses ranges the API refuses: reversed, longer than 366 days, or not real dates", () => {
    expect(occurrenceDates({ startDate: "2026-12-31", endDate: "2026-11-02", daysOfWeek: MON_WED })).toBeNull();
    expect(occurrenceDates({ startDate: "2026-11-02", endDate: "", daysOfWeek: MON_WED })).toBeNull();
    expect(occurrenceDates({ startDate: "2027-02-30", endDate: "2027-03-30", daysOfWeek: MON_WED })).toBeNull();
    // 366 days counting both ends is the longest series: 1 Jan 2027 … 1 Jan 2028, as the API counts.
    expect(epochDay("2028-01-01")! - epochDay("2027-01-01")! + 1).toBe(MAX_SERIES_RANGE_DAYS);
    expect(occurrenceDates({ startDate: "2027-01-01", endDate: "2028-01-01", daysOfWeek: MON_WED })).not.toBeNull();
    expect(occurrenceDates({ startDate: "2027-01-01", endDate: "2028-01-02", daysOfWeek: MON_WED })).toBeNull();
  });

  it("counts past the 200-session limit so it can be flagged", () => {
    const everyDay = occurrenceDates({
      startDate: "2027-01-01",
      endDate: "2027-12-31",
      daysOfWeek: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
    });
    expect(everyDay).toHaveLength(365);
    // Mon–Fri over 40 weeks is exactly 200; one more weekday tips it over.
    const workdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
    expect(occurrenceDates({ startDate: "2027-01-04", endDate: "2027-10-08", daysOfWeek: workdays })).toHaveLength(200);
    expect(occurrenceDates({ startDate: "2027-01-04", endDate: "2027-10-11", daysOfWeek: workdays })).toHaveLength(201);
  });
});

describe("Baku wall-clock times", () => {
  it("turns a Baku date and time into the instant (UTC+4)", () => {
    expect(zonedInstant("2026-11-02", "10:00")?.toISOString()).toBe("2026-11-02T06:00:00.000Z");
    expect(zonedInstant("2026-11-02", "00:30:00")?.toISOString()).toBe("2026-11-01T20:30:00.000Z");
    expect(zonedInstant("2026-11-02", "25:00")).toBeNull();
  });

  it("reads an instant on a Baku clock, whatever the browser's zone", () => {
    expect(wallClock("2026-11-02T06:00:00Z")).toMatchObject({ date: "2026-11-02", time: "10:00" });
    // 21:30Z is already the next day in Baku.
    expect(todayIn(undefined, new Date("2026-10-25T21:30:00Z"))).toBe("2026-10-26");
    expect(todayIn(undefined, new Date("2026-10-25T19:30:00Z"))).toBe("2026-10-25");
  });
});

describe("display helpers", () => {
  it("orders weekdays Monday first and names the common patterns", () => {
    expect(sortDays(["SUNDAY", "WEDNESDAY", "MONDAY", "MONDAY"])).toEqual(["MONDAY", "WEDNESDAY", "SUNDAY"]);
    expect(formatDays(["WEDNESDAY", "MONDAY"])).toBe("Mon, Wed");
    expect(formatDays(["FRIDAY", "THURSDAY", "WEDNESDAY", "TUESDAY", "MONDAY"])).toBe("Mon–Fri");
    expect(formatDays(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"])).toBe("Every day");
  });

  it("measures a session and counts what is still to come", () => {
    expect(sessionHours("10:00", "12:30")).toBe(2.5);
    expect(sessionHours("12:00", "10:00")).toBeNull();
    expect(formatSessions(18, 18)).toBe("18 sessions");
    expect(formatSessions(18, 6)).toBe("18 sessions · 6 upcoming");
    expect(formatSessions(1)).toBe("1 session");
  });
});
