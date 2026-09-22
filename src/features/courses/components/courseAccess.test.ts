import { describe, expect, it } from "vitest";
import { courseAccess } from "./courseAccess";

const EDITOR = "t-editor";
const CO = "t-co";
const course = {
  tutorId: EDITOR,
  tutors: [
    { tutorId: EDITOR, displayName: "Editor", authorized: true },
    { tutorId: CO, displayName: "Co", authorized: false },
  ],
};

describe("courseAccess", () => {
  it("the authorised tutor edits", () => {
    expect(courseAccess(course, EDITOR)).toBe("editor");
  });

  it("a tutor on the roster who is not the editor is a co-tutor", () => {
    expect(courseAccess(course, CO)).toBe("coTutor");
  });

  // Regression: the seed tutor opening another expert's published course was
  // told "You teach this course as a co-tutor".
  it("a tutor who is not on the roster is an outsider, not a co-tutor", () => {
    expect(courseAccess(course, "t-stranger")).toBe("outsider");
    expect(courseAccess({ tutorId: EDITOR, tutors: [] }, "t-stranger")).toBe("outsider");
  });

  it("assumes the editor until the tutor's profile has loaded", () => {
    expect(courseAccess(course, undefined)).toBe("editor");
  });

  it("survives a course without a roster (older API)", () => {
    expect(courseAccess({ tutorId: EDITOR, tutors: null as never }, CO)).toBe("outsider");
  });
});
