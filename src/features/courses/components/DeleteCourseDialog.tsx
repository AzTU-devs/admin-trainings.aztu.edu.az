import { useId, useState } from "react";
import { Archive, DoorOpen, Globe, RotateCw, Trash2, Users, Wallet, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@shared/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { Input } from "@shared/components/ui/Input";
import { Label } from "@shared/components/ui/Label";
import { Spinner } from "@shared/components/ui/Spinner";
import { cn } from "@shared/lib/cn";
import type { UUID } from "@shared/types/lms";
import type { NormalizedError } from "@lib/axios/httpClient";
import { useDeleteCourseMutation, useGetCourseDeletionImpactQuery } from "@features/courses/api/coursesApi";
import type { CourseDeletionImpact } from "@features/courses/types";

interface Props {
  course: { id: UUID; title: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The course is gone (deleted now, or found deleted already): leave its page. */
  onDeleted: () => void;
}

/**
 * The super admin's "Delete course": what it does, counted by the API
 * (enrolments cancelled, how many of them paid, room bookings released), and
 * a Delete button that only works once the course's title is typed — there is
 * no restoring a course from any screen afterwards.
 */
export function DeleteCourseDialog({ course, open, onOpenChange, onDeleted }: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      {/* Mounted only while open: the counts are asked for afresh, and the typed title starts empty. */}
      {open && <DeleteCourseBody course={course} onBusyChange={setBusy} onCancel={() => onOpenChange(false)} onDeleted={onDeleted} />}
    </Dialog>
  );
}

function DeleteCourseBody({
  course,
  onBusyChange,
  onCancel,
  onDeleted,
}: {
  course: Props["course"];
  onBusyChange: (busy: boolean) => void;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const inputId = useId();
  const { data: impact, error, isFetching, refetch } = useGetCourseDeletionImpactQuery(course.id, {
    refetchOnMountOrArgChange: true,
  });
  const [deleteCourse, { isLoading: deleting }] = useDeleteCourseMutation();
  const [typed, setTyped] = useState("");
  const title = impact?.title ?? course.title;
  // Exactly the title; only the spaces around what was typed are forgiven.
  const confirmed = !!impact && typed.trim() === title.trim();

  const remove = async () => {
    if (!confirmed || deleting) return;
    onBusyChange(true);
    try {
      await deleteCourse(course.id).unwrap();
      toast.success(`“${title}” was deleted`);
      onBusyChange(false);
      onDeleted();
    } catch (e) {
      onBusyChange(false);
      const err = e as NormalizedError;
      toast.error(err.message || "Could not delete the course");
      // Deleted meanwhile (another tab, another super admin): there is nothing left to stay on.
      if (err.status === 404) onDeleted();
    }
  };

  return (
    <DialogContent size="md">
      <DialogHeader icon={<Trash2 />} iconTone="danger">
        <DialogTitle>Delete this course?</DialogTitle>
        <DialogDescription>
          <span className="font-semibold text-ink">{title}</span> is deleted for good.
        </DialogDescription>
      </DialogHeader>

      {impact ? (
        <Consequences impact={impact} />
      ) : error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-danger-tint px-4 py-3 text-sm text-danger">
          {(error as NormalizedError).message || "Could not count what deleting it affects."}
          <Button size="sm" variant="secondary" leftIcon={<RotateCw className="size-4" />} onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <div role="status" className="flex items-center justify-center gap-2 py-6 text-sm text-ink-3">
          <Spinner size={4} /> Counting what it affects…
        </div>
      )}

      <form
        className="mt-5"
        onSubmit={(e) => {
          e.preventDefault();
          void remove();
        }}
      >
        <Label htmlFor={inputId}>
          Type <span className="font-mono text-[13px] text-danger">{title}</span> to confirm
        </Label>
        <Input
          id={inputId}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          disabled={!impact || deleting}
        />
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            leftIcon={<Trash2 className="size-4" />}
            loading={deleting}
            disabled={!confirmed || isFetching}
          >
            Delete course
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

/** What deleting does, plainly and with the API's counts. */
function Consequences({ impact }: { impact: CourseDeletionImpact }) {
  const enrolled = impact.activeEnrollments;
  const paid = impact.paidEnrollments;
  const bookings = impact.upcomingRoomBookings;
  const series = impact.roomBookingSeries;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  return (
    <ul aria-label="What deleting does" className="space-y-2.5 rounded-[18px] border border-line px-4 py-3.5 text-[13.5px] leading-snug text-ink-2">
      <Consequence Icon={Globe}>
        It disappears from the website, the dashboard and the calendar for everyone, and{" "}
        <strong className="font-semibold text-ink">cannot be restored</strong>.
      </Consequence>
      <Consequence Icon={Users}>
        {enrolled === 0
          ? "No one is enrolled, so no enrolment is cancelled."
          : `${plural(enrolled, "active enrolment is", "active enrolments are")} cancelled, and ${enrolled === 1 ? "the student is" : "the students are"} notified.`}
      </Consequence>
      {paid > 0 && (
        <Consequence Icon={Wallet} tone="text-warn">
          {`${paid} of them ${paid === 1 ? "was" : "were"} paid. No refund is made automatically.`}
        </Consequence>
      )}
      <Consequence Icon={DoorOpen}>
        {bookings === 0 && series === 0
          ? "No upcoming room bookings to release."
          : [
              bookings > 0 && `${plural(bookings, "upcoming room booking is", "upcoming room bookings are")} released`,
              series > 0 && `${plural(series, "long-term booking is", "long-term bookings are")} removed`,
            ]
              .filter(Boolean)
              .join(", and ") + "."}
      </Consequence>
      <Consequence Icon={Archive}>Its enrolment, payment and attendance records are kept, for the record.</Consequence>
    </ul>
  );
}

function Consequence({ Icon, tone, children }: { Icon: LucideIcon; tone?: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", tone ?? "text-ink-3")} />
      <span className="min-w-0">{children}</span>
    </li>
  );
}
