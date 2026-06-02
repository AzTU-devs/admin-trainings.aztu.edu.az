import { PageHeader } from "@shared/components/layout/PageHeader";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { GraduationCap } from "lucide-react";

export default function TrainingNewPage() {
  return (
    <>
      <PageHeader title="New training" description="In-person training session." />
      <EmptyState
        Icon={GraduationCap}
        title="Trainings endpoint pending"
        description="No backend trainings API yet. Create an OFFLINE course (courseType=OFFLINE) for now — see the gap report."
      />
    </>
  );
}
