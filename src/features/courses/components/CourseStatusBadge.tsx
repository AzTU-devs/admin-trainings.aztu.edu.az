import { Badge } from "@shared/components/ui/Badge";
import { COURSE_STATUS, type CourseStatus } from "@shared/types/lms";
import { enumLabel } from "@shared/constants/enumLabels";

const TONE: Record<CourseStatus, "neutral" | "brand" | "gold" | "success" | "warning" | "danger" | "outline"> = {
  [COURSE_STATUS.DRAFT]: "neutral",
  [COURSE_STATUS.IN_REVIEW]: "warning",
  [COURSE_STATUS.PUBLISHED]: "success",
  [COURSE_STATUS.REJECTED]: "danger",
  [COURSE_STATUS.ARCHIVED]: "outline",
};

export function CourseStatusBadge({ status }: { status: CourseStatus }) {
  return <Badge tone={TONE[status] ?? "neutral"} dot>{enumLabel("courseStatus", status)}</Badge>;
}
