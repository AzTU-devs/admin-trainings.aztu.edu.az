import { cn } from "@shared/lib/cn";

/**
 * How many things wait behind a menu item or a tab (sign-ups to approve,
 * enrolment requests to decide): the gold pill of the menu's badges, 99+ past
 * that, and nothing at zero or while the number is unknown.
 */
export function CountPill({ count, className }: { count: number | undefined; className?: string }) {
  if (!count || count <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-gold-tint px-2 text-[10.5px] font-semibold leading-none tabular-nums text-gold-ink",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
