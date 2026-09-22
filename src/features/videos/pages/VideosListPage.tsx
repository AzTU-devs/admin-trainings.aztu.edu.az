import { useState } from "react";
import { CalendarDays, Trash2, Upload, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Card } from "@shared/components/ui/Card";
import { ConfirmDialog } from "@shared/components/ui/ConfirmDialog";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { Spinner } from "@shared/components/ui/Spinner";
import { StatusBadge } from "@shared/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { VideoUploader } from "@shared/components/upload/VideoUploader";
import { formatFileSize, videoContentType } from "@shared/components/upload/uploadConstraints";
import { Svg } from "@shared/components/bright";
import { tileSvg } from "@shared/lib/art";
import { hueFor } from "@shared/lib/hue";
import { cn } from "@shared/lib/cn";
import { env, resolveApiUrl } from "@shared/config/env";
import { appStorage, STORAGE_KEYS } from "@lib/storage";
import type { NormalizedError } from "@lib/axios/httpClient";
import {
  useCompleteVideoUploadMutation,
  useDeleteVideoMutation,
  useInitVideoUploadMutation,
  useListVideosQuery,
} from "@features/videos/api/videosApi";
import type { VideoAsset } from "@features/videos/types";

/**
 * The poster's drawing says the status at a glance, before the pill is read:
 * a play mark once the file is usable, turning rings while bytes are still
 * arriving or being processed (they stop for reduced motion), a struck-out
 * target when it failed.
 */
const statusMotif: Record<VideoAsset["status"], string> = {
  UPLOADING: "rings",
  PROCESSING: "rings",
  READY: "play",
  FAILED: "cross",
};

/**
 * A refused upload comes back as the API's `ApiError` body — `UPLOAD_TOO_LARGE`,
 * `MEDIA_TYPE_MISMATCH`, `NOT_A_VIDEO` and so on, each with a sentence worth
 * showing. Falling back to "HTTP 415" throws that away.
 */
function uploadErrorMessage(xhr: XMLHttpRequest): string {
  try {
    const body = JSON.parse(xhr.responseText) as { message?: string };
    if (body.message) return body.message;
  } catch {
    // Not JSON: nginx answers an over-limit body with its own HTML page, and a
    // request that never reached the API has no body at all.
  }
  if (xhr.status === 413) {
    return `The server refused the file as too large (limit ${env.uploads.maxVideoMb} MB).`;
  }
  if (xhr.status === 401) {
    return "Your session expired during the upload. Sign in again and retry.";
  }
  return `Upload failed (HTTP ${xhr.status}).`;
}

