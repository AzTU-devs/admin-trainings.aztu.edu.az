import { useCallback, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, History, Pencil, Star, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { DataTable } from "@shared/components/tables/DataTable";
import { Button } from "@shared/components/ui/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@shared/components/ui/Tabs";
import { TooltipProvider } from "@shared/components/ui/Tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { Textarea } from "@shared/components/ui/Textarea";
import { TutorStatusBadge } from "@features/tutors/components/TutorStatusBadge";
import { TutorAvatar } from "@features/tutors/components/TutorAvatar";
import { tutorAvatarSrc } from "@features/tutors/components/avatarSource";
import { EditExpertProfileDialog } from "@features/tutors/components/EditExpertProfileDialog";
import {
  useDecideTutorMutation,
  useListTutorsQuery,
} from "@features/tutors/api/tutorsApi";
import type { TutorProfileDto } from "@features/tutors/types";
import { TUTOR_APPROVAL_STATUS, type TutorApprovalStatus } from "@shared/types/lms";
import { cn } from "@shared/lib/cn";

type DecisionKind = "APPROVED" | "REJECTED";

const fullNameOf = (t: TutorProfileDto) => `${t.firstName ?? ""} ${t.lastName ?? ""}`.trim();

/**
 * Who the row is about: the round initials avatar every people list uses (so
 * a tutor looks the same here as in Users or the roster picker), the subject
 * area as a coloured label, then the name and the title line.
 */
function TutorIdentity({ tutor }: { tutor: TutorProfileDto }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-ink">
        {tutor.firstName} {tutor.lastName}
      </p>
      <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
        {[tutor.academicTitle, tutor.headline].filter(Boolean).join(" · ") || "—"}
      </p>
    </div>
  );
}

/**
 * The triage pair. Approve carries the weight (navy outline, green tick);
 * Reject is quiet red text that tints only on hover — in a queue the eye
 * should land on the approval, and the dialog it opens keeps the solid danger
 * button for the decision itself.
 */
function ApproveButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <Button size="sm" variant="outline" className={className} leftIcon={<Check className="size-4 text-ok" />} onClick={onClick}>
      Approve
    </Button>
  );
}
function RejectButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      className={cn("text-danger hover:bg-danger-tint hover:text-danger", className)}
      leftIcon={<X className="size-4" />}
      onClick={onClick}
    >
      Reject
    </Button>
  );
}

function Rating({ tutor }: { tutor: TutorProfileDto }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Star aria-hidden className="size-3.5 fill-gold text-gold" />
      <span className="font-semibold text-ink">{`${tutor.ratingAvg ?? 0} (${tutor.ratingCount})`}</span>
    </span>
  );
}

