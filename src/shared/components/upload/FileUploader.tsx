import { useCallback } from "react";
import { useDropzone, type Accept, type FileRejection } from "react-dropzone";
import { File as FileIcon, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@shared/lib/cn";

interface FileUploaderProps {
  value?: File[];
  onChange?: (files: File[]) => void;
  accept?: Accept;
  maxSizeMb?: number;
  maxFiles?: number;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  helperText?: string;
}

/**
 * Generic drag-and-drop file picker for an arbitrary `accept` map. Controlled:
 * it hands the caller a list of Files and never transfers anything itself.
 *
 * It carries no allowlist of its own, so a caller that uploads to the media API
 * must pass an `accept` from `uploadConstraints` — a browser wildcard such as
 * `image/*` would offer types the API refuses (see that module on SVG).
 */
export function FileUploader({
  value = [],
  onChange,
  accept,
  maxSizeMb = 10,
  maxFiles = 1,
  multiple = false,
  disabled,
  className,
  helperText,
}: FileUploaderProps) {
  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) {
        const reason = rejected[0].errors[0]?.message ?? "File rejected";
        toast.error(reason);
      }
      if (accepted.length === 0) return;
      const next = multiple ? [...value, ...accepted].slice(0, maxFiles) : accepted.slice(0, 1);
      onChange?.(next);
    },
    [multiple, maxFiles, onChange, value],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxSize: maxSizeMb * 1024 * 1024,
    maxFiles,
    multiple,
    disabled,
  });

  const remove = (idx: number) => {
    const next = value.filter((_, i) => i !== idx);
    onChange?.(next);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "cursor-pointer rounded-[20px] border-[1.5px] border-dashed p-6 text-center transition-colors duration-200",
          "border-line-2 bg-paper/60 hover:border-navy/45 hover:bg-navy-tint/40",
          isDragActive && "border-navy bg-navy-tint",
          isDragReject && "border-danger bg-danger-tint",
          disabled && "opacity-60 cursor-not-allowed",
        )}
      >
        <input {...getInputProps()} />
        <div className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-full bg-navy-tint text-navy">
          <UploadCloud className="size-5" />
        </div>
        <p className="text-sm font-semibold text-ink">
          {isDragActive ? "Drop the file here" : "Drag & drop, or click to browse"}
        </p>
        <p className="mt-1 text-[12.5px] text-ink-3">
          {helperText ?? `Up to ${maxSizeMb} MB${multiple ? ` · max ${maxFiles} files` : ""}`}
        </p>
      </div>

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface py-2.5 pl-2.5 pr-3"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-paper-2 text-ink-3">
                <FileIcon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                <p className="font-mono text-[11.5px] text-ink-3">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${file.name}`}
                className="inline-flex size-8 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-danger-tint hover:text-danger"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
