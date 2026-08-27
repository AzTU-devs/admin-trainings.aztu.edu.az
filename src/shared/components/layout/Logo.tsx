import { cn } from "@shared/lib/cn";

/**
 * The AzTU portal lockup. Uses the purpose-built SVG mark (navy shield, gold
 * device) which reads correctly on both light and dark surfaces — unlike the
 * raster mark, which is a navy glyph baked onto an opaque white canvas and
 * therefore turns into a solid block under any invert/brightness filter.
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
      <img
        src="/images/logo/logo-icon.svg"
        alt=""
        width={36}
        height={36}
        className="size-9 shrink-0"
      />
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
