import { useEffect, type RefObject } from "react";

export interface ScrollFadeOptions {
  /** Off: no attribute is written (e.g. only on phones). Default on. */
  enabled?: boolean;
  /**
   * How much must be left past an edge before it counts, in px. Pass the
   * scroller's own end padding: when only that padding is out of view there
   * is nothing to hint at (the sidebar's last item sat under a fade while it
   * fitted, 16px of padding short).
   */
  slack?: number;
  /**
   * The attribute to write. `data-fade` (default) also fades that edge out
   * (index.css, "Scroll fades"); any other name only reports the state, for
   * styles of your own — the dialog's `data-scroll` draws its header and
   * footer rules from it.
   */
  attribute?: string;
}

/**
 * Keeps `data-fade` on a scroller in step with where it is scrolled, so the
 * edge that has more content past it fades out (styles in index.css, "Scroll
 * fades"). Without it a menu or a table cut at the edge of its box looked like
 * the end of the list. The value names the edges with more content: "top",
 * "bottom", "top bottom" (or left/right for `x`); no attribute when it all fits.
 *
 *   const ref = useRef<HTMLElement>(null);
 *   useScrollFade(ref, "y");
 *   <nav ref={ref} className="overflow-y-auto">…</nav>
 *
 * Pass the element itself (from a callback ref / state) instead of a ref
 * object when it mounts later than the component — a dialog's content only
 * exists while it is open, and a ref object is read once.
 *
 * Written straight to the element (no re-render on every scroll). Watches
 * the scroller's size and its content's size, so rows loading in or a
 * window resize update it too.
 */
export function useScrollFade(
  target: RefObject<HTMLElement | null> | HTMLElement | null,
  axis: "x" | "y",
  options: boolean | ScrollFadeOptions = true,
) {
  const { enabled = true, slack = 1, attribute = "data-fade" } =
    typeof options === "boolean" ? { enabled: options } : options;

  useEffect(() => {
    const el = target && "current" in target ? target.current : target;
    if (!el || !enabled) return;

    const update = () => {
      const [pos, size, full] =
        axis === "y" ? [el.scrollTop, el.clientHeight, el.scrollHeight] : [el.scrollLeft, el.clientWidth, el.scrollWidth];
      const before = pos > slack;
      const after = full - size - pos > slack;
      const [a, b] = axis === "y" ? ["top", "bottom"] : ["left", "right"];
      const value = [before && a, after && b].filter(Boolean).join(" ");
      if (value) el.setAttribute(attribute, value);
      else el.removeAttribute(attribute);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    for (const child of Array.from(el.children)) ro?.observe(child);
    return () => {
      el.removeEventListener("scroll", update);
      ro?.disconnect();
      el.removeAttribute(attribute);
    };
  }, [target, axis, enabled, slack, attribute]);
}
