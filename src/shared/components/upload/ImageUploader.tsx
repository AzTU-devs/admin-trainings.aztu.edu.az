import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { env } from "@shared/config/env";
import { cn } from "@shared/lib/cn";

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

  useEffect(() => {
    if (!value) return setPreview(null);
    if (typeof value === "string") return setPreview(value);
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      onChange?.(file);
    },
    [onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxSize: maxSizeMb * 1024 * 1024,
    multiple: false,
    disabled,
    onDropRejected: (rej) => {
      const reason = rej[0]?.errors[0]?.message ?? "Image rejected";
      toast.error(reason);
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
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PNG, JPG, WebP · up to {maxSizeMb} MB</p>
          </div>
        )}
      </div>
    </div>
  );
}
