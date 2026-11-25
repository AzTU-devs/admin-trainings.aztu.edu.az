import { describe, expect, it } from "vitest";
import { courseSchema, sessionHours } from "@features/courses/schemas/course.schema";

const CATEGORY = "5acf18e6-805d-40dd-bdb5-0c9e53935ad4";

const base = {
  slug: "intro-to-python",
  title: "Intro to Python",
  subtitle: "",
  description: "<p>About</p>",
  requirements: "",
  learningOutcomes: "",
  syllabusItems: [],
  courseType: "ONLINE" as const,
  level: "BEGINNER" as const,
  language: "az",
  free: true,
  price: 0,
  currency: "AZN",
  categoryIds: [CATEGORY],
  onlineDetails: { hasCertificate: false, dripEnabled: false },
};

const issues = (value: unknown) => {
  const r = courseSchema.safeParse(value);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};

describe("courseSchema", () => {
  it("needs a price above 0 for a paid course", () => {
    // Paid at 0 saved, and the course never appeared on the website.
    expect(issues({ ...base, free: false, price: 0 })).toEqual([
      "price: A paid course needs a price above 0. Switch on “Free course” if it costs nothing.",
    ]);
    expect(issues({ ...base, free: false, price: 25 })).toEqual([]);
    expect(issues({ ...base, free: true, price: 0 })).toEqual([]);
  });

  it("accepts a course exactly as the API returns it, nulls included", () => {
    // The shape that used to fail with "Invalid input: expected string, received
    // null" before any request was sent: no trailer, no weekly/total hours.
    expect(
      issues({
        ...base,
        courseType: "OFFLINE",
        subtitle: null,
        requirements: null,
        thumbnailMediaId: "498446bd-dc31-41dc-864b-d615a226160a",
        trailerMediaId: null,
        offlineDetails: {
          startDate: "2026-10-10",
          endDate: "2026-10-20",
          startTime: null,
          endTime: null,
          weeklyHours: null,
          totalHours: null,
          studentLimit: 20,
          city: null,
          addressLine: null,
          daysOfWeek: ["MONDAY", "WEDNESDAY"],
        },
      }),
    ).toEqual([]);
  });

  it("accepts hand-seeded ids that are not RFC version-4 UUIDs", () => {
    expect(issues({ ...base, categoryIds: ["00000000-0000-0000-0000-000000000001"] })).toEqual([]);
  });

  it("requires a date, both times and seats for a one-time course", () => {
    expect(issues({ ...base, courseType: "ONE_TIME", offlineDetails: { studentLimit: 0 } })).toEqual([
      "offlineDetails.startDate: Pick the date of the training",
      "offlineDetails.startTime: Start time is required",
      "offlineDetails.endTime: End time is required",
      "offlineDetails.studentLimit: Seat limit must be at least 1",
    ]);
  });

  it("wants a one-time session to end after it starts", () => {
    const oneTime = (startTime: string, endTime: string) => ({
      ...base,
      courseType: "ONE_TIME",
      offlineDetails: { startDate: "2026-10-10", startTime, endTime, studentLimit: 30 },
    });
    expect(issues(oneTime("10:00", "13:30"))).toEqual([]);
    expect(issues(oneTime("10:00:00", "13:30:00"))).toEqual([]);
    expect(issues(oneTime("13:30", "10:00"))).toEqual(["offlineDetails.endTime: End time must be after the start time"]);
    expect(issues(oneTime("10:00", "10:00"))).toEqual(["offlineDetails.endTime: End time must be after the start time"]);
  });

  it("lets an offline course leave its daily times out, but not run them backwards", () => {
    const offline = {
      ...base,
      courseType: "OFFLINE",
      offlineDetails: { startDate: "2026-10-01", endDate: "2026-10-30", studentLimit: 20, daysOfWeek: ["TUESDAY"] },
    };
    expect(issues(offline)).toEqual([]);
    expect(
      issues({ ...offline, offlineDetails: { ...offline.offlineDetails, startTime: "18:00", endTime: "09:00" } }),
    ).toEqual(["offlineDetails.endTime: End time must be after the start time"]);
  });

  it("ignores a half-filled schedule on an online course", () => {
    expect(issues({ ...base, offlineDetails: { startDate: "", studentLimit: 0 } })).toEqual([]);
  });

  it("needs a title on every syllabus item", () => {
    expect(
      issues({ ...base, syllabusItems: [{ title: "Loops", description: "<p>for</p>" }, { title: "  ", description: "" }] }),
    ).toEqual(["syllabusItems.1.title: Give this item a title"]);
  });

  it("caps the city at the column's 80 characters", () => {
    expect(
      issues({
        ...base,
        courseType: "OFFLINE",
        offlineDetails: {
          startDate: "2026-10-01",
          endDate: "2026-10-02",
          studentLimit: 5,
          city: "x".repeat(81),
          daysOfWeek: ["THURSDAY"],
        },
      }),
    ).toEqual(["offlineDetails.city: At most 80 characters"]);
  });
});

describe("courseSchema — course days", () => {
  const offline = (daysOfWeek: unknown, dates = { startDate: "2026-11-02", endDate: "2026-12-30" }) => ({
    ...base,
    courseType: "OFFLINE",
    offlineDetails: { ...dates, studentLimit: 20, daysOfWeek },
  });

  it("asks an offline course for at least one day", () => {
    expect(issues(offline([]))).toEqual(["offlineDetails.daysOfWeek: Pick at least one day"]);
    // A course from before the days were asked for: none stored, null from the API.
    expect(issues(offline(null))).toEqual(["offlineDetails.daysOfWeek: Pick at least one day"]);
    expect(issues(offline(["MONDAY", "WEDNESDAY"]))).toEqual([]);
  });

  it("wants one of the days between the dates", () => {
    // Tue 3 – Thu 5 Nov has no Monday.
    expect(issues(offline(["MONDAY"], { startDate: "2026-11-03", endDate: "2026-11-05" }))).toEqual([
      "offlineDetails.daysOfWeek: None of the chosen days falls between the start and end date",
    ]);
    expect(issues(offline(["WEDNESDAY"], { startDate: "2026-11-03", endDate: "2026-11-05" }))).toEqual([]);
  });

  it("refuses a name that is not a weekday", () => {
    expect(issues(offline(["MONDAY", "FUNDAY"]))[0]).toMatch(/^offlineDetails\.daysOfWeek\.1: /);
  });

  it("asks a one-time course for none", () => {
    expect(
      issues({
        ...base,
        courseType: "ONE_TIME",
        offlineDetails: { startDate: "2026-11-05", startTime: "10:00", endTime: "12:00", studentLimit: 30, daysOfWeek: [] },
      }),
    ).toEqual([]);
  });
});

describe("sessionHours", () => {
  it("measures a session in hours to one decimal", () => {
    expect(sessionHours("10:00", "13:30")).toBe(3.5);
    expect(sessionHours("09:15:00", "10:05:00")).toBe(0.8);
    expect(sessionHours("10:00", "09:00")).toBeNull();
    expect(sessionHours("10:00", "")).toBeNull();
  });
});
