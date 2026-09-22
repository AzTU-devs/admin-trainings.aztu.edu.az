import { useEffect, useState } from "react";
import { resolveAuthedMediaUrl } from "@shared/lib/authedMediaUrl";

/**
 * A src an <img> can load. The authenticated media route needs a bearer token
 * that a plain image request never sends, so those bytes are fetched through the
 * API client and shown from an object URL; public URLs pass straight through.
 */
export function useLoadableSrc(src?: string | null): string | null {
  const [resolved, setResolved] = useState<string | null>(null);

  useEffect(() => {
    setResolved(null);
    if (!src) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    void resolveAuthedMediaUrl(src)
      .then((r) => {
        if (cancelled) {
          if (r.revoke) URL.revokeObjectURL(r.url);
          return;
        }
        if (r.revoke) objectUrl = r.url;
        setResolved(r.url);
      })
      // A failed fetch leaves the initials showing, which is the right fallback.
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return resolved;
}
