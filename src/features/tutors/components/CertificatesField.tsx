import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { FormProvider, useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Award, ExternalLink, FileText, FileUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SoftEmpty } from "@shared/components/bright";
import { FormField } from "@shared/components/forms/FormField";
import { Button } from "@shared/components/ui/Button";
import { ConfirmDialog } from "@shared/components/ui/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { Input } from "@shared/components/ui/Input";
import { useUploadMediaMutation } from "@shared/api/mediaApi";
import { formatFileSize } from "@shared/components/upload/uploadConstraints";
import { serverFieldErrors } from "@shared/lib/fieldErrors";
import { isolatedSubmit } from "@shared/lib/isolatedSubmit";
import { openStoredDocument } from "@shared/lib/openDocument";
import { cn } from "@shared/lib/cn";
import type { UUID } from "@shared/types/lms";
import type { NormalizedError } from "@lib/axios/httpClient";
import { usePdfPicker } from "@features/tutors/components/usePdfPicker";
import {
  CERTIFICATE_LIMIT,
  EMPTY_CERTIFICATE,
  certificateSchema,
  toCreateCertificateRequest,
  type CertificateFormValues,
} from "@features/tutors/schemas/certificate.schema";
import type { CreateCertificateRequest, TutorCertificate } from "@features/tutors/types";

interface Props {
  certificates: TutorCertificate[];
  onChange: Dispatch<SetStateAction<TutorCertificate[]>>;
  /** Saves one through the caller's endpoint (the expert's own, or an admin's for that expert). */
  add?: (body: CreateCertificateRequest) => Promise<TutorCertificate>;
  remove?: (id: UUID) => Promise<void>;
}

/** The refusals that are about the PDF rather than the details. */
const FILE_ERROR_CODES = new Set(["INVALID_DOCUMENT", "MEDIA_FORBIDDEN", "MEDIA_NOT_FOUND"]);
const CERTIFICATE_FIELDS = new Set(["title", "issuer", "issuedYear", "file"]);

/**
 * The expert's certificates, each with its PDF. Unlike everything else on the
 * profile they are not part of its save: each one is added (PDF uploaded, then
 * the certificate posted) or deleted on its own, at once, through `add` and
 * `remove` — the list here is what the server holds.
 */
