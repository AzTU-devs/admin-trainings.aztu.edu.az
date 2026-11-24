import { useCallback, useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, List, Trash2, X } from "lucide-react";
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
import { RemoveRequestDialog } from "@features/room-requests/components/RemoveRequestDialog";
import {
  describeBooking,
  describeSeries,
  formatBookingWhen,
  type RemovalTarget,
} from "@features/room-requests/lib/removal";
import { usePermissions } from "@features/auth/hooks/usePermissions";
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

/**
 * The super admin's Remove (`room:booking_remove`): icon-only, quiet red like
 * Reject, so a pending row's actions still fit beside Approve and Reject.
 * The confirm it opens names the request and says what removing does.
 */
function RemoveButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      className="px-3 text-danger hover:bg-danger-tint hover:text-danger"
      aria-label="Remove"
      title="Remove"
      onClick={onClick}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

const bookingRemoval = (b: RoomBookingDto): RemovalTarget => ({
  kind: b.seriesId ? "occurrence" : "booking",
  id: b.id,
  what: describeBooking(b),
});

const seriesRemoval = (s: RoomBookingSeriesDto): RemovalTarget => ({
  kind: "series",
  id: s.id,
  what: describeSeries(s),
  sessions: s.occurrenceCount,
});

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
 *
 * A super admin can also remove any request for good: a single booking, a
 * whole long-term booking, or one session of it from its details. Other
 * roles never see Remove (and the API refuses them with 403 anyway).
 */
export default function AdminRoomRequestsPage() {
  const { isSuperAdmin } = usePermissions();
  const [tab, setTab] = useState<BookingStatus>(BOOKING_STATUS.PENDING);
  const [page, setPage] = useState(0);
  const [seriesPage, setSeriesPage] = useState(0);
  const [decision, setDecision] = useState<{ b: RoomBookingDto; kind: DecisionKind } | null>(null);
  const [note, setNote] = useState("");
  const [details, setDetails] = useState<RoomBookingSeriesDto | null>(null);
  const [seriesDecision, setSeriesDecision] = useState<{ series: RoomBookingSeriesDto; kind: SeriesDecisionKind } | null>(
    null,
  );
  const [removal, setRemoval] = useState<RemovalTarget | null>(null);
  // Set once a request is gone. The control that opened the confirm (and the
  // details, for a whole series) goes with its row, so focus moves to the
  // current status tab, the top of the list the row was in. Cleared when the
  // next confirm or details dialog opens, not by the handler: a series removed
  // from its details closes both dialogs, and both must agree.
  const removedRef = useRef(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const focusAfterRemoval = useCallback((e: Event) => {
    if (!removedRef.current) return;
    e.preventDefault();
    tabsRef.current?.querySelector<HTMLElement>('[role="tab"][data-state="active"]')?.focus({ preventScroll: true });
  }, []);
  const openRemoval = useCallback((target: RemovalTarget) => {
    removedRef.current = false;
    setRemoval(target);
  }, []);
  const openDetails = useCallback((s: RoomBookingSeriesDto) => {
    removedRef.current = false;
    setDetails(s);
  }, []);

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
          decidable(row.original) || isSuperAdmin ? (
            <div className="flex items-center justify-end gap-2">
              {decidable(row.original) && (
                <>
                  <ApproveButton onClick={() => openDecision(row.original, "APPROVED")} />
                  <RejectButton onClick={() => openDecision(row.original, "REJECTED")} />
                </>
              )}
              {isSuperAdmin && <RemoveButton onClick={() => openRemoval(bookingRemoval(row.original))} />}
            </div>
          ) : null,
      },
    ],
    [openDecision, openRemoval, isSuperAdmin],
  );

  const seriesActions = useCallback(
    (s: RoomBookingSeriesDto) => (
      // Compact on purpose: with the details as a labelled icon and the decision pair
      // stacked, the long-term table fits a 1280px screen beside the sidebar. In one
      // row the three buttons alone took about 360px and pushed Approve/Reject out of view.
      <>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Details"
          title="Details"
          onClick={stop(() => openDetails(s))}
        >
          <List className="size-4" />
        </Button>
        {isSuperAdmin && <RemoveButton onClick={stop(() => openRemoval(seriesRemoval(s)))} />}
        {s.status === BOOKING_STATUS.PENDING ? (
          <div className="flex flex-col items-stretch gap-1">
            <ApproveButton onClick={stop(() => openSeriesDecision(s, "APPROVED"))} />
            <RejectButton onClick={stop(() => openSeriesDecision(s, "REJECTED"))} />
          </div>
        ) : null}
      </>
    ),
    [openSeriesDecision, openDetails, openRemoval, isSuperAdmin],
  );

  const seriesColumns = useMemo<ColumnDef<RoomBookingSeriesDto>[]>(
    () => [
      { header: "Room", cell: ({ row }) => <RoomCell name={row.original.roomName} roomId={row.original.roomId} /> },
      {
        header: "Requested by",
        cell: ({ row }) => <TutorCell name={row.original.tutorName} email={row.original.tutorEmail} />,
        // Shown in the details dialog on narrower screens.
        meta: { hideBelow: "2xl" },
      },
      { header: "Period", cell: ({ row }) => <PeriodCell series={row.original} /> },
      { header: "Schedule", cell: ({ row }) => <ScheduleCell series={row.original} /> },
      { header: "Fee", cell: ({ row }) => <FeeCell booking={row.original} />, meta: { hideBelow: "xl" } },
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
        <TabsList ref={tabsRef}>
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
              onRowClick={openDetails}
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
                    decidable(b) || isSuperAdmin ? (
                      <>
                        {decidable(b) && (
                          <>
                            <ApproveButton onClick={() => openDecision(b, "APPROVED")} />
                            <RejectButton onClick={() => openDecision(b, "REJECTED")} />
                          </>
                        )}
                        {isSuperAdmin && <RemoveButton onClick={() => openRemoval(bookingRemoval(b))} />}
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
        removableSessions={isSuperAdmin}
        onCloseAutoFocus={focusAfterRemoval}
        actions={(s) => (
          <>
            {isSuperAdmin && (
              <Button
                variant="ghost"
                className="text-danger hover:bg-danger-tint hover:text-danger"
                leftIcon={<Trash2 className="size-4" />}
                onClick={() => openRemoval(seriesRemoval(s))}
              >
                Remove whole series
              </Button>
            )}
            {s.status === BOOKING_STATUS.PENDING ? (
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
            ) : null}
          </>
        )}
      />

      <SeriesDecisionDialog decision={seriesDecision} onClose={() => setSeriesDecision(null)} />

      {isSuperAdmin && (
        <RemoveRequestDialog
          target={removal}
          onClose={() => setRemoval(null)}
          onRemoved={(t) => {
            removedRef.current = true;
            // Removed from its details: they would only show what is gone.
            if (t.kind === "series") setDetails(null);
          }}
          onCloseAutoFocus={focusAfterRemoval}
        />
      )}

      <Dialog open={!!decision} onOpenChange={(o) => !o && setDecision(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{decision?.kind === "APPROVED" ? "Approve booking" : "Reject booking"}</DialogTitle>
            <DialogDescription>
              {decision?.b.roomName} ·{" "}
              {decision?.b && `${formatBookingWhen(decision.b.startsAt, decision.b.endsAt)} Baku time`}
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
