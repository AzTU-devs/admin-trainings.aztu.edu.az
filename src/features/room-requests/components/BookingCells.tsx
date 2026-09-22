import { Clock, Repeat } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { roomHue } from "@features/rooms/lib/roomPlan";
import { formatAmount } from "@features/rooms/lib/money";
import { RoomTile } from "@features/rooms/components/RoomTile";
import { RoomRequestStatusBadge } from "@features/room-requests/components/RoomRequestStatusBadge";
import type { RoomBookingDto } from "@features/room-requests/types";

/*
 * The cells of the booking tables (admin review queue, tutor's own bookings)
 * and the phone row that stands in for them under 768px. Presentation only:
 * the pages own the columns, sorting, paging and actions.
 *
 * Dates follow the browser's locale, like the rest of the dashboard.
 */
const time = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const longDate = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
const dateTime = (d: Date) =>
  `${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}, ${time(d)}`;

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/**
 * A 40px calendar tile — month over day. On a phone card it is the row's only
 * tile, so it wears the room's colour field (a room is the same colour here as
 * on the rooms pages). In the tables the Room cell's own tile carries that
 * colour, so the date tile is `plain` paper: one colour accent per row, as a
 * person's avatar is in the people tables, not two matching tiles side by side.
 * Decorative: the cell next to it always spells the full date out.
 */
export function DateTile({
  date,
  roomId,
  plain,
  className,
}: {
  date: Date;
  roomId: string;
  plain?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 flex-col items-center justify-center rounded-[12px]",
        plain ? "bg-paper-2 text-ink" : ["bg-k-100 text-k-900", roomHue(roomId)],
        className,
      )}
    >
      <span className={cn("text-[10px] font-semibold leading-none", plain ? "text-ink-3" : "text-k-700")}>
        {date.toLocaleDateString(undefined, { month: "short" })}
      </span>
      <span className="mt-[3px] font-display text-[16px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
        {date.getDate()}
      </span>
    </span>
  );
}

/** Two lines beside a date tile: the value in ink, the date under it in ink-3. */
function TileCell({ tile, main, sub }: { tile?: React.ReactNode; main: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {tile}
      <div className="min-w-0 leading-tight">
        <p className="whitespace-nowrap font-medium text-ink tabular-nums">{main}</p>
        {sub ? <p className="mt-1 whitespace-nowrap text-[12.5px] text-ink-3">{sub}</p> : null}
      </div>
    </div>
  );
}

/**
 * Room name as the row's primary cell, after the room's colour tile — the
 * room's face here, as an avatar is a person's (a booking has no capacity or
 * photos, so the floor plan cannot be drawn). Long seeded names wrap instead
 * of widening the table.
 */
export function RoomCell({ name, roomId }: { name: string; roomId: string }) {
  return (
    <div className="flex min-w-[12.5rem] max-w-[22.5rem] items-center gap-3">
      <RoomTile roomId={roomId} />
      <span className="min-w-0 break-words font-medium leading-snug text-ink">{name}</span>
    </div>
  );
}

/** Admin "When": the start day's tile, the time range, and the full date. */
export function WhenCell({ booking }: { booking: RoomBookingDto }) {
  const start = new Date(booking.startsAt);
  const end = new Date(booking.endsAt);
  return (
    <TileCell
      tile={<DateTile date={start} roomId={booking.roomId} plain />}
      main={`${time(start)} → ${sameDay(start, end) ? time(end) : dateTime(end)}`}
      sub={longDate(start)}
    />
  );
}

/** Tutor "Starts": the day's tile, the start time and the full date. */
export function StartsCell({ booking }: { booking: RoomBookingDto }) {
  const start = new Date(booking.startsAt);
  return <TileCell tile={<DateTile date={start} roomId={booking.roomId} plain />} main={time(start)} sub={longDate(start)} />;
}

/** Tutor "Ends": the end time; the date only when it is not the start's day. */
export function EndsCell({ booking }: { booking: RoomBookingDto }) {
  const start = new Date(booking.startsAt);
  const end = new Date(booking.endsAt);
  return <TileCell main={time(end)} sub={sameDay(start, end) ? undefined : longDate(end)} />;
}

/** The RRULE when there is one (technical value, so mono); a quiet dash otherwise. */
export function RecurrenceCell({ rule }: { rule?: string }) {
  if (!rule) return <span className="text-ink-3">—</span>;
  return (
    <span className="inline-flex max-w-[14rem] items-center gap-1.5 text-ink-2">
      <Repeat aria-hidden className="size-3.5 shrink-0 text-ink-3" />
      <span className="truncate font-mono text-[12px]" title={rule}>
        {rule}
      </span>
    </span>
  );
}

/** Amount in ink, currency after it in ink-3. */
export function FeeCell({ booking, className }: { booking: RoomBookingDto; className?: string }) {
  return (
    <span className={cn("whitespace-nowrap", className)}>
      <span className="font-semibold text-ink tabular-nums">{formatAmount(booking.totalFee)}</span>{" "}
      <span className="text-[12.5px] text-ink-3">{booking.currency}</span>
    </span>
  );
}

/**
 * One booking on a phone (DataTable's `renderMobileRow`): tile, room, fee on the first
 * line; status, time range and recurrence under it; the row's actions last,
 * right-aligned, so they stay in reach instead of scrolling off a 390px table.
 */
export function BookingMobileRow({ booking, actions }: { booking: RoomBookingDto; actions?: React.ReactNode }) {
  const start = new Date(booking.startsAt);
  const end = new Date(booking.endsAt);
  return (
    <>
      <div className="flex items-start gap-3">
        <DateTile date={start} roomId={booking.roomId} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 break-words font-semibold leading-snug text-ink">{booking.roomName}</p>
            <FeeCell booking={booking} className="pt-px" />
          </div>
          <div className="meta mt-2">
            <RoomRequestStatusBadge status={booking.status} />
            <span className="max-w-full whitespace-normal tabular-nums">
              <Clock aria-hidden />
              <span className="sr-only">{longDate(start)}, </span>
              {`${time(start)} → ${sameDay(start, end) ? time(end) : dateTime(end)}`}
            </span>
            {booking.recurrenceRule ? (
              <span className="min-w-0 max-w-full">
                <Repeat aria-hidden />
                <span className="truncate font-mono text-[12px] text-ink-2">{booking.recurrenceRule}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
      {/* -mr-2 lines a trailing ghost button's text up with the fee above,
          as DataTable's own phone cards do. */}
      {actions ? <div className="-mb-1 -mr-2 mt-3 flex items-center justify-end gap-2">{actions}</div> : null}
    </>
  );
}
