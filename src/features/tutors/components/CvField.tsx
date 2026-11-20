import { useLayoutEffect, useRef, useState } from "react";
import { ExternalLink, FileText, FileUp, Globe, Loader2, Replace, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@shared/components/ui/Button";
import { useUploadMediaMutation } from "@shared/api/mediaApi";
import { formatFileSize } from "@shared/components/upload/uploadConstraints";
import { openStoredDocument } from "@shared/lib/openDocument";
import { cn } from "@shared/lib/cn";
import type { UUID } from "@shared/types/lms";
import type { NormalizedError } from "@lib/axios/httpClient";
import { usePdfPicker } from "@features/tutors/components/usePdfPicker";

interface Props {
  /** The field's id: it goes on the file input, so the field's label names the picker. */
  id: string;
  /** The CV in the form: the saved one, a fresh upload, or none. */
  value: UUID | undefined;
  /** The CV as saved, to tell a fresh upload (not on the profile until saved) from it. */
  savedId: UUID | undefined;
  onChange: (mediaId: UUID | undefined) => void;
  /** Whether the profile is public, which decides what the note beside the CV says. */
  approved: boolean;
  invalid?: boolean;
  /** True while a PDF is uploading; the profile can't be saved meanwhile. */
  onBusyChange: (busy: boolean) => void;
}

/**
 * The expert's CV, saved with the profile as `cvMediaId` — the way the photo
 * is: a picked PDF is uploaded at once and its id goes into the form, Remove
 * clears it (the save then sends null), and nothing reaches the profile until
 * Save. The current one opens in a new tab.
 */
export function CvField({ id, value, savedId, onChange, approved, invalid, onBusyChange }: Props) {
  const [uploadMedia] = useUploadMediaMutation();
  const [uploading, setUploading] = useState<string | null>(null);
  /** What the last upload was, to name it until the profile is saved (the API keeps no name we can read back). */
  const [fresh, setFresh] = useState<{ id: UUID; name: string; size: number } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  // Remove takes its own button away, and an upload swaps the buttons for its
  // status and back: the control that had the focus is gone each time. Focus
  // moves on in the same commit (below), so it never falls to the page.
  const focusNext = useRef<"keep" | "pick" | "status" | "open" | null>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  /** "Choose PDF" or "Replace": the same job, whichever is shown. */
  const pickRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);

  const upload = async (file: File) => {
    // From this field's own button rather than a drop: the status takes the focus while the PDF uploads.
    if (picker.rootRef.current?.contains(document.activeElement)) focusNext.current = "status";
    setProblem(null);
    setUploading(file.name);
    onBusyChange(true);
    let uploaded = false;
    try {
      const media = await uploadMedia(file).unwrap();
      setFresh({ id: media.id, name: file.name, size: file.size });
      onChange(media.id);
      uploaded = true;
    } catch (e) {
      const message = (e as NormalizedError).message || "The CV didn't upload. Please try again.";
      setProblem(message);
      toast.error(message);
    } finally {
      // Unless it was moved meanwhile: to the new CV, or back to the picker to try again.
      if (focusNext.current === "status" || document.activeElement === statusRef.current) {
        focusNext.current = uploaded ? "open" : "pick";
      }
      setUploading(null);
      onBusyChange(false);
    }
  };

  const picker = usePdfPicker({
    onPick: (file) => void upload(file),
    onProblem: (message) => {
      setProblem(message);
      toast.error(message);
    },
    disabled: !!uploading,
  });

  useLayoutEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    focusNext.current = null;
    // Only where focus fell to the page or is still in this field: never taken from another field.
    const active = document.activeElement;
    if (active && active !== document.body && !picker.rootRef.current?.contains(active)) return;
    ({ keep: keepRef, pick: pickRef, status: statusRef, open: openRef })[target].current?.focus();
  });

  const open = async () => {
    if (!value) return;
    setOpening(true);
    try {
      await openStoredDocument(value, "cv.pdf");
    } catch {
      toast.error("Couldn't open the CV. Please try again.");
    } finally {
      setOpening(false);
    }
  };

  const unsaved = !!value && value !== savedId;
  const named = fresh && fresh.id === value ? fresh : null;
  const removedSaved = !value && !!savedId;

  return (
    <div className="space-y-2">
      <div
        {...picker.getRootProps({
          className: cn(
            "rounded-[18px] border p-3.5 transition-colors duration-200 sm:p-4",
            value ? "border-line bg-surface" : "border-[1.5px] border-dashed border-line-2 bg-paper/60",
            picker.isDragActive && "border-navy bg-navy-tint",
            (invalid || problem) && !picker.isDragActive && "border-danger",
          ),
        })}
      >
        <input {...picker.getInputProps({ id })} />
        {uploading ? (
          <div ref={statusRef} role="status" tabIndex={-1} className="flex items-center gap-3 focus:outline-none">
            <Tile tone="brand">
              <Loader2 className="animate-spin" />
            </Tile>
            <p className="min-w-0 truncate text-sm font-semibold text-ink">Uploading {uploading}…</p>
          </div>
        ) : value ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Tile tone={unsaved ? "brand" : "ok"}>
                <FileText />
              </Tile>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{named ? named.name : unsaved ? "New CV" : "CV"}</p>
                <p className="text-[12.5px] leading-snug text-ink-3">
                  {unsaved
                    ? `PDF${named ? ` · ${formatFileSize(named.size)}` : ""} · Not on the profile until it's saved.`
                    : "PDF · Saved on the profile."}
                </p>
              </div>
            </div>
            <div className="-ml-1.5 flex shrink-0 flex-wrap items-center gap-1 sm:ml-0">
              <Button
                ref={openRef}
                type="button"
                size="sm"
                variant="secondary"
                leftIcon={<ExternalLink className="size-4" />}
                loading={opening}
                onClick={() => void open()}
                aria-label="Open CV"
              >
                Open
              </Button>
              <Button
                ref={pickRef}
                type="button"
                size="sm"
                variant="ghost"
                leftIcon={<Replace className="size-4" />}
                onClick={picker.open}
                aria-label="Replace CV"
              >
                Replace
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-danger hover:bg-danger-tint hover:text-danger"
                leftIcon={<Trash2 className="size-4" />}
                onClick={() => {
                  // To the undo in its place, or to the picker when there is no saved CV to keep.
                  focusNext.current = savedId ? "keep" : "pick";
                  setProblem(null);
                  onChange(undefined);
                }}
                aria-label="Remove CV"
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Tile tone="brand">
                <FileUp />
              </Tile>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {picker.isDragActive ? "Drop the PDF here" : removedSaved ? "CV removed" : "No CV yet"}
                </p>
                <p className="text-[12.5px] leading-snug text-ink-3">
                  {removedSaved
                    ? "It comes off the profile when the profile is saved."
                    : `Drag a PDF here, or choose one — up to ${picker.maxMb} MB.`}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1">
              {removedSaved && (
                <Button
                  ref={keepRef}
                  type="button"
                  size="sm"
                  variant="ghost"
                  leftIcon={<Undo2 className="size-4" />}
                  onClick={() => onChange(savedId)}
                >
                  Keep the saved CV
                </Button>
              )}
              <Button
                ref={pickRef}
                type="button"
                size="sm"
                variant="secondary"
                leftIcon={<FileUp className="size-4" />}
                onClick={picker.open}
                aria-label="Choose PDF for the CV"
              >
                Choose PDF
              </Button>
            </div>
          </div>
        )}
      </div>
      {/* The contract's promise to the expert: where the CV goes, and when. */}
      <p className="flex items-start gap-2 text-[12.5px] leading-snug text-ink-3">
        <Globe aria-hidden className="mt-px size-3.5 shrink-0" />
        {approved
          ? "The profile is approved, so the CV is shown on the public expert page, where visitors can download it."
          : "The CV is shown on the public expert page once the profile is approved."}
      </p>
      {problem && (
        <p role="alert" className="text-[12.5px] font-medium leading-snug text-danger">
          {problem}
        </p>
      )}
    </div>
  );
}

const TILE = {
  brand: "bg-navy-tint text-navy",
  ok: "bg-ok-tint text-ok",
} as const;

function Tile({ tone, children }: { tone: keyof typeof TILE; children: React.ReactNode }) {
  return (
    <span aria-hidden className={cn("grid size-10 shrink-0 place-items-center rounded-[13px] [&_svg]:size-[18px]", TILE[tone])}>
      {children}
    </span>
  );
}
