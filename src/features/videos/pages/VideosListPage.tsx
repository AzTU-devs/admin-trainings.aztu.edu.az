import { useState } from "react";
import { Trash2, Upload, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Card, CardContent } from "@shared/components/ui/Card";
import { ConfirmDialog } from "@shared/components/ui/ConfirmDialog";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { Spinner } from "@shared/components/ui/Spinner";
import { Badge } from "@shared/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { VideoUploader } from "@shared/components/upload/VideoUploader";
import { formatFileSize, videoContentType } from "@shared/components/upload/uploadConstraints";
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

const statusTone = {
  UPLOADING: "warning",
  PROCESSING: "warning",
  READY: "success",
  FAILED: "danger",
} as const;

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
          title="No videos yet"
          description="Upload your first video to use it across lessons."
          action={<Button leftIcon={<Upload className="size-4" />} onClick={() => setOpen(true)}>Upload video</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.content.map((v) => (
            <Card key={v.id}>
              {/*
                A placeholder rather than a <video> or <img>: the API returns no
                poster frame yet, and /media/{id}/content requires an
                Authorization header that a plain `src` attribute cannot send —
                so every tile would fire a request that 401s and renders nothing.
              */}
              <div className="aspect-video rounded-t-2xl bg-gray-900 flex items-center justify-center">
                <VideoIcon className="size-8 text-white/30" />
              </div>
              <CardContent>
                <div className="flex items-start gap-2">
                  <p className="font-medium text-gray-900 dark:text-white truncate flex-1">{v.title}</p>
                  <button
                    type="button"
                    onClick={() => setToDelete(v)}
                    aria-label={`Delete ${v.title}`}
                    className="size-8 -mt-1 shrink-0 rounded-lg text-gray-400 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10 inline-flex items-center justify-center"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge tone={statusTone[v.status]} dot>{v.status}</Badge>
                  <span className="text-xs text-gray-500">
                    {/* Duration is only known once something has probed the file;
                        until then the stored size is the honest thing to show. */}
                    {v.durationSeconds > 0
                      ? `${Math.round(v.durationSeconds / 60)} min`
                      : formatFileSize(v.sizeBytes)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
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
