import { useMemo } from "react";
import { swatchSvg } from "@shared/lib/art";
import { categoryStyle } from "@shared/lib/categoryStyle";
import { cn } from "@shared/lib/cn";
import { Svg } from "./Svg";

/**
 * A category's colour field with its family motif — the same swatch the
 * website shows in its categories menu. 44px rounded square by default; pass
 * `round` for a circle and size it with `className` (e.g. `size-9`).
 *
 * A category that matches no family gets the navy field with one of AzTU's
 * neutral tiles, picked by its slug (or name), so unmatched rows differ from
 * each other without borrowing a discipline's glyph.
 */
export function CategorySwatch({
  category,
  round,
  className,
}: {
  category: { slug?: string | null; name?: string | null } | null | undefined;
  round?: boolean;
  className?: string;
}) {
  const style = categoryStyle(category);
  const seed = category?.slug || category?.name || null;
  const markup = useMemo(() => swatchSvg(style.art, seed), [style.art, seed]);
  return (
    <span aria-hidden className={cn("sw-sq", style.k, round && "sw-round", className)}>
      <Svg markup={markup} />
    </span>
  );
}
