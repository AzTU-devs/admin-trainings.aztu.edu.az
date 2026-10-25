import { skipToken } from "@reduxjs/toolkit/query/react";
import { AlertTriangle, Repeat } from "lucide-react";
import { Button } from "@shared/components/ui/Button";
import { Spinner } from "@shared/components/ui/Spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { Detail, DetailList, Notice, PlainText, ProfileSection, Value } from "@features/user-profile/components/ProfileBits";
import { cn } from "@shared/lib/cn";
import { useGetRoomBookingSeriesQuery } from "@features/room-requests/api/roomRequestsApi";
import { RoomRequestStatusBadge } from "@features/room-requests/components/RoomRequestStatusBadge";
import { FeeCell } from "@features/room-requests/components/BookingCells";
import {
  formatDateRange,
  formatDays,
  formatLocalDate,
  formatSessions,
  formatTimeRange,
  safeTimeZone,
  wallClock,
} from "@features/room-requests/lib/series";
import type { RoomBookingOccurrenceDto, RoomBookingSeriesDto } from "@features/room-requests/types";

const dateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : null;

/**
 * One long-term booking in full (`GET …/series/{id}`): what was asked for,
 * the decision, and every session with its own status — a session that has
 * started keeps its status when the rest of the series is cancelled.
 *
 * Opens on the list row at once (`series`) and fills the sessions in when the
 * detail arrives. `actions` are the caller's buttons for the footer (cancel
 * for the tutor, approve/reject for an admin), beside Close.
 */
export function SeriesDetailsDialog({
  series,
  onOpenChange,
  showTutor,
  actions,
}: {
  series: RoomBookingSeriesDto | null;
  onOpenChange: (open: boolean) => void;
  showTutor?: boolean;
  actions?: (series: RoomBookingSeriesDto) => React.ReactNode;
}) {
  const { data, isFetching, isError } = useGetRoomBookingSeriesQuery(series?.id ?? skipToken);
  // The detail once it is here and for this series; the list row until then.
  const shown = data && data.id === series?.id ? data : series;

  return (
    <Dialog open={!!series} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        {shown && (
          <>
            <DialogHeader icon={<Repeat />}>
              <DialogTitle>Long-term booking · {shown.roomName}</DialogTitle>
              <DialogDescription>
                {formatDateRange(shown.startDate, shown.endDate)} · {formatDays(shown.daysOfWeek)} ·{" "}
                {formatTimeRange(shown.startTime, shown.endTime)} Baku time
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-7">
              <DetailList>
                <Detail label="Status">
                  <RoomRequestStatusBadge status={shown.status} />
                </Detail>
                <Detail label="Sessions">{formatSessions(shown.occurrenceCount, shown.upcomingCount)}</Detail>
                <Detail label="Fee">
                  <FeeCell booking={shown} />
                </Detail>
                <Detail label="Course">
                  <Value>{shown.offlineCourseTitle}</Value>
                </Detail>
                {showTutor && (
                  <Detail label="Requested by">
                    {shown.tutorName}
                    <span className="block text-[13px] text-ink-3">{shown.tutorEmail}</span>
                  </Detail>
                )}
                <Detail label="Requested">
                  <Value>{dateTime(shown.createdAt)}</Value>
                </Detail>
                <Detail label="Note from the expert" wide>
                  <PlainText value={shown.note} />
                </Detail>
                {(shown.decisionNote || shown.decidedAt) && (
                  <Detail label={shown.decidedAt ? `Decision note · ${dateTime(shown.decidedAt)}` : "Decision note"} wide>
                    <PlainText value={shown.decisionNote} />
                  </Detail>
                )}
              </DetailList>

              <ProfileSection
                title="Sessions"
                count={data?.id === shown.id ? data.occurrences.length : undefined}
                description="Each session is a booking of its own; times are Baku time."
              >
                {data?.id === shown.id ? (
                  <OccurrenceList occurrences={data.occurrences} timeZone={safeTimeZone(data.timezone)} />
                ) : isError ? (
                  <Notice tone="danger" Icon={AlertTriangle} title="Could not load the sessions">
                    Close this and open it again to retry.
                  </Notice>
                ) : (
                  <div className="flex justify-center py-6" aria-busy={isFetching}>
                    <Spinner />
                  </div>
                )}
              </ProfileSection>
            </div>

            <DialogFooter>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {actions?.(shown)}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Every session in order: the date and hours in the series' zone, its status on the right. */
function OccurrenceList({ occurrences, timeZone }: { occurrences: RoomBookingOccurrenceDto[]; timeZone: string }) {
  if (occurrences.length === 0) return <p className="text-sm text-ink-3">No sessions.</p>;
  const now = Date.now();
  return (
    <ol
      aria-label="Sessions"
      className="max-h-[22rem] overflow-y-auto overscroll-contain rounded-[18px] border border-line"
    >
      {occurrences.map((o, i) => {
        const start = wallClock(o.startsAt, timeZone);
        const end = wallClock(o.endsAt, timeZone);
        const past = new Date(o.startsAt).getTime() <= now;
        return (
          <li
            key={o.bookingId}
            className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 last:border-0"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden className="w-6 shrink-0 text-right font-mono text-[12px] text-ink-3 tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0 leading-tight">
                <p className={cn("font-medium tabular-nums", past ? "text-ink-3" : "text-ink")}>
                  {formatLocalDate(start.date)}
                  {past && <span className="sr-only"> (past)</span>}
                </p>
                <p className="mt-0.5 text-[12.5px] text-ink-3 tabular-nums">
                  {formatTimeRange(start.time, end.time)}
                </p>
              </div>
            </div>
            <RoomRequestStatusBadge status={o.status} />
          </li>
        );
      })}
    </ol>
  );
}
