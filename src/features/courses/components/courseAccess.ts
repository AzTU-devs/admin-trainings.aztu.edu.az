import type { CourseDto } from "@features/courses/types";

/**
 * What the signed-in tutor may do with a course on the tutor course page.
 *
 * - editor:   the one tutor authorised to change it (`course.tutorId`).
 * - coTutor:  on its teaching roster (`course.tutors`) without being the editor.
 * - outsider: neither. The API serves any published course by slug, so the page
 *   also opens for somebody else's course (a link from the catalogue). It used
 *   to treat every non-editor as a co-tutor and told them "You teach this course
 *   as a co-tutor" about a course they have nothing to do with.
 *
 * Until the tutor's own profile has loaded (`myTutorId` undefined) the page
 * assumes the editor, as before: the API refuses edits by anyone else anyway,
 * and flashing a read-only banner at the owner on every load would be worse.
 */
export type CourseAccess = "editor" | "coTutor" | "outsider";

export function courseAccess(course: Pick<CourseDto, "tutorId" | "tutors">, myTutorId?: string | null): CourseAccess {
  if (!myTutorId || course.tutorId === myTutorId) return "editor";
  return (course.tutors ?? []).some((t) => t.tutorId === myTutorId) ? "coTutor" : "outsider";
}
