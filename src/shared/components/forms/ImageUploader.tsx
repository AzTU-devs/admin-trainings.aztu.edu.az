import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useFormContext } from "react-hook-form";
import { UploadCloud, X, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@shared/lib/cn";
import { useUploadMediaMutation } from "@shared/api/mediaApi";
import { MediaImage } from "@shared/components/ui/MediaImage";
import {
  IMAGE_ACCEPT,
  IMAGE_FORMATS_LABEL,
  validateImageFile,
} from "@shared/components/upload/uploadConstraints";
import { env } from "@shared/config/env";
import type { UUID } from "@shared/types/lms";

interface ImageUploaderProps {
  /** Ordered media ids. The first is treated as the cover. */
  value: UUID[];
  onChange: (ids: UUID[]) => void;
  min?: number;
  disabled?: boolean;
  /**
   * Show the "at least N required" counter as an error. Defaults to "the
   * surrounding form has been submitted" (or always, outside a form) — a
   * freshly opened dialog should not open on a red message it has not
   * validated yet.
   */
  invalid?: boolean;
}

/**
 * Drag-and-drop multi-image uploader. Each dropped image is uploaded to
 * `/media`; the resulting ids are appended (order preserved, first = cover).
 */
export function ImageUploader({ value, onChange, min = 2, disabled, invalid }: ImageUploaderProps) {
  const [uploadMedia, { isLoading }] = useUploadMediaMutation();
  // react-hook-form's context is null outside a <FormProvider>.
  const form = useFormContext() as ReturnType<typeof useFormContext> | null;

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (accepted.length === 0) return;

      // Size is checked here rather than by the dropzone so an oversized file is
      // named in the message. Dropping the whole batch on one bad file is
      // deliberate: uploading three of four images and reporting a failure leaves
      // the caller unsure which ids it now holds.
      const tooBig = accepted
        .map((f) => validateImageFile(f, env.uploads.maxImageMb))
        .find((msg): msg is string => msg !== null);
      if (tooBig) {
        toast.error(tooBig);
        return;
      }

      try {
        const uploaded = await Promise.all(accepted.map((f) => uploadMedia(f).unwrap()));
        onChange([...value, ...uploaded.map((m) => m.id)]);
      } catch {
        toast.error("One or more images failed to upload");
      }
    },
    [uploadMedia, onChange, value],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    // The API's allowlist, not `image/*`: SVG is an XML document that can carry a
    // script and stored media is served under this portal's own origin, so the
    // server refuses it. Offering it here only delays the rejection.
    accept: IMAGE_ACCEPT,
    multiple: true,
    disabled: disabled || isLoading,
    onDrop,
    onDropRejected: (rejections) =>
      toast.error(
        rejections[0]?.file
          ? `${rejections[0].file.name} is not a supported image. Use ${IMAGE_FORMATS_LABEL}.`
          : `Only images are accepted. Use ${IMAGE_FORMATS_LABEL}.`,
      ),
  });

  const remove = (id: UUID) => onChange(value.filter((v) => v !== id));

  const short = value.length < min && (invalid ?? form?.formState.isSubmitted ?? true);

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[20px] border-[1.5px] border-dashed px-4 py-6 text-center transition-colors duration-200",
          isDragActive
            ? "border-navy bg-navy-tint"
            : "border-line-2 bg-paper/60 hover:border-navy/45 hover:bg-navy-tint/40",
          (disabled || isLoading) && "opacity-60 cursor-not-allowed",
        )}
      >
        <input {...getInputProps()} />
        <span className="grid size-11 place-items-center rounded-full bg-navy-tint text-navy">
          {isLoading ? <Loader2 className="size-5 animate-spin" /> : <UploadCloud className="size-5" />}
        </span>
        <p className="text-sm font-medium text-ink">
          {isLoading ? "Uploading…" : "Drag & drop images, or click to browse"}
        </p>
        <p className={cn("text-[12.5px] tabular-nums", short ? "font-medium text-danger" : "text-ink-3")}>
          {value.length} added · at least {min} required
        </p>
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {value.map((id, i) => (
            <div key={id} className="group relative aspect-video overflow-hidden rounded-2xl border border-line bg-paper-2">
              <MediaImage mediaId={id} className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-2 top-2 inline-flex h-6 items-center gap-1 rounded-full bg-gold px-2 text-[11px] font-semibold text-on-gold">
                  <Star className="size-3" /> Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(id)}
                disabled={disabled}
                aria-label="Remove image"
                className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition-[opacity,background-color] hover:bg-error-600 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
