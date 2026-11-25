import { useState } from "react";
import { Flag, GraduationCap } from "lucide-react";
import { Button } from "@shared/components/ui/Button";
import { cn } from "@shared/lib/cn";
import { GraduateDialog } from "@features/certificates/components/GraduateDialog";
import { certificateCounts, endedLine } from "@features/certificates/lib/certificates";
import type { CourseGraduationView } from "@features/certificates/types";

/**
 * The course header's "End course & graduate", for whoever the graduation view
 * says may end it (a roster expert with course:end, or the super admin), while
 * the course has not been ended.
 */
export function EndCourseAction({ view }: { view: CourseGraduationView | undefined }) {
  const [open, setOpen] = useState(false);
  if (!view || !view.canEnd || view.endedAt) return null;
  return (
    <>
      <Button variant="secondary" leftIcon={<GraduationCap className="size-4" />} onClick={() => setOpen(true)}>
        End course &amp; graduate
      </Button>
      <GraduateDialog view={view} mode="end" open={open} onOpenChange={setOpen} />
    </>
  );
}

/**
 * "Ended on … by …" above an ended course's page, whatever tab is open: the
 * course takes no new enrolments, and its certificates are one click away.
 */
export function CourseEndedNotice({
  view,
  onShowCertificates,
  className,
}: {
  view: CourseGraduationView | undefined;
  onShowCertificates?: () => void;
  className?: string;
}) {
  if (!view?.endedAt) return null;
  const { valid } = certificateCounts(view);
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col gap-3 rounded-[20px] border border-line bg-navy-tint px-5 py-4 sm:flex-row sm:items-center",
        className,
      )}
    >
      <Flag aria-hidden className="hidden size-5 shrink-0 text-navy sm:block" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{endedLine(view)}</p>
        <p className="mt-0.5 text-[13.5px] text-ink-2">
          It takes no new enrolments. {valid} {valid === 1 ? "certificate is" : "certificates are"} valid.
        </p>
      </div>
      {onShowCertificates && (
        <Button size="sm" variant="secondary" className="self-start sm:self-auto" onClick={onShowCertificates}>
          See certificates
        </Button>
      )}
    </div>
  );
}
