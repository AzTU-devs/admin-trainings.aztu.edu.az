import { useState } from "react";
import { Library, Video as VideoIcon } from "lucide-react";
import { Button } from "@shared/components/ui/Button";
import { Spinner } from "@shared/components/ui/Spinner";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { QueryErrorState } from "@shared/components/feedback/QueryErrorState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { formatFileSize } from "@shared/components/upload/uploadConstraints";
import { useListVideosQuery } from "@features/videos/api/videosApi";
import type { VideoAsset } from "@features/videos/types";

interface Props {
  onSelect: (video: VideoAsset) => void;
  disabled?: boolean;
  label?: string;
}

/**
 * "Choose from library" for a lesson's video or a course trailer.
 *
 * The video library promised its uploads could be attached to lessons, but no
 * field offered them, so a tutor re-uploaded the same recording for every
 * lesson. The API already accepts a READY video the caller owns as
 * `videoMediaId` / `trailerMediaId`; this is the missing picker. Only READY
 * videos are offered — anything else would be refused on save.
 */
export function VideoLibraryPicker({ onSelect, disabled, label = "Choose from library" }: Props) {
  const [open, setOpen] = useState(false);
  // 100 is the API's page-size cap; a library past that needs search, not a longer list.
  const { currentData, isFetching, isError, error, refetch } = useListVideosQuery(
    { size: 100 },
    { skip: !open },
  );
  const ready = (currentData?.content ?? []).filter((v) => v.status === "READY");

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        leftIcon={<Library className="size-4" />}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Choose a video</DialogTitle>
            <DialogDescription>
              Videos from your library that have finished uploading.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar -mx-1 px-1">
            {isFetching && !currentData ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : isError ? (
              <QueryErrorState error={error} onRetry={refetch} what="your videos" compact />
            ) : ready.length === 0 ? (
              <EmptyState
                title="No ready videos"
                description="Upload one in the Video library first, then pick it here."
              />
            ) : (
              <ul className="space-y-2">
                {ready.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(v);
                        setOpen(false);
                      }}
                      className="w-full flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <span className="size-9 shrink-0 rounded-lg bg-gray-900 text-white/60 inline-flex items-center justify-center">
                        <VideoIcon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{v.title}</span>
                        <span className="block text-xs text-gray-500">
                          {v.durationSeconds > 0 ? `${Math.round(v.durationSeconds / 60)} min · ` : ""}
                          {formatFileSize(v.sizeBytes)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
