import { cn } from "@shared/lib/cn";

/**
 * A compact "nothing here yet" row for inside a card or a page section: an
 * icon tile, one bold line, one helpful line, and an optional action on the
 * right. Never a big empty dashed box.
 */
export function SoftEmpty({
  icon,
  title,
  hint,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("soft-empty", className)}>
      <span className="icon-tile [&_svg]:size-5" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{title}</p>
        {hint ? <p className="mt-0.5 text-sm text-ink-2">{hint}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
