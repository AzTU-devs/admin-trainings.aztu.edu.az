import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarX, List, Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { DataTable } from "@shared/components/tables/DataTable";
import { ConfirmDialog } from "@shared/components/ui/ConfirmDialog";
import { ProfileSection } from "@features/user-profile/components/ProfileBits";
import { RoomRequestStatusBadge } from "@features/room-requests/components/RoomRequestStatusBadge";
import {
  BookingMobileRow,
  EndsCell,
  FeeCell,
  RoomCell,
  StartsCell,
} from "@features/room-requests/components/BookingCells";
import {
  PeriodCell,
  ScheduleCell,
  SeriesMobileRow,
  SeriesStatusCell,
} from "@features/room-requests/components/SeriesCells";
import { BookingRequestDialog } from "@features/room-requests/components/BookingRequestDialog";
import { SeriesDetailsDialog } from "@features/room-requests/components/SeriesDetailsDialog";
import {
  useCancelRoomBookingMutation,
  useCancelRoomBookingSeriesMutation,
  useListMyRoomBookingSeriesQuery,
  useListMyRoomBookingsQuery,
} from "@features/room-requests/api/roomRequestsApi";
import type { RoomBookingDto, RoomBookingSeriesDto } from "@features/room-requests/types";
import { singleBookingErrorMessage } from "@features/room-requests/lib/bookingErrors";
import { formatDateRange, formatDays, formatTimeRange } from "@features/room-requests/lib/series";
import { BOOKING_STATUS } from "@shared/types/lms";
import type { ApiPage } from "@shared/types/api";

const pageOf = (data?: ApiPage<unknown>) =>
  data ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } : undefined;

/** Pending and approved requests can still be cancelled — a series only while a session is still to come. */
const cancellable = (status: string) => status === BOOKING_STATUS.PENDING || status === BOOKING_STATUS.APPROVED;
const seriesCancellable = (s: RoomBookingSeriesDto) => cancellable(s.status) && s.upcomingCount > 0;

/**
 * Tutors request rooms — one session (`POST /api/portal/room-bookings`) or a
 * long-term booking on chosen weekdays (`POST …/room-bookings/series`) — and
 * follow both here: long-term bookings (`GET …/series/mine`) with every
 * session in their details, and single bookings (`GET …/room-bookings/mine`,
 * which leaves out the sessions of a series). Either can be cancelled.
 */
