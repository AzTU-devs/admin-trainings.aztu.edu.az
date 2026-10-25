import { useCallback, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, List, X } from "lucide-react";
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
import { ProfileSection } from "@features/user-profile/components/ProfileBits";
import { RoomRequestStatusBadge } from "@features/room-requests/components/RoomRequestStatusBadge";
import {
  BookingMobileRow,
  FeeCell,
  RecurrenceCell,
  RoomCell,
  WhenCell,
} from "@features/room-requests/components/BookingCells";
import {
  PeriodCell,
  ScheduleCell,
  SeriesMobileRow,
  SeriesStatusCell,
  TutorCell,
} from "@features/room-requests/components/SeriesCells";
import { SeriesDetailsDialog } from "@features/room-requests/components/SeriesDetailsDialog";
import { SeriesDecisionDialog, type SeriesDecisionKind } from "@features/room-requests/components/SeriesDecisionDialog";
import {
  useDecideRoomBookingMutation,
  useListAdminRoomBookingSeriesQuery,
  useListAdminRoomBookingsQuery,
} from "@features/room-requests/api/roomRequestsApi";
import type { RoomBookingDto, RoomBookingSeriesDto } from "@features/room-requests/types";
import { singleBookingErrorMessage } from "@features/room-requests/lib/bookingErrors";
import type { ApiPage } from "@shared/types/api";
import { BOOKING_STATUS, type BookingStatus } from "@shared/types/lms";

type DecisionKind = "APPROVED" | "REJECTED";

const pageOf = (data?: ApiPage<unknown>) =>
  data ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } : undefined;

/**
 * The decision pair in a row — the same pair as the tutor approval queue.
 * Neither is a filled primary: a queue of eight pending requests would
 * otherwise be a column of eight raised navy buttons. Approve carries the
 * weight as a navy outline with a green tick, Reject is quiet red text; the
 * dialog each opens keeps the solid button for the decision itself.
 */
function ApproveButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <Button size="sm" variant="outline" leftIcon={<Check className="size-4 text-ok" />} onClick={onClick}>
      Approve
    </Button>
  );
}
function RejectButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
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

/** A session of a series is decided with its series (the API answers 409 PART_OF_SERIES). */
const decidable = (b: RoomBookingDto) => b.status === BOOKING_STATUS.PENDING && !b.seriesId;

/** Rows that open a dialog keep their buttons from also opening the row. */
const stop = (fn: () => void) => (e: React.MouseEvent) => {
  e.stopPropagation();
  fn();
};

/**
 * The booking review queue, filtered by status: long-term requests (a room on
 * chosen weekdays over a period, decided as a whole — `GET …/series/admin`)
 * over single bookings (`GET …/room-bookings/admin`, which leaves the
 * sessions of a series out). A long-term request opens on its sessions, so
 * the dates can be checked before the whole series is approved.
 */
