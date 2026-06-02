import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { DataTable } from "@shared/components/tables/DataTable";
import { Avatar, AvatarFallback } from "@shared/components/ui/Avatar";
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
import {
  useDecideTutorMutation,
  useListTutorsQuery,
} from "@features/tutors/api/tutorsApi";
import type { TutorProfileDto } from "@features/tutors/types";
import { TUTOR_APPROVAL_STATUS, type TutorApprovalStatus } from "@shared/types/lms";

function initials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

export default function AdminTutorsPage() {
  const [tab, setTab] = useState<TutorApprovalStatus>(TUTOR_APPROVAL_STATUS.PENDING);
  const [page, setPage] = useState(0);
  const [decision, setDecision] = useState<{ tutor: TutorProfileDto; kind: "APPROVED" | "REJECTED" } | null>(null);
  const [note, setNote] = useState("");

  const { data, isFetching } = useListTutorsQuery({ status: tab, page, size: 10 });
  const [decide, { isLoading: deciding }] = useDecideTutorMutation();

  const columns = useMemo<ColumnDef<TutorProfileDto>[]>(
    () => [
      {
        header: "Tutor",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar size="sm">
              <AvatarFallback>{initials(row.original.firstName, row.original.lastName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {row.original.firstName} {row.original.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">{row.original.headline ?? "—"}</p>
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
        cell: ({ row }) =>
          row.original.approvalStatus === TUTOR_APPROVAL_STATUS.PENDING ? (
            <div className="flex items-center gap-1.5 justify-end">
              <Button size="sm" variant="secondary" leftIcon={<Check className="size-4" />} onClick={() => { setDecision({ tutor: row.original, kind: "APPROVED" }); setNote(""); }}>Approve</Button>
              <Button size="sm" variant="danger" leftIcon={<X className="size-4" />} onClick={() => { setDecision({ tutor: row.original, kind: "REJECTED" }); setNote(""); }}>Reject</Button>
            </div>
          ) : null,
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader title="Tutors" description="Review and decide on tutor applications." />

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
    </>
  );
}
