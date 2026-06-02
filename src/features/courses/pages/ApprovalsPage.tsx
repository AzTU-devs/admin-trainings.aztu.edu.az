import { PageHeader } from "@shared/components/layout/PageHeader";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { ClipboardCheck } from "lucide-react";

/**
 * The backend exposes no "list my submissions / approval status" endpoint yet
 * (tutor course controller only has create/update/submit/archive).
 * See GAP_REPORT.md → `GET /api/portal/courses?status=...`.
 */
export default function ApprovalsPage() {
  return (
    <>
      <PageHeader title="Approval status" description="Track which of your courses are awaiting review." />
      <EmptyState
        Icon={ClipboardCheck}
        title="Approval status endpoint pending"
        description="A backend endpoint to list a tutor's own courses by status is required before this view can show data. It's listed in the gap report."
      />
    </>
  );
}
