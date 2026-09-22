import { useId } from "react";
import { Card } from "@shared/components/ui/Card";
import { cn } from "@shared/lib/cn";

interface FormCardProps {
  /** A lucide icon element; it sits in a navy-tint tile beside the title. */
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  /**
   * Lay the children out on the two-column field grid (the default), or leave
   * them as a single block (pickers, the roster editor).
   */
  grid?: boolean;
  /** Anything that belongs under the fields — a card-level save row. */
  footer?: React.ReactNode;
  className?: string;
}

/**
 * One section of the course editor as its own rounded card: an icon tile, the
 * title in Albert Sans and the fields on a two-column grid. The editor used to
 * be one long card with small headings; separate cards make each part easy to
 * find on a long form, the way the website breaks a course page into blocks.
 */
export function FormCard({ icon, title, description, children, grid = true, footer, className }: FormCardProps) {
  const titleId = useId();
  return (
    <Card className={cn("scroll-mt-24", className)}>
      <section aria-labelledby={titleId}>
        <header
          className={cn(
            "flex gap-3.5 px-5 pt-5 sm:px-7 sm:pt-6",
            // A lone title sits on the tile's centre line; with a description
            // under it, the title lines up with the tile's top instead.
            description ? "items-start" : "items-center",
          )}
        >
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-navy-tint text-navy [&_svg]:size-[18px]"
          >
            {icon}
          </span>
          <div className={cn("min-w-0", description && "pt-0.5")}>
            <h2
              id={titleId}
              className="font-display text-[19px] font-bold leading-tight tracking-[-0.018em] text-ink"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-ink-3">{description}</p>
            )}
          </div>
        </header>
        <div
          className={cn(
            "px-5 pb-5 pt-5 sm:px-7 sm:pb-7",
            grid && "grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2",
          )}
        >
          {children}
        </div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-5 py-4 sm:px-7">
            {footer}
          </div>
        )}
      </section>
    </Card>
  );
}
