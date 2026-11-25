import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Armchair, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { NormalizedError } from "@lib/axios/httpClient";
import { Form } from "@shared/components/forms/Form";
import { FormField } from "@shared/components/forms/FormField";
import { Button } from "@shared/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { Textarea } from "@shared/components/ui/Textarea";
import { Notice } from "@features/user-profile/components/ProfileBits";
import {
  useApproveEnrollmentRequestMutation,
  useRejectEnrollmentRequestMutation,
} from "@features/enrollments/api/enrollmentRequestsApi";
import {
  firstNameOf,
  isGoneRequest,
  priceText,
  seatsLeftText,
  studentName,
} from "@features/enrollments/lib/requests";
import {
  REQUEST_REJECT_REASON_MAX,
  rejectRequestSchema,
  type RejectRequestFormValues,
} from "@features/enrollments/schemas/rejectRequest.schema";
import type { EnrollmentRequestDto } from "@features/enrollments/types";

export type RequestDecisionKind = "approve" | "reject";

export interface RequestDecision {
  request: EnrollmentRequestDto;
  kind: RequestDecisionKind;
}

/**
 * The owner's (or the super admin's) decision on an enrolment request,
 * confirmed in a dialog that says what follows. Approving a free course seats
 * the student at once; a paid one asks them to pay first. Rejecting takes an
 * optional reason, which the student is shown.
 *
 * A refusal stays in the dialog with the API's message — a full course, or a
 * 403 for someone who may not decide on this course — except when the
 * request is no longer there to decide (decided, cancelled, the course ended
 * or deleted): then it closes with a toast, and the list (refetched on any
 * outcome) shows what is left.
 */
export function RequestDecisionDialog({
  decision,
  onClose,
}: {
  decision: RequestDecision | null;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={!!decision} onOpenChange={(o) => !o && !busy && onClose()}>
      {/* Keyed by the request and the kind: each one opens without the last one's reason or error. */}
      {decision &&
        (decision.kind === "approve" ? (
          <ApprovePanel
            key={`a-${decision.request.enrollmentId}`}
            request={decision.request}
            onBusyChange={setBusy}
            onClose={onClose}
          />
        ) : (
          <RejectPanel
            key={`r-${decision.request.enrollmentId}`}
            request={decision.request}
            onBusyChange={setBusy}
            onClose={onClose}
          />
        ))}
    </Dialog>
  );
}

interface PanelProps {
  request: EnrollmentRequestDto;
  onBusyChange: (busy: boolean) => void;
  onClose: () => void;
}

const takesSeat = (seatsLeft: number) =>
  seatsLeft === 1
    ? " This takes the last seat."
    : ` This takes one of the ${seatsLeft.toLocaleString()} seats left.`;

/** What approving does, in the request's own terms: free or paid, a seat or not. */
function ApprovalOutcome({ request: r }: { request: EnrollmentRequestDto }) {
  const first = firstNameOf(r);
  const seated = r.seatsLeft !== null && r.seatsLeft !== undefined;
  const full = seated && (r.seatsLeft ?? 0) <= 0;
  return (
    <div className="space-y-3 text-sm leading-relaxed text-ink-2">
      {r.paid ? (
        <p>
          {first} is notified and asked to pay {priceText(r)} on the website; the place is theirs
          once the payment goes through.
          {seated && !full
            ? ` A seat is taken when they pay (${seatsLeftText(r.seatsLeft)} now).`
            : ""}
        </p>
      ) : (
        <p>
          {first} joins the course straight away and is notified.
          {seated && !full ? takesSeat(r.seatsLeft ?? 0) : ""}
        </p>
      )}
      {full && (
        <Notice tone="warning" Icon={Armchair} title="No seats left">
          {r.paid
            ? "Every seat is taken. They can only pay once a seat is free again."
            : "Every seat is taken, so the approval is refused until a seat is free again."}
        </Notice>
      )}
    </div>
  );
}

