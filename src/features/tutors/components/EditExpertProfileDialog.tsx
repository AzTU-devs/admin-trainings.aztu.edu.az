import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { ExpertProfileForm } from "@features/tutors/components/ExpertProfileForm";
import { TutorStatusBadge } from "@features/tutors/components/TutorStatusBadge";
import { useUpdateTutorProfileMutation } from "@features/tutors/api/tutorsApi";
import { TUTOR_APPROVAL_STATUS } from "@shared/types/lms";
import type { TutorProfileDto } from "@features/tutors/types";

interface Props {
  /** The expert being edited; null keeps the dialog closed. */
  tutor: TutorProfileDto | null;
  onClose: () => void;
}

/** An admin's edit of any expert's profile, through `PATCH /api/admin/tutors/{tutorId}`. */
export function EditExpertProfileDialog({ tutor, onClose }: Props) {
  const [update] = useUpdateTutorProfileMutation();

  return (
    <Dialog open={!!tutor} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size="xl"
        className="max-h-[90vh] overflow-y-auto"
        // A stray click beside a long form should not throw the edits away;
        // Esc, Cancel and the close button still dismiss it on purpose.
        onInteractOutside={(e) => e.preventDefault()}
      >
        {tutor && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 pr-8">
                Edit expert profile <TutorStatusBadge status={tutor.approvalStatus} />
              </DialogTitle>
              <DialogDescription>
                {tutor.firstName} {tutor.lastName} ·{" "}
                {tutor.approvalStatus === TUTOR_APPROVAL_STATUS.APPROVED
                  ? "Changes appear on the public expert page as soon as they're saved."
                  : "Not shown publicly until approved. Saving here doesn't change the approval status."}
              </DialogDescription>
            </DialogHeader>
            {/* Keyed so opening another expert starts a fresh form, not the last one's edits. */}
            <ExpertProfileForm
              key={tutor.id}
              profile={tutor}
              onSave={(body) => update({ id: tutor.id, body }).unwrap()}
              onSaved={onClose}
              onCancel={onClose}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
