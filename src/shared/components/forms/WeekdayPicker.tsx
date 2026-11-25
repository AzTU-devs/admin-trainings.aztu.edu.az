import { cn } from "@shared/lib/cn";
import { DAYS_OF_WEEK, DAY_LABEL, sortDays, type DayOfWeek } from "@shared/lib/weekdays";

/**
 * The seven weekdays as toggle buttons, Monday first (the Azerbaijani week).
 * A picked day takes the navy wash and ring of a selected chip (`.chip.on`,
 * the moderation queue's open item); the rest are secondary pills. One row of
 * seven equal cells, so the week reads as a week even on a phone.
 *
 * Shared by the long-term room booking (the days it repeats on) and the
 * offline course form (the days the course meets).
 */
export function WeekdayPicker({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  label = "Weekdays",
  describedBy,
}: {
  id?: string;
  value: readonly string[];
  onChange: (days: DayOfWeek[]) => void;
  onBlur?: () => void;
  invalid?: boolean;
  /** The group's name for a screen reader. */
  label?: string;
  /** The id of the hint or error under the picker. */
  describedBy?: string;
}) {
  const toggle = (day: DayOfWeek) =>
    onChange(value.includes(day) ? sortDays(value.filter((d) => d !== day)) : sortDays([...value, day]));

  return (
    <div
      id={id}
      role="group"
      aria-label={label}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className="grid grid-cols-7 gap-1.5"
      onBlur={(e) => {
        // Touched once focus leaves the whole row, not on each button.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onBlur?.();
      }}
    >
      {DAYS_OF_WEEK.map((day) => {
        const on = value.includes(day);
        return (
          <button
            key={day}
            type="button"
            aria-pressed={on}
            aria-label={DAY_LABEL[day].long}
            onClick={() => toggle(day)}
            className={cn(
              "inline-flex h-10 min-w-0 items-center justify-center rounded-full text-[13px] font-semibold transition-[background-color,color,box-shadow] duration-200",
              on
                ? "bg-navy-tint text-navy shadow-[inset_0_0_0_1.5px_var(--navy)]"
                : cn(
                    "bg-surface text-ink-2 hover:text-ink",
                    invalid
                      ? "shadow-[inset_0_0_0_1px_var(--danger)]"
                      : "shadow-[inset_0_0_0_1px_var(--line-2)] hover:shadow-[inset_0_0_0_1px_var(--ink-3)]",
                  ),
            )}
          >
            {DAY_LABEL[day].short}
          </button>
        );
      })}
    </div>
  );
}
