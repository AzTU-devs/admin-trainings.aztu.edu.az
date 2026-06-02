import { Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { GraduationCap } from "lucide-react";

/**
 * No backend yet. Offline trainings are expected to be modeled as Courses with
 * courseType=OFFLINE (offlineDetails). See GAP_REPORT.md.
 */
export default function TrainingsListPage() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader
        title="Offline trainings"
        description="In-person training sessions."
        actions={
          <Button leftIcon={<Plus className="size-4" />} onClick={() => navigate("/tutor/courses/new")}>
            New (as offline course)
          </Button>
        }
      />
      <EmptyState
        Icon={GraduationCap}
        title="Trainings endpoint pending"
        description="The backend has no dedicated trainings API. Create an OFFLINE course instead, or see the gap report for the proposed contract."
      />
    </>
  );
}
