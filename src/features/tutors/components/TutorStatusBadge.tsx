import { Badge } from "@shared/components/ui/Badge";
import { TUTOR_APPROVAL_STATUS, type TutorApprovalStatus } from "@shared/types/lms";
import { enumLabel } from "@shared/constants/enumLabels";

const TONE: Record<TutorApprovalStatus, "warning" | "success" | "danger" | "neutral"> = {
  [TUTOR_APPROVAL_STATUS.PENDING]: "warning",
  [TUTOR_APPROVAL_STATUS.APPROVED]: "success",
  [TUTOR_APPROVAL_STATUS.REJECTED]: "danger",
  [TUTOR_APPROVAL_STATUS.SUSPENDED]: "neutral",
};

export function TutorStatusBadge({ status }: { status: TutorApprovalStatus }) {
  return <Badge tone={TONE[status] ?? "neutral"} dot>{enumLabel("tutorApprovalStatus", status)}</Badge>;
}
