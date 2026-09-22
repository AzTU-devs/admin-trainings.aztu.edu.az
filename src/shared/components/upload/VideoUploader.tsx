import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { CheckCircle2, Play, Square, Video as VideoIcon, X } from "lucide-react";
import { toast } from "sonner";
import { env } from "@shared/config/env";
import { cn } from "@shared/lib/cn";
import { resolveAuthedMediaUrl } from "@shared/lib/authedMediaUrl";
import {
  VIDEO_ACCEPT,
  VIDEO_FORMATS_LABEL,
  formatFileSize,
  validateVideoFile,
} from "@shared/components/upload/uploadConstraints";

interface VideoUploaderProps {
  /**
   * A stored video's URL to preview, or a File to start from. Callers that keep
   * no File of their own (both current ones) may leave it undefined — the picked
   * file is tracked internally either way.
   */
  value?: File | string | null;
  onChange?: (file: File | null) => void;
  /**
   * Performs the transfer and resolves with the stored video's URL. Called only
   * once the picked file has passed the size/type check.
   *
   * Reporting through `onProgress` (0..100) and honouring `signal` are both
   * optional: an uploader that cannot report progress leaves the bar at zero and
   * the label without a percentage, and one that ignores the signal makes the
   * stop button do nothing.
   */
  uploader?: (file: File, onProgress: (pct: number) => void, signal: AbortSignal) => Promise<string>;
  onUploaded?: (url: string) => void;
  maxSizeMb?: number;
  disabled?: boolean;
  className?: string;
}

type Status = "idle" | "selected" | "uploading" | "stopped" | "done" | "error";

/** Statuses the transfer itself sets; they outrank what `picked`/`storedUrl` imply. */
type Phase = Exclude<Status, "idle" | "selected"> | null;

