import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@shared/lib/cn";

interface Props {
  title: string;
  description?: string;
  Icon?: LucideIcon;
  action?: React.ReactNode;
  /**
   * "danger" / "warning" tint the icon tile, for a query that failed or a
   * service that is down. Neutral by default.
   */
  tone?: "neutral" | "danger" | "warning";
  className?: string;
}

const TILE: Record<NonNullable<Props["tone"]>, string> = {
  neutral: "bg-surface text-ink-3 shadow-[0_0_0_1px_var(--line)]",
  danger: "bg-danger-tint text-danger",
  warning: "bg-warn-tint text-warn",
};

/**
 * A quiet well for "nothing here" and "could not load": an icon tile, one
 * bold line, one helpful line and an optional action — on the paper-2 tone,
 * never a dashed box. For a one-line version inside a section, use
 * <SoftEmpty> from @shared/components/bright.
 */
export function EmptyState({ title, description, Icon = Inbox, action, tone = "neutral", className }: Props) {
  return (
    <div className={cn("rounded-2xl bg-paper-2 px-6 py-10 text-center", className)}>
      <div className={cn("mx-auto mb-4 grid size-14 place-items-center rounded-[18px]", TILE[tone])}>
        <Icon className="size-6" />
      </div>
      <h3 className="font-display text-[17px] font-bold tracking-[-0.012em] text-ink">{title}</h3>
      {description && <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-2">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
