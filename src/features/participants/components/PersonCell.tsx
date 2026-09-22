import { Avatar, AvatarFallback, AvatarImage } from "@shared/components/ui/Avatar";

/**
 * The first cell of a people table (course participants, a tutor's students):
 * a round avatar — the photo, or the person's initials on their hue field —
 * with the name over the email.
 *
 * The colour comes from the name (AvatarFallback's default), so a person is
 * the same colour here as in the users table and the header menu. The text
 * block is capped so a long SMOKE-* name or address truncates instead of
 * pushing the other columns off the card; the full value stays in `title`.
 */
export function PersonCell({
  name,
  email,
  avatarUrl,
}: {
  name: string;
  email: string;
  avatarUrl?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar size="md">
        <AvatarImage src={avatarUrl} alt="" />
        <AvatarFallback name={name} />
      </Avatar>
      <div className="min-w-0 max-w-[15rem] sm:max-w-[22rem]">
        <p className="truncate font-semibold text-ink" title={name}>
          {name}
        </p>
        <p className="mt-0.5 truncate text-[12.5px] text-ink-3" title={email}>
          {email}
        </p>
      </div>
    </div>
  );
}

/**
 * A percentage as the website's progress bar with the number beside it.
 * Clamped to 0–100 for the bar only; the number shows what the API sent.
 */
export function ProgressCell({ value }: { value: number }) {
  const width = Math.min(100, Math.max(0, value));
  return (
    <div className="flex min-w-[150px] items-center gap-3">
      <div className="hbar h-2 flex-1" aria-hidden>
        <i style={{ width: `${width}%` }} />
      </div>
      <span className="w-10 text-right text-[12.5px] font-semibold tabular-nums text-ink">{value}%</span>
    </div>
  );
}

/**
 * A progress bar with its column name in front, for the stacked phone row
 * where the column header is hidden.
 */
export function StackedProgress({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-[12.5px] text-ink-3">{label}</span>
      <div className="min-w-0 flex-1">
        <ProgressCell value={value} />
      </div>
    </div>
  );
}

/** A date cell: day, month and year in the viewer's locale, or a dash. */
export function DateCell({ value }: { value?: string | null }) {
  if (!value) return <span className="text-ink-3">—</span>;
  return <span className="whitespace-nowrap tabular-nums text-ink-2">{new Date(value).toLocaleDateString()}</span>;
}
