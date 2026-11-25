import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldX } from "lucide-react";
import { toast } from "sonner";
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
import type { UUID } from "@shared/types/lms";
import type { NormalizedError } from "@lib/axios/httpClient";
import { useRevokeCertificateMutation } from "@features/certificates/api/certificatesApi";
import { formatCertificateCode } from "@features/certificates/lib/certificates";
import { REVOKE_REASON_MAX, revokeSchema, type RevokeFormValues } from "@features/certificates/schemas/revoke.schema";
import type { CertificateRef } from "@features/certificates/types";

export interface RevokeTarget {
  certificate: CertificateRef;
  /** Whose it is, as the list names them. */
  name: string;
}

interface Props {
  courseId: UUID;
  /** The certificate to revoke; null closes the dialog. */
  target: RevokeTarget | null;
  onClose: () => void;
}

/**
 * The super admin revokes a certificate: a reason is required (kept for the
 * record, never shown publicly), and the dialog says what follows — the
 * verification page shows it as revoked, and a fresh certificate takes
 * graduating the student again.
 */
export function RevokeCertificateDialog({ courseId, target, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && !busy && onClose()}>
      {target && <RevokeBody courseId={courseId} target={target} onBusyChange={setBusy} onClose={onClose} />}
    </Dialog>
  );
}

function RevokeBody({
  courseId,
  target,
  onBusyChange,
  onClose,
}: {
  courseId: UUID;
  target: RevokeTarget;
  onBusyChange: (busy: boolean) => void;
  onClose: () => void;
}) {
  const [revoke] = useRevokeCertificateMutation();
  const form = useForm<RevokeFormValues>({ resolver: zodResolver(revokeSchema), defaultValues: { reason: "" } });
  const code = formatCertificateCode(target.certificate.code);

  const submit = async ({ reason }: RevokeFormValues) => {
    onBusyChange(true);
    try {
      await revoke({ courseId, certificateId: target.certificate.id, reason }).unwrap();
      onBusyChange(false);
      toast.success(`Certificate ${code} revoked`);
      onClose();
    } catch (e) {
      onBusyChange(false);
      const err = e as NormalizedError;
      toast.error(err.message || "Could not revoke the certificate");
      // Revoked or gone meanwhile: the list (refetched either way) shows what is there now.
      if (err.code === "CERTIFICATE_ALREADY_REVOKED" || err.code === "CERTIFICATE_NOT_FOUND") onClose();
    }
  };

  const submitting = form.formState.isSubmitting;

  return (
    <DialogContent size="md">
      <DialogHeader icon={<ShieldX />} iconTone="danger">
        <DialogTitle>Revoke this certificate?</DialogTitle>
        <DialogDescription>
          {target.name}&apos;s certificate <span className="font-mono text-[13px] text-ink">{code}</span> will show as
          revoked on its verification page, and its PDF is no longer offered. This cannot be undone: to give{" "}
          {target.name} a certificate again, graduate them again and a new one is issued.
        </DialogDescription>
      </DialogHeader>
      <Form form={form} onSubmit={submit} className="mt-2 space-y-0">
        <FormField<RevokeFormValues>
          name="reason"
          label="Reason"
          required
          description={`Kept with the record, not shown on the verification page. At most ${REVOKE_REASON_MAX} characters.`}
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
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" leftIcon={<ShieldX className="size-4" />} loading={submitting}>
            Revoke certificate
          </Button>
        </DialogFooter>
      </Form>
    </DialogContent>
  );
}
