import { Users } from "lucide-react";

/** A room's capacity as a quiet neutral pill: people icon + the number. */
export function CapacityPill({ capacity }: { capacity: number }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-ink/6 px-2.5 text-[12.5px] font-semibold text-ink tabular-nums">
      <Users className="size-3.5 text-ink-3" aria-hidden />
      {capacity}
    </span>
  );
}
