import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./Dialog";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  /**
   * Where focus goes once the dialog has closed. By default DialogContent
   * returns it to the control that had it when the dialog opened, while that
   * control is still on the page and enabled. Call `preventDefault()` and
   * focus a neighbour instead when the confirmed action removed it (a deleted
   * row's delete button).
   */
  onCloseAutoFocus?: (event: Event) => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  onConfirm,
  onCloseAutoFocus,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent size="sm" showClose={false} onCloseAutoFocus={onCloseAutoFocus}>
        {/* The shared header layout: the danger tile beside the title, the
            description under it — like every other dialog. */}
        <DialogHeader icon={destructive ? <AlertTriangle /> : undefined} iconTone="danger">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {/* Straight after the header: its own 12px + the header's 20px is enough. */}
        <DialogFooter className="mt-0">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={handle} loading={busy}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