export default function VideosListPage() {
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<VideoAsset | null>(null);
  const { data, isFetching } = useListVideosQuery({ size: 24 });
  const [initUpload] = useInitVideoUploadMutation();
  const [completeUpload] = useCompleteVideoUploadMutation();
  const [deleteVideo] = useDeleteVideoMutation();

  /**
   * Send the raw bytes to the URL returned by /videos/init. Despite the name
   * "uploadUrl" this is the authenticated `PUT /api/videos/{id}/content` — NOT an
   * anonymous presigned URL — so the Bearer token that axios would normally
   * attach has to be set by hand here.
   *
   * The whole file goes in one request: the API exposes no chunk or resume
   * offset, so an interrupted upload restarts from zero. XHR rather than fetch
   * because only XHR reports upload progress. `VideoUploader` has already checked
   * the size and type against the server's limits before this runs.
   */
  const uploadFile = async (file: File, onProgress: (pct: number) => void, signal: AbortSignal): Promise<string> => {
    // The API treats an unrecognized type as "no claim made" and decides from the
    // file's own leading bytes; guessing video/mp4 for a .mov whose type the
    // browser did not report would instead come back as MEDIA_TYPE_MISMATCH.
    const contentType = videoContentType(file);
    const { uploadUrl, videoId } = await initUpload({
      filename: file.name,
      sizeBytes: file.size,
      mime: contentType,
    }).unwrap();

    // `uploadUrl` is root-relative (e.g. "/api/videos/{id}/content"); resolve it
    // against the API base origin so the PUT reaches the backend, not this app.
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", resolveApiUrl(uploadUrl));
      xhr.setRequestHeader("Content-Type", contentType);
      // Access token only — the refresh token is an httpOnly cookie this app
      // cannot read. This raw PUT also bypasses the axios refresh interceptor, so
      // a token that expires mid-upload surfaces as the 401 message above rather
      // than silently retrying half a gigabyte.
      const token = appStorage.get<string>(STORAGE_KEYS.accessToken);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress((e.loaded / e.total) * 100);
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(uploadErrorMessage(xhr)));
      xhr.onerror = () => reject(new Error("Network error — the upload was interrupted."));
      xhr.onabort = () => reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
      signal.addEventListener("abort", () => xhr.abort());
      xhr.send(file);
    });

    const asset = await completeUpload({ videoId, title: file.name }).unwrap();
    return resolveApiUrl(asset.url);
  };

  return (
    <>
      <PageHeader
        title="Video library"
        description="Reusable videos you can attach to course lessons."
        actions={
          <Button leftIcon={<Upload className="size-4" />} onClick={() => setOpen(true)}>Upload video</Button>
        }
      />

      {isFetching ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !data || data.content.length === 0 ? (
        <EmptyState
          Icon={VideoIcon}
          title="No videos yet"
          description="Upload your first video to use it across lessons."
          action={<Button leftIcon={<Upload className="size-4" />} onClick={() => setOpen(true)}>Upload video</Button>}
        />
      ) : (
        // On a phone each video is a compact row (poster left, text right) so
        // a long library stays scannable; from `sm` up they are poster cards.
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {data.content.map((v) => (
            <Card key={v.id} className="group flex gap-3 overflow-hidden p-2 sm:flex-col sm:gap-0">
              {/*
                A generated poster rather than a <video> or <img>: the API returns
                no poster frame yet, and /media/{id}/content requires an
                Authorization header that a plain `src` attribute cannot send —
                so every tile would fire a request that 401s and renders nothing.
                The colour is seeded by the video id, so a video keeps its colour.
              */}
              <div
                className={cn(
                  "relative aspect-video w-[136px] shrink-0 self-center overflow-hidden rounded-[14px] bg-k-100",
                  "sm:w-auto sm:self-auto sm:rounded-[18px]",
                  // A failed upload takes the red family; everything else keeps its own hue.
                  v.status === "FAILED" ? "k-trans" : hueFor(v.id),
                )}
              >
                {/* The drafting grid of the website's course covers. */}
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-80"
                  style={{
                    backgroundImage:
                      "linear-gradient(var(--k-200) 1px, transparent 1px), linear-gradient(90deg, var(--k-200) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                    backgroundPosition: "-1px -1px",
                  }}
                />
                <span
                  aria-hidden
                  className="absolute -right-4 -top-6 size-16 rounded-full bg-k-200 sm:-right-6 sm:-top-8 sm:size-28"
                />
                <span
                  aria-hidden
                  className="absolute left-2.5 top-2.5 size-2 rounded-full bg-gold sm:left-4 sm:top-4 sm:size-2.5"
                />
                <div
                  className={cn(
                    // Left of centre on the phone row, so the size pill does not cover it.
                    "mo absolute left-[34%] top-1/2 h-[62%] -translate-x-1/2 -translate-y-1/2 bg-transparent sm:left-1/2",
                    "transition-transform duration-300 ease-out group-hover:scale-[1.04]",
                  )}
                >
                  <Svg markup={tileSvg(statusMotif[v.status])} />
                </div>
                <span className="pill pill-sm pill-glass absolute bottom-1.5 right-1.5 font-mono tabular-nums sm:bottom-2.5 sm:right-2.5">
                  {/* Duration is only known once something has probed the file;
                      until then the stored size is the honest thing to show. */}
                  {v.durationSeconds > 0
                    ? `${Math.round(v.durationSeconds / 60)} min`
                    : formatFileSize(v.sizeBytes)}
                </span>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2 py-1 pr-1 sm:gap-3 sm:px-3 sm:pb-2.5 sm:pt-3.5">
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 truncate font-semibold text-ink" title={v.title}>
                    {v.title}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setToDelete(v)}
                    aria-label={`Delete ${v.title}`}
                    className="-mr-1 -mt-2 size-9 shrink-0 text-ink-3 hover:bg-danger-tint hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:justify-between">
                  {/* The shared status pill ("Ready", "Uploading"), same tones as every
                      other list; the poster's motif already shows motion. */}
                  <StatusBadge value={v.status} />
                  {v.uploadedAt && (
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] tabular-nums text-ink-3">
                      <CalendarDays aria-hidden className="size-3.5" />
                      {new Date(v.uploadedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg" aria-describedby={undefined}>
          <DialogHeader icon={<Upload />}>
            <DialogTitle>Upload a new video</DialogTitle>
          </DialogHeader>
          <VideoUploader
            uploader={uploadFile}
            onUploaded={() => {
              toast.success("Video uploaded");
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this video?"
        description={
          toDelete
            ? `${toDelete.title} — lessons that reference it will lose their video.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await deleteVideo(toDelete.id).unwrap();
            toast.success("Video deleted");
            setToDelete(null);
          } catch (e) {
            toast.error((e as NormalizedError).message || "Could not delete the video");
          }
        }}
      />
    </>
  );
}
