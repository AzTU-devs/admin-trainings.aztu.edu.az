import { useNavigate } from "react-router";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@shared/components/ui/Card";
import type { HueClass } from "@shared/lib/categoryStyle";
import { cn } from "@shared/lib/cn";

export interface QuickAction {
  label: string;
  to: string;
  Icon: LucideIcon;
  /** The colour family of the section it opens, so an action matches its stat card. */
  hue: HueClass;
}

/**
 * "Quick actions" as tile rows: a hue icon tile, the label, and the round
 * arrow the website's category tiles use for "go". Each row stays a button
 * that navigates, exactly as before — only the look changed.
 *
 * From sm up the rows pair into two columns: the card is wide there (a full
 * row, or three fifths of it from xl), and two rows of two keep it about as
 * short as the activity card beside it.
 */
export function QuickActionsCard({ actions, className }: { actions: QuickAction[]; className?: string }) {
  const navigate = useNavigate();

  return (
    <Card className={cn("flex flex-col", className)}>
      <header className="p-6 pb-2">
        <h2 className="t-md">Quick actions</h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">Common tasks</p>
      </header>

      <ul className="grid gap-1 px-3 pb-3 pt-2 sm:grid-cols-2">
        {actions.map(({ label, to, Icon, hue }) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => navigate(to)}
              className="group flex min-h-[60px] w-full items-center gap-3.5 rounded-[18px] p-2 pr-3 text-left transition-colors duration-200 hover:bg-paper-2"
            >
              <span
                aria-hidden
                className={cn("grid size-11 shrink-0 place-items-center rounded-[14px] bg-k-100 text-k-700", hue)}
              >
                <Icon className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1 text-[14.5px] font-semibold leading-snug text-ink">{label}</span>
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-full text-ink-3 shadow-[inset_0_0_0_1px_var(--line)] transition-colors duration-200 group-hover:bg-navy group-hover:text-on-navy group-hover:shadow-none"
              >
                <ArrowUpRight className="size-4" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
