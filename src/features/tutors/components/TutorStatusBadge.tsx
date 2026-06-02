import { Badge } from "@shared/components/ui/Badge";
import { TUTOR_APPROVAL_STATUS, type TutorApprovalStatus } from "@shared/types/lms";

const MAP: Record<TutorApprovalStatus, { tone: "warning" | "success" | "danger" | "neutral"; label: string }> = {
  [TUTOR_APPROVAL_STATUS.PENDING]: { tone: "warning", label: "Pending" },
  [TUTOR_APPROVAL_STATUS.APPROVED]: { tone: "success", label: "Approved" },
  [TUTOR_APPROVAL_STATUS.REJECTED]: { tone: "danger", label: "Rejected" },
  [TUTOR_APPROVAL_STATUS.SUSPENDED]: { tone: "neutral", label: "Suspended" },
};

export function TutorStatusBadge({ status }: { status: TutorApprovalStatus }) {
  const m = MAP[status];
  return <Badge tone={m.tone} dot>{m.label}</Badge>;
}
