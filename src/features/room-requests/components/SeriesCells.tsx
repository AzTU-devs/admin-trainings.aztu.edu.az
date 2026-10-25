import { Clock, MessageSquare, Repeat, User } from "lucide-react";
import { RoomRequestStatusBadge } from "@features/room-requests/components/RoomRequestStatusBadge";
import { DateTile, FeeCell, TileCell } from "@features/room-requests/components/BookingCells";
import { formatDateRange, formatDays, formatSessions, formatTimeRange } from "@features/room-requests/lib/series";
import type { RoomBookingSeriesDto } from "@features/room-requests/types";

/*
 * The cells of the long-term booking tables (the tutor's list, the admin
 * queue) and their phone row — the single-booking cells' recipes (a plain
 * date tile, two-line cells, the fee in ink) for a period instead of a slot.
 *
 * A series' dates and times are Baku wall-clock values (yyyy-MM-dd, HH:mm),
 * shown as sent rather than converted to the browser's zone: "Mon, Wed
 * 10:00–12:00 Baku time" is what was asked for and what the room will see.
 */

/** A yyyy-MM-dd as a Date at the browser's local midnight, for the date tile (month and day only). */
function tileDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** "Period": the first day's tile, the date range, the session count under it. */
export function PeriodCell({ series }: { series: RoomBookingSeriesDto }) {
  return (
    <TileCell
      tile={<DateTile date={tileDate(series.startDate)} roomId={series.roomId} plain />}
      main={formatDateRange(series.startDate, series.endDate)}
      sub={formatSessions(series.occurrenceCount, series.upcomingCount)}
    />
  );
}

/** "Schedule": the weekdays, and the times in Baku time under them. */
export function ScheduleCell({ series }: { series: RoomBookingSeriesDto }) {
  return <TileCell main={formatDays(series.daysOfWeek)} sub={`${formatTimeRange(series.startTime, series.endTime)} Baku time`} />;
}

/** Who asked (admin queue): name over email, capped so a long address truncates. */
export function TutorCell({ name, email }: { name: string; email: string }) {
  return (
    <div className="min-w-0 max-w-[14rem] leading-tight">
      <p className="truncate font-medium text-ink" title={name}>
        {name}
      </p>
      <p className="mt-1 truncate text-[12.5px] text-ink-3" title={email}>
        {email}
      </p>
    </div>
  );
}

/** The status pill, with the admin's note under it (one line; the details dialog has all of it). */
export function SeriesStatusCell({ series }: { series: RoomBookingSeriesDto }) {
  return (
    <div className="min-w-0 max-w-[14rem]">
      <RoomRequestStatusBadge status={series.status} />
      {series.decisionNote ? (
        <p className="mt-1.5 truncate text-[12.5px] text-ink-3" title={series.decisionNote}>
          {series.decisionNote}
        </p>
      ) : null}
    </div>
  );
}

/**
 * One series on a phone (DataTable's `renderMobileRow`): the start day's tile,
 * room and fee on the first line; status, period, pattern and (for admins) the
 * requester under it; the decision note; the actions last, right-aligned.
 */
export function SeriesMobileRow({
  series,
  actions,
  showTutor,
}: {
  series: RoomBookingSeriesDto;
  actions?: React.ReactNode;
  showTutor?: boolean;
}) {
  return (
    <>
      <div className="flex items-start gap-3">
        <DateTile date={tileDate(series.startDate)} roomId={series.roomId} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 break-words font-semibold leading-snug text-ink">{series.roomName}</p>
            <FeeCell booking={series} className="pt-px" />
          </div>
          <p className="mt-1 text-[13px] text-ink-2 tabular-nums">
            {formatDateRange(series.startDate, series.endDate)} · {formatSessions(series.occurrenceCount, series.upcomingCount)}
          </p>
          <div className="meta mt-2">
            <RoomRequestStatusBadge status={series.status} />
            <span className="tabular-nums">
              <Repeat aria-hidden />
              {formatDays(series.daysOfWeek)}
            </span>
            <span className="tabular-nums">
              <Clock aria-hidden />
              {formatTimeRange(series.startTime, series.endTime)} Baku time
            </span>
            {showTutor ? (
              <span className="min-w-0 max-w-full">
                <User aria-hidden />
                <span className="truncate">{series.tutorName}</span>
              </span>
            ) : null}
          </div>
          {series.decisionNote ? (
            <p className="mt-2 flex gap-1.5 text-[13px] leading-snug text-ink-2">
              <MessageSquare aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ink-3" />
              <span className="min-w-0 break-words">{series.decisionNote}</span>
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="-mb-1 -mr-2 mt-3 flex items-center justify-end gap-2">{actions}</div> : null}
    </>
  );
}
