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
          "rounded-2xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer",
          "border-gray-200 dark:border-gray-700 hover:border-brand-500 dark:hover:border-brand-400",
          isDragActive && "border-brand-500 bg-brand-50 dark:bg-brand-500/10",
          isDragReject && "border-error-400 bg-error-50 dark:bg-error-500/10",
          disabled && "opacity-60 cursor-not-allowed",
        )}
      >
        <input {...getInputProps()} />
        <div className="mx-auto size-12 rounded-2xl bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 inline-flex items-center justify-center mb-3">
          <UploadCloud className="size-5" />
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {isDragActive ? "Drop the file here" : "Drag & drop, or click to browse"}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {helperText ?? `Up to ${maxSizeMb} MB${multiple ? ` · max ${maxFiles} files` : ""}`}
        </p>
      </div>

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5"
            >
              <FileIcon className="size-4 text-gray-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${file.name}`}
                className="size-8 rounded-lg text-gray-400 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10 inline-flex items-center justify-center"
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
