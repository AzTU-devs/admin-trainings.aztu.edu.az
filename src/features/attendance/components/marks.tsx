import { Check, CircleSlash, Clock, X, type LucideIcon } from "lucide-react";
import { Badge } from "@shared/components/ui/Badge";
import { cn } from "@shared/lib/cn";
import { MARK_LABEL } from "@features/attendance/lib/attendance";
import { ATTENDANCE_MARKS, type AttendanceMark, type AttendanceStatus } from "@features/attendance/types";

/** Each mark has an icon as well as a colour, so the colour is never the only signal. */
const MARK_ICON: Record<AttendanceStatus, LucideIcon> = {
  PRESENT: Check,
  LATE: Clock,
  ABSENT: X,
  EXCUSED: CircleSlash,
};

const MARK_TONE = {
  PRESENT: "success",
  LATE: "warning",
  ABSENT: "danger",
  EXCUSED: "neutral",
} as const satisfies Record<AttendanceStatus, string>;

/** The picker's option once chosen: the mark's tint, like its badge. */
const CHOSEN: Record<AttendanceMark, string> = {
  PRESENT: "bg-ok-tint text-ok shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--ok)_40%,transparent)]",
  LATE: "bg-warn-tint text-warn shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--warn)_40%,transparent)]",
  ABSENT: "bg-danger-tint text-danger shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--danger)_40%,transparent)]",
};

/** The icon's tone in a count, as in the mark's badge. */
const COUNT_TONE: Record<AttendanceStatus, string> = {
  PRESENT: "text-ok",
  LATE: "text-warn",
  ABSENT: "text-danger",
  EXCUSED: "text-ink-3",
};

/**
 * How many students had a mark, after the mark's icon: the shape tells the
 * counts apart without the colour, and it is the shape the badges and pickers
 * show beside the word. The caller says the words for a screen reader.
 */
export function MarkCount({ status, value, className }: { status: AttendanceStatus; value: number; className?: string }) {
  const Icon = MARK_ICON[status];
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Icon aria-hidden className={cn("size-3.5", COUNT_TONE[status])} />
      {value}
    </span>
  );
}

/** A saved mark as a pill: Joined (green), Late (amber), Absent (red). */
export function MarkBadge({ status, className }: { status: AttendanceStatus; className?: string }) {
  const Icon = MARK_ICON[status] ?? CircleSlash;
  return (
    <Badge tone={MARK_TONE[status] ?? "neutral"} className={className}>
      <Icon aria-hidden className="size-3.5" />
      {MARK_LABEL[status] ?? status}
    </Badge>
  );
}

interface PickerProps {
  /** The radio group's name: one per student, so arrow keys move within a student's row. */
  name: string;
  /** What the group is for, said by screen readers ("Mark for Leyla Məmmədova"). */
  label: string;
  value: AttendanceMark | undefined;
  onChange: (mark: AttendanceMark) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Joined / Late / Absent as the segmented control (`.seg`): real radio
 * buttons under the pills, so a row is one tab stop and the arrow keys choose,
 * as in any radio group. Nothing is chosen until someone chooses.
 */
export function MarkPicker({ name, label, value, onChange, disabled, className }: PickerProps) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("seg flex-nowrap", className)}>
      {ATTENDANCE_MARKS.map((mark) => {
        const Icon = MARK_ICON[mark];
        const checked = value === mark;
        return (
          <label
            key={mark}
            className={cn(
              "inline-flex h-[34px] flex-none cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13.5px] font-semibold text-ink-2 transition-[background-color,color,box-shadow] duration-200 hover:text-ink sm:px-3.5",
              // The radio itself is visually hidden, so its focus ring is drawn on the pill.
              "has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-solid",
              checked && CHOSEN[mark],
              disabled && "cursor-not-allowed opacity-55",
            )}
          >
            <input
              type="radio"
              name={name}
              value={mark}
              checked={checked}
              disabled={disabled}
              onChange={() => onChange(mark)}
              className="sr-only"
            />
            <Icon aria-hidden className="size-4" />
            {MARK_LABEL[mark]}
          </label>
        );
      })}
    </div>
  );
}
