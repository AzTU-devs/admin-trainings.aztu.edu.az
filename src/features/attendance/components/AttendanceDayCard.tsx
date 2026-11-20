import { useState } from "react";
import { CalendarCheck, CalendarClock, CalendarX2, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@shared/components/ui/Badge";
import { Button } from "@shared/components/ui/Button";
import { Card } from "@shared/components/ui/Card";
import { Input } from "@shared/components/ui/Input";
import { Label } from "@shared/components/ui/Label";
import { cn } from "@shared/lib/cn";
import { MarkCount } from "@features/attendance/components/marks";
import {
  formatDay,
  isIsoDay,
  lastMarkableDay,
  shiftDay,
} from "@features/attendance/lib/attendance";
import type { AttendanceDaySummary } from "@features/attendance/types";

interface Props {
  /** The day shown. */
  date: string;
  firstDate: string;
  lastDate: string;
  /** Today in Baku. */
  today: string;
  /** The days that have marks, newest first; undefined while they load. */
  days: AttendanceDaySummary[] | undefined;
  onPick: (date: string) => void;
}

/** How many marked days show before "Show all": a term of twice-weekly sessions runs past thirty. */
const DAYS_SHOWN = 12;

/**
 * Which course day the list below is for: the day, the course's span, a date
 * box with previous / next / today, and the days already marked to jump to.
 * Days can be picked from the course's first day up to its last day or today,
 * whichever comes first — the days the API takes marks for. A marked day
 * opens wherever it falls: a course's dates can move after marks were saved,
 * and those marks must stay within reach (a super admin may correct them).
 */
export function AttendanceDayCard({ date, firstDate, lastDate, today, days, onPick }: Props) {
  const oneDay = firstDate === lastDate;
  const upcoming = today < firstDate;
  // Before the course starts there is nothing to mark, but its first day can still be looked at.
  const lastDay = upcoming ? firstDate : lastMarkableDay(lastDate, today);
  const pickable = (d: string) => d >= firstDate && d <= lastDay;
  const outside = date < firstDate || date > lastDate;

  // What is typed in the date box. A date box reports partial dates while the
  // year is typed, so only a whole day in range moves the list; and whatever
  // else moves it (Today, the arrows, a marked day, the page itself) starts
  // the box afresh on the day shown.
  const [draft, setDraft] = useState(date);
  const [draftFor, setDraftFor] = useState(date);
  if (draftFor !== date) {
    setDraftFor(date);
    setDraft(date);
  }
  const typed = draftFor === date ? draft : date;
  const typedOutOfRange = typed !== date && !(isIsoDay(typed) && pickable(typed));

  const go = (next: string) => {
    if (next !== date) onPick(next);
  };
  const pick = (next: string) => {
    if (pickable(next)) go(next);
  };

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <span
            aria-hidden
            className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-navy-tint text-navy [&_svg]:size-5"
          >
            <CalendarCheck />
          </span>
          <div className="min-w-0">
            <h2 className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-display text-[20px] font-bold leading-tight tracking-[-0.018em] text-ink">
              {formatDay(date)}
              {date === today && (
                <Badge tone="brand" size="sm">
                  Today
                </Badge>
              )}
            </h2>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">
              {oneDay
                ? "A one-day course."
                : `Course days ${formatDay(firstDate)} – ${formatDay(lastDate)}.`}
            </p>
          </div>
        </div>

        {!oneDay && (
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label htmlFor="attendance-day">Day</Label>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label="Previous day"
                  disabled={date <= firstDate}
                  // From a marked day past the course's days, back into them.
                  onClick={() => pick(date > lastDay ? lastDay : shiftDay(date, -1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Input
                  id="attendance-day"
                  type="date"
                  min={firstDate}
                  max={lastDay}
                  value={typed}
                  invalid={typedOutOfRange}
                  aria-describedby={typedOutOfRange ? "attendance-day-range" : undefined}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDraft(value);
                    if (isIsoDay(value)) pick(value);
                  }}
                  className="w-[10.75rem]"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label="Next day"
                  disabled={date >= lastDay}
                  // From a marked day before the course's days, on to its first.
                  onClick={() => pick(date < firstDate ? firstDate : shiftDay(date, 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
            {pickable(today) && date !== today && (
              <Button type="button" size="md" variant="ghost" onClick={() => pick(today)}>
                Today
              </Button>
            )}
          </div>
        )}
      </div>

      {typedOutOfRange && (
        <p id="attendance-day-range" className="mt-2 text-[12.5px] font-medium text-danger lg:text-right">
          Pick a day from {formatDay(firstDate)} to {formatDay(lastDay)}.
        </p>
      )}

      {upcoming && (
        <div className="note mt-4">
          <CalendarClock aria-hidden />
          <p>
            The course hasn&rsquo;t started yet. Attendance can be taken from its first day, {formatDay(firstDate)}.
          </p>
        </div>
      )}

      {outside && (
        <div className="note mt-4">
          <CalendarX2 aria-hidden />
          <div className="min-w-0">
            <p>
              This day is outside the course&rsquo;s days, so no marks can be added to it. The marks saved on it stay;
              only a super admin can change or delete them.
            </p>
            {/* A one-day course has no date box or arrows to get back with. */}
            <Button type="button" variant="link" size="sm" className="mt-1" onClick={() => go(lastDay)}>
              Go to {formatDay(lastDay)}
            </Button>
          </div>
        </div>
      )}

      <MarkedDays days={days} selected={date} onPick={go} />
    </Card>
  );
}

function MarkedDays({
  days,
  selected,
  onPick,
}: {
  days: AttendanceDaySummary[] | undefined;
  selected: string;
  onPick: (date: string) => void;
}) {
  const [all, setAll] = useState(false);
  if (!days) return null;
  const shown = all ? days : days.slice(0, DAYS_SHOWN);

  return (
    <div className="mt-5 border-t border-line pt-4">
      <h3 className="text-[12.5px] font-semibold text-ink-3">Marked days</h3>
      {days.length === 0 ? (
        <p className="mt-1.5 text-[13.5px] text-ink-3">No marks saved yet.</p>
      ) : (
        <>
          <ul aria-label="Marked days" className="mt-2.5 flex flex-wrap gap-2">
            {shown.map((d) => {
              const current = d.date === selected;
              return (
                <li key={d.date}>
                  <button
                    type="button"
                    aria-current={current ? "date" : undefined}
                    onClick={() => onPick(d.date)}
                    className={cn(
                      "inline-flex h-9 items-center gap-2.5 rounded-full bg-surface pl-3.5 pr-3 text-[13px] font-semibold text-ink-2 transition-[background-color,box-shadow,color] duration-200",
                      "shadow-[inset_0_0_0_1px_var(--line-2)] hover:text-ink hover:shadow-[inset_0_0_0_1px_var(--ink-3)]",
                      current && "bg-navy-tint text-navy shadow-[inset_0_0_0_1.5px_color-mix(in_oklch,var(--navy)_55%,transparent)]",
                    )}
                  >
                    <span>{formatDay(d.date, "short")}</span>
                    {/* The counts after each mark's icon for the eye, and as words for a screen reader. */}
                    <span aria-hidden className="flex items-center gap-2 text-[12px] font-medium tabular-nums text-ink-3">
                      <MarkCount status="PRESENT" value={d.present} />
                      <MarkCount status="LATE" value={d.late} />
                      <MarkCount status="ABSENT" value={d.absent} />
                    </span>
                    <span className="sr-only">
                      : {d.present} joined, {d.late} late, {d.absent} absent
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {days.length > DAYS_SHOWN && (
            <Button type="button" variant="link" size="sm" className="mt-3" onClick={() => setAll((v) => !v)}>
              {all ? "Show fewer days" : `Show all ${days.length} days`}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
