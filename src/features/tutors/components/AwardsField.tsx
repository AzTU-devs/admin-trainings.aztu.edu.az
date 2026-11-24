import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { FormProvider, useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, FileImage, FileText, FileUp, Plus, Trash2, Trophy, X } from "lucide-react";
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
import { usePdfOrImagePicker } from "@features/tutors/components/usePdfPicker";
import {
  AWARD_LIMIT,
  EMPTY_AWARD,
  awardSchema,
  toCreateAwardRequest,
  type AwardFormValues,
} from "@features/tutors/schemas/award.schema";
import type { CreateAwardRequest, TutorAward } from "@features/tutors/types";

interface Props {
  awards: TutorAward[];
  onChange: Dispatch<SetStateAction<TutorAward[]>>;
  /** Saves one through the caller's endpoint (the expert's own, or an admin's for that expert). */
  add?: (body: CreateAwardRequest) => Promise<TutorAward>;
  remove?: (id: UUID) => Promise<void>;
}

/** The refusals that are about the file rather than the names. */
const FILE_ERROR_CODES = new Set(["INVALID_AWARD_FILE", "MEDIA_FORBIDDEN", "MEDIA_NOT_FOUND"]);
const AWARD_FIELDS = new Set(["nameAz", "nameEn", "file"]);

/** How a stored award file is named on its button: by the kind the API derived from it. */
const fileNoun = (a: TutorAward) => (a.fileKind === "IMAGE" ? "image" : "PDF");

/**
 * The expert's awards (Təltiflər), each named in Azerbaijani and English, with
 * an optional PDF or image. Like the certificates, they are not part of the
 * profile's save: each one is added (file uploaded first, if there is one,
 * then the award posted) or deleted on its own, at once, through `add` and
 * `remove` — the list here is what the server holds.
 */
