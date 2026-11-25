import { useState, type Ref } from "react";
import { CalendarCheck, CalendarClock, CalendarPlus, CalendarX2, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@shared/components/ui/Badge";
import { Button } from "@shared/components/ui/Button";
import { Card } from "@shared/components/ui/Card";
import { Input } from "@shared/components/ui/Input";
import { Label } from "@shared/components/ui/Label";
import { dayOfWeekOfDate, formatDays } from "@shared/lib/weekdays";
import {
  formatDay,
  isIsoDay,
  lastMarkableDay,
  shiftDay,
} from "@features/attendance/lib/attendance";

interface Props {
  /** The day shown. */
  date: string;
  firstDate: string;
  lastDate: string;
  /** Today in Baku. */
  today: string;
  onPick: (date: string) => void;
  /** The weekdays the course meets (from the register); empty or absent when it has none set. */
  daysOfWeek?: readonly string[];
  /** The day's heading, focused when a day is opened from the register. */
  headingRef?: Ref<HTMLHeadingElement>;
  /** The date box, focused to open a day the register does not list. */
  dateBoxRef?: Ref<HTMLInputElement>;
}

/**
 * Which day the list below is for: the day, the course's span, and a date
 * box with previous / next / today. Days can be picked from the course's
 * first day up to its last day or today, whichever comes first — the days the
 * API takes marks for, a make-up session on another weekday included. The
 * days already marked are opened from the register above, wherever they fall:
 * a course's dates can move after marks were saved, and those marks must stay
 * within reach (a super admin may correct them).
 */
export function AttendanceDayCard({ date, firstDate, lastDate, today, onPick, daysOfWeek, headingRef, dateBoxRef }: Props) {
  const oneDay = firstDate === lastDate;
  const upcoming = today < firstDate;
  // Before the course starts there is nothing to mark, but its first day can still be looked at.
  const lastDay = upcoming ? firstDate : lastMarkableDay(lastDate, today);
  const pickable = (d: string) => d >= firstDate && d <= lastDay;
  const outside = date < firstDate || date > lastDate;
  // Within the course's dates but not on one of its weekdays: allowed, as a make-up session.
  const weekday = dayOfWeekOfDate(date);
  const extraDay = !outside && !oneDay && !!daysOfWeek?.length && !!weekday && !daysOfWeek.includes(weekday);

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
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-display text-[20px] font-bold leading-tight tracking-[-0.018em] text-ink focus:outline-none"
            >
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
                : `The course runs ${formatDay(firstDate)} – ${formatDay(lastDate)}.`}
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
                  ref={dateBoxRef}
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

      {extraDay && (
        <div className="note mt-4">
          <CalendarPlus aria-hidden />
          <p>
            Not one of the course&rsquo;s days ({formatDays(daysOfWeek)}): marks on it are for a make-up session.
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
    </Card>
  );
}
