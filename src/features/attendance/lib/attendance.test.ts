import { afterEach, describe, expect, it } from "vitest";
import {
  bakuToday,
  formatDay,
  formatMarkedAt,
  isIsoDay,
  isMarkableDay,
  lastMarkableDay,
  msUntilNextBakuDay,
  studentName,
} from "./attendance";

// Some checks run in a zone west of UTC, where a day or an instant shown
// without its own zone moves to another day; CI runs in UTC and the team in
// Baku, where they would not.
const originalTz = process.env.TZ;
afterEach(() => {
  process.env.TZ = originalTz;
});

describe("attendance days", () => {
  it("takes today from Baku's clock, not the viewer's", () => {
    // 21:30 UTC is already the next day in Baku (UTC+4).
    expect(bakuToday(new Date("2026-11-13T21:30:00Z"))).toBe("2026-11-14");
    expect(bakuToday(new Date("2026-11-13T19:59:00Z"))).toBe("2026-11-13");
  });

  it("knows how long until the day turns in Baku", () => {
    expect(msUntilNextBakuDay(new Date("2026-11-13T19:59:00Z"))).toBe(60_000);
    expect(msUntilNextBakuDay(new Date("2026-11-13T19:59:59.250Z"))).toBe(750);
    // Midnight itself: a whole day to go.
    expect(msUntilNextBakuDay(new Date("2026-11-13T20:00:00Z"))).toBe(86_400_000);
    // Noon in Baku, whatever the viewer's zone.
    process.env.TZ = "America/Los_Angeles";
    expect(msUntilNextBakuDay(new Date("2026-11-13T08:00:00Z"))).toBe(12 * 3_600_000);
  });

  it("allows the course's days up to its last day or today, whichever comes first", () => {
    expect(lastMarkableDay("2026-11-27", "2026-11-13")).toBe("2026-11-13");
    expect(lastMarkableDay("2026-11-10", "2026-11-13")).toBe("2026-11-10");

    expect(isMarkableDay("2026-11-02", "2026-11-02", "2026-11-27", "2026-11-13")).toBe(true);
    expect(isMarkableDay("2026-11-13", "2026-11-02", "2026-11-27", "2026-11-13")).toBe(true);
    expect(isMarkableDay("2026-11-14", "2026-11-02", "2026-11-27", "2026-11-13")).toBe(false);
    expect(isMarkableDay("2026-11-01", "2026-11-02", "2026-11-27", "2026-11-13")).toBe(false);
    // A one-time course that has not happened yet has no day to mark.
    expect(isMarkableDay("2026-12-01", "2026-12-01", "2026-12-01", "2026-11-13")).toBe(false);
  });

  it("knows a whole, real day from what a date box reports while typing", () => {
    expect(isIsoDay("2026-11-13")).toBe(true);
    expect(isIsoDay("2028-02-29")).toBe(true);
    expect(isIsoDay("2026-02-30")).toBe(false);
    expect(isIsoDay("2026-13-01")).toBe(false);
    expect(isIsoDay("2026-11-1")).toBe(false);
    expect(isIsoDay("")).toBe(false);
  });

  it("writes a day without moving it to another one in any zone", () => {
    // In Los Angeles the 13th's midnight in UTC is still the 12th.
    process.env.TZ = "America/Los_Angeles";
    expect(formatDay("2026-11-13")).toMatch(/Fri/);
    expect(formatDay("2026-11-13")).toContain("13");
    expect(formatDay("2026-11-13")).toContain("2026");
    expect(formatDay("2026-11-13", "short")).toMatch(/Fri/);
    expect(formatDay("2026-11-13", "short")).not.toContain("2026");
  });

  it("says when a mark was saved on Baku's clock, in any zone", () => {
    process.env.TZ = "America/Los_Angeles";
    // 21:30 UTC is 01:30 on the 14th in Baku — and 13:30 on the 13th in Los Angeles.
    expect(formatMarkedAt("2026-11-13T21:30:00Z")).toMatch(/\b14\b/);
    expect(formatMarkedAt("2026-11-13T21:30:00Z")).toMatch(/\b1:30\b/);
    expect(formatMarkedAt("2026-11-13T06:05:00Z")).toMatch(/\b10:05\b/);
    expect(formatMarkedAt("not a date")).toBe("");
  });

  it("lists a student by name, or by email when the name is missing", () => {
    expect(studentName({ firstName: "Leyla", lastName: "Əliyeva", email: "l@example.az" })).toBe("Leyla Əliyeva");
    expect(studentName({ firstName: "", lastName: "", email: "l@example.az" })).toBe("l@example.az");
  });
});
