import { cn } from "@shared/lib/cn";

/**
 * The AzTU portal lockup, set like the public website's brand block: the
 * shield, then the two-line wordmark — the product name in Albert Sans over
 * the university line in small gold caps. The words are the same as before
 * ("AzTU Portal" / "Az. Technical Uni."); only their setting is new.
 *
 * Two shield files, both the university's own mark trimmed to the glyph and
 * put on transparency: navy for light surfaces, white for dark. The supplied
 * source art is dark-on-white with an opaque background, so it cannot be
 * tinted with a filter — an inverted copy turns the whole plate into a solid
 * block. Both are rendered and one is hidden by the `dark` class, so the
 * correct mark is on screen at first paint with no JavaScript involved.
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
      <span className="relative block h-[34px] w-[18px] shrink-0">
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
        <span aria-hidden className="flex flex-col leading-none">
          <span className="font-display text-[17px] font-extrabold tracking-[-0.02em] text-ink">
            AzTU Portal
          </span>
          <span className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-gold-ink">
            Az. Technical Uni.
          </span>
        </span>
      )}
      <span className="sr-only">AzTU Portal</span>
    </span>
  );
}
