import { cn } from "@shared/lib/cn";

/**
 * The AzTU portal lockup: the university's stacked logo (the shield on its
 * square plate over the "AZTU" wordmark), then the product name. The logo
 * already says "AZTU", so the name beside it is just "Portal"; the full
 * "AzTU Portal" is still the accessible name.
 *
 * Two files, resized from the university's originals to 93 × 128 (twice the
 * tallest size drawn here): aztu-logo-dark.png — navy plate and wordmark —
 * for light surfaces, aztu-logo-light.png — white — for dark ones. Both are
 * rendered and one is hidden by the `dark` class, so the correct one is on
 * screen at first paint with no JavaScript involved.
 *
 * The lockup is portrait, so its height sets the size: 40px fits the 60px
 * header and the sidebar, `size="lg"` (56px) is the sign-in panel's.
 */
export function Logo({
  showText = true,
  size = "md",
  className,
}: {
  showText?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  const img = cn("w-auto shrink-0", size === "lg" ? "h-14" : "h-10");
  return (
    <span className={cn("inline-flex items-center", size === "lg" ? "gap-3.5" : "gap-3", className)}>
      <img src="/images/logo/aztu-logo-dark.png" alt="" width={93} height={128} className={cn(img, "dark:hidden")} />
      <img
        src="/images/logo/aztu-logo-light.png"
        alt=""
        width={93}
        height={128}
        className={cn(img, "hidden dark:block")}
      />
      {showText && (
        <span
          aria-hidden
          className={cn(
            "font-display font-extrabold leading-none tracking-[-0.02em] text-ink",
            size === "lg" ? "text-[22px]" : "text-[19px]",
          )}
        >
          Portal
        </span>
      )}
      <span className="sr-only">AzTU Portal</span>
    </span>
  );
}
