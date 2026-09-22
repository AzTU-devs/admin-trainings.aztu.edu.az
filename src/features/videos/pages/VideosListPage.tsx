import { useState } from "react";
import { Trash2, Upload, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Card, CardContent } from "@shared/components/ui/Card";
import { ConfirmDialog } from "@shared/components/ui/ConfirmDialog";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { QueryErrorState } from "@shared/components/feedback/QueryErrorState";
import { apiErrorMessage } from "@shared/lib/apiError";
import { Spinner } from "@shared/components/ui/Spinner";
import { Badge } from "@shared/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { VideoUploader } from "@shared/components/upload/VideoUploader";
import { formatFileSize } from "@shared/components/upload/uploadConstraints";
import { resolveApiUrl } from "@shared/config/env";
import { useDeleteVideoMutation, useListVideosQuery } from "@features/videos/api/videosApi";
import { useStreamingVideoUpload } from "@features/videos/hooks/useStreamingVideoUpload";
import type { VideoAsset } from "@features/videos/types";
import { enumLabel } from "@shared/constants/enumLabels";

const statusTone = {
  UPLOADING: "warning",
  PROCESSING: "warning",
  READY: "success",
  FAILED: "danger",
} as const;

export default function VideosListPage() {
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<VideoAsset | null>(null);
  const { currentData: data, isFetching, isError, error, refetch } = useListVideosQuery({ size: 24 });
  const [deleteVideo] = useDeleteVideoMutation();
  const upload = useStreamingVideoUpload();

  // The library keeps no form state: it only needs the stored copy's URL back.
  const uploadFile = async (file: File, onProgress: (pct: number) => void, signal: AbortSignal) => {
    const asset = await upload(file, onProgress, signal);
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

      {isFetching && !data ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : isError ? (
        <QueryErrorState error={error} onRetry={refetch} what="your videos" />
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
                  <Badge tone={statusTone[v.status] ?? "neutral"} dot>{enumLabel("videoStatus", v.status)}</Badge>
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
            <DialogDescription>
              Once it's ready, choose it from the library in any lesson or as a course trailer.
            </DialogDescription>
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
            toast.error(apiErrorMessage(e, "Could not delete the video"));
          }
        }}
      />
    </>
  );
}