export default function TutorRoomRequestsPage() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [seriesPage, setSeriesPage] = useState(0);
  const [toCancel, setToCancel] = useState<RoomBookingDto | null>(null);
  const [seriesToCancel, setSeriesToCancel] = useState<RoomBookingSeriesDto | null>(null);
  const [details, setDetails] = useState<RoomBookingSeriesDto | null>(null);

  const { data, isFetching } = useListMyRoomBookingsQuery({ page, size: 10 });
  const { data: seriesData, isFetching: seriesFetching } = useListMyRoomBookingSeriesQuery({ page: seriesPage, size: 10 });
  const [cancelBooking] = useCancelRoomBookingMutation();
  const [cancelSeries] = useCancelRoomBookingSeriesMutation();

  const fmt = (iso: string) => new Date(iso).toLocaleString();

  /** Pending and approved bookings can still be cancelled; the rest have no action. */
  const cancelAction = useCallback((b: RoomBookingDto) => {
    // A session of a series is cancelled with its series (the API answers 409 PART_OF_SERIES).
    if (!cancellable(b.status) || b.seriesId) return null;
    return (
      <Button
        variant="ghost"
        size="sm"
        // A calendar with a cross: this cancels the booking, it does not delete a record.
        leftIcon={<CalendarX className="size-4" />}
        onClick={(e) => {
          e.stopPropagation();
          setToCancel(b);
        }}
      >
        Cancel
      </Button>
    );
  }, []);

  const seriesActions = useCallback(
    (s: RoomBookingSeriesDto) => (
      <>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<List className="size-4" />}
          onClick={(e) => {
            e.stopPropagation();
            setDetails(s);
          }}
        >
          Details
        </Button>
        {seriesCancellable(s) ? (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<CalendarX className="size-4" />}
            onClick={(e) => {
              e.stopPropagation();
              setSeriesToCancel(s);
            }}
          >
            Cancel
          </Button>
        ) : null}
      </>
    ),
    [],
  );

  const columns = useMemo<ColumnDef<RoomBookingDto>[]>(
    () => [
      { header: "Room", cell: ({ row }) => <RoomCell name={row.original.roomName} roomId={row.original.roomId} /> },
      { header: "Starts", cell: ({ row }) => <StartsCell booking={row.original} /> },
      { header: "Ends", cell: ({ row }) => <EndsCell booking={row.original} /> },
      { header: "Fee", cell: ({ row }) => <FeeCell booking={row.original} /> },
      { header: "Status", cell: ({ row }) => <RoomRequestStatusBadge status={row.original.status} /> },
      {
        header: "",
        id: "actions",
        cell: ({ row }) => <div className="flex justify-end">{cancelAction(row.original)}</div>,
      },
    ],
    [cancelAction],
  );

  const seriesColumns = useMemo<ColumnDef<RoomBookingSeriesDto>[]>(
    () => [
      { header: "Room", cell: ({ row }) => <RoomCell name={row.original.roomName} roomId={row.original.roomId} /> },
      { header: "Period", cell: ({ row }) => <PeriodCell series={row.original} /> },
      { header: "Schedule", cell: ({ row }) => <ScheduleCell series={row.original} /> },
      { header: "Fee", cell: ({ row }) => <FeeCell booking={row.original} />, meta: { hideBelow: "lg" } },
      { header: "Status", cell: ({ row }) => <SeriesStatusCell series={row.original} /> },
      {
        header: "",
        id: "actions",
        cell: ({ row }) => <div className="flex items-center justify-end gap-1">{seriesActions(row.original)}</div>,
      },
    ],
    [seriesActions],
  );

  const bookings = data?.content ?? [];
  const series = seriesData?.content ?? [];

  return (
    <>
      <PageHeader
        title="Room bookings"
        description="Request a classroom for one session or for a whole period, and track your requests."
        actions={
          <Button leftIcon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
            New booking
          </Button>
        }
      />

      <div className="space-y-10">
        <ProfileSection
          title="Long-term bookings"
          count={seriesData?.totalElements}
          description="A room on chosen weekdays over a period. An admin approves or rejects the whole series."
        >
          <DataTable<RoomBookingSeriesDto>
            data={series}
            columns={seriesColumns}
            isLoading={seriesFetching}
            emptyTitle="No long-term bookings yet"
            emptyDescription="Choose “Long-term (repeating)” in a new booking to request a room for weeks at a time."
            pagination={pageOf(seriesData)}
            onPageChange={setSeriesPage}
            getRowId={(row) => row.id}
            onRowClick={setDetails}
            renderMobileRow={(s) => <SeriesMobileRow series={s} actions={seriesActions(s)} />}
          />
        </ProfileSection>

        <ProfileSection title="Single bookings" count={data?.totalElements}>
          {/* Below 768px DataTable shows each row as a card: the booking's
              tile, room, fee, status and time, with Cancel in reach. */}
          <DataTable<RoomBookingDto>
            data={bookings}
            columns={columns}
            isLoading={isFetching}
            emptyTitle="No bookings yet"
            emptyDescription="Request a classroom with the button above; an admin reviews it."
            pagination={pageOf(data)}
            onPageChange={setPage}
            getRowId={(row) => row.id}
            renderMobileRow={(b) => <BookingMobileRow booking={b} actions={cancelAction(b)} />}
          />
        </ProfileSection>
      </div>

      <BookingRequestDialog open={open} onOpenChange={setOpen} />

      <SeriesDetailsDialog
        series={details}
        onOpenChange={(o) => !o && setDetails(null)}
        actions={(s) =>
          seriesCancellable(s) ? (
            <Button
              variant="danger"
              leftIcon={<CalendarX className="size-4" />}
              onClick={() => {
                setDetails(null);
                setSeriesToCancel(s);
              }}
            >
              Cancel booking
            </Button>
          ) : null
        }
      />

      <ConfirmDialog
        open={!!toCancel}
        onOpenChange={(o) => !o && setToCancel(null)}
        title="Cancel this booking?"
        description={toCancel ? `${toCancel.roomName} · ${fmt(toCancel.startsAt)}` : undefined}
        confirmLabel="Cancel booking"
        cancelLabel="Keep it"
        destructive
        onConfirm={async () => {
          if (!toCancel) return;
          try {
            await cancelBooking(toCancel.id).unwrap();
            toast.success("Booking cancelled");
            setToCancel(null);
          } catch (e) {
            toast.error(singleBookingErrorMessage(e, "Could not cancel booking"));
          }
        }}
      />

      <ConfirmDialog
        open={!!seriesToCancel}
        onOpenChange={(o) => !o && setSeriesToCancel(null)}
        title="Cancel this long-term booking?"
        description={
          seriesToCancel
            ? `${seriesToCancel.roomName} · ${formatDateRange(seriesToCancel.startDate, seriesToCancel.endDate)}, ` +
              `${formatDays(seriesToCancel.daysOfWeek)} ${formatTimeRange(seriesToCancel.startTime, seriesToCancel.endTime)}. ` +
              `Only the sessions that haven't started are cancelled (${seriesToCancel.upcomingCount} of ` +
              `${seriesToCancel.occurrenceCount}); sessions already held keep their status.`
            : undefined
        }
        confirmLabel="Cancel booking"
        cancelLabel="Keep it"
        destructive
        onConfirm={async () => {
          if (!seriesToCancel) return;
          try {
            await cancelSeries(seriesToCancel.id).unwrap();
            toast.success("Long-term booking cancelled");
            setSeriesToCancel(null);
          } catch (e) {
            toast.error(singleBookingErrorMessage(e, "Could not cancel the long-term booking"));
          }
        }}
      />
    </>
  );
}
