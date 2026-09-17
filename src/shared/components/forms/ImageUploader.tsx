import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
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
}

/**
 * Drag-and-drop multi-image uploader. Each dropped image is uploaded to
 * `/media`; the resulting ids are appended (order preserved, first = cover).
 */
export function ImageUploader({ value, onChange, min = 2, disabled }: ImageUploaderProps) {
  const [uploadMedia, { isLoading }] = useUploadMediaMutation();

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

  const short = value.length < min;

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
            : "border-gray-200 dark:border-gray-700 hover:border-brand-400",
          (disabled || isLoading) && "opacity-60 cursor-not-allowed",
        )}
      >
        <input {...getInputProps()} />
        {isLoading ? <Loader2 className="size-6 text-brand-500 animate-spin" /> : <UploadCloud className="size-6 text-gray-400" />}
        <p className="text-sm text-gray-700 dark:text-gray-200">
          {isLoading ? "Uploading…" : "Drag & drop images, or click to browse"}
        </p>
        <p className={cn("text-xs", short ? "text-error-600" : "text-gray-400")}>
          {value.length} added · at least {min} required
        </p>
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {value.map((id, i) => (
            <div key={id} className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 aspect-video">
              <MediaImage mediaId={id} className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-aztu-gold-500 text-white text-[10px] font-semibold px-1.5 py-0.5">
                  <Star className="size-3" /> Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(id)}
                disabled={disabled}
                aria-label="Remove image"
                className="absolute right-1.5 top-1.5 rounded-md bg-gray-900/70 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error-600"
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
