import { useMemo } from "react";
import { hash, monogramSvg } from "@shared/lib/art";
import { cn } from "@shared/lib/cn";
import { hueFor, initialsOf } from "@shared/lib/hue";
import type { HueClass } from "@shared/lib/categoryStyle";

/**
 * An expert's portrait when there is no photo — the website's arch-shaped
 * monogram: large initials on a hue field with one drafted shape behind them.
 * Size it with `className` (e.g. `w-28 aspect-[5/6]`).
 */
export function Monogram({
  name,
  seed,
  hue,
  className,
}: {
  name: string;
  /** Stable id for the drawing and the colour; defaults to the name. */
  seed?: string;
  hue?: HueClass;
  className?: string;
}) {
  const key = seed || name;
  const markup = useMemo(() => monogramSvg(initialsOf(name) || "?", hash(key)), [name, key]);
  return (
    <span
      aria-hidden
      className={cn("av arch", hue ?? hueFor(key), className)}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
