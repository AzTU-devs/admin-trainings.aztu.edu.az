import { cn } from "@shared/lib/cn";

/**
 * The AzTU portal lockup.
 *
 * Two files, both the university's own mark trimmed to the glyph and put on
 * transparency: navy for light surfaces, white for dark. The supplied source
 * art is dark-on-white with an opaque background, so it cannot be tinted with a
 * filter — an inverted copy turns the whole plate into a solid block.
 *
 * Both are rendered and one is hidden by the `dark` class, so the correct mark
 * is on screen at first paint with no JavaScript involved.
 */
export function Logo({
  showText = true,
  className,
}: {
  showText?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative block h-9 w-[19px] shrink-0">
        <img
          src="/images/logo/aztu-mark.png"
          alt="AzTU"
          className="absolute inset-0 size-full object-contain dark:hidden"
        />
        <img
          src="/images/logo/aztu-mark-white.png"
          alt=""
          aria-hidden
          className="absolute inset-0 hidden size-full object-contain dark:block"
        />
      </span>
      {showText && (
        <span className="leading-tight">
          <span className="block text-sm font-bold text-brand-700 dark:text-white">
            AzTU Portal
          </span>
          <span className="block text-[9px] uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
            Az. Technical Uni.
          </span>
        </span>
      )}
      <span className="sr-only">AzTU Portal</span>
    </span>
  );
}
