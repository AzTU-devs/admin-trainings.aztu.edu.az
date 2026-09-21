import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { DataTable } from "@shared/components/tables/DataTable";
import { Button } from "@shared/components/ui/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@shared/components/ui/Tabs";
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

export default function AdminTutorsPage() {
  const [tab, setTab] = useState<TutorApprovalStatus>(TUTOR_APPROVAL_STATUS.PENDING);
  const [page, setPage] = useState(0);
  const [decision, setDecision] = useState<{ tutor: TutorProfileDto; kind: "APPROVED" | "REJECTED" } | null>(null);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<TutorProfileDto | null>(null);

  const { data, isFetching } = useListTutorsQuery({ status: tab, page, size: 10 });
  const [decide, { isLoading: deciding }] = useDecideTutorMutation();

  const columns = useMemo<ColumnDef<TutorProfileDto>[]>(
    () => [
      {
        header: "Tutor",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <TutorAvatar
              size="sm"
              src={tutorAvatarSrc(row.original)}
              name={`${row.original.firstName ?? ""} ${row.original.lastName ?? ""}`}
            />
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {row.original.firstName} {row.original.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {[row.original.academicTitle, row.original.headline].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
          </div>
        ),
      },
      { header: "Experience", cell: ({ row }) => (row.original.yearsExperience != null ? `${row.original.yearsExperience} yr` : "—") },
      { header: "Rating", cell: ({ row }) => (row.original.ratingCount ? `${row.original.ratingAvg ?? 0} (${row.original.ratingCount})` : "—") },
      { header: "Status", cell: ({ row }) => <TutorStatusBadge status={row.original.approvalStatus} /> },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 justify-end">
            <Button size="sm" variant="ghost" leftIcon={<Pencil className="size-4" />} onClick={() => setEditing(row.original)}>Edit</Button>
            {row.original.approvalStatus === TUTOR_APPROVAL_STATUS.PENDING && (
              <>
                <Button size="sm" variant="secondary" leftIcon={<Check className="size-4" />} onClick={() => { setDecision({ tutor: row.original, kind: "APPROVED" }); setNote(""); }}>Approve</Button>
                <Button size="sm" variant="danger" leftIcon={<X className="size-4" />} onClick={() => { setDecision({ tutor: row.original, kind: "REJECTED" }); setNote(""); }}>Reject</Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader title="Tutors" description="Review tutor applications and keep expert profiles up to date." />

      <Tabs value={tab} onValueChange={(v) => { setTab(v as TutorApprovalStatus); setPage(0); }}>
        <TabsList className="mb-4">
          <TabsTrigger value={TUTOR_APPROVAL_STATUS.PENDING}>Pending</TabsTrigger>
          <TabsTrigger value={TUTOR_APPROVAL_STATUS.APPROVED}>Approved</TabsTrigger>
          <TabsTrigger value={TUTOR_APPROVAL_STATUS.REJECTED}>Rejected</TabsTrigger>
          <TabsTrigger value={TUTOR_APPROVAL_STATUS.SUSPENDED}>Suspended</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          <DataTable<TutorProfileDto>
            data={data?.content ?? []}
            columns={columns}
            isLoading={isFetching}
            emptyTitle={`No ${tab.toLowerCase()} tutors`}
            pagination={data ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } : undefined}
            onPageChange={setPage}
            getRowId={(r) => r.id}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!decision} onOpenChange={(o) => !o && setDecision(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{decision?.kind === "APPROVED" ? "Approve tutor" : "Reject tutor"}</DialogTitle>
            <DialogDescription>
              {decision && `${decision.tutor.firstName} ${decision.tutor.lastName}`}
            </DialogDescription>
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
    </>
  );
}
