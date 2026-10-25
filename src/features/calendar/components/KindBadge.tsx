import { cn } from "@shared/lib/cn";
import { KIND_META, KIND_ORDER, kindColors } from "@features/calendar/lib/calendarEvents";
import type { CalendarEventKind } from "@features/calendar/types";

/** A kind's colour as a small round swatch (the colours live in calendar.css). */
export function KindSwatch({
  kind,
  pending,
  className,
}: {
  kind: CalendarEventKind;
  pending?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full",
        pending && "cal-swatch--pending",
        className,
      )}
      style={pending ? undefined : { background: kindColors(kind).color }}
    />
  );
}

/** The kind as a quiet pill with its swatch — the dialog's first line. */
export function KindBadge({ kind }: { kind: CalendarEventKind }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-ink/6 px-2.5 text-[12px] font-semibold leading-none text-ink-2">
      <KindSwatch kind={kind} />
      {KIND_META[kind]?.label ?? kind}
    </span>
  );
}

/** What each colour means, plus the pattern a booking awaiting a decision gets. */
export function CalendarLegend({ className }: { className?: string }) {
  return (
    <ul
      aria-label="Legend"
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-ink-2",
        className,
      )}
    >
      {KIND_ORDER.map((kind) => (
        <li key={kind} className="inline-flex items-center gap-1.5">
          <KindSwatch kind={kind} />
          {KIND_META[kind].label}
        </li>
      ))}
      <li className="inline-flex items-center gap-1.5">
        <KindSwatch kind="ROOM_BOOKING" pending />
        Pending booking
      </li>
    </ul>
  );
}
