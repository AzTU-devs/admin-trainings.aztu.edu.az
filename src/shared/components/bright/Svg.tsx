import { cn } from "@shared/lib/cn";

/**
 * Inlines a drawing from @shared/lib/art. The wrapper is `display: contents`
 * (the `.sx` class), so the <svg> lays out as if it were the container's own
 * child — the .cover, .mo, .av and .sw-sq rules in index.css size it that way.
 *
 * The markup comes from our own pure functions built from fixed shapes; the
 * only outside text in it (a person's initials) is escaped there. Never pass
 * markup from anywhere else.
 */
export function Svg({ markup, className }: { markup: string; className?: string }) {
  return <span aria-hidden className={cn("sx", className)} dangerouslySetInnerHTML={{ __html: markup }} />;
}
