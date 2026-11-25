import { useSearchParams } from "react-router";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/Tabs";
import { CountPill } from "@shared/components/data-display/CountPill";
import { EnrollmentRequestsTable } from "@features/enrollments/components/EnrollmentRequestsTable";
import { usePendingEnrollmentRequestCount } from "@features/enrollments/hooks/useEnrollmentRequests";

/**
 * The super admin's view of every course's enrolment requests (an expert
 * decides theirs on their Enrollments page). Pending ones come oldest first;
 * rejected ones are kept with their reason. The tab is in the URL
 * (`?tab=rejected`), so a link can open it.
 */
export default function EnrollmentRequestsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "rejected" ? "rejected" : "pending";
  const pendingCount = usePendingEnrollmentRequestCount();

  return (
    <>
      <PageHeader
        title="Enrolment requests"
        description="Students' requests to join any course. Approving a free course seats the student at once; on a paid one they are asked to pay first."
      />
      <Tabs
        value={tab}
        onValueChange={(v) =>
          setParams(v === "rejected" ? { tab: "rejected" } : {}, { replace: true })
        }
      >
        <TabsList aria-label="Requests" className="mb-4">
          <TabsTrigger value="pending">
            Pending
            <CountPill count={pendingCount} />
          </TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        {/* Keyed by the tab: each list starts on its first page. */}
        <TabsContent value={tab} className="mt-0">
          <EnrollmentRequestsTable
            key={tab}
            status={tab === "rejected" ? "REJECTED" : "PENDING_APPROVAL"}
            scope="all"
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
