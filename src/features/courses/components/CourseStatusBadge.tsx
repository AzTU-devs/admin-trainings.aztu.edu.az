import { Badge } from "@shared/components/ui/Badge";
import { COURSE_STATUS, type CourseStatus } from "@shared/types/lms";

const MAP: Record<
  CourseStatus,
  { tone: "neutral" | "brand" | "gold" | "success" | "warning" | "danger" | "outline"; label: string }
> = {
  [COURSE_STATUS.DRAFT]: { tone: "neutral", label: "Draft" },
  [COURSE_STATUS.IN_REVIEW]: { tone: "warning", label: "In review" },
  [COURSE_STATUS.PUBLISHED]: { tone: "success", label: "Published" },
  [COURSE_STATUS.REJECTED]: { tone: "danger", label: "Rejected" },
  [COURSE_STATUS.ARCHIVED]: { tone: "outline", label: "Archived" },
};

export function CourseStatusBadge({ status }: { status: CourseStatus }) {
  const m = MAP[status];
  return <Badge tone={m.tone} dot>{m.label}</Badge>;
}
