import { Flag } from "lucide-react";
import { Badge } from "@shared/components/ui/Badge";
import { COURSE_STATUS, type CourseStatus } from "@shared/types/lms";
import { formatBakuDate } from "@features/certificates/lib/certificates";

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

/**
 * "Ended" beside the status of a course whose students have been graduated.
 * Ending is not a status (a published course stays published), so it is its
 * own pill; nothing while the course runs.
 */
export function CourseEndedBadge({ endedAt }: { endedAt?: string | null }) {
  if (!endedAt) return null;
  const on = formatBakuDate(endedAt);
  return (
    <Badge tone="brand" title={on ? `Ended on ${on}` : undefined}>
      <Flag aria-hidden className="size-3" />
      Ended
    </Badge>
  );
}
