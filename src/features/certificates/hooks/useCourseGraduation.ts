import { COURSE_STATUS, type CourseStatus, type UUID } from "@shared/types/lms";
import { useGetCourseGraduationQuery } from "@features/certificates/api/certificatesApi";
import type { CourseGraduationView } from "@features/certificates/types";

/**
 * A course page's graduation view, or undefined while there is none to show:
 * not loaded yet, or refused (an expert not on the roster, an older API) —
 * the page then simply has no graduation parts.
 *
 * Only asked for where it can say something: a published or archived course
 * (one that can be ended), or one ended already (it may have been unpublished
 * since). `always` asks for any course — the super admin's signatures can be
 * chosen before the course is published.
 */
export function useCourseGraduation(
  course: { id: UUID; status: CourseStatus; endedAt?: string | null } | undefined,
  { always = false }: { always?: boolean } = {},
): CourseGraduationView | undefined {
  const relevant =
    !!course &&
    (always || !!course.endedAt || course.status === COURSE_STATUS.PUBLISHED || course.status === COURSE_STATUS.ARCHIVED);
  const { data } = useGetCourseGraduationQuery(course?.id ?? "", { skip: !relevant });
  return relevant ? data : undefined;
}
