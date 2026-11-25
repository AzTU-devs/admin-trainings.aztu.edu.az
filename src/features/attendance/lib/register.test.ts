import { describe, expect, it } from "vitest";
import { attendanceRate, formatRate, hasExcused, registerSummary, totalCounts, yearShown } from "@features/attendance/lib/register";
import type { AttendanceRegister, AttendanceRegisterDay } from "@features/attendance/types";

const day = (date: string, courseDay = true): AttendanceRegisterDay => ({
  date,
  courseDay,
  present: 0,
  late: 0,
  absent: 0,
  excused: 0,
});

describe("the register's arithmetic", () => {
  it("rates joined and late over every marked day, as the export does", () => {
    expect(attendanceRate({ present: 9, late: 2, absent: 1, excused: 0 })).toBeCloseTo(91.667);
    // An excused day is a marked day, not an attended one.
    expect(attendanceRate({ present: 1, late: 0, absent: 0, excused: 1 })).toBe(50);
    // Nothing marked is no rate at all, not 0 %.
    expect(attendanceRate({ present: 0, late: 0, absent: 0, excused: 0 })).toBeNull();
    // An older API without EXCUSED.
    expect(attendanceRate({ present: 1, late: 0, absent: 1 } as never)).toBe(50);
  });

  it("writes the rate with one decimal at most", () => {
    expect(formatRate(91.6667)).toBe("91.7%");
    expect(formatRate(100)).toBe("100%");
    expect(formatRate(0)).toBe("0%");
  });

  it("adds every student's counts up, and spots an excused record", () => {
    const students = [
      { present: 2, late: 1, absent: 0, excused: 0 },
      { present: 1, late: 0, absent: 2, excused: 1 },
    ] as AttendanceRegister["students"];
    expect(totalCounts({ students })).toEqual({ present: 3, late: 1, absent: 2, excused: 1 });
    expect(hasExcused({ days: [], students })).toBe(true);
    expect(hasExcused({ days: [day("2026-11-02")], students: [students[0]] })).toBe(false);
  });

  it("shows a column's year only once the register runs into another year", () => {
    expect([...yearShown([day("2026-11-02"), day("2026-12-30")])]).toEqual([]);
    expect([...yearShown([day("2026-12-28"), day("2026-12-30"), day("2027-01-04"), day("2027-01-06")])]).toEqual([
      "2026-12-28",
      "2027-01-04",
    ]);
  });

  it("sums the register up in its subtitle", () => {
    const base = {
      courseId: "c",
      courseTitle: "Python",
      firstDate: "2026-11-02",
      lastDate: "2026-11-06",
      canMark: true,
      canManage: false,
      students: [{}, {}] as AttendanceRegister["students"],
    };
    expect(
      registerSummary({
        ...base,
        courseType: "OFFLINE",
        daysOfWeek: ["MONDAY", "WEDNESDAY"],
        days: [day("2026-11-02"), day("2026-11-04"), day("2026-11-05", false)],
      }),
    ).toBe("2 students · 2 course days, Mon, Wed");
    expect(registerSummary({ ...base, courseType: "ONE_TIME", daysOfWeek: [], days: [day("2026-11-02")] })).toBe(
      "2 students · one day, Mon 2 Nov 2026",
    );
    expect(registerSummary({ ...base, courseType: "OFFLINE", daysOfWeek: [], days: [] })).toBe(
      "2 students · no course days set, so the days with marks are listed",
    );
  });
});
