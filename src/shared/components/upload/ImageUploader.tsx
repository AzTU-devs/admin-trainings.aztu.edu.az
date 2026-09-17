import { useCallback, useEffect, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { env } from "@shared/config/env";
import { cn } from "@shared/lib/cn";
import { resolveAuthedMediaUrl } from "@shared/lib/authedMediaUrl";
import {
  IMAGE_ACCEPT,
  IMAGE_FORMATS_LABEL,
  validateImageFile,
} from "@shared/components/upload/uploadConstraints";

interface ImageUploaderProps {
  value?: File | string | null;
  onChange?: (file: File | null) => void;
  maxSizeMb?: number;
  aspect?: "square" | "video" | "wide";
  disabled?: boolean;
  className?: string;
}

/**
 * Single-image picker with live preview. Accepts either a freshly-picked File
 * or an already-uploaded URL (string).
 *
 * The picker filters on the API's own image allowlist rather than `image/*`,
 * which notably keeps SVG out: the API refuses it as an executable document, so
 * offering it here would only produce a rejection after the upload.
 */
export function ImageUploader({
  value,
  onChange,
  maxSizeMb = env.uploads.maxImageMb,
  aspect = "wide",
  disabled,
  className,
}: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreview(null);
      return;
    }
    if (typeof value === "string") {
      // A saved image is an authenticated /media/{id}/content URL, and a bare
      // src attribute sends no Authorization header — so render the bytes, not
      // the URL, or the preview is a permanent 401. Non-API URLs pass straight
      // through.
      let objectUrl: string | null = null;
      let cancelled = false;
      void resolveAuthedMediaUrl(value)
        .then((resolved) => {
          if (cancelled) {
            if (resolved.revoke) URL.revokeObjectURL(resolved.url);
            return;
          }
          if (resolved.revoke) objectUrl = resolved.url;
          setPreview(resolved.url);
        })
        .catch(() => {
          if (!cancelled) setPreview(null);
        });
      return () => {
        cancelled = true;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const refusePick = useCallback((message: string) => {
    setError(message);
    toast.error(message);
  }, []);

  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      // The dropzone's `accept` filter matches on a browser-reported type that is
      // sometimes empty, so re-check before the caller starts an upload.
      const problem = validateImageFile(file, maxSizeMb);
      if (problem) {
        refusePick(problem);
        return;
      }
      setError(null);
      onChange?.(file);
    },
    [maxSizeMb, onChange, refusePick],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: IMAGE_ACCEPT,
    maxSize: maxSizeMb * 1024 * 1024,
    multiple: false,
    disabled,
    // Restate the reason ourselves: react-dropzone's own message is a raw byte
    // count, and its type error does not say which formats would have worked.
    onDropRejected: (rejections: FileRejection[]) => {
      const file = rejections[0]?.file;
      refusePick(
        (file && validateImageFile(file, maxSizeMb)) ??
          `Image rejected. Use ${IMAGE_FORMATS_LABEL} up to ${maxSizeMb} MB.`,
      );
    },
  });

  const aspectCls = {
    square: "aspect-square",
    video: "aspect-video",
    wide: "aspect-[16/9]",
  }[aspect];

  return (
    <div className={cn("space-y-2", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "relative w-full rounded-2xl border-2 border-dashed overflow-hidden cursor-pointer transition-colors",
          aspectCls,
          preview ? "border-transparent" : "border-gray-200 dark:border-gray-700 hover:border-brand-500",
          isDragActive && "border-brand-500 bg-brand-50 dark:bg-brand-500/10",
          !preview && error && "border-error-400 dark:border-error-500/60",
          disabled && "opacity-60 cursor-not-allowed",
        )}
      >
        <input {...getInputProps()} />
        {preview ? (
          <>
            <img src={preview} alt="" className="absolute inset-0 size-full object-cover" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setError(null);
                onChange?.(null);
              }}
              aria-label="Remove image"
              className="absolute top-2 right-2 size-9 rounded-xl bg-gray-900/70 text-white inline-flex items-center justify-center hover:bg-gray-900"
            >
              <X className="size-4" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <div className="size-12 rounded-2xl bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 inline-flex items-center justify-center mb-3">
              <ImageIcon className="size-5" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {isDragActive ? "Drop image" : "Click or drag to upload"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {IMAGE_FORMATS_LABEL} · up to {maxSizeMb} MB
            </p>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-error-600 dark:text-error-400">
          {error}
        </p>
      )}
    </div>
  );
}
