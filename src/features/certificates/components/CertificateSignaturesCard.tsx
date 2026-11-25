import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, PenLine, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@shared/components/ui/Avatar";
import { Button } from "@shared/components/ui/Button";
import type { UUID } from "@shared/types/lms";
import type { NormalizedError } from "@lib/axios/httpClient";
import { FormCard } from "@features/courses/components/FormCard";
import { useSetCertificateTutorsMutation } from "@features/certificates/api/certificatesApi";
import type { CertificateTutor } from "@features/certificates/types";

/** The API's limit (400 INVALID_CERTIFICATE_TUTORS beyond it). */
export const MAX_SIGNATURES = 3;

interface Props {
  courseId: UUID;
  /** What is saved now, in order; empty is the default (the course's editor). */
  saved: CertificateTutor[];
  /** The course's experts — its editor and its roster — the only ones who may be printed. */
  experts: CertificateTutor[];
  /** The course's editor, named as the default. */
  editorName: string | null | undefined;
}

/**
 * The super admin's "Certificate signatures": which of the course's experts
 * are printed on its certificates, with a signature line each, in order —
 * one to three of them, or none chosen for the default, the course's editor.
 * Certificates are snapshots, so a change only reaches those issued after it.
 */
export function CertificateSignaturesCard(props: Props) {
  // A fresh draft whenever the saved list changes (saved here, or elsewhere and refetched).
  return <SignaturesEditor key={props.saved.map((t) => t.tutorId).join(",")} {...props} />;
}

function SignaturesEditor({ courseId, saved, experts, editorName }: Props) {
  const [draft, setDraft] = useState<UUID[]>(() => saved.map((t) => t.tutorId));
  const [setTutors, { isLoading: saving }] = useSetCertificateTutorsMutation();

  const names = useMemo(() => {
    const m = new Map<UUID, string>();
    for (const t of saved) m.set(t.tutorId, t.displayName);
    for (const t of experts) if (t.displayName) m.set(t.tutorId, t.displayName);
    return m;
  }, [saved, experts]);
  const onCourse = useMemo(() => new Set(experts.map((t) => t.tutorId)), [experts]);

  const unchanged = draft.join(",") === saved.map((t) => t.tutorId).join(",");
  const full = draft.length >= MAX_SIGNATURES;
  const addable = experts.filter((t) => !draft.includes(t.tutorId));

  const move = (index: number, by: -1 | 1) =>
    setDraft((d) => {
      const next = [...d];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });

  const save = async () => {
    try {
      await setTutors({ courseId, tutorIds: draft }).unwrap();
      toast.success(draft.length === 0 ? "Certificates will name the course editor" : "Certificate signatures saved");
    } catch (e) {
      toast.error((e as NormalizedError).message || "Could not save the signatures");
    }
  };

  return (
    <FormCard
      icon={<PenLine />}
      title="Certificate signatures"
      description="The experts named on this course's certificates, each over a signature line, in this order: up to three. A change applies to certificates issued from now on; those issued already keep the names they were issued with."
      grid={false}
      footer={
        <Button onClick={() => void save()} loading={saving} disabled={unchanged}>
          Save signatures
        </Button>
      }
    >
      {draft.length === 0 ? (
        <p className="rounded-[16px] bg-paper-2 px-4 py-3 text-[13.5px] text-ink-2">
          <span className="font-semibold text-ink">Course editor: {editorName || "not set"}</span>
          <span className="block text-ink-3">The default, while no one is chosen.</span>
        </p>
      ) : (
        <ol aria-label="Named on certificates" className="space-y-1.5">
          {draft.map((id, index) => {
            const name = names.get(id) ?? id;
            return (
              <li key={id} className="flex items-center gap-3 rounded-[14px] border border-line px-3 py-2">
                <span className="w-4 text-center text-[13px] font-semibold tabular-nums text-ink-3">{index + 1}</span>
                <Avatar size="sm">
                  <AvatarFallback name={name} />
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{name}</span>
                  {!onCourse.has(id) && (
                    <span className="block text-[12.5px] text-warn">No longer on the course: remove before saving.</span>
                  )}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Move ${name} up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Move ${name} down`}
                  disabled={index === draft.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${name}`}
                  onClick={() => setDraft((d) => d.filter((t) => t !== id))}
                >
                  <X className="size-4" />
                </Button>
              </li>
            );
          })}
        </ol>
      )}

      {addable.length > 0 && (
        <div className="mt-4">
          <p className="text-[13px] font-semibold text-ink-2">
            {full ? `At most ${MAX_SIGNATURES} names: remove one to add another.` : "Add from the course's experts"}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {addable.map((t) => (
              <Button
                key={t.tutorId}
                size="sm"
                variant="secondary"
                leftIcon={<Plus className="size-4" />}
                disabled={full}
                onClick={() => setDraft((d) => [...d, t.tutorId])}
              >
                {t.displayName || t.tutorId}
              </Button>
            ))}
          </div>
        </div>
      )}
    </FormCard>
  );
}