export function CertificatesField({ certificates, onChange, add, remove }: Props) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<TutorCertificate | null>(null);
  const [openingId, setOpeningId] = useState<UUID | null>(null);
  const full = certificates.length >= CERTIFICATE_LIMIT;
  const addRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Set once a delete went through: the row it was opened from is gone, so
  // focus goes to the list's own controls rather than to the page's start.
  const deleted = useRef(false);

  const open = async (c: TutorCertificate) => {
    setOpeningId(c.id);
    try {
      await openStoredDocument(c.mediaId, "certificate.pdf");
    } catch {
      toast.error("Couldn't open the PDF. Please try again.");
    } finally {
      setOpeningId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting || !remove) return;
    const target = deleting;
    try {
      await remove(target.id);
      deleted.current = true;
      onChange((list) => list.filter((c) => c.id !== target.id));
      toast.success("Certificate deleted");
    } catch (e) {
      const err = e as NormalizedError;
      // Already gone on the server (deleted elsewhere): the list should not keep it either.
      if (err.code === "CERTIFICATE_NOT_FOUND") {
        deleted.current = true;
        onChange((list) => list.filter((c) => c.id !== target.id));
      }
      toast.error(err.message || "Could not delete the certificate");
    }
  };

  return (
    <div className="space-y-3 md:col-span-2">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 ref={headingRef} tabIndex={-1} className="text-[13.5px] font-semibold text-ink focus:outline-none">
            Certificates
          </h3>
          <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">
            Each with its PDF, saved as soon as it is added or deleted · {certificates.length}/{CERTIFICATE_LIMIT}
          </p>
        </div>
        {add && (
          <Button
            ref={addRef}
            type="button"
            size="sm"
            variant="secondary"
            leftIcon={<Plus className="size-4" />}
            disabled={full}
            onClick={() => setAdding(true)}
          >
            Add certificate
          </Button>
        )}
      </div>

      {certificates.length === 0 ? (
        <SoftEmpty icon={<Award />} title="No certificates yet." hint={add ? "Add each one with its PDF." : undefined} />
      ) : (
        <ul aria-label="Certificates" className="divide-y divide-line rounded-[18px] border border-line bg-surface">
          {certificates.map((c) => {
            const details = [c.issuer, c.issuedYear].filter((v) => v !== null && v !== undefined && v !== "").join(" · ");
            return (
              <li key={c.id} className="flex items-center gap-3 py-3 pl-3.5 pr-2 sm:pl-4">
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-gold-tint text-gold-ink [&_svg]:size-[18px]">
                  <Award />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold leading-snug text-ink">{c.title}</p>
                  {details && <p className="mt-0.5 break-words text-[12.5px] text-ink-3">{details}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="px-3"
                    leftIcon={<ExternalLink className="size-4" />}
                    loading={openingId === c.id}
                    onClick={() => void open(c)}
                    aria-label={`Open the PDF of ${c.title}`}
                  >
                    PDF
                  </Button>
                  {remove && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-ink-3 hover:bg-danger-tint hover:text-danger"
                      onClick={() => setDeleting(c)}
                      aria-label={`Delete ${c.title}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {add && (
        <Dialog open={adding} onOpenChange={(o) => !busy && setAdding(o)}>
          <DialogContent
            size="md"
            // A stray click beside the dialog should not drop a half-filled certificate.
            onInteractOutside={(e) => e.preventDefault()}
            // Focus goes back to Add, which opened the dialog — unless the
            // certificate just added filled the list, and Add is disabled.
            onCloseAutoFocus={(e) => {
              if (!addRef.current?.disabled) return;
              e.preventDefault();
              headingRef.current?.focus();
            }}
          >
            <DialogHeader icon={<Award />}>
              <DialogTitle>Add certificate</DialogTitle>
              <DialogDescription>Its PDF is uploaded and the certificate saved on the profile straight away.</DialogDescription>
            </DialogHeader>
            <CertificateForm
              add={add}
              onBusyChange={setBusy}
              onCancel={() => setAdding(false)}
              onAdded={(created) => {
                onChange((list) => [...list, created]);
                setAdding(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this certificate?"
        description={deleting ? `“${deleting.title}” and its PDF come off the profile straight away.` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCloseAutoFocus={(e) => {
          if (!deleted.current) return;
          deleted.current = false;
          e.preventDefault();
          (addRef.current ?? headingRef.current)?.focus();
        }}
      />
    </div>
  );
}

type Step = "idle" | "uploading" | "saving";

/** Inside the dialog, so each opening starts empty (Radix unmounts the content on close). */
function CertificateForm({
  add,
  onAdded,
  onCancel,
  onBusyChange,
}: {
  add: (body: CreateCertificateRequest) => Promise<TutorCertificate>;
  onAdded: (created: TutorCertificate) => void;
  onCancel: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [uploadMedia] = useUploadMediaMutation();
  const [step, setStepState] = useState<Step>("idle");
  // The PDF sent by an attempt the API then refused for its details: a retry
  // with the same file posts it again instead of uploading another copy.
  const uploaded = useRef<{ file: File; mediaId: UUID } | null>(null);
  const form = useForm<CertificateFormValues>({
    resolver: zodResolver(certificateSchema),
    defaultValues: EMPTY_CERTIFICATE,
  });
  const file = form.watch("file");

  const setStep = (next: Step) => {
    setStepState(next);
    onBusyChange(next !== "idle");
  };

  const picker = usePdfPicker({
    onPick: (picked) => {
      form.setValue("file", picked, { shouldDirty: true });
      form.clearErrors("file");
    },
    onProblem: (message) => form.setError("file", { message }),
    disabled: step !== "idle",
  });

  const submit = async (values: CertificateFormValues) => {
    const pdf = values.file as File;
    let mediaId = uploaded.current?.file === pdf ? uploaded.current.mediaId : null;
    if (!mediaId) {
      setStep("uploading");
      try {
        mediaId = (await uploadMedia(pdf).unwrap()).id;
        uploaded.current = { file: pdf, mediaId };
      } catch (e) {
        setStep("idle");
        const message = (e as NormalizedError).message || "The PDF didn't upload. Please try again.";
        form.setError("file", { message });
        toast.error(message);
        return;
      }
    }

    setStep("saving");
    try {
      const created = await add(toCreateCertificateRequest(values, mediaId));
      setStep("idle");
      toast.success("Certificate added");
      onAdded(created);
    } catch (e) {
      setStep("idle");
      const err = e as NormalizedError;
      for (const [field, message] of serverFieldErrors(err)) {
        const name = field === "mediaId" ? "file" : field;
        if (CERTIFICATE_FIELDS.has(name)) form.setError(name as FieldPath<CertificateFormValues>, { message });
      }
      if (err.code && FILE_ERROR_CODES.has(err.code)) {
        // That upload can't be used: the next try needs a new one.
        uploaded.current = null;
        form.setError("file", { message: err.message });
      }
      // CERTIFICATE_LIMIT and the rest: the API says what went wrong.
      toast.error(err.message || "Could not add the certificate");
    }
  };

  const working = step !== "idle";

  return (
    <FormProvider {...form}>
      <form
        noValidate
        // Not also a submit of the profile form around this field.
        onSubmit={isolatedSubmit(form.handleSubmit(submit))}
        className="space-y-4"
      >
        <FormField<CertificateFormValues> name="title" label="Title" required>
          {({ field, invalid, id }) => (
            <Input
              {...field}
              id={id}
              value={(field.value as string) ?? ""}
              invalid={invalid}
              placeholder="e.g. AWS Certified Solutions Architect"
              disabled={working}
            />
          )}
        </FormField>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <FormField<CertificateFormValues> name="issuer" label="Issuer">
            {({ field, invalid, id }) => (
              <Input
                {...field}
                id={id}
                value={(field.value as string) ?? ""}
                invalid={invalid}
                placeholder="e.g. Amazon Web Services"
                disabled={working}
              />
            )}
          </FormField>
          <FormField<CertificateFormValues> name="issuedYear" label="Year issued">
            {({ field, invalid, id }) => (
              <Input
                id={id}
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                type="number"
                inputMode="numeric"
                step={1}
                placeholder="e.g. 2021"
                value={(field.value as number | undefined) ?? ""}
                invalid={invalid}
                disabled={working}
                onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
              />
            )}
          </FormField>
        </div>
        <FormField<CertificateFormValues> name="file" label="Certificate PDF" required>
          {({ id, invalid }) => (
            <div
              {...picker.getRootProps({
                className: cn(
                  "rounded-[18px] border-[1.5px] border-dashed p-3.5 transition-colors duration-200 sm:p-4",
                  file ? "border-line bg-surface" : "border-line-2 bg-paper/60",
                  picker.isDragActive && "border-navy bg-navy-tint",
                  invalid && !picker.isDragActive && "border-danger",
                ),
              })}
            >
              <input {...picker.getInputProps({ id })} />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    aria-hidden
                    className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-navy-tint text-navy [&_svg]:size-[18px]"
                  >
                    {file ? <FileText /> : <FileUp />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {file ? file.name : picker.isDragActive ? "Drop the PDF here" : "No PDF chosen"}
                    </p>
                    <p className="text-[12.5px] leading-snug text-ink-3">
                      {file ? `PDF · ${formatFileSize(file.size)}` : `Drag it here, or choose it — up to ${picker.maxMb} MB.`}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="shrink-0 self-start sm:self-auto"
                  leftIcon={<FileUp className="size-4" />}
                  onClick={picker.open}
                  disabled={working}
                >
                  {file ? "Choose another" : "Choose PDF"}
                </Button>
              </div>
            </div>
          )}
        </FormField>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={working}>
            Cancel
          </Button>
          <Button type="submit" loading={working}>
            {step === "uploading" ? "Uploading PDF…" : step === "saving" ? "Saving…" : "Add certificate"}
          </Button>
        </DialogFooter>
      </form>
    </FormProvider>
  );
}
