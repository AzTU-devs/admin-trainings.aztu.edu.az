import { Link } from "react-router";
import { UserCheck } from "lucide-react";
import { Button } from "@shared/components/ui/Button";
import { isInPerson, type CourseType } from "@shared/types/lms";

/**
 * The way from a course's page to its attendance, beside İştirakçilər. Only
 * for in-person courses (OFFLINE, ONE_TIME): an online course is self-paced,
 * has no class days, and the API answers ATTENDANCE_NOT_APPLICABLE.
 */
export function CourseAttendanceButton({ courseType, to }: { courseType: CourseType | null | undefined; to: string }) {
  if (!isInPerson(courseType)) return null;
  return (
    <Button asChild variant="secondary" leftIcon={<UserCheck className="size-4" />}>
      <Link to={to}>Attendance</Link>
    </Button>
  );
}