/**
 * Video picker with preview, progress and a stop button. The transfer itself is
 * the caller's `uploader`, so this component stays transport-agnostic.
 *
 * Stopping is abort-and-restart, not pause-and-resume: both callers send the
 * file in a single request, which leaves no server-side offset to resume from.
 * The UI says "stopped" rather than implying a resume it cannot perform.
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
  /**
   * The picked file is kept here and not only handed to `onChange`, because
   * neither caller can echo a File back as `value`: the course form stores a
   * media id and the video library keeps no form state at all. Trusting `value`
   * alone meant forgetting the file the instant it was dropped, so the start
   * button never appeared and nothing could ever be uploaded.
   */
  const [picked, setPicked] = useState<File | null>(value instanceof File ? value : null);
  const [storedUrl, setStoredUrl] = useState<string | null>(
    typeof value === "string" && value ? value : null,
  );
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>(typeof value === "string" && value ? "done" : null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  /** Distinguishes the stop button's abort from the cancel button's — see below. */
  const cancelledRef = useRef(false);

  const status: Status = phase ?? (picked ? "selected" : storedUrl ? "done" : "idle");
  const preview = objectUrl ?? storedUrl;

  useEffect(() => {
    if (value instanceof File) {
      setPicked(value);
      setStoredUrl(null);
      setPhase(null);
      return;
    }
    if (typeof value === "string" && value) {
      // An already-stored video: drop any local pick so its object URL is
      // released and the stored copy is what the preview shows.
      setPicked(null);
      setPhase("done");

      // The stored URL is the authenticated /media/{id}/content endpoint, and a
      // <video src> sends no Authorization header — so resolve it to bytes first
      // or the saved trailer is a permanently blank player. Non-API URLs come
      // back unchanged.
      let blobUrl: string | null = null;
      let cancelled = false;
      void resolveAuthedMediaUrl(value)
        .then((resolved) => {
          if (cancelled) {
            if (resolved.revoke) URL.revokeObjectURL(resolved.url);
            return;
          }
          if (resolved.revoke) blobUrl = resolved.url;
          setStoredUrl(resolved.url);
        })
        .catch(() => {
          if (!cancelled) setStoredUrl(null);
        });
      return () => {
        cancelled = true;
        if (blobUrl) URL.revokeObjectURL(blobUrl);
      };
    }
    // Cleared by the caller — or simply never set. This cannot undo a pick the
    // caller ignored: `value` does not change in that case, so nothing re-runs.
    setPicked(null);
    setStoredUrl(null);
    setPhase(null);
  }, [value]);

  useEffect(() => {
    if (!picked) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(picked);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [picked]);

  /**
   * A refused pick leaves the dropzone on screen with the reason under it — the
   * file was never adopted, so there is nothing to show a filename or a retry
   * button for.
   */
  const refusePick = useCallback((message: string) => {
    setError(message);
    toast.error(message);
  }, []);

  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      // Re-check what the dropzone let through: its `accept` filter matches on a
      // browser-reported type that is often empty, and this is the last gate
      // before as much as half a gigabyte leaves the machine.
      const problem = validateVideoFile(file, maxSizeMb);
      if (problem) {
        refusePick(problem);
        return;
      }
      setError(null);
      setProgress(0);
      setStoredUrl(null);
      setPhase(null);
      setPicked(file);
      onChange?.(file);
    },
    [maxSizeMb, onChange, refusePick],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: VIDEO_ACCEPT,
    maxSize: maxSizeMb * 1024 * 1024,
    multiple: false,
    disabled: disabled || status === "uploading",
    // react-dropzone reports raw byte counts and error codes; re-derive the
    // reason so a rejection reads the same whichever gate caught it.
    onDropRejected: (rejections: FileRejection[]) => {
      const file = rejections[0]?.file;
      refusePick(
        (file && validateVideoFile(file, maxSizeMb)) ??
          `Video rejected. Use ${VIDEO_FORMATS_LABEL} up to ${maxSizeMb} MB.`,
      );
    },
  });

  const startUpload = async () => {
    if (!uploader || !picked) return;
    // Guards against a parent that supplied the File as `value`, bypassing onDrop.
    const problem = validateVideoFile(picked, maxSizeMb);
    if (problem) {
      setPhase("error");
      setError(problem);
      toast.error(problem);
      return;
    }
    controllerRef.current = new AbortController();
    cancelledRef.current = false;
    setPhase("uploading");
    setError(null);
    try {
      const url = await uploader(picked, setProgress, controllerRef.current.signal);
      setPhase("done");
      setProgress(100);
      onUploaded?.(url);
      toast.success("Upload complete");
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        // `cancel()` aborts as well, and its reset lands before this rejection is
        // delivered — so only the stop button gets to say "stopped", or cancelling
        // mid-upload would leave the card on screen with no file behind it.
        if (!cancelledRef.current) {
          // Back to zero, not to wherever the abort landed: restarting re-sends
          // the whole file, so a retained percentage would be a lie.
          setPhase("stopped");
          setProgress(0);
        }
        return;
      }
      setPhase("error");
      setError((e as Error).message || "Upload failed");
      toast.error((e as Error).message || "Upload failed");
    }
  };

  const cancel = () => {
    cancelledRef.current = true;
    controllerRef.current?.abort();
    setPicked(null);
    setStoredUrl(null);
    setPhase(null);
    setProgress(0);
    setError(null);
    onChange?.(null);
  };

  const statusLabel = () => {
    switch (status) {
      case "uploading":
        // Zero means "no progress reported yet" as often as it means "nothing
        // sent yet", so the percentage appears only once there is one.
        return progress > 0 ? `Uploading… ${progress.toFixed(0)}%` : "Uploading…";
      case "stopped":
        return "Stopped — restarting re-uploads from the beginning";
      case "done":
        return "Ready";
      case "error":
        return error ?? "Error";
      default:
        return picked ? `${formatFileSize(picked.size)} · ready to upload` : "Ready to upload";
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {status === "idle" ? (
        <div className="space-y-2">
          <div
            {...getRootProps()}
            className={cn(
              "cursor-pointer rounded-[22px] border-[1.5px] border-dashed p-8 text-center transition-colors duration-200",
              "border-line-2 bg-paper/60 hover:border-navy/45 hover:bg-navy-tint/40",
              isDragActive && "border-navy bg-navy-tint",
              error && "border-danger",
              disabled && "opacity-60 cursor-not-allowed",
            )}
          >
            <input {...getInputProps()} />
            <div className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-full bg-navy-tint text-navy">
              <VideoIcon className="size-5" />
            </div>
            <p className="text-sm font-semibold text-ink">
              {isDragActive ? "Drop the video" : "Drag & drop video, or click to browse"}
            </p>
            <p className="mt-1 text-[12.5px] text-ink-3">
              {VIDEO_FORMATS_LABEL} · up to {maxSizeMb} MB
            </p>
          </div>
          {error && (
            <p role="alert" className="text-[12.5px] font-medium text-danger">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 rounded-[22px] border border-line bg-surface p-4">
          {preview && (
            <video src={preview} controls className="aspect-video w-full rounded-2xl bg-black" />
          )}
          <div className="flex items-center gap-3">
            <div className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-full", status === "done" ? "bg-ok-tint text-ok" : "bg-navy-tint text-navy")}>
              {status === "done" ? <CheckCircle2 className="size-5" /> : <VideoIcon className="size-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {picked ? picked.name : "Uploaded video"}
              </p>
              <p
                className={cn(
                  "text-[12.5px] tabular-nums",
                  status === "error" ? "font-medium text-danger" : "text-ink-3",
                )}
              >
                {statusLabel()}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {(status === "selected" || status === "stopped" || status === "error") && uploader && (
                <button
                  type="button"
                  onClick={startUpload}
                  className="inline-flex size-9 items-center justify-center rounded-full bg-navy text-on-navy transition-colors hover:bg-navy-hover"
                  aria-label={status === "selected" ? "Start upload" : "Restart upload"}
                >
                  <Play className="size-4" />
                </button>
              )}
              {status === "uploading" && (
                <button
                  type="button"
                  onClick={() => controllerRef.current?.abort()}
                  className="inline-flex size-9 items-center justify-center rounded-full bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line-2)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--ink-3)]"
                  aria-label="Stop upload"
                >
                  <Square className="size-4" />
                </button>
              )}
              <button
                type="button"
                onClick={cancel}
                className="inline-flex size-9 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-danger-tint hover:text-danger"
                aria-label="Cancel"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
          {status === "uploading" && (
            <div className="h-2 overflow-hidden rounded-full bg-ink/7">
              <div
                className="h-full rounded-full bg-navy transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
