import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@shared/components/ui/Card";
import { Spinner } from "@shared/components/ui/Spinner";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { ExpertProfileForm } from "@features/tutors/components/ExpertProfileForm";
import { TutorStatusBadge } from "@features/tutors/components/TutorStatusBadge";
import {
  useGetMyTutorProfileQuery,
  useUpdateMyTutorProfileMutation,
} from "@features/tutors/api/tutorsApi";
import { TUTOR_APPROVAL_STATUS, type TutorApprovalStatus } from "@shared/types/lms";

/** Whether what the tutor saves here is what the public site shows. */
const VISIBILITY: Record<TutorApprovalStatus, string> = {
  [TUTOR_APPROVAL_STATUS.APPROVED]: "Shown on your public expert page on the trainings site.",
  [TUTOR_APPROVAL_STATUS.PENDING]:
    "Your application is under review. These details go public once it is approved.",
  [TUTOR_APPROVAL_STATUS.REJECTED]: "Not shown publicly while your application is rejected.",
  [TUTOR_APPROVAL_STATUS.SUSPENDED]: "Not shown publicly while your profile is suspended.",
};

/** A tutor's own expert profile editor, through `PATCH /api/portal/tutor/me`. */
export function ExpertProfileSection() {
  const { data, isLoading, error } = useGetMyTutorProfileQuery();
  const [update] = useUpdateMyTutorProfileMutation();

  if (isLoading) {
    return (
      <Card className="mt-4">
        <CardContent className="py-10 flex justify-center">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    // Tutor sign-up creates the profile, so a 404 means a TUTOR role granted by
    // hand — there is nothing here to edit, which is not the same as a failure.
    const missing = !!error && "status" in error && error.status === 404;
    return (
      <EmptyState
        className="mt-4"
        title={missing ? "No expert profile yet" : "Couldn't load your expert profile"}
        description={
          missing
            ? "Your account has no expert profile to edit. Contact the platform administrators."
            : "Please try again later."
        }
      />
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>Expert profile</CardTitle>
          <CardDescription>{VISIBILITY[data.approvalStatus]}</CardDescription>
        </div>
        <TutorStatusBadge status={data.approvalStatus} />
      </CardHeader>
      <CardContent className="pt-2">
        {/* Keyed by id only: a refetch after saving must not reset edits in progress. */}
        <ExpertProfileForm key={data.id} profile={data} onSave={(body) => update(body).unwrap()} />
      </CardContent>
    </Card>
  );
}
