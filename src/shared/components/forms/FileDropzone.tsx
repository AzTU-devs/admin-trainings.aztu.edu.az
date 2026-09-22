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
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-paper-2 py-2.5 pl-2.5 pr-3.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ok-tint text-ok">
          <FileCheck2 className="size-[18px]" />
        </span>
        <span className="truncate text-sm font-medium text-ink">{current}</span>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            disabled={disabled || isLoading}
            aria-label="Remove file"
            className="ml-auto inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-danger-tint hover:text-danger disabled:opacity-50"
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
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[20px] border-[1.5px] border-dashed px-4 py-8 text-center transition-colors duration-200",
        isDragActive
          ? "border-navy bg-navy-tint"
          : "border-line-2 bg-paper/60 hover:border-navy/45 hover:bg-navy-tint/40",
        (disabled || isLoading) && "opacity-60 cursor-not-allowed",
      )}
    >
      <input {...getInputProps()} />
      {isLoading ? (
        <span className="grid size-11 place-items-center rounded-full bg-navy-tint text-navy"><Loader2 className="size-5 animate-spin" /></span>
      ) : (
        <span className="grid size-11 place-items-center rounded-full bg-navy-tint text-navy"><UploadCloud className="size-5" /></span>
      )}
      <p className="text-sm font-medium text-ink">
        {isLoading ? "Uploading…" : isDragActive ? "Drop the file here" : "Drag & drop a file, or click to browse"}
      </p>
      {hint && !isLoading && <p className="text-[12.5px] text-ink-3">{hint}</p>}
    </div>
  );
}
