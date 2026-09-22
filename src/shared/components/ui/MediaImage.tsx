import { useEffect, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import { httpClient } from "@lib/axios/httpClient";
import { cn } from "@shared/lib/cn";
import type { UUID } from "@shared/types/lms";

interface MediaImageProps {
  mediaId: UUID;
  alt?: string;
  className?: string;
}

/**
 * Renders a media file by id. The `/media/{id}/content` endpoint requires an
 * Authorization header, so a plain <img src> can't load it — we fetch the
 * bytes through the authenticated axios client and show an object URL instead.
 */
export function MediaImage({ mediaId, alt = "", className }: MediaImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;
    setUrl(null);
    setFailed(false);

    httpClient
      .get(`/media/${mediaId}/content`, { responseType: "blob" })
      .then((res) => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(res.data as Blob);
        setUrl(objectUrl);
      })
      .catch(() => !revoked && setFailed(true));

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mediaId]);

  if (failed) {
    return (
      <div className={cn("flex items-center justify-center bg-paper-2 text-ink-3", className)}>
        <ImageOff className="size-6" />
      </div>
    );
  }
  if (!url) {
    return (
      <div className={cn("flex items-center justify-center bg-paper-2 text-ink-3", className)}>
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }
  return <img src={url} alt={alt} className={className} />;
}
