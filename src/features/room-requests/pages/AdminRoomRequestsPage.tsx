import { useCallback, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, X } from "lucide-react";
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
import { RoomRequestStatusBadge } from "@features/room-requests/components/RoomRequestStatusBadge";
import {
  BookingMobileRow,
  FeeCell,
  RecurrenceCell,
  RoomCell,
  WhenCell,
} from "@features/room-requests/components/BookingCells";
import {
  useDecideRoomBookingMutation,
  useListAdminRoomBookingsQuery,
} from "@features/room-requests/api/roomRequestsApi";
import type { RoomBookingDto } from "@features/room-requests/types";
import { BOOKING_STATUS, type BookingStatus } from "@shared/types/lms";

type DecisionKind = "APPROVED" | "REJECTED";

/**
 * The decision pair in a row — the same pair as the tutor approval queue.
 * Neither is a filled primary: a queue of eight pending requests would
 * otherwise be a column of eight raised navy buttons. Approve carries the
 * weight as a navy outline with a green tick, Reject is quiet red text; the
 * dialog each opens keeps the solid button for the decision itself.
 */
function ApproveButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" leftIcon={<Check className="size-4 text-ok" />} onClick={onClick}>
      Approve
    </Button>
  );
}
function RejectButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-danger hover:bg-danger-tint hover:text-danger"
      leftIcon={<X className="size-4" />}
      onClick={onClick}
    >
      Reject
    </Button>
  );
}

export default function AdminRoomRequestsPage() {
  const [tab, setTab] = useState<BookingStatus>(BOOKING_STATUS.PENDING);
  const [page, setPage] = useState(0);
  const [decision, setDecision] = useState<{ b: RoomBookingDto; kind: DecisionKind } | null>(null);
  const [note, setNote] = useState("");

  const { data, isFetching } = useListAdminRoomBookingsQuery({ status: tab, page, size: 10 });
  const [decide, { isLoading: deciding }] = useDecideRoomBookingMutation();

  // Opening a decision starts a fresh note (the table and the phone rows share it).
  const openDecision = useCallback((b: RoomBookingDto, kind: DecisionKind) => {
    setDecision({ b, kind });
    setNote("");
  }, []);

  const columns = useMemo<ColumnDef<RoomBookingDto>[]>(
    () => [
      { header: "Room", accessorKey: "roomName", cell: ({ row }) => <RoomCell name={row.original.roomName} roomId={row.original.roomId} /> },
      { header: "When", cell: ({ row }) => <WhenCell booking={row.original} /> },
      { header: "Recurrence", cell: ({ row }) => <RecurrenceCell rule={row.original.recurrenceRule} /> },
      { header: "Fee", cell: ({ row }) => <FeeCell booking={row.original} /> },
      { header: "Status", cell: ({ row }) => <RoomRequestStatusBadge status={row.original.status} /> },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          row.original.status === BOOKING_STATUS.PENDING ? (
            <div className="flex items-center justify-end gap-2">
              <ApproveButton onClick={() => openDecision(row.original, "APPROVED")} />
              <RejectButton onClick={() => openDecision(row.original, "REJECTED")} />
            </div>
          ) : null,
      },
    ],
    [openDecision],
  );

  const bookings = data?.content ?? [];
  const pagination = data
    ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages }
    : undefined;
  const emptyTitle = `No ${tab.toLowerCase()} bookings`;

  return (
    <>
      <PageHeader title="Room bookings" description="Review and approve classroom booking requests." />

      <Tabs value={tab} onValueChange={(v) => { setTab(v as BookingStatus); setPage(0); }}>
        <TabsList>
          <TabsTrigger value={BOOKING_STATUS.PENDING}>Pending</TabsTrigger>
          <TabsTrigger value={BOOKING_STATUS.APPROVED}>Approved</TabsTrigger>
          <TabsTrigger value={BOOKING_STATUS.REJECTED}>Rejected</TabsTrigger>
          <TabsTrigger value={BOOKING_STATUS.CANCELLED}>Cancelled</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          {/* Below 768px DataTable shows each row as a card; a booking's
              card is the tile, room, fee, status and time with the decision
              pair in reach (six columns do not fit 390px). */}
          <DataTable<RoomBookingDto>
            data={bookings}
            columns={columns}
            isLoading={isFetching}
            emptyTitle={emptyTitle}
            pagination={pagination}
            onPageChange={setPage}
            getRowId={(r) => r.id}
            renderMobileRow={(b) => (
              <BookingMobileRow
                booking={b}
                actions={
                  b.status === BOOKING_STATUS.PENDING ? (
                    <>
                      <ApproveButton onClick={() => openDecision(b, "APPROVED")} />
                      <RejectButton onClick={() => openDecision(b, "REJECTED")} />
                    </>
                  ) : undefined
                }
              />
            )}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!decision} onOpenChange={(o) => !o && setDecision(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{decision?.kind === "APPROVED" ? "Approve booking" : "Reject booking"}</DialogTitle>
            <DialogDescription>
              {decision?.b.roomName} · {decision?.b.startsAt && new Date(decision.b.startsAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            placeholder={decision?.kind === "APPROVED" ? "Optional note…" : "Reason for rejection…"}
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
                  await decide({ id: decision.b.id, decision: decision.kind, note: note.trim() || undefined }).unwrap();
                  toast.success(decision.kind === "APPROVED" ? "Booking approved" : "Booking rejected");
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
