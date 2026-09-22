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
          "relative w-full cursor-pointer overflow-hidden rounded-[22px] border-[1.5px] border-dashed transition-colors duration-200",
          aspectCls,
          preview ? "border-transparent" : "border-line-2 bg-paper/60 hover:border-navy/45 hover:bg-navy-tint/40",
          isDragActive && "border-navy bg-navy-tint",
          !preview && error && "border-danger",
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
              className="absolute right-2.5 top-2.5 inline-flex size-9 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur-sm transition-colors hover:bg-black/85"
            >
              <X className="size-4" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <div className="mb-3 inline-flex size-12 items-center justify-center rounded-full bg-navy-tint text-navy">
              <ImageIcon className="size-5" />
            </div>
            <p className="text-sm font-semibold text-ink">
              {isDragActive ? "Drop image" : "Click or drag to upload"}
            </p>
            <p className="mt-1 text-[12.5px] text-ink-3">
              {IMAGE_FORMATS_LABEL} · up to {maxSizeMb} MB
            </p>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="text-[12.5px] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
