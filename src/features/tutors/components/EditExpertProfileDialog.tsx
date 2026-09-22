import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { ExpertProfileForm } from "@features/tutors/components/ExpertProfileForm";
import { TutorStatusBadge } from "@features/tutors/components/TutorStatusBadge";
import { TutorAvatar } from "@features/tutors/components/TutorAvatar";
import { tutorAvatarSrc } from "@features/tutors/components/avatarSource";
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
        // Scrolls inside by itself (the shared dialog caps its height), which
        // the form's sticky save bar relies on.
        className="pb-0 sm:pb-0"
        // A stray click beside a long form should not throw the edits away;
        // Esc, Cancel and the close button still dismiss it on purpose.
        onInteractOutside={(e) => e.preventDefault()}
      >
        {tutor && (
          <>
            {/* The expert's identity strip: the same round avatar as their row
                in the Tutors table (the arch monogram is kept for 96px and up,
                where its drawing has room). */}
            <DialogHeader className="mb-5 flex-row items-start gap-3.5 border-b border-line pb-5 sm:mb-6 sm:items-center sm:gap-4 sm:pb-6">
              <TutorAvatar
                src={tutorAvatarSrc(tutor)}
                name={`${tutor.firstName ?? ""} ${tutor.lastName ?? ""}`}
                size="xl"
                className="size-12 text-[16.5px] sm:size-16 sm:text-[22px]"
              />
              <div className="min-w-0 space-y-1.5">
                <DialogTitle className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                  Edit expert profile <TutorStatusBadge status={tutor.approvalStatus} />
                </DialogTitle>
                <DialogDescription>
                  <span className="font-semibold text-ink">
                    {tutor.firstName} {tutor.lastName}
                  </span>{" "}
                  ·{" "}
                  {tutor.approvalStatus === TUTOR_APPROVAL_STATUS.APPROVED
                    ? "Changes appear on the public expert page as soon as they're saved."
                    : "Not shown publicly until approved. Saving here doesn't change the approval status."}
                </DialogDescription>
              </div>
            </DialogHeader>
            {/* Keyed so opening another expert starts a fresh form, not the last one's edits. */}
            <ExpertProfileForm
              key={tutor.id}
              profile={tutor}
              onSave={(body) => update({ id: tutor.id, body }).unwrap()}
              onSaved={onClose}
              onCancel={onClose}
              stickyActions
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
