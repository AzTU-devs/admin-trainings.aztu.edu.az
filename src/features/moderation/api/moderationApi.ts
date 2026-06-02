/**
 * Course moderation reuses the courses API decision endpoint
 * (POST /api/admin/courses/{id}/decision). The backend has no "list courses
 * awaiting review" endpoint yet — see GAP_REPORT.md.
 */
export { useDecideCourseMutation, useGetCourseBySlugQuery } from "@features/courses/api/coursesApi";
