import { useState } from "react";
import { Monogram } from "@shared/components/bright";
import { cn } from "@shared/lib/cn";
import { hueFor } from "@shared/lib/hue";
import type { HueClass } from "@shared/lib/categoryStyle";
import { useLoadableSrc } from "@features/tutors/components/useLoadableSrc";

interface Props {
  /** From `tutorAvatarSrc`. Null or undefined shows the monogram. */
  src?: string | null;
  /** Full name, for the monogram's initials. */
  name: string;
  /** Stable id (the tutor's) for the drawing, so an expert always looks the same. */
  seed?: string;
  /** The expert's field — their main subject area's hue (see `useExpertHue`). */
  hue?: HueClass;
  /** Size it with a width and the portrait ratio, e.g. `w-11 aspect-[5/6]`. */
  className?: string;
}

/**
 * An expert's portrait in the website's arch shape (the experts page and the
 * expert hero): the photo fills the arch when there is one; otherwise the
 * initials are set large on the expert's hue with one drafted shape behind
 * them — typographic, never a fake silhouette. Decorative: name the expert in
 * text beside it.
 */
export function ExpertPortrait({ src, name, seed, hue, className }: Props) {
  const resolved = useLoadableSrc(src);
  // A public photo URL can still 404 (an expert suspended since the list
  // loaded); the monogram is the right fallback then, as it is with no photo.
  const [failed, setFailed] = useState<string | null>(null);
  const k = hue ?? hueFor(seed || name);

  if (resolved && failed !== resolved) {
    return (
      <span aria-hidden className={cn("av arch", k, className)}>
        <img src={resolved} alt="" onError={() => setFailed(resolved)} />
      </span>
    );
  }
  return <Monogram name={name.trim() || "?"} seed={seed} hue={k} className={className} />;
}
