import { describe, expect, it } from "vitest";
import {
  dayOfWeekOfDate,
  daySpan,
  formatDayMonth,
  formatDays,
  formatWeekdayDate,
  formatWeekdayRange,
  sortDays,
} from "@shared/lib/weekdays";

describe("daySpan", () => {
  it("counts the dates on the chosen weekdays, both ends included, with the first and the last", () => {
    // Mon 2 Nov – Wed 30 Dec 2026, Mondays and Wednesdays: nine weeks of two.
    expect(daySpan("2026-11-02", "2026-12-30", ["MONDAY", "WEDNESDAY"])).toEqual({
      count: 18,
      first: "2026-11-02",
      last: "2026-12-30",
    });
    // The range's own weekdays need not be chosen: Tue 3 – Sun 15 Nov, Fridays.
    expect(daySpan("2026-11-03", "2026-11-15", ["FRIDAY"])).toEqual({ count: 2, first: "2026-11-06", last: "2026-11-13" });
  });

  it("is the same whatever order or repeats the days come in", () => {
    expect(daySpan("2026-11-02", "2026-11-08", ["SUNDAY", "MONDAY", "MONDAY"])).toEqual({
      count: 2,
      first: "2026-11-02",
      last: "2026-11-08",
    });
  });

  it("finds none when no chosen weekday falls in the range", () => {
    // Tue 3 – Thu 5 Nov has no Monday.
    expect(daySpan("2026-11-03", "2026-11-05", ["MONDAY"])).toEqual({ count: 0, first: null, last: null });
  });

  it("has no answer without a range", () => {
    expect(daySpan("", "2026-11-05", ["MONDAY"])).toBeNull();
    expect(daySpan("2026-11-05", "2026-11-04", ["MONDAY"])).toBeNull();
    expect(daySpan("2026-02-30", "2026-03-04", ["MONDAY"])).toBeNull();
  });

  it("works a mistyped year out at once rather than walking it", () => {
    const span = daySpan("2026-01-01", "9026-12-31", ["MONDAY"]);
    expect(span?.count).toBeGreaterThan(365_000);
    expect(span?.first).toBe("2026-01-05");
  });
});

describe("weekday wording", () => {
  it("orders and names the days Monday first", () => {
    expect(sortDays(["FRIDAY", "MONDAY", "FRIDAY", "NOPE"])).toEqual(["MONDAY", "FRIDAY"]);
    expect(sortDays(null)).toEqual([]);
    expect(formatDays(["WEDNESDAY", "MONDAY"])).toBe("Mon, Wed");
    expect(formatDays([])).toBe("");
    expect(formatDays(undefined)).toBe("");
  });

  it("writes a date the same way in every browser", () => {
    expect(dayOfWeekOfDate("2026-11-02")).toBe("MONDAY");
    expect(formatWeekdayDate("2026-11-02")).toBe("Mon 2 Nov 2026");
    expect(formatWeekdayDate("2026-11-02", false)).toBe("Mon 2 Nov");
    expect(formatDayMonth("2026-12-30")).toBe("30 Dec");
    expect(formatDayMonth("2027-01-04", true)).toBe("4 Jan 2027");
    expect(formatWeekdayRange("2026-11-02", "2026-12-30")).toBe("Mon 2 Nov – Wed 30 Dec 2026");
    expect(formatWeekdayRange("2026-12-28", "2027-01-04")).toBe("Mon 28 Dec 2026 – Mon 4 Jan 2027");
    expect(formatWeekdayRange("2026-11-02", "2026-11-02")).toBe("Mon 2 Nov 2026");
  });
});
