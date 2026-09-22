import { COURSE_TYPE } from "@shared/types/lms";
import type { CourseDto } from "@features/courses/types";

/**
 * "by <tutor> · 7 of 20 seats taken" — the seat count only for an in-person
 * course, where the limit is real and the tutor could not otherwise see how
 * full the cohort is.
 */
export function courseByline(course: CourseDto): string | undefined {
  const parts: string[] = [];
  if (course.tutorDisplayName) parts.push(`by ${course.tutorDisplayName}`);
  const d = course.offlineDetails;
  if (course.courseType === COURSE_TYPE.OFFLINE && d?.studentLimit) {
    parts.push(`${d.enrolledCount ?? course.enrolledCount ?? 0} of ${d.studentLimit} seats taken`);
  }
  return parts.length ? parts.join(" · ") : undefined;
}
