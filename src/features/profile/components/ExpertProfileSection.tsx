import { Card, CardContent } from "@shared/components/ui/Card";
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
      <Card className="mt-6">
        <CardContent className="flex justify-center py-10">
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
        className="mt-6"
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
    // A bare section over the form's cards (the foundation's page pattern
    // for an unboxed section): the heading a step above the cards' titles,
    // the visibility note under it and the approval status at its end. The
    // cards and the sticky save bar are the course editor's, so the three
    // forms (course, settings, expert profile) read as one product.
    <section aria-labelledby="expert-profile-title" className="mt-10">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2
            id="expert-profile-title"
            className="font-display text-[24px] font-extrabold leading-tight tracking-[-0.024em] text-ink"
          >
            Expert profile
          </h2>
          <p className="mt-1 text-[14.5px] leading-relaxed text-ink-2">{VISIBILITY[data.approvalStatus]}</p>
        </div>
        <TutorStatusBadge status={data.approvalStatus} />
      </header>
      {/* Keyed by id only: a refetch after saving must not reset edits in progress. */}
      <ExpertProfileForm
        key={data.id}
        profile={data}
        onSave={(body) => update(body).unwrap()}
        layout="cards"
        saveBarLabel="Expert profile"
      />
    </section>
  );
}
