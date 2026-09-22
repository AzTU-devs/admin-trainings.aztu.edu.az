import { useMemo, useState } from "react";
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
import { RoomStatusBadge } from "@features/rooms/components/RoomStatusBadge";
import { apiErrorMessage } from "@shared/lib/apiError";
import {
  useDecideRoomBookingMutation,
  useListAdminRoomBookingsQuery,
} from "@features/room-requests/api/roomRequestsApi";
import type { RoomBookingDto } from "@features/room-requests/types";
import { BOOKING_STATUS, type BookingStatus } from "@shared/types/lms";

export default function AdminRoomRequestsPage() {
  const [tab, setTab] = useState<BookingStatus>(BOOKING_STATUS.PENDING);
  const [page, setPage] = useState(0);
  const [decision, setDecision] = useState<{ b: RoomBookingDto; kind: "APPROVED" | "REJECTED" } | null>(null);
  const [note, setNote] = useState("");

  // `currentData`: `data` still holds the previous tab's rows while the next
  // loads (and after it fails), which put Approve/Reject buttons for pending
  // bookings under the "Approved" label.
  const { currentData: data, isFetching, isError, error, refetch } = useListAdminRoomBookingsQuery({
    status: tab,
    page,
    size: 10,
  });
  const [decide, { isLoading: deciding }] = useDecideRoomBookingMutation();

  const columns = useMemo<ColumnDef<RoomBookingDto>[]>(
    () => [
      {
        header: "Room",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">{row.original.roomName}</p>
            {row.original.roomStatus && row.original.roomStatus !== "AVAILABLE" && (
              <RoomStatusBadge status={row.original.roomStatus} />
            )}
          </div>
        ),
      },
      {
        header: "Requested by",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-sm text-gray-900 dark:text-white truncate">{row.original.tutorName ?? "—"}</p>
            {row.original.tutorEmail && <p className="text-xs text-gray-500 truncate">{row.original.tutorEmail}</p>}
          </div>
        ),
      },
      { header: "Course", cell: ({ row }) => <span className="text-sm">{row.original.offlineCourseTitle ?? "—"}</span> },
      {
        header: "When",
        cell: ({ row }) => (
          <span className="text-xs">
            {new Date(row.original.startsAt).toLocaleString()} → {new Date(row.original.endsAt).toLocaleTimeString()}
          </span>
        ),
      },
      { header: "Fee", cell: ({ row }) => `${row.original.totalFee} ${row.original.currency}` },
      { header: "Status", cell: ({ row }) => <RoomRequestStatusBadge status={row.original.status} /> },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          row.original.status === BOOKING_STATUS.PENDING ? (
            <div className="flex items-center gap-1.5 justify-end">
              <Button size="sm" variant="secondary" leftIcon={<Check className="size-4" />} onClick={() => { setDecision({ b: row.original, kind: "APPROVED" }); setNote(""); }}>Approve</Button>
              <Button size="sm" variant="danger" leftIcon={<X className="size-4" />} onClick={() => { setDecision({ b: row.original, kind: "REJECTED" }); setNote(""); }}>Reject</Button>
            </div>
          ) : null,
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader title="Room bookings" description="Review and approve classroom booking requests." />

      <Tabs value={tab} onValueChange={(v) => { setTab(v as BookingStatus); setPage(0); }}>
        <TabsList className="mb-4">
          <TabsTrigger value={BOOKING_STATUS.PENDING}>Pending</TabsTrigger>
          <TabsTrigger value={BOOKING_STATUS.APPROVED}>Approved</TabsTrigger>
          <TabsTrigger value={BOOKING_STATUS.REJECTED}>Rejected</TabsTrigger>
          <TabsTrigger value={BOOKING_STATUS.CANCELLED}>Cancelled</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          <DataTable<RoomBookingDto>
            data={data?.content ?? []}
            columns={columns}
            isLoading={isFetching && !data}
            isError={isError}
            error={error}
            onRetry={refetch}
            errorWhat="bookings"
            emptyTitle={`No ${tab.toLowerCase()} bookings`}
            pagination={data ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } : undefined}
            onPageChange={setPage}
            getRowId={(r) => r.id}
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
                } catch (e) {
                  // e.g. ROOM_TIME_TAKEN when another approval took the slot.
                  toast.error(apiErrorMessage(e, "Could not save the decision"));
                  void refetch();
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
