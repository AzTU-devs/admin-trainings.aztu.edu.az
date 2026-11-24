import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Trash2 } from "lucide-react";
import type { NormalizedError } from "@lib/axios/httpClient";
import { Button } from "@shared/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { Notice } from "@features/user-profile/components/ProfileBits";
import {
  useRemoveRoomBookingMutation,
  useRemoveRoomBookingSeriesMutation,
} from "@features/room-requests/api/roomRequestsApi";
import { REMOVED_ALREADY, type RemovalTarget } from "@features/room-requests/lib/removal";

const COPY: Record<
  RemovalTarget["kind"],
  {
    title: string;
    confirm: string;
    done: string;
    failed: string;
    body: (sessions?: number) => string;
  }
> = {
  booking: {
    title: "Remove this booking request?",
    confirm: "Remove request",
    done: "Booking request removed",
    failed: "Could not remove the request",
    body: () =>
      "This cannot be undone. The request disappears from every list and from the calendar, and its time slot is free to book again.",
  },
  occurrence: {
    title: "Remove this session?",
    confirm: "Remove session",
    done: "Session removed",
    failed: "Could not remove the session",
    body: () =>
      "Only this session of the long-term booking is removed; its other sessions stay. This cannot be undone. " +
      "The session disappears from every list and from the calendar, and its time slot is free to book again.",
  },
  series: {
    title: "Remove this long-term booking?",
    confirm: "Remove whole series",
    done: "Long-term booking removed",
    failed: "Could not remove the long-term booking",
    body: (sessions) => {
      const which =
        sessions === undefined
          ? "every session of it"
          : sessions === 1
            ? "its one session"
            : `all ${sessions} of its sessions`;
      return (
        `The long-term booking and ${which} are removed. This cannot be undone. ` +
        "They disappear from every list and from the calendar, and their time slots are free to book again."
      );
    },
  },
};

/**
 * The super admin's confirm before a room request is removed for good: one
 * request, one session of a long-term booking, or a whole long-term booking.
 * It names what goes and says it cannot be undone and frees the time slot.
 *
 * A refusal keeps the dialog open with the API's message; a 404 means the
 * request is gone already (removed elsewhere), which is what was asked, so it
 * closes as a removal. Either way the lists and the calendar refresh (the
 * mutations' tags are invalidated on a refusal too).
 *
 * `onRemoved` runs before `onClose` once the request is gone, so a caller can
 * close the dialogs underneath and decide where focus goes (`onCloseAutoFocus`,
 * as with ConfirmDialog: the control that opened this may be gone with the row).
 */
export function RemoveRequestDialog({
  target,
  onClose,
  onRemoved,
  onCloseAutoFocus,
}: {
  target: RemovalTarget | null;
  onClose: () => void;
  onRemoved?: (target: RemovalTarget) => void;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && !busy && onClose()}>
      {/* Keyed by the request: each one opens without the last one's error. */}
      {target && (
        <RemovePanel
          key={`${target.kind}-${target.id}`}
          target={target}
          onClose={onClose}
          onRemoved={onRemoved}
          onBusyChange={setBusy}
          onCloseAutoFocus={onCloseAutoFocus}
        />
      )}
    </Dialog>
  );
}

function RemovePanel({
  target,
  onClose,
  onRemoved,
  onBusyChange,
  onCloseAutoFocus,
}: {
  target: RemovalTarget;
  onClose: () => void;
  onRemoved?: (target: RemovalTarget) => void;
  onBusyChange: (busy: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const [removeBooking, { isLoading: removingBooking }] = useRemoveRoomBookingMutation();
  const [removeSeries, { isLoading: removingSeries }] = useRemoveRoomBookingSeriesMutation();
  const [error, setError] = useState<string | null>(null);
  const busy = removingBooking || removingSeries;
  const copy = COPY[target.kind];

  const submit = async () => {
    setError(null);
    onBusyChange(true);
    try {
      if (target.kind === "series") await removeSeries(target.id).unwrap();
      else await removeBooking(target.id).unwrap();
      toast.success(copy.done);
    } catch (e) {
      const err = (e ?? {}) as Partial<NormalizedError>;
      if (!err.code || !REMOVED_ALREADY.has(err.code)) {
        setError(err.message || copy.failed);
        return;
      }
      toast.info("It had already been removed");
    } finally {
      onBusyChange(false);
    }
    onRemoved?.(target);
    onClose();
  };

  return (
    <DialogContent size="md" showClose={false} onCloseAutoFocus={onCloseAutoFocus}>
      <DialogHeader icon={<AlertTriangle />} iconTone="danger">
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription className="break-words">{target.what}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-ink-2">
          {copy.body(target.kind === "series" ? target.sessions : undefined)}
        </p>
        {error && (
          <div role="alert">
            <Notice tone="danger" Icon={AlertTriangle} title={copy.failed}>
              <p className="whitespace-pre-line">{error}</p>
            </Notice>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="danger"
          leftIcon={<Trash2 className="size-4" />}
          loading={busy}
          onClick={submit}
        >
          {copy.confirm}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
