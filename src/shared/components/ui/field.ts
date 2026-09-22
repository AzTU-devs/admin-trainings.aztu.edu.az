import { cn } from "@shared/lib/cn";

/**
 * `field` is a form control (14px radius). `search` is a search box: a pill,
 * like the header search and the website's catalogue search — every toolbar
 * and filter search takes it, so one screen never shows both shapes.
 */
export type FieldShape = "field" | "search";

/**
 * The Bright field recipe shared by Input, Textarea and SelectTrigger: surface
 * fill, 14px radius (a pill for `search`), a --control-line edge that darkens
 * on hover, and a 3px focus ring in --focus. The tokens swap with the theme,
 * so there are no `dark:` variants. Height and padding are left to each
 * control.
 *
 * The edge is --control-line, not the decorative --line-2: an empty field has
 * to be findable (WCAG 1.4.11, 3:1 against the surface; line-2 was ~1.6:1).
 *
 * Placeholders: in a labelled field they are --ink-4, lighter than ink-3, so
 * an example value ("••••••••", "+994…") does not read as something already
 * filled in. A search box has no visible label — its placeholder is the only
 * text saying what it searches — so it takes ink-3 (AA) instead.
 *
 * Text is 16px on phones: iOS Safari zooms the page into any field set
 * smaller than that when it takes focus, and stays zoomed after. 14px from sm.
 */
export function fieldClasses(invalid?: boolean, shape: FieldShape = "field"): string {
  return cn(
    "w-full border bg-surface text-base text-ink sm:text-sm",
    shape === "search" ? "rounded-full placeholder:text-ink-3" : "rounded-xl placeholder:text-ink-4",
    "transition-[border-color,box-shadow] duration-200",
    "focus:outline-none focus:ring-[3px]",
    "disabled:cursor-not-allowed disabled:bg-paper-2 disabled:opacity-70",
    invalid
      ? "border-danger focus:border-danger focus:ring-danger/20"
      : "border-control-line hover:border-ink-3 focus:border-focus focus:ring-focus/25",
  );
}