export default function AdminRoomRequestsPage() {
  const [tab, setTab] = useState<BookingStatus>(BOOKING_STATUS.PENDING);
  const [page, setPage] = useState(0);
  const [seriesPage, setSeriesPage] = useState(0);
  const [decision, setDecision] = useState<{ b: RoomBookingDto; kind: DecisionKind } | null>(null);
  const [note, setNote] = useState("");
  const [details, setDetails] = useState<RoomBookingSeriesDto | null>(null);
  const [seriesDecision, setSeriesDecision] = useState<{ series: RoomBookingSeriesDto; kind: SeriesDecisionKind } | null>(
    null,
  );

  const { data, isFetching } = useListAdminRoomBookingsQuery({ status: tab, page, size: 10 });
  const { data: seriesData, isFetching: seriesFetching } = useListAdminRoomBookingSeriesQuery({
    status: tab,
    page: seriesPage,
    size: 10,
  });
  const [decide, { isLoading: deciding }] = useDecideRoomBookingMutation();

  // Opening a decision starts a fresh note (the table and the phone rows share it).
  const openDecision = useCallback((b: RoomBookingDto, kind: DecisionKind) => {
    setDecision({ b, kind });
    setNote("");
  }, []);
  const openSeriesDecision = useCallback((series: RoomBookingSeriesDto, kind: SeriesDecisionKind) => {
    setDetails(null);
    setSeriesDecision({ series, kind });
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
          decidable(row.original) ? (
            <div className="flex items-center justify-end gap-2">
              <ApproveButton onClick={() => openDecision(row.original, "APPROVED")} />
              <RejectButton onClick={() => openDecision(row.original, "REJECTED")} />
            </div>
          ) : null,
      },
    ],
    [openDecision],
  );

  const seriesActions = useCallback(
    (s: RoomBookingSeriesDto) => (
      <>
        <Button variant="ghost" size="sm" leftIcon={<List className="size-4" />} onClick={stop(() => setDetails(s))}>
          Details
        </Button>
        {s.status === BOOKING_STATUS.PENDING ? (
          <>
            <ApproveButton onClick={stop(() => openSeriesDecision(s, "APPROVED"))} />
            <RejectButton onClick={stop(() => openSeriesDecision(s, "REJECTED"))} />
          </>
        ) : null}
      </>
    ),
    [openSeriesDecision],
  );

  const seriesColumns = useMemo<ColumnDef<RoomBookingSeriesDto>[]>(
    () => [
      { header: "Room", cell: ({ row }) => <RoomCell name={row.original.roomName} roomId={row.original.roomId} /> },
      {
        header: "Requested by",
        cell: ({ row }) => <TutorCell name={row.original.tutorName} email={row.original.tutorEmail} />,
        meta: { hideBelow: "xl" },
      },
      { header: "Period", cell: ({ row }) => <PeriodCell series={row.original} /> },
      { header: "Schedule", cell: ({ row }) => <ScheduleCell series={row.original} /> },
      { header: "Fee", cell: ({ row }) => <FeeCell booking={row.original} />, meta: { hideBelow: "lg" } },
      { header: "Status", cell: ({ row }) => <SeriesStatusCell series={row.original} /> },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => <div className="flex items-center justify-end gap-2">{seriesActions(row.original)}</div>,
      },
    ],
    [seriesActions],
  );

  const bookings = data?.content ?? [];
  const series = seriesData?.content ?? [];
  const status = tab.toLowerCase();

  return (
    <>
      <PageHeader title="Room bookings" description="Review and approve classroom booking requests." />

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as BookingStatus);
          setPage(0);
          setSeriesPage(0);
        }}
      >
        <TabsList>
          <TabsTrigger value={BOOKING_STATUS.PENDING}>Pending</TabsTrigger>
          <TabsTrigger value={BOOKING_STATUS.APPROVED}>Approved</TabsTrigger>
          <TabsTrigger value={BOOKING_STATUS.REJECTED}>Rejected</TabsTrigger>
          <TabsTrigger value={BOOKING_STATUS.CANCELLED}>Cancelled</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="space-y-10">
          <ProfileSection
            title="Long-term requests"
            count={seriesData?.totalElements}
            description="Weekly sessions over a period, approved or rejected as a whole. Oldest first."
          >
            <DataTable<RoomBookingSeriesDto>
              data={series}
              columns={seriesColumns}
              isLoading={seriesFetching}
              emptyTitle={`No ${status} long-term requests`}
              pagination={pageOf(seriesData)}
              onPageChange={setSeriesPage}
              getRowId={(r) => r.id}
              onRowClick={setDetails}
              renderMobileRow={(s) => <SeriesMobileRow series={s} showTutor actions={seriesActions(s)} />}
            />
          </ProfileSection>

          <ProfileSection title="Single bookings" count={data?.totalElements}>
            {/* Below 768px DataTable shows each row as a card; a booking's
                card is the tile, room, fee, status and time with the decision
                pair in reach (six columns do not fit 390px). */}
            <DataTable<RoomBookingDto>
              data={bookings}
              columns={columns}
              isLoading={isFetching}
              emptyTitle={`No ${status} bookings`}
              pagination={pageOf(data)}
              onPageChange={setPage}
              getRowId={(r) => r.id}
              renderMobileRow={(b) => (
                <BookingMobileRow
                  booking={b}
                  actions={
                    decidable(b) ? (
                      <>
                        <ApproveButton onClick={() => openDecision(b, "APPROVED")} />
                        <RejectButton onClick={() => openDecision(b, "REJECTED")} />
                      </>
                    ) : undefined
                  }
                />
              )}
            />
          </ProfileSection>
        </TabsContent>
      </Tabs>

      <SeriesDetailsDialog
        series={details}
        onOpenChange={(o) => !o && setDetails(null)}
        showTutor
        actions={(s) =>
          s.status === BOOKING_STATUS.PENDING ? (
            <>
              <Button
                variant="ghost"
                className="text-danger hover:bg-danger-tint hover:text-danger"
                leftIcon={<X className="size-4" />}
                onClick={() => openSeriesDecision(s, "REJECTED")}
              >
                Reject
              </Button>
              <Button leftIcon={<Check className="size-4" />} onClick={() => openSeriesDecision(s, "APPROVED")}>
                Approve all sessions
              </Button>
            </>
          ) : null
        }
      />

      <SeriesDecisionDialog decision={seriesDecision} onClose={() => setSeriesDecision(null)} />

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
                  toast.error(singleBookingErrorMessage(e, "Could not save decision"));
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
