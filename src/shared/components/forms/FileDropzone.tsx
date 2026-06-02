import { useCallback } from "react";
import { useDropzone, type Accept } from "react-dropzone";
import { UploadCloud, X, FileCheck2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@shared/lib/cn";
import { useUploadMediaMutation } from "@shared/api/mediaApi";
import type { MediaFileDto } from "@shared/types/media";

interface FileDropzoneProps {
  /** react-dropzone accept map. Omit to allow any file type. */
  accept?: Accept;
  /** Human hint shown under the drop target (e.g. "MP4 up to 100MB"). */
  hint?: string;
  /** Label for an already-attached file, if any. */
  current?: string | null;
  onUploaded: (media: MediaFileDto) => void;
  onClear?: () => void;
  disabled?: boolean;
}

/**
 * Drag-and-drop (or click) file upload. Uploads the dropped file to `/media`
 * and reports the resulting {@link MediaFileDto} via {@link onUploaded}.
 */
export function FileDropzone({ accept, hint, current, onUploaded, onClear, disabled }: FileDropzoneProps) {
  const [uploadMedia, { isLoading }] = useUploadMediaMutation();

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      try {
        const media = await uploadMedia(file).unwrap();
        onUploaded(media);
        toast.success("File uploaded");
      } catch {
        toast.error("Upload failed");
      }
    },
    [uploadMedia, onUploaded],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    multiple: false,
    disabled: disabled || isLoading,
    onDrop,
    onDropRejected: () => toast.error("File type not accepted"),
  });

  if (current) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 px-3.5 py-3">
        <FileCheck2 className="size-5 text-success-500 shrink-0" />
        <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{current}</span>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            disabled={disabled || isLoading}
            aria-label="Remove file"
            className="ml-auto text-gray-400 hover:text-error-500 disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center cursor-pointer transition-colors",
        isDragActive
          ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
          : "border-gray-200 dark:border-gray-700 hover:border-brand-400",
        (disabled || isLoading) && "opacity-60 cursor-not-allowed",
      )}
    >
      <input {...getInputProps()} />
      {isLoading ? (
        <Loader2 className="size-6 text-brand-500 animate-spin" />
      ) : (
        <UploadCloud className="size-6 text-gray-400" />
      )}
      <p className="text-sm text-gray-700 dark:text-gray-200">
        {isLoading ? "Uploading…" : isDragActive ? "Drop the file here" : "Drag & drop a file, or click to browse"}
      </p>
      {hint && !isLoading && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
