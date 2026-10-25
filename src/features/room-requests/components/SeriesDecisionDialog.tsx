import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, X } from "lucide-react";
import type { NormalizedError } from "@lib/axios/httpClient";
import { Button } from "@shared/components/ui/Button";
import { Label } from "@shared/components/ui/Label";
import { Textarea } from "@shared/components/ui/Textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { Notice } from "@features/user-profile/components/ProfileBits";
import { useDecideRoomBookingSeriesMutation } from "@features/room-requests/api/roomRequestsApi";
import { ROOM_BOOKING_CONFLICT } from "@features/room-requests/lib/bookingErrors";
import { formatDateRange, formatDays, formatSessions, formatTimeRange } from "@features/room-requests/lib/series";
import type { RoomBookingSeriesDto } from "@features/room-requests/types";

export type SeriesDecisionKind = "APPROVED" | "REJECTED";

export const REJECT_NOTE_REQUIRED = "Say why the request is rejected; the expert sees this note";

/**
 * The admin's decision on a whole long-term booking: approving books every
 * pending future session at once, rejecting turns them all down and needs a
 * reason. An approval that would overlap an approved booking is refused by
 * the API with 409 ROOM_BOOKING_CONFLICT and nothing changes; its message
 * (which lists the dates) stays in the dialog.
 */
export function SeriesDecisionDialog({
  decision,
  onClose,
}: {
  decision: { series: RoomBookingSeriesDto; kind: SeriesDecisionKind } | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!decision} onOpenChange={(o) => !o && onClose()}>
      {/* Keyed by the series and the kind: each decision starts with an empty note. */}
      {decision && <DecisionPanel key={`${decision.series.id}-${decision.kind}`} {...decision} onClose={onClose} />}
    </Dialog>
  );
}

function DecisionPanel({
  series,
  kind,
  onClose,
}: {
  series: RoomBookingSeriesDto;
  kind: SeriesDecisionKind;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [decide, { isLoading }] = useDecideRoomBookingSeriesMutation();
  const approving = kind === "APPROVED";

  const submit = async () => {
    const trimmed = note.trim();
    if (!approving && !trimmed) {
      setNoteError(REJECT_NOTE_REQUIRED);
      return;
    }
    setConflict(null);
    try {
      await decide({ id: series.id, decision: kind, note: trimmed || null }).unwrap();
      toast.success(approving ? "Long-term booking approved" : "Long-term booking rejected");
      onClose();
    } catch (e) {
      const err = e as NormalizedError;
      if (err.code === ROOM_BOOKING_CONFLICT) {
        setConflict(err.message || "Some sessions overlap bookings that are already approved.");
        toast.error("Some sessions clash with approved bookings");
      } else if (err.code === "NOTE_REQUIRED") {
        setNoteError(REJECT_NOTE_REQUIRED);
      } else {
        toast.error(err.message || "Could not save the decision");
      }
    }
  };

  return (
    <DialogContent size="md">
      <DialogHeader icon={approving ? <Check /> : <X />} iconTone={approving ? "brand" : "danger"}>
        <DialogTitle>{approving ? "Approve long-term booking" : "Reject long-term booking"}</DialogTitle>
        <DialogDescription>
          {series.roomName} · {series.tutorName}
          <br />
          {formatDateRange(series.startDate, series.endDate)} · {formatDays(series.daysOfWeek)} ·{" "}
          {formatTimeRange(series.startTime, series.endTime)} Baku time ·{" "}
          {formatSessions(series.occurrenceCount, series.upcomingCount)}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-ink-2">
          {approving
            ? "Every pending session that hasn't started is approved in one go."
            : "Every pending session is rejected; the expert is notified with your note."}
        </p>
        <div>
          <Label htmlFor="series-decision-note" required={!approving}>
            {approving ? "Note (optional)" : "Reason for rejection"}
          </Label>
          <Textarea
            id="series-decision-note"
            rows={3}
            value={note}
            invalid={!!noteError}
            aria-describedby={noteError ? "series-decision-note-error" : undefined}
            placeholder={approving ? "Optional note…" : "Reason for rejection…"}
            onChange={(e) => {
              setNote(e.target.value);
              if (noteError && e.target.value.trim()) setNoteError(null);
            }}
          />
          {noteError && (
            <p id="series-decision-note-error" className="mt-1.5 text-[12.5px] font-medium leading-snug text-danger">
              {noteError}
            </p>
          )}
        </div>
        {conflict && (
          <Notice tone="danger" Icon={AlertTriangle} title="Can't approve: some sessions clash with approved bookings">
            <p className="whitespace-pre-line">{conflict}</p>
            <p className="mt-1">Nothing was changed. Reject the request, or ask the expert to pick other dates.</p>
          </Notice>
        )}
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant={approving ? "primary" : "danger"} loading={isLoading} onClick={submit}>
          {approving ? "Approve all sessions" : "Reject"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
