import { useMemo, useState } from "react";
import { AlertTriangle, CalendarRange, CalendarX } from "lucide-react";
import { Button } from "@shared/components/ui/Button";
import { Notice } from "@features/user-profile/components/ProfileBits";
import { formatAmount } from "@features/rooms/lib/money";
import {
  MAX_SERIES_OCCURRENCES,
  formatDays,
  formatHours,
  formatLocalDate,
  formatTimeRange,
  occurrenceDates,
  sessionHours,
  zonedInstant,
} from "@features/room-requests/lib/series";

/** Dates shown before the list folds behind "Show all". */
export const PREVIEW_COLLAPSED = 10;

export interface SeriesPreviewPattern {
  startDate: string;
  endDate: string;
  daysOfWeek: readonly string[];
  startTime: string;
  endTime: string;
}

/**
 * What a long-term pattern produces, live as the form is filled: the number of
 * sessions, the first and last date, the hours, and the dates themselves
 * (folded after ten). Computed the way the API expands a series, so what is
 * shown is what will be requested; the API's limits (200 sessions, a first
 * session in the future) are flagged here before the request is sent.
 *
 * The fee is an estimate at the room's flat rate: the API prices each session
 * with the room's pricing rules, which may differ by day or hour.
 */
export function SeriesPreview({
  pattern,
  hourlyRate,
  currency,
}: {
  pattern: SeriesPreviewPattern;
  hourlyRate?: number;
  currency?: string;
}) {
  const { startDate, endDate, daysOfWeek, startTime, endTime } = pattern;
  const [expanded, setExpanded] = useState(false);
  const dates = useMemo(
    () => (daysOfWeek.length ? occurrenceDates({ startDate, endDate, daysOfWeek }) : null),
    [startDate, endDate, daysOfWeek],
  );
  const hours = sessionHours(startTime, endTime);

  if (!dates) {
    return (
      <div className="flex gap-3 rounded-[18px] bg-paper-2 p-4 text-sm leading-relaxed text-ink-3">
        <CalendarRange aria-hidden className="mt-0.5 size-[18px] shrink-0" />
        <p>Pick the dates and weekdays to see every session this booking makes.</p>
      </div>
    );
  }

  const count = dates.length;
  const tooMany = count > MAX_SERIES_OCCURRENCES;
  const first = count ? zonedInstant(dates[0], startTime) : null;
  const pastStart = !tooMany && first !== null && first.getTime() <= Date.now();
  const shown = expanded ? dates : dates.slice(0, PREVIEW_COLLAPSED);
  const totalHours = hours !== null ? hours * count : null;
  const fee = totalHours !== null && hourlyRate ? hourlyRate * totalHours : null;

  return (
    <div className="space-y-3">
      <section aria-label="Sessions preview" className="rounded-[18px] bg-paper-2 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          {/* Announced as it changes, so a screen-reader user hears the count follow their edits. */}
          <div aria-live="polite" className="min-w-0">
            <p className="font-display text-[22px] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums">
              {count}{" "}
              <span className="ml-0.5 font-sans text-[14px] font-semibold tracking-normal text-ink-2">
                {count === 1 ? "session" : "sessions"}
              </span>
            </p>
            {count > 0 && (
              <p className="mt-2 text-[13px] leading-snug text-ink-3">
                {count === 1 ? (
                  <>On {formatLocalDate(dates[0])}</>
                ) : (
                  <>
                    First <span className="font-medium text-ink-2">{formatLocalDate(dates[0])}</span>, last{" "}
                    <span className="font-medium text-ink-2">{formatLocalDate(dates[count - 1])}</span>
                  </>
                )}
              </p>
            )}
          </div>
          {count > 0 && hours !== null && totalHours !== null && (
            <div className="text-right leading-tight">
              <p className="font-semibold text-ink tabular-nums">{formatHours(totalHours)}</p>
              <p className="mt-1 text-[12.5px] text-ink-3">{formatHours(hours)} each</p>
            </div>
          )}
        </div>

        {count > 0 && (
          <>
            <p className="mt-3 text-[13px] text-ink-2">
              {formatDays(daysOfWeek)}
              {hours !== null && (
                <>
                  {" · "}
                  <span className="tabular-nums">{formatTimeRange(startTime, endTime)}</span>{" "}
                  <span className="text-ink-3">Baku time</span>
                </>
              )}
            </p>
            <ol aria-label="Session dates" className="mt-3 flex flex-wrap gap-1.5">
              {shown.map((d) => (
                <li
                  key={d}
                  className="inline-flex h-7 items-center rounded-full bg-surface px-2.5 text-[12.5px] font-medium text-ink-2 shadow-[inset_0_0_0_1px_var(--line)] tabular-nums"
                >
                  {formatLocalDate(d, { weekday: "short", month: "short", day: "numeric" })}
                </li>
              ))}
            </ol>
            {count > PREVIEW_COLLAPSED && (
              <Button
                type="button"
                variant="link"
                className="mt-2.5 text-[13px]"
                aria-expanded={expanded}
                onClick={() => setExpanded((x) => !x)}
              >
                {expanded ? "Show fewer" : `Show all ${count} dates`}
              </Button>
            )}
            {fee !== null && !tooMany && (
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
                About{" "}
                <span className="font-semibold text-ink tabular-nums">
                  {formatAmount(fee)} {currency}
                </span>{" "}
                at the room's base rate; the final fee follows the room's pricing.
              </p>
            )}
          </>
        )}
      </section>

      {count === 0 && (
        <Notice tone="warning" Icon={CalendarX} title="No sessions in this period">
          None of the chosen weekdays falls between these dates.
        </Notice>
      )}
      {tooMany && (
        <Notice tone="danger" Icon={AlertTriangle} title={`${count} sessions is over the limit of ${MAX_SERIES_OCCURRENCES}`}>
          Shorten the period or pick fewer weekdays; a request this long is refused.
        </Notice>
      )}
      {pastStart && (
        <Notice tone="warning" Icon={AlertTriangle} title="The first session has already started">
          Pick a later start date or time; every session must be in the future.
        </Notice>
      )}
    </div>
  );
}
