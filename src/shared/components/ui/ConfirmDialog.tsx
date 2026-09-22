import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { apiErrorMessage } from "@shared/lib/apiError";
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
  /** Extra content under the description — a warning box, a note field. */
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
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
  children,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (e) {
      // A caller that lets its mutation reject (the category and user deletes
      // did) used to leave the dialog open with no word of why, and an unhandled
      // rejection in the console. Say why, and keep the dialog so it can be retried.
      toast.error(apiErrorMessage(e, "That didn't work. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent size="sm" showClose={false}>
        <DialogHeader>
          <div className="flex items-start gap-3">
            {destructive && (
              <div className="size-10 shrink-0 rounded-xl bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 inline-flex items-center justify-center">
                <AlertTriangle className="size-5" />
              </div>
            )}
            <div className="min-w-0">
              <DialogTitle>{title}</DialogTitle>
              {/* Radix wants a description for screen readers; fall back to the
                  title rather than leave the dialog unlabelled. */}
              {description ? (
                <DialogDescription className="mt-1">{description}</DialogDescription>
              ) : (
                <DialogDescription className="sr-only">{title}</DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>
        {children}
        <DialogFooter>
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
