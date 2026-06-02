import { useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Card, CardContent } from "@shared/components/ui/Card";
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
import {
  useCompleteVideoUploadMutation,
  useInitVideoUploadMutation,
  useListVideosQuery,
} from "@features/videos/api/videosApi";

const statusTone = {
  UPLOADING: "warning",
  PROCESSING: "warning",
  READY: "success",
  FAILED: "danger",
} as const;

export default function VideosListPage() {
  const [open, setOpen] = useState(false);
  const { data, isFetching } = useListVideosQuery({ size: 24 });
  const [initUpload] = useInitVideoUploadMutation();
  const [completeUpload] = useCompleteVideoUploadMutation();

  /**
   * Real chunked upload to a presigned URL. The server hands us a target URL
   * via /videos/init; we PUT the file directly with progress tracking.
   */
  const uploadFile = async (file: File, onProgress: (pct: number) => void, signal: AbortSignal): Promise<string> => {
    const { uploadUrl, videoId } = await initUpload({ filename: file.name, sizeBytes: file.size, mime: file.type }).unwrap();

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress((e.loaded / e.total) * 100);
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.onabort = () => reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
      signal.addEventListener("abort", () => xhr.abort());
      xhr.send(file);
    });

    const asset = await completeUpload({ videoId, title: file.name }).unwrap();
    return asset.url;
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
              <div className="aspect-video bg-black rounded-t-2xl overflow-hidden">
                {v.thumbnailUrl ? (
                  <img src={v.thumbnailUrl} alt="" className="size-full object-cover" />
                ) : (
                  <video src={v.url} className="size-full object-cover" />
                )}
              </div>
              <CardContent>
                <p className="font-medium text-gray-900 dark:text-white truncate">{v.title}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge tone={statusTone[v.status]} dot>{v.status}</Badge>
                  <span className="text-xs text-gray-500">
                    {Math.round(v.durationSeconds / 60)} min
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
    </>
  );
}
