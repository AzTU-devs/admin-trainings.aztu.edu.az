import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CourseContentPreview } from "@features/courses/components/CourseContentPreview";
import type { CourseDto } from "@features/courses/types";

/** What a reviewer sees of an in-person course before it is published. */
const course = (courseType: CourseDto["courseType"], daysOfWeek: NonNullable<CourseDto["offlineDetails"]>["daysOfWeek"]) =>
  ({
    id: "c1",
    slug: "excel",
    title: "Excel",
    courseType,
    syllabusItems: [],
    offlineDetails: { startDate: "2026-11-02", endDate: "2026-12-30", studentLimit: 20, enrolledCount: 3, daysOfWeek },
  }) as unknown as CourseDto;

describe("CourseContentPreview", () => {
  it("names the days an offline course meets beside its dates", () => {
    render(<CourseContentPreview course={course("OFFLINE", ["WEDNESDAY", "MONDAY"])} />);
    expect(screen.getByText("Course days")).toBeInTheDocument();
    expect(screen.getByText("Mon, Wed")).toBeInTheDocument();
  });

  it("says nothing of days a course has none of", () => {
    render(<CourseContentPreview course={course("OFFLINE", [])} />);
    expect(screen.queryByText("Course days")).not.toBeInTheDocument();
  });
});