export function AwardsField({ awards, onChange, add, remove }: Props) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<TutorAward | null>(null);
  const [openingId, setOpeningId] = useState<UUID | null>(null);
  const full = awards.length >= AWARD_LIMIT;
  const addRef = useRef<HTMLButtonElement>(null);
  // The section's own heading is the card's; this line, which says how many
  // there are, takes the focus when Add can't (the list is full).
  const summaryRef = useRef<HTMLParagraphElement>(null);
  // Set once a delete went through: the row it was opened from is gone, so
  // focus goes to the list's own controls rather than to the page's start.
  const deleted = useRef(false);

  const open = async (a: TutorAward) => {
    if (!a.mediaId) return;
    setOpeningId(a.id);
    try {
      // The extension follows what the file turns out to be.
      await openStoredDocument(a.mediaId, "award");
    } catch {
      toast.error(`Couldn't open the ${fileNoun(a)}. Please try again.`);
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
      onChange((list) => list.filter((a) => a.id !== target.id));
      toast.success("Award deleted");
    } catch (e) {
      const err = e as NormalizedError;
      // Already gone on the server (deleted elsewhere): the list should not keep it either.
      if (err.code === "AWARD_NOT_FOUND") {
        deleted.current = true;
        onChange((list) => list.filter((a) => a.id !== target.id));
      }
      toast.error(err.message || "Could not delete the award");
    }
  };

  return (
    <div className="space-y-3 md:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p
          ref={summaryRef}
          tabIndex={-1}
          className="min-w-0 text-[12.5px] leading-snug text-ink-3 focus:outline-none"
        >
          {full
            ? `That's the most there can be (${AWARD_LIMIT}). Delete one to add another.`
            : `Saved as soon as each is added or deleted · ${awards.length}/${AWARD_LIMIT}`}
        </p>
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
            Add award
          </Button>
        )}
      </div>

      {awards.length === 0 ? (
        <SoftEmpty
          icon={<Trophy />}
          title="No awards yet."
          hint={add ? "Add each with its name in Azerbaijani and English, and a PDF or image if there is one." : undefined}
        />
      ) : (
        <ul aria-label="Awards" className="divide-y divide-line rounded-[18px] border border-line bg-surface">
          {awards.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-3 pl-3.5 pr-2 sm:pl-4">
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-gold-tint text-gold-ink [&_svg]:size-[18px]"
              >
                <Trophy />
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold leading-snug text-ink">
                  <LanguageTag>AZ</LanguageTag>
                  <span lang="az">{a.nameAz}</span>
                </p>
                <p className="mt-0.5 break-words text-[12.5px] text-ink-3">
                  <LanguageTag>EN</LanguageTag>
                  <span lang="en">{a.nameEn}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {a.mediaId && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="px-3"
                    leftIcon={<ExternalLink className="size-4" />}
                    loading={openingId === a.id}
                    onClick={() => void open(a)}
                    aria-label={`Open the ${fileNoun(a)} of ${a.nameAz}`}
                  >
                    {a.fileKind === "IMAGE" ? "Image" : "PDF"}
                  </Button>
                )}
                {remove && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-ink-3 hover:bg-danger-tint hover:text-danger"
                    onClick={() => setDeleting(a)}
                    aria-label={`Delete ${a.nameAz}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {add && (
        <Dialog open={adding} onOpenChange={(o) => !busy && setAdding(o)}>
          <DialogContent
            size="md"
            // A stray click beside the dialog should not drop a half-filled award.
            onInteractOutside={(e) => e.preventDefault()}
            // Focus goes back to Add, which opened the dialog — unless the
            // award just added filled the list, and Add is disabled.
            onCloseAutoFocus={(e) => {
              if (!addRef.current?.disabled) return;
              e.preventDefault();
              summaryRef.current?.focus();
            }}
          >
            <DialogHeader icon={<Trophy />}>
              <DialogTitle>Add award</DialogTitle>
              <DialogDescription>
                Saved on the profile straight away, with its file uploaded first if one is chosen.
              </DialogDescription>
            </DialogHeader>
            <AwardForm
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
        title="Delete this award?"
        description={
          deleting
            ? `“${deleting.nameAz}”${deleting.mediaId ? " and its file come" : " comes"} off the profile straight away.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCloseAutoFocus={(e) => {
          if (!deleted.current) return;
          deleted.current = false;
          e.preventDefault();
          (addRef.current ?? summaryRef.current)?.focus();
        }}
      />
    </div>
  );
}

/** Which language a name is in, before it. */
function LanguageTag({ children }: { children: string }) {
  return (
    <span className="mr-1.5 inline-block rounded-md bg-paper-2 px-1.5 py-px align-[1px] text-[10.5px] font-bold tracking-[0.04em] text-ink-3">
      {children}
    </span>
  );
}

type Step = "idle" | "uploading" | "saving";

/** Inside the dialog, so each opening starts empty (Radix unmounts the content on close). */
function AwardForm({
  add,
  onAdded,
  onCancel,
  onBusyChange,
}: {
  add: (body: CreateAwardRequest) => Promise<TutorAward>;
  onAdded: (created: TutorAward) => void;
  onCancel: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [uploadMedia] = useUploadMediaMutation();
  const [step, setStepState] = useState<Step>("idle");
  // The file sent by an attempt the API then refused for its names: a retry
  // with the same file posts it again instead of uploading another copy.
  const uploaded = useRef<{ file: File; mediaId: UUID } | null>(null);
  // "Choose file" / "Choose another": where focus goes when the chosen file is
  // taken off again (its Remove button goes with it).
  const pickRef = useRef<HTMLButtonElement>(null);
  const form = useForm<AwardFormValues>({
    resolver: zodResolver(awardSchema),
    defaultValues: EMPTY_AWARD,
  });
  const file = form.watch("file");
  // By its type, or by its name when the browser reports none (the picker accepts it on either).
  const image = !!file && (file.type ? file.type.startsWith("image/") : !/\.pdf$/i.test(file.name));
  const refusal = form.formState.errors.root?.server?.message;

  const setStep = (next: Step) => {
    setStepState(next);
    onBusyChange(next !== "idle");
  };

  const picker = usePdfOrImagePicker({
    onPick: (picked) => {
      form.setValue("file", picked, { shouldDirty: true });
      form.clearErrors("file");
    },
    onProblem: (message) => form.setError("file", { message }),
    disabled: step !== "idle",
  });

  const submit = async (values: AwardFormValues) => {
    const chosen = values.file instanceof File ? values.file : undefined;
    let mediaId: UUID | null = null;
    if (chosen) {
      mediaId = uploaded.current?.file === chosen ? uploaded.current.mediaId : null;
      if (!mediaId) {
        setStep("uploading");
        try {
          mediaId = (await uploadMedia(chosen).unwrap()).id;
          uploaded.current = { file: chosen, mediaId };
        } catch (e) {
          setStep("idle");
          const message = (e as NormalizedError).message || "The file didn't upload. Please try again.";
          form.setError("file", { message });
          toast.error(message);
          return;
        }
      }
    }

    setStep("saving");
    try {
      const created = await add(toCreateAwardRequest(values, mediaId));
      setStep("idle");
      toast.success("Award added");
      onAdded(created);
    } catch (e) {
      setStep("idle");
      const err = e as NormalizedError;
      let placed = false;
      for (const [field, message] of serverFieldErrors(err)) {
        const name = field === "mediaId" ? "file" : field;
        if (AWARD_FIELDS.has(name)) {
          form.setError(name as FieldPath<AwardFormValues>, { message });
          placed = true;
        }
      }
      if (err.code && FILE_ERROR_CODES.has(err.code)) {
        // That upload can't be used: the next try needs a new one.
        uploaded.current = null;
        form.setError("file", { message: err.message });
        placed = true;
      }
      // AWARD_LIMIT and the rest are about no one field: said in the dialog,
      // which stays open, as well as in the toast that fades.
      const message = err.message || "Could not add the award";
      if (!placed) form.setError("root.server", { message });
      toast.error(message);
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
        <FormField<AwardFormValues> name="nameAz" label="Name (AZ)" required>
          {({ field, invalid, id }) => (
            <Input
              {...field}
              id={id}
              lang="az"
              value={(field.value as string) ?? ""}
              invalid={invalid}
              placeholder="e.g. İlin ən yaxşı müəllimi"
              disabled={working}
            />
          )}
        </FormField>
        <FormField<AwardFormValues> name="nameEn" label="Name (EN)" required>
          {({ field, invalid, id }) => (
            <Input
              {...field}
              id={id}
              lang="en"
              value={(field.value as string) ?? ""}
              invalid={invalid}
              placeholder="e.g. Teacher of the Year"
              disabled={working}
            />
          )}
        </FormField>
        <FormField<AwardFormValues>
          name="file"
          label="File"
          description="Optional: a scan or photo of the award."
        >
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
                    {!file ? <FileUp /> : image ? <FileImage /> : <FileText />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {file ? file.name : picker.isDragActive ? "Drop the file here" : "No file chosen"}
                    </p>
                    <p className="text-[12.5px] leading-snug text-ink-3">
                      {file
                        ? `${image ? "Image" : "PDF"} · ${formatFileSize(file.size)}`
                        : `A PDF or an image — drag it here, or choose it; up to ${picker.maxMb} MB.`}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1 self-start sm:self-auto">
                  <Button
                    ref={pickRef}
                    type="button"
                    size="sm"
                    variant="secondary"
                    leftIcon={<FileUp className="size-4" />}
                    onClick={picker.open}
                    disabled={working}
                  >
                    {file ? "Choose another" : "Choose file"}
                  </Button>
                  {file && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      leftIcon={<X className="size-4" />}
                      onClick={() => {
                        form.setValue("file", undefined, { shouldDirty: true });
                        form.clearErrors("file");
                        pickRef.current?.focus();
                      }}
                      disabled={working}
                      aria-label="Remove the chosen file"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </FormField>

        {refusal && (
          <p role="alert" className="text-[12.5px] font-medium leading-snug text-danger">
            {refusal}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={working}>
            Cancel
          </Button>
          <Button type="submit" loading={working}>
            {step === "uploading" ? "Uploading file…" : step === "saving" ? "Saving…" : "Add award"}
          </Button>
        </DialogFooter>
      </form>
    </FormProvider>
  );
}
