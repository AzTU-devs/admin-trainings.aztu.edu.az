import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@shared/components/ui/Avatar";
import { resolveAuthedMediaUrl } from "@shared/lib/authedMediaUrl";

interface Props {
  /** From `tutorAvatarSrc`. Null or undefined shows the initials. */
  src?: string | null;
  /** Full name, for the initials fallback. */
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  fallbackClassName?: string;
}

/**
 * A tutor's photo with an initials fallback, which also covers a photo that
 * fails to load (a pending tutor's, say, on a route the viewer may not read).
 */
export function TutorAvatar({ src, name, size, className, fallbackClassName }: Props) {
  const resolved = useLoadableSrc(src);
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <Avatar size={size} className={className}>
      {resolved && <AvatarImage src={resolved} alt="" />}
      <AvatarFallback className={fallbackClassName}>{initials}</AvatarFallback>
    </Avatar>
  );
}

/**
 * A src an <img> can load. The authenticated media route needs a bearer token
 * that a plain image request never sends, so those bytes are fetched through the
 * API client and shown from an object URL; public URLs pass straight through.
 */
function useLoadableSrc(src?: string | null): string | null {
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
