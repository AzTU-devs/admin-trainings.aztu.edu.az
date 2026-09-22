import { useMemo } from "react";
import { coverArt, swatchSvg } from "@shared/lib/art";
import { categoryStyle } from "@shared/lib/categoryStyle";
import { cn } from "@shared/lib/cn";
import { Svg } from "./Svg";

interface CourseCoverProps {
  /** Seeds the drawing — the course id (or slug), so a course always looks the same. */
  seed: string;
  /** The course's category, when known: picks the colour family and the motifs. Navy otherwise. */
  category?: { slug?: string | null; name?: string | null } | null;
  /**
   * Square thumbnail for list rows and table cells: the family's single tile
   * motif, whole, on the category field (the same glyph as CategorySwatch;
   * without a category, the same neutral shape as this course's full cover).
   * Cropping the 16:10 drawing to a square sliced its main shape at the
   * edges. Size the box with `className` (e.g. `size-10 rounded-[12px]`).
   */
  thumb?: boolean;
  /**
   * The course has a real thumbnail, rendered as `children` (an <img> or
   * <MediaImage className="absolute inset-0 size-full object-cover" />). Adds
   * the top shade and the category "tab" so a photo still belongs to the system.
   */
  photo?: boolean;
  className?: string;
  /** A photo and/or overlays (`<div className="ov left-3 top-3">…</div>`). */
  children?: React.ReactNode;
}

/**
 * A course cover: the website's generated drawing in the category's colours,
 * or a photo with a category tab. Decorative — give the course its name in
 * text next to it.
 *
 *   <CourseCover seed={course.id} category={cat} className="aspect-[16/10] w-full" />
 *   <CourseCover seed={course.id} thumb className="size-12 rounded-[14px]" />
 */
export function CourseCover({ seed, category, thumb, photo, className, children }: CourseCoverProps) {
  const style = categoryStyle(category);
  // One seed for both shapes: the thumbnail and the full cover of a course
  // without a category pick the same neutral motif (brandVariant in art.ts).
  const key = seed || "course";
  const markup = useMemo(
    () => (photo ? "" : thumb ? swatchSvg(style.art, key) : coverArt(style.art, key)),
    [photo, thumb, style.art, key],
  );
  return (
    <div className={cn("cover", style.k, thumb && "thumb", photo && "photo", className)}>
      {photo ? null : <Svg markup={markup} />}
      {children}
      {photo ? <span className="ktab" aria-hidden /> : null}
    </div>
  );
}
