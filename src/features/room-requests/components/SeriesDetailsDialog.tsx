import { useRef, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query/react";
import { AlertTriangle, Repeat, Trash2 } from "lucide-react";
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
import { RemoveRequestDialog } from "@features/room-requests/components/RemoveRequestDialog";
import { describeOccurrence, type RemovalTarget } from "@features/room-requests/lib/removal";
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
 * for the tutor, approve/reject/remove for an admin), beside Close.
 *
 * `removableSessions` (the super admin) puts a Remove on each session: that
 * session alone is removed for good, after a confirm, and the list reloads
 * without it. Focus then lands on the sessions list, since the button that
 * was pressed goes with its row.
 */
export function SeriesDetailsDialog({
  series,
  onOpenChange,
  showTutor,
  actions,
  removableSessions,
  onCloseAutoFocus,
}: {
  series: RoomBookingSeriesDto | null;
  onOpenChange: (open: boolean) => void;
  showTutor?: boolean;
  actions?: (series: RoomBookingSeriesDto) => React.ReactNode;
  removableSessions?: boolean;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const { data, isFetching, isError } = useGetRoomBookingSeriesQuery(series?.id ?? skipToken);
  // The detail once it is here and for this series; the list row until then.
  const shown = data && data.id === series?.id ? data : series;
  const [removal, setRemoval] = useState<RemovalTarget | null>(null);
  const sessionsRef = useRef<HTMLElement>(null);
  const removedRef = useRef(false);

  return (
    <Dialog open={!!series} onOpenChange={onOpenChange}>
      <DialogContent size="lg" onCloseAutoFocus={onCloseAutoFocus}>
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
                  <OccurrenceList
                    listRef={sessionsRef}
                    occurrences={data.occurrences}
                    timeZone={safeTimeZone(data.timezone)}
                    onRemove={
                      removableSessions
                        ? (o) => {
                            removedRef.current = false;
                            setRemoval({
                              kind: "occurrence",
                              id: o.bookingId,
                              what: describeOccurrence(data, o, safeTimeZone(data.timezone)),
                            });
                          }
                        : undefined
                    }
                  />
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
        {removableSessions && (
          <RemoveRequestDialog
            target={removal}
            onClose={() => setRemoval(null)}
            onRemoved={() => {
              removedRef.current = true;
            }}
            onCloseAutoFocus={(e) => {
              if (!removedRef.current) return;
              removedRef.current = false;
              e.preventDefault();
              sessionsRef.current?.focus({ preventScroll: true });
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Every session in order: the date and hours in the series' zone, its status
 * on the right — and, with `onRemove`, a Remove after it.
 */
function OccurrenceList({
  occurrences,
  timeZone,
  onRemove,
  listRef,
}: {
  occurrences: RoomBookingOccurrenceDto[];
  timeZone: string;
  onRemove?: (occurrence: RoomBookingOccurrenceDto) => void;
  /** Where focus can be put after a removal (the list, or its empty note); not in the tab order. */
  listRef?: React.Ref<HTMLElement>;
}) {
  if (occurrences.length === 0)
    return (
      <p ref={listRef as React.Ref<HTMLParagraphElement>} tabIndex={-1} className="text-sm text-ink-3 focus:outline-none">
        No sessions.
      </p>
    );
  const now = Date.now();
  return (
    <ol
      ref={listRef as React.Ref<HTMLOListElement>}
      // Focusable by script only when sessions can be removed (focus lands
      // here after one goes). Otherwise left alone, so a browser that lets a
      // scroller take focus itself still does.
      tabIndex={onRemove ? -1 : undefined}
      aria-label="Sessions"
      className={cn(
        "max-h-[22rem] overflow-y-auto overscroll-contain rounded-[18px] border border-line",
        onRemove && "focus:outline-none",
      )}
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
            <div className="flex shrink-0 items-center gap-1">
              <RoomRequestStatusBadge status={o.status} />
              {onRemove && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-ink-3 hover:bg-danger-tint hover:text-danger"
                  aria-label={`Remove session on ${formatLocalDate(start.date)}`}
                  title="Remove session"
                  onClick={() => onRemove(o)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