export default function AdminTutorsPage() {
  const [tab, setTab] = useState<TutorApprovalStatus>(TUTOR_APPROVAL_STATUS.PENDING);
  const [page, setPage] = useState(0);
  const [decision, setDecision] = useState<{ tutor: TutorProfileDto; kind: DecisionKind } | null>(null);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<TutorProfileDto | null>(null);

  const { data, isFetching } = useListTutorsQuery({ status: tab, page, size: 10 });
  const [decide, { isLoading: deciding }] = useDecideTutorMutation();

  // Opening a decision starts a fresh note (the table and the phone rows share it).
  const ask = useCallback((tutor: TutorProfileDto, kind: DecisionKind) => {
    setDecision({ tutor, kind });
    setNote("");
  }, []);

  const columns = useMemo<ColumnDef<TutorProfileDto>[]>(
    () => [
      {
        header: "Tutor",
        cell: ({ row }) => (
          <div className="flex min-w-[16rem] max-w-[30rem] items-center gap-3">
            <TutorAvatar src={tutorAvatarSrc(row.original)} name={fullNameOf(row.original)} size="md" />
            <TutorIdentity tutor={row.original} />
          </div>
        ),
      },
      {
        header: "Experience",
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.yearsExperience != null ? `${row.original.yearsExperience} yr` : "—"}
          </span>
        ),
      },
      {
        header: "Rating",
        cell: ({ row }) => (row.original.ratingCount ? <Rating tutor={row.original} /> : "—"),
      },
      { header: "Status", cell: ({ row }) => <TutorStatusBadge status={row.original.approvalStatus} /> },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" leftIcon={<Pencil className="size-4" />} onClick={() => setEditing(row.original)}>
              Edit
            </Button>
            {row.original.approvalStatus === TUTOR_APPROVAL_STATUS.PENDING && (
              <>
                <ApproveButton onClick={() => ask(row.original, "APPROVED")} />
                <RejectButton onClick={() => ask(row.original, "REJECTED")} />
              </>
            )}
          </div>
        ),
      },
    ],
    [ask],
  );

  /** A tutor on a phone: who, then where they stand, then the decision. */
  const mobileRow = (t: TutorProfileDto) => {
    const pending = t.approvalStatus === TUTOR_APPROVAL_STATUS.PENDING;
    return (
      <div className="text-sm text-ink-2">
        <div className="flex items-start gap-3">
          <TutorAvatar src={tutorAvatarSrc(t)} name={fullNameOf(t)} size="md" />
          <div className="min-w-0 flex-1">
            <TutorIdentity tutor={t} />
            <div className="meta mt-2.5">
              <TutorStatusBadge status={t.approvalStatus} />
              {t.yearsExperience != null && (
                <span>
                  <History aria-hidden />
                  {`${t.yearsExperience} yr`}
                </span>
              )}
              {!!t.ratingCount && <Rating tutor={t} />}
            </div>
          </div>
          {!pending && (
            <Button size="sm" variant="ghost" className="-mr-2 -mt-1 shrink-0 px-2" leftIcon={<Pencil className="size-4" />} onClick={() => setEditing(t)}>
              Edit
            </Button>
          )}
        </div>
        {pending && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Button size="sm" variant="ghost" className="px-2" leftIcon={<Pencil className="size-4" />} onClick={() => setEditing(t)}>
              Edit
            </Button>
            <ApproveButton className="px-2" onClick={() => ask(t, "APPROVED")} />
            <RejectButton className="px-2" onClick={() => ask(t, "REJECTED")} />
          </div>
        )}
      </div>
    );
  };

  const pagination = data
    ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages }
    : undefined;
  const emptyTitle = `No ${tab.toLowerCase()} tutors`;

  return (
    <TooltipProvider delayDuration={300}>
      <PageHeader title="Tutors" description="Review tutor applications and keep expert profiles up to date." />

      <Tabs value={tab} onValueChange={(v) => { setTab(v as TutorApprovalStatus); setPage(0); }}>
        <TabsList className="mb-4">
          <TabsTrigger value={TUTOR_APPROVAL_STATUS.PENDING}>Pending</TabsTrigger>
          <TabsTrigger value={TUTOR_APPROVAL_STATUS.APPROVED}>Approved</TabsTrigger>
          <TabsTrigger value={TUTOR_APPROVAL_STATUS.REJECTED}>Rejected</TabsTrigger>
          <TabsTrigger value={TUTOR_APPROVAL_STATUS.SUSPENDED}>Suspended</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          {/* Phones get each tutor as a stacked row with the decision buttons
              in reach (renderMobileRow); the table takes over from 768px. */}
          <DataTable<TutorProfileDto>
            data={data?.content ?? []}
            columns={columns}
            isLoading={isFetching}
            emptyTitle={emptyTitle}
            pagination={pagination}
            onPageChange={setPage}
            getRowId={(r) => r.id}
            renderMobileRow={mobileRow}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!decision} onOpenChange={(o) => !o && setDecision(null)}>
        <DialogContent size="md">
          <DialogHeader>
            {/* Who the decision is about: the same round avatar as their row. */}
            <div className="flex items-center gap-4">
              {decision && (
                <TutorAvatar
                  src={tutorAvatarSrc(decision.tutor)}
                  name={fullNameOf(decision.tutor)}
                  size="xl"
                />
              )}
              <div className="min-w-0 space-y-1">
                <DialogTitle>{decision?.kind === "APPROVED" ? "Approve tutor" : "Reject tutor"}</DialogTitle>
                <DialogDescription className="break-words">
                  {decision && `${decision.tutor.firstName} ${decision.tutor.lastName}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <Textarea
            rows={3}
            placeholder={decision?.kind === "APPROVED" ? "Optional welcome note…" : "Reason for rejection (sent to the applicant)…"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDecision(null)} disabled={deciding}>Cancel</Button>
            <Button
              variant={decision?.kind === "REJECTED" ? "danger" : "primary"}
              loading={deciding}
              onClick={async () => {
                if (!decision) return;
                try {
                  await decide({ id: decision.tutor.id, decision: decision.kind, note: note.trim() || undefined }).unwrap();
                  toast.success(decision.kind === "APPROVED" ? "Tutor approved" : "Tutor rejected");
                  setDecision(null);
                } catch {
                  toast.error("Could not save decision");
                }
              }}
            >
              {decision?.kind === "APPROVED" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditExpertProfileDialog tutor={editing} onClose={() => setEditing(null)} />
    </TooltipProvider>
  );
}
