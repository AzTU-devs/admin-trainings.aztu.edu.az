import { PageHeader } from "@shared/components/layout/PageHeader";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { Megaphone } from "lucide-react";

/**
 * The backend has no admin broadcast/compose endpoint yet — notifications are
 * produced server-side from templates. See GAP_REPORT.md.
 */
export default function AdminNotificationsPage() {
  return (
    <>
      <PageHeader title="Notifications" description="Broadcast composer for admins." />
      <EmptyState
        Icon={Megaphone}
        title="Broadcast endpoint pending"
        description="There is no admin broadcast API. Notifications are currently generated from server-side templates. The compose/broadcast endpoint is listed in the gap report."
      />
    </>
  );
}
