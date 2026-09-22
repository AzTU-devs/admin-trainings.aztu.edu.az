import { describe, expect, it } from "vitest";
import { lessonSchema } from "./lesson.schema";

const lesson = { title: "Intro", contentType: "LIVE_SESSION" as const, durationSeconds: 0, preview: false };

describe("lessonSchema", () => {
  it("keeps an existing LIVE_SESSION lesson valid", () => {
    expect(lessonSchema.safeParse({ ...lesson, videoUrl: "" }).success).toBe(true);
  });

  it("accepts only http(s) links — the link is rendered as one", () => {
    expect(lessonSchema.safeParse({ ...lesson, videoUrl: "https://meet.example.com/x" }).success).toBe(true);
    expect(lessonSchema.safeParse({ ...lesson, videoUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(lessonSchema.safeParse({ ...lesson, videoUrl: "meet.example.com" }).success).toBe(false);
  });

  it("rejects a title of spaces", () => {
    expect(lessonSchema.safeParse({ ...lesson, title: "   " }).success).toBe(false);
  });
});