function ApprovePanel({ request, onBusyChange, onClose }: PanelProps) {
  const [approve, { isLoading }] = useApproveEnrollmentRequestMutation();
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const name = studentName(request);

  const submit = async () => {
    setError(null);
    onBusyChange(true);
    try {
      await approve(request).unwrap();
      onBusyChange(false);
      toast.success(request.paid ? `${name} is asked to pay` : `${name} is enrolled`);
      onClose();
    } catch (e) {
      onBusyChange(false);
      const err = (e ?? {}) as Partial<NormalizedError>;
      if (isGoneRequest(err)) {
        toast.info(err.message || "This request is no longer waiting");
        onClose();
        return;
      }
      setError({
        title: err.code === "COURSE_FULL" ? "The course is full" : "Could not approve the request",
        message: err.message || "Please try again in a moment.",
      });
    }
  };

  return (
    <DialogContent size="md" showClose={false}>
      <DialogHeader icon={<Check />} iconTone="brand">
        <DialogTitle>Approve this enrolment request?</DialogTitle>
        <DialogDescription className="break-words">
          {name} · {request.courseTitle}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <ApprovalOutcome request={request} />
        {error && (
          <div role="alert">
            <Notice tone="danger" Icon={AlertTriangle} title={error.title}>
              <p className="whitespace-pre-line">{error.message}</p>
            </Notice>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button leftIcon={<Check className="size-4" />} loading={isLoading} onClick={submit}>
          Approve request
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function RejectPanel({ request, onBusyChange, onClose }: PanelProps) {
  const [reject] = useRejectEnrollmentRequestMutation();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<RejectRequestFormValues>({
    resolver: zodResolver(rejectRequestSchema),
    defaultValues: { reason: "" },
  });
  const name = studentName(request);
  const submitting = form.formState.isSubmitting;

  const submit = async ({ reason }: RejectRequestFormValues) => {
    setError(null);
    onBusyChange(true);
    try {
      await reject({ request, reason: reason || undefined }).unwrap();
      onBusyChange(false);
      toast.success(`${name}'s request is rejected`);
      onClose();
    } catch (e) {
      onBusyChange(false);
      const err = (e ?? {}) as Partial<NormalizedError>;
      if (isGoneRequest(err)) {
        toast.info(err.message || "This request is no longer waiting");
        onClose();
        return;
      }
      const fieldMessage = err.fieldErrors?.reason;
      if (fieldMessage) {
        form.setError("reason", { message: fieldMessage });
        return;
      }
      setError(err.message || "Could not reject the request");
    }
  };

  return (
    <DialogContent size="md" showClose={false}>
      <DialogHeader icon={<X />} iconTone="danger">
        <DialogTitle>Reject this enrolment request?</DialogTitle>
        <DialogDescription className="break-words">
          {name} · {request.courseTitle}
        </DialogDescription>
      </DialogHeader>
      <Form form={form} onSubmit={submit} className="space-y-4">
        <p className="text-sm leading-relaxed text-ink-2">
          {firstNameOf(request)} is notified, with your reason if you give one, and may ask to enrol
          again later.
        </p>
        <FormField<RejectRequestFormValues>
          name="reason"
          label="Reason (optional)"
          description={`Shown to the student. At most ${REQUEST_REJECT_REASON_MAX} characters.`}
        >
          {({ field, invalid, id }) => (
            <Textarea
              id={id}
              rows={3}
              {...field}
              value={field.value as string}
              invalid={invalid}
              disabled={submitting}
            />
          )}
        </FormField>
        {error && (
          <div role="alert">
            <Notice tone="danger" Icon={AlertTriangle} title="Could not reject the request">
              <p className="whitespace-pre-line">{error}</p>
            </Notice>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            leftIcon={<X className="size-4" />}
            loading={submitting}
          >
            Reject request
          </Button>
        </DialogFooter>
      </Form>
    </DialogContent>
  );
}
