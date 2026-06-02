import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { CheckCircle2, Pause, Play, Video as VideoIcon, X } from "lucide-react";
import { toast } from "sonner";
import { env } from "@shared/config/env";
import { cn } from "@shared/lib/cn";

interface VideoUploaderProps {
  value?: File | string | null;
  onChange?: (file: File | null) => void;
  /**
   * Hook for the real chunked upload (TUS / multipart presigned).
   * Receives the picked file, returns the public URL.
   * The component reports progress via `onProgress` for the UI.
   */
  uploader?: (file: File, onProgress: (pct: number) => void, signal: AbortSignal) => Promise<string>;
  onUploaded?: (url: string) => void;
  maxSizeMb?: number;
  disabled?: boolean;
  className?: string;
}

type Status = "idle" | "selected" | "uploading" | "paused" | "done" | "error";

/**
 * Video uploader UI with progress, pause/cancel hooks. The actual chunked
 * transfer is plugged in by the caller via the `uploader` prop so the
 * component is transport-agnostic (TUS, multipart, presigned, …).
 */
export function VideoUploader({
  value,
  onChange,
  uploader,
  onUploaded,
  maxSizeMb = env.uploads.maxVideoMb,
  disabled,
  className,
}: VideoUploaderProps) {
  const [status, setStatus] = useState<Status>(value ? "selected" : "idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!value) {
      setPreview(null);
      setStatus("idle");
      return;
    }
    if (typeof value === "string") {
      setPreview(value);
      setStatus("done");
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    setStatus("selected");
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      setError(null);
      setProgress(0);
      onChange?.(file);
    },
    [onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "video/*": [] },
    maxSize: maxSizeMb * 1024 * 1024,
    multiple: false,
    disabled: disabled || status === "uploading",
    onDropRejected: (rej) => {
      const reason = rej[0]?.errors[0]?.message ?? "Video rejected";
      toast.error(reason);
    },
  });

  const startUpload = async () => {
    if (!uploader || !(value instanceof File)) return;
    controllerRef.current = new AbortController();
    setStatus("uploading");
    setError(null);
    try {
      const url = await uploader(value, setProgress, controllerRef.current.signal);
      setStatus("done");
      setProgress(100);
      onUploaded?.(url);
      toast.success("Upload complete");
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setStatus("paused");
        return;
      }
      setStatus("error");
      setError((e as Error).message || "Upload failed");
      toast.error("Upload failed");
    }
  };

  const cancel = () => {
    controllerRef.current?.abort();
    setStatus("idle");
    setProgress(0);
    onChange?.(null);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {status === "idle" ? (
        <div
          {...getRootProps()}
          className={cn(
            "rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
            "border-gray-200 dark:border-gray-700 hover:border-brand-500",
            isDragActive && "border-brand-500 bg-brand-50 dark:bg-brand-500/10",
            disabled && "opacity-60 cursor-not-allowed",
          )}
        >
          <input {...getInputProps()} />
          <div className="mx-auto size-12 rounded-2xl bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 inline-flex items-center justify-center mb-3">
            <VideoIcon className="size-5" />
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {isDragActive ? "Drop the video" : "Drag & drop video, or click to browse"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">MP4, MOV, WebM · up to {maxSizeMb} MB</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
          {preview && (
            <video src={preview} controls className="w-full rounded-xl bg-black aspect-video" />
          )}
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 inline-flex items-center justify-center shrink-0">
              {status === "done" ? <CheckCircle2 className="size-5" /> : <VideoIcon className="size-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {value instanceof File ? value.name : "Uploaded video"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {status === "uploading" ? `Uploading… ${progress.toFixed(0)}%` :
                 status === "paused" ? "Paused" :
                 status === "done" ? "Ready" :
                 status === "error" ? (error ?? "Error") : "Ready to upload"}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {(status === "selected" || status === "paused" || status === "error") && uploader && (
                <button
                  type="button"
                  onClick={startUpload}
                  className="size-9 rounded-xl bg-brand-700 hover:bg-brand-800 text-white inline-flex items-center justify-center"
                  aria-label="Start upload"
                >
                  <Play className="size-4" />
                </button>
              )}
              {status === "uploading" && (
                <button
                  type="button"
                  onClick={() => controllerRef.current?.abort()}
                  className="size-9 rounded-xl border border-gray-200 dark:border-gray-700 inline-flex items-center justify-center text-gray-700 dark:text-gray-200"
                  aria-label="Pause upload"
                >
                  <Pause className="size-4" />
                </button>
              )}
              <button
                type="button"
                onClick={cancel}
                className="size-9 rounded-xl text-gray-400 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10 inline-flex items-center justify-center"
                aria-label="Cancel"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
          {(status === "uploading" || status === "paused") && (
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
              <div
                className="h-full bg-brand-700 transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
