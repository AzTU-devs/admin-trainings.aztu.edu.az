import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Check, MailWarning, X } from "lucide-react";
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
  useApproveAccountMutation,
  useRejectAccountMutation,
} from "@features/account-approvals/api/accountApprovalsApi";
import { applicantName, isStaleDecision } from "@features/account-approvals/lib/accounts";
import {
  ACCOUNT_REJECT_REASON_MAX,
  rejectAccountSchema,
  type RejectAccountFormValues,
} from "@features/account-approvals/schemas/reject.schema";
import type { AccountApprovalDto } from "@features/account-approvals/types";

export type AccountDecisionKind = "approve" | "reject";

export interface AccountDecision {
  account: AccountApprovalDto;
  kind: AccountDecisionKind;
}

/**
 * The super admin's decision on a sign-up, confirmed in a dialog that says
 * what follows: approving lets the person sign in and e-mails them; rejecting
 * needs a reason, which they are e-mailed, and can be undone by approving the
 * account later.
 *
 * A refusal stays in the dialog with the API's message, except when the
 * account was decided meanwhile or is gone: then it closes with a toast, and
 * the list (refetched on any outcome) shows it as it is now.
 */
export function AccountDecisionDialog({
  decision,
  onClose,
}: {
  decision: AccountDecision | null;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={!!decision} onOpenChange={(o) => !o && !busy && onClose()}>
      {/* Keyed by the account and the kind: each one opens without the last one's reason or error. */}
      {decision &&
        (decision.kind === "approve" ? (
          <ApprovePanel
            key={`a-${decision.account.userId}`}
            account={decision.account}
            onBusyChange={setBusy}
            onClose={onClose}
          />
        ) : (
          <RejectPanel
            key={`r-${decision.account.userId}`}
            account={decision.account}
            onBusyChange={setBusy}
            onClose={onClose}
          />
        ))}
    </Dialog>
  );
}

interface PanelProps {
  account: AccountApprovalDto;
  onBusyChange: (busy: boolean) => void;
  onClose: () => void;
}

function ApprovePanel({ account, onBusyChange, onClose }: PanelProps) {
  const [approve, { isLoading }] = useApproveAccountMutation();
  const [error, setError] = useState<string | null>(null);
  const name = applicantName(account);

  const submit = async () => {
    setError(null);
    onBusyChange(true);
    try {
      await approve(account.userId).unwrap();
      onBusyChange(false);
      toast.success(`${name}'s account is approved`);
      onClose();
    } catch (e) {
      onBusyChange(false);
      const err = (e ?? {}) as Partial<NormalizedError>;
      if (isStaleDecision(err)) {
        toast.info(err.message || "This account was decided meanwhile");
        onClose();
        return;
      }
      setError(err.message || "Could not approve the account");
    }
  };

  return (
    <DialogContent size="md" showClose={false}>
      <DialogHeader icon={<Check />} iconTone="brand">
        <DialogTitle>Approve this account?</DialogTitle>
        <DialogDescription className="break-words">
          {name} · {account.email}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-ink-2">
          They can sign in on the website straight away, and are e-mailed that their account is
          approved.
        </p>
        {!account.emailVerified && (
          <Notice tone="warning" Icon={MailWarning} title="The e-mail address is not verified yet">
            Nobody has confirmed they own {account.email}. Approve only if you know who this is.
          </Notice>
        )}
        {error && (
          <div role="alert">
            <Notice tone="danger" Icon={AlertTriangle} title="Could not approve the account">
              <p className="whitespace-pre-line">{error}</p>
            </Notice>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button leftIcon={<Check className="size-4" />} loading={isLoading} onClick={submit}>
          Approve account
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function RejectPanel({ account, onBusyChange, onClose }: PanelProps) {
  const [reject] = useRejectAccountMutation();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<RejectAccountFormValues>({
    resolver: zodResolver(rejectAccountSchema),
    defaultValues: { reason: "" },
  });
  const name = applicantName(account);
  const submitting = form.formState.isSubmitting;

  const submit = async ({ reason }: RejectAccountFormValues) => {
    setError(null);
    onBusyChange(true);
    try {
      await reject({ userId: account.userId, reason }).unwrap();
      onBusyChange(false);
      toast.success(`${name}'s sign-up is rejected`);
      onClose();
    } catch (e) {
      onBusyChange(false);
      const err = (e ?? {}) as Partial<NormalizedError>;
      if (isStaleDecision(err)) {
        toast.info(err.message || "This account was decided meanwhile");
        onClose();
        return;
      }
      // The API's own word on the reason belongs under the field.
      const fieldMessage = err.fieldErrors?.reason;
      if (fieldMessage) {
        form.setError("reason", { message: fieldMessage });
        return;
      }
      setError(err.message || "Could not reject the sign-up");
    }
  };

  return (
    <DialogContent size="md" showClose={false}>
      <DialogHeader icon={<X />} iconTone="danger">
        <DialogTitle>Reject this sign-up?</DialogTitle>
        <DialogDescription className="break-words">
          {name} · {account.email}
        </DialogDescription>
      </DialogHeader>
      <Form form={form} onSubmit={submit} className="space-y-4">
        <p className="text-sm leading-relaxed text-ink-2">
          They cannot sign in, and are e-mailed your reason. You can still approve the account later
          from the Rejected tab.
        </p>
        <FormField<RejectAccountFormValues>
          name="reason"
          label="Reason"
          required
          description={`E-mailed to ${account.email}. At most ${ACCOUNT_REJECT_REASON_MAX} characters.`}
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
            <Notice tone="danger" Icon={AlertTriangle} title="Could not reject the sign-up">
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
            Reject sign-up
          </Button>
        </DialogFooter>
      </Form>
    </DialogContent>
  );
}
