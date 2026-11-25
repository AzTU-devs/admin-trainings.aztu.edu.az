import { useState } from "react";
import { Download, ExternalLink, GraduationCap, RotateCcw, ShieldX, Users } from "lucide-react";
import { toast } from "sonner";
import { SoftEmpty } from "@shared/components/bright";
import { Badge } from "@shared/components/ui/Badge";
import { Button } from "@shared/components/ui/Button";
import { ConfirmDialog } from "@shared/components/ui/ConfirmDialog";
import { FormCard } from "@features/courses/components/FormCard";
import type { NormalizedError } from "@lib/axios/httpClient";
import { useReopenCourseMutation } from "@features/certificates/api/certificatesApi";
import { GraduateDialog } from "@features/certificates/components/GraduateDialog";
import { RevokeCertificateDialog, type RevokeTarget } from "@features/certificates/components/RevokeCertificateDialog";
import {
  certificateCounts,
  certificatePageUrl,
  certificatePdfUrl,
  formatBakuDay,
  formatCertificateCode,
  graduatable,
  graduateName,
  isLive,
} from "@features/certificates/lib/certificates";
import type { CourseGraduationView, GraduationStudent } from "@features/certificates/types";

/**
 * A course's Certificates section: each student's certificate (its number,
 * when it was issued, whether it still stands), with links to the website,
 * where it is drawn, verified and downloaded as a PDF. Those who may graduate
 * students graduate the rest from here; the super admin also revokes a
 * certificate and reopens a course ended by mistake.
 */
export function CourseCertificatesCard({ view }: { view: CourseGraduationView }) {
  const [graduating, setGraduating] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [revoking, setRevoking] = useState<RevokeTarget | null>(null);
  const [reopenCourse] = useReopenCourseMutation();

  const remaining = graduatable(view);
  const { valid, revoked } = certificateCounts(view);
  const ended = !!view.endedAt;
  const mayGraduate = ended && view.canIssue && remaining.length > 0;
  const mayReopen = ended && view.canManage;

  const reopen = async () => {
    try {
      await reopenCourse({ courseId: view.courseId }).unwrap();
      toast.success("Course reopened");
    } catch (e) {
      toast.error((e as NormalizedError).message || "Could not reopen the course");
    }
  };

  return (
    <>
      <FormCard
        icon={<GraduationCap />}
        title="Certificates"
        description={summary(valid, revoked, view.students.length)}
        grid={false}
        footer={
          mayGraduate || mayReopen ? (
            <>
              {mayReopen && (
                <Button variant="ghost" leftIcon={<RotateCcw className="size-4" />} onClick={() => setReopening(true)}>
                  Reopen course
                </Button>
              )}
              {mayGraduate && (
                <Button leftIcon={<GraduationCap className="size-4" />} onClick={() => setGraduating(true)}>
                  Graduate more students
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {view.students.length === 0 ? (
          <SoftEmpty icon={<Users />} title="No students on this course." />
        ) : (
          <ul aria-label="Students' certificates" className="-mx-5 divide-y divide-line border-y border-line sm:-mx-7">
            {view.students.map((s) => (
              <CertificateRow
                key={s.enrollmentId}
                student={s}
                canRevoke={view.canManage}
                onRevoke={(target) => setRevoking(target)}
              />
            ))}
          </ul>
        )}
      </FormCard>

      {view.canIssue && <GraduateDialog view={view} mode="issue" open={graduating} onOpenChange={setGraduating} />}
      {view.canManage && (
        <>
          <RevokeCertificateDialog courseId={view.courseId} target={revoking} onClose={() => setRevoking(null)} />
          <ConfirmDialog
            open={reopening}
            onOpenChange={setReopening}
            title="Reopen this course?"
            description="Use this when the course was ended by mistake. It takes enrolments again and, if published, returns to the catalogue. The certificates already issued stay valid."
            confirmLabel="Reopen course"
            onConfirm={reopen}
          />
        </>
      )}
    </>
  );
}

function summary(valid: number, revoked: number, students: number): string {
  if (valid === 0 && revoked === 0) {
    return students === 0 ? "Nobody is enrolled." : "No certificates issued yet.";
  }
  const parts = [`${valid} ${valid === 1 ? "certificate" : "certificates"} valid`];
  if (revoked > 0) parts.push(`${revoked} revoked`);
  return `${parts.join(", ")} · ${students} ${students === 1 ? "student" : "students"}. Certificates are verified and downloaded on the website.`;
}

function CertificateRow({
  student,
  canRevoke,
  onRevoke,
}: {
  student: GraduationStudent;
  canRevoke: boolean;
  onRevoke: (target: RevokeTarget) => void;
}) {
  const name = graduateName(student);
  const certificate = student.certificate;
  return (
    <li
      aria-label={name}
      className="grid gap-x-5 gap-y-2 px-5 py-3.5 sm:px-7 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink" title={name}>
          {name}
        </p>
        <p className="truncate text-[12.5px] text-ink-3" title={student.email}>
          {student.email}
        </p>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
        {certificate ? (
          <>
            <span className="font-mono text-[13px] text-ink">{formatCertificateCode(certificate.code)}</span>
            <CertificateStatus revokedAt={certificate.revokedAt} />
            <span className="text-[12.5px] text-ink-3">Issued {formatBakuDay(certificate.issuedAt)}</span>
          </>
        ) : (
          <Badge tone="neutral">Not graduated</Badge>
        )}
      </div>

      {certificate && (
        <div className="-ml-2 flex flex-wrap items-center gap-0.5 md:ml-0 md:justify-end">
          <Button asChild size="sm" variant="ghost" leftIcon={<ExternalLink className="size-4" />}>
            <a href={certificatePageUrl(certificate.code)} target="_blank" rel="noopener noreferrer">
              View<span className="sr-only"> {name}&apos;s certificate</span>
            </a>
          </Button>
          {/* A revoked certificate has no PDF: the website answers 410. */}
          {isLive(certificate) && (
            <Button asChild size="sm" variant="ghost" leftIcon={<Download className="size-4" />}>
              <a href={certificatePdfUrl(certificate.code)} target="_blank" rel="noopener noreferrer">
                Download PDF<span className="sr-only"> of {name}&apos;s certificate</span>
              </a>
            </Button>
          )}
          {canRevoke && isLive(certificate) && (
            <Button
              size="sm"
              variant="ghost"
              className="text-danger hover:bg-danger-tint hover:text-danger"
              leftIcon={<ShieldX className="size-4" />}
              onClick={() => onRevoke({ certificate, name })}
            >
              Revoke<span className="sr-only"> {name}&apos;s certificate</span>
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

function CertificateStatus({ revokedAt }: { revokedAt: string | null }) {
  if (!revokedAt) {
    return (
      <Badge tone="success" dot>
        Valid
      </Badge>
    );
  }
  return (
    <Badge tone="danger" dot title={`Revoked on ${formatBakuDay(revokedAt)}`}>
      Revoked {formatBakuDay(revokedAt)}
    </Badge>
  );
}
