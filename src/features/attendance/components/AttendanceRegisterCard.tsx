import { useEffect, useRef, useState } from "react";
import { CalendarPlus, FileSpreadsheet, RotateCw, Users } from "lucide-react";
import { toast } from "sonner";
import { SoftEmpty } from "@shared/components/bright";
import { Button } from "@shared/components/ui/Button";
import { Card } from "@shared/components/ui/Card";
import { Spinner } from "@shared/components/ui/Spinner";
import { resolveApiUrl } from "@shared/config/env";
import { cn } from "@shared/lib/cn";
import { useScrollFade } from "@shared/lib/useScrollFade";
import type { UUID } from "@shared/types/lms";
import type { NormalizedError } from "@lib/axios/httpClient";
import { TutorAvatar } from "@features/tutors/components/TutorAvatar";
import { useGetAttendanceRegisterQuery } from "@features/attendance/api/attendanceApi";
import { downloadAttendanceExport } from "@features/attendance/api/attendanceExport";
import { MarkCount } from "@features/attendance/components/marks";
import { MARK_LABEL, formatMarkedAt, studentName } from "@features/attendance/lib/attendance";
import {
  MARK_LETTER,
  attendanceRate,
  dayHeading,
  formatRate,
  hasExcused,
  markedOn,
  marksByDate,
  registerSummary,
  totalCounts,
  yearShown,
} from "@features/attendance/lib/register";
import type {
  AttendanceCounts,
  AttendanceRegister,
  AttendanceRegisterDay,
  AttendanceRegisterMark,
  AttendanceRegisterStudent,
  AttendanceStatus,
} from "@features/attendance/types";

interface Props {
  courseId: UUID;
  /** For the file name when the server's is not readable here. */
  courseSlug: string;
  /** Today in Baku, as the page shows it. */
  today: string;
  /** The day open in the roster under the table. */
  openDate: string;
  /** Opens a day in the roster: its header (or any of its cells) was chosen. */
  onOpenDay: (date: string) => void;
  /**
   * For those who may mark, on a course of more than one day: open a date the
   * table does not list yet (a make-up session, a course without days).
   */
  onOpenOtherDay?: () => void;
}

/** A mark's tint in a cell: its badge's colours, as a round letter. */
const CELL_TONE: Record<AttendanceStatus, string> = {
  PRESENT: "bg-ok-tint text-ok",
  LATE: "bg-warn-tint text-warn",
  ABSENT: "bg-danger-tint text-danger",
  EXCUSED: "bg-ink/6 text-ink-2",
};

/** The marks the legend explains, in the export's order. */
const LEGEND: AttendanceStatus[] = ["PRESENT", "LATE", "ABSENT", "EXCUSED"];

/*
 * The sticky parts of the table. Cells carry their own background (a sticky
 * cell is see-through otherwise) and the separate-borders model keeps each
 * hairline with its cell as it sticks. The name column casts a shadow only
 * once columns have slid under it (`data-scroll-x`, kept by useScrollFade).
 */
const STICKY_LEFT =
  "sticky left-0 bg-surface [[data-scroll-x~=left]_&]:shadow-[8px_0_12px_-10px_oklch(0.235_0.045_258/0.45)]";
const NAME_WIDTH = "w-[10.5rem] min-w-[10.5rem] max-w-[10.5rem] sm:w-[16rem] sm:min-w-[16rem] sm:max-w-[16rem]";

/**
 * The course's attendance as a register: a row per student, a column per
 * course day (and per other day with marks), each mark a coloured letter, the
 * totals at the end of each row and under each day. Choosing a day — its
 * header, or any cell under it — opens it in the roster below, where marks
 * are taken exactly as before. Wide registers scroll inside the card, with
 * the names and the header row kept in view; the page never scrolls sideways.
 */
export function AttendanceRegisterCard({ courseId, courseSlug, today, openDate, onOpenDay, onOpenOtherDay }: Props) {
  const { data: register, error, isFetching, refetch } = useGetAttendanceRegisterQuery(courseId);

  return (
    <Card aria-busy={isFetching || undefined} className="min-w-0 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <h2 className="font-display text-[17px] font-bold tracking-[-0.012em] text-ink">Register</h2>
          <p className="mt-0.5 text-[13px] text-ink-3">
            {register ? registerSummary(register) : "Every course day, every student."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onOpenOtherDay && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              leftIcon={<CalendarPlus className="size-4" />}
              onClick={onOpenOtherDay}
            >
              Open another day
            </Button>
          )}
          <ExportButton courseId={courseId} courseSlug={courseSlug} today={today} />
        </div>
      </div>

      {register ? (
        <RegisterBody register={register} today={today} openDate={openDate} onOpenDay={onOpenDay} refreshing={isFetching} />
      ) : error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 bg-danger-tint px-5 py-4 text-sm text-danger sm:px-6">
          {(error as NormalizedError).message || "Could not load the register."}
          <Button size="sm" variant="secondary" leftIcon={<RotateCw className="size-4" />} onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="flex justify-center py-12">
          <Spinner />
          <span className="sr-only">Loading the register…</span>
        </div>
      )}
    </Card>
  );
}

function RegisterBody({
  register,
  today,
  openDate,
  onOpenDay,
  refreshing,
}: {
  register: AttendanceRegister;
  today: string;
  openDate: string;
  onOpenDay: (date: string) => void;
  refreshing: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollFade(scrollRef, "x", { attribute: "data-scroll-x" });
  const excused = hasExcused(register);
  const days = register.days;

  // The open day's column is brought into view — on load (today's, on a long
  // course far to the right) and whenever another day is opened.
  useEffect(() => {
    const scroller = scrollRef.current;
    const column = scroller?.querySelector<HTMLElement>(`th[data-date="${openDate}"]`);
    if (!scroller || !column) return;
    const names = scroller.querySelector<HTMLElement>("thead th")?.offsetWidth ?? 0;
    const start = column.offsetLeft - names;
    const end = column.offsetLeft + column.offsetWidth;
    if (start < scroller.scrollLeft || end > scroller.scrollLeft + scroller.clientWidth) {
      // A couple of days before it stay in view, for context.
      scroller.scrollLeft = Math.max(0, start - column.offsetWidth * 2);
    }
  }, [openDate, days]);

  if (register.students.length === 0) {
    return (
      <div className="p-5 sm:p-6">
        <SoftEmpty icon={<Users />} title="No students on this course yet." hint="Enrolled İştirakçilər appear here." />
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="p-5 sm:p-6">
        <SoftEmpty
          icon={<CalendarPlus />}
          title="No days to show yet."
          hint="This course has no course days set and nothing is marked. A day opened below and marked appears here."
        />
      </div>
    );
  }

  const withYear = yearShown(days);
  const totals = totalCounts(register);
  // A course without days has only its marked days, all "not a course day":
  // tagging every one of them would say nothing.
  const tagExtra = register.courseType === "ONE_TIME" || register.daysOfWeek?.length > 0;

  return (
    <>
      <Legend excused={excused} extra={tagExtra && days.some((d) => !d.courseDay)} />
      <div className="relative">
        <div
          ref={scrollRef}
          className={cn(
            "custom-scrollbar max-h-[min(72vh,44rem)] overflow-auto overscroll-x-contain transition-opacity",
            refreshing && "opacity-75",
          )}
        >
          <table className="border-separate border-spacing-0 text-[13px] tabular-nums">
            <caption className="sr-only">
              Attendance register: a row per student, a column per day. Choose a day to open it below.
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className={cn(
                    STICKY_LEFT,
                    NAME_WIDTH,
                    "top-0 z-30 border-b border-line px-4 py-2 text-left align-bottom text-[12.5px] font-semibold text-ink-3 sm:pl-6",
                  )}
                >
                  Student
                </th>
                {days.map((d) => (
                  <DayHeader
                    key={d.date}
                    day={d}
                    today={today}
                    open={d.date === openDate}
                    extra={tagExtra && !d.courseDay}
                    withYear={withYear.has(d.date)}
                    onOpen={onOpenDay}
                  />
                ))}
                <TotalHeader first>Joined</TotalHeader>
                <TotalHeader>Late</TotalHeader>
                <TotalHeader>Absent</TotalHeader>
                {excused && <TotalHeader>Excused</TotalHeader>}
                <TotalHeader last>Attendance</TotalHeader>
              </tr>
            </thead>
            <tbody>
              {register.students.map((s) => (
                <StudentRow
                  key={s.enrollmentId}
                  student={s}
                  days={days}
                  today={today}
                  openDate={openDate}
                  excused={excused}
                  onOpenDay={onOpenDay}
                />
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th
                  scope="row"
                  className={cn(
                    STICKY_LEFT,
                    NAME_WIDTH,
                    "bottom-0 z-30 border-t border-line-2 px-4 py-2.5 text-left text-[12.5px] font-semibold text-ink-2 sm:pl-6",
                  )}
                >
                  Day totals
                </th>
                {days.map((d) => (
                  <td
                    key={d.date}
                    className={cn(
                      "sticky bottom-0 z-20 border-t border-line-2 bg-surface px-1 py-2 text-center align-top",
                      d.date === openDate && "bg-[color-mix(in_oklch,var(--navy-tint)_60%,var(--surface))]",
                    )}
                  >
                    <DayTotals day={d} future={d.date > today} excused={excused} />
                  </td>
                ))}
                <TotalCell first strong>{totals.present}</TotalCell>
                <TotalCell strong>{totals.late}</TotalCell>
                <TotalCell strong>{totals.absent}</TotalCell>
                {excused && <TotalCell strong>{totals.excused}</TotalCell>}
                <RateCell counts={totals} last />
              </tr>
            </tfoot>
          </table>
        </div>
        {/* More days to the right: the edge fades, as other wide tables do. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-surface to-transparent opacity-0 transition-opacity [[data-scroll-x~=right]+&]:opacity-100"
        />
      </div>
    </>
  );
}

/** What the letters and the "Extra" tag mean. */
function Legend({ excused, extra }: { excused: boolean; extra: boolean }) {
  return (
    <ul
      aria-label="Legend"
      className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-line px-5 py-2.5 text-[12.5px] text-ink-2 sm:px-6"
    >
      {LEGEND.filter((s) => s !== "EXCUSED" || excused).map((s) => (
        <li key={s} className="inline-flex items-center gap-1.5">
          <Letter status={s} />
          {MARK_LABEL[s]}
        </li>
      ))}
      {extra && (
        <li className="inline-flex items-center gap-1.5">
          <ExtraTag />
          Not a course day
        </li>
      )}
    </ul>
  );
}

function Letter({ status, className }: { status: AttendanceStatus; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid size-[22px] shrink-0 place-items-center rounded-full text-[11.5px] font-bold leading-none",
        CELL_TONE[status] ?? CELL_TONE.EXCUSED,
        className,
      )}
    >
      {MARK_LETTER[status] ?? "?"}
    </span>
  );
}

function ExtraTag() {
  return (
    <span aria-hidden className="rounded-full bg-gold-tint px-1.5 py-px text-[10.5px] font-semibold leading-tight text-gold-ink">
      Extra
    </span>
  );
}

/**
 * A day's column header: weekday and date, today marked, a day that is not a
 * course day tagged "Extra", a day still to come quiet. A day that has come
 * (or one outside the course's days, whose marks a super admin may correct)
 * opens in the roster; one still to come has nothing to open.
 */
function DayHeader({
  day,
  today,
  open,
  extra,
  withYear,
  onOpen,
}: {
  day: AttendanceRegisterDay;
  today: string;
  open: boolean;
  /** Not one of the course's days: a make-up session, or a day from before its dates moved. */
  extra: boolean;
  withYear: boolean;
  onOpen: (date: string) => void;
}) {
  const { weekday, dayMonth, full } = dayHeading(day.date, withYear);
  const isToday = day.date === today;
  const future = day.date > today;
  // Said by a screen reader as the column's name, so before every cell under it.
  const spoken = [full, isToday && "today", extra && "not a course day", future && "still to come", open && "open below"]
    .filter(Boolean)
    .join(", ");

  const body = (
    <>
      <span aria-hidden className="text-[11px] font-semibold uppercase tracking-[0.04em]">
        {weekday}
      </span>
      <span aria-hidden className={cn("whitespace-nowrap text-[12.5px] font-semibold", future ? "text-ink-3" : "text-ink")}>
        {dayMonth}
      </span>
      {isToday ? (
        <span aria-hidden className="mt-0.5 rounded-full bg-gold-tint px-1.5 py-px text-[10.5px] font-bold leading-tight text-gold-ink">
          Today
        </span>
      ) : extra ? (
        <span className="mt-0.5">
          <ExtraTag />
        </span>
      ) : null}
      <span className="sr-only">{spoken}</span>
    </>
  );

  return (
    <th
      scope="col"
      aria-label={spoken}
      data-date={day.date}
      className={cn(
        "sticky top-0 z-20 w-[3.75rem] min-w-[3.75rem] border-b border-line bg-surface px-1 py-1.5 align-bottom font-normal",
        open && "bg-[color-mix(in_oklch,var(--navy-tint)_60%,var(--surface))]",
      )}
    >
      {future ? (
        <span title={full} className="flex flex-col items-center gap-0.5 px-1 py-1 text-ink-4">
          {body}
        </span>
      ) : (
        <button
          type="button"
          title={`${full} — open this day`}
          aria-current={isToday ? "date" : undefined}
          onClick={() => onOpen(day.date)}
          className={cn(
            "flex w-full flex-col items-center gap-0.5 rounded-[12px] px-1 py-1 text-ink-3 transition-[background-color,box-shadow,color] duration-200 hover:bg-ink/5 hover:text-ink-2",
            open && "bg-navy-tint text-navy shadow-[inset_0_0_0_1.5px_var(--navy)] hover:bg-navy-tint hover:text-navy",
          )}
        >
          {body}
        </button>
      )}
    </th>
  );
}

function StudentRow({
  student: s,
  days,
  today,
  openDate,
  excused,
  onOpenDay,
}: {
  student: AttendanceRegisterStudent;
  days: AttendanceRegisterDay[];
  today: string;
  openDate: string;
  excused: boolean;
  onOpenDay: (date: string) => void;
}) {
  const name = studentName(s);
  const marks = marksByDate(s.marks ?? []);
  return (
    <tr className="group/row">
      <th
        scope="row"
        className={cn(
          STICKY_LEFT,
          NAME_WIDTH,
          "z-10 border-b border-line px-4 py-2 text-left font-normal sm:pl-6 group-last/row:border-b-0",
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {/* The row's name is said before every cell in it: the initials are left out of it. */}
          <span aria-hidden className="contents">
            <TutorAvatar src={s.avatarUrl ? resolveApiUrl(s.avatarUrl) : null} name={name} size="xs" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink" title={name}>
              {name}
            </span>{" "}
            <span className="block truncate text-[12px] text-ink-3" title={s.email}>
              {s.email}
            </span>
          </span>
        </span>
      </th>
      {days.map((d) => {
        const future = d.date > today;
        return (
          <td
            key={d.date}
            // The header is the keyboard's way in (one stop per day, not one
            // per cell); a pointer may use any cell under it.
            onClick={future ? undefined : () => onOpenDay(d.date)}
            className={cn(
              "border-b border-line px-1 py-2 text-center group-last/row:border-b-0",
              !future && "cursor-pointer hover:bg-paper-2",
              d.date === openDate && "bg-navy-tint/45 hover:bg-navy-tint/70",
            )}
          >
            <MarkCell mark={marks.get(d.date)} future={future} />
          </td>
        );
      })}
      <TotalCell first row>{s.present ?? 0}</TotalCell>
      <TotalCell row>{s.late ?? 0}</TotalCell>
      <TotalCell row>{s.absent ?? 0}</TotalCell>
      {excused && <TotalCell row>{s.excused ?? 0}</TotalCell>}
      <RateCell counts={s} last row />
    </tr>
  );
}

/** One cell: the mark as a coloured letter, "not marked" as a quiet dot, a day to come blank. */
function MarkCell({ mark, future }: { mark: AttendanceRegisterMark | undefined; future: boolean }) {
  if (mark) {
    const label = MARK_LABEL[mark.status] ?? mark.status;
    const when = formatMarkedAt(mark.markedAt);
    const by = [mark.markedByName && `by ${mark.markedByName}`, when].filter(Boolean).join(" · ");
    return (
      <span title={by ? `${label} · ${by}` : label} className="inline-flex">
        <Letter status={mark.status} className="size-[26px] text-[12px]" />
        <span className="sr-only">{label}</span>
      </span>
    );
  }
  if (future) return <span className="sr-only">No mark yet</span>;
  return (
    <>
      <span aria-hidden className="text-ink-4">
        ·
      </span>
      <span className="sr-only">Not marked</span>
    </>
  );
}

/** A day's counts, one per line after each mark's icon; a day to come has none. */
function DayTotals({ day, future, excused }: { day: AttendanceRegisterDay; future: boolean; excused: boolean }) {
  if (future && markedOn(day) === 0) return <span className="sr-only">Still to come</span>;
  if (markedOn(day) === 0) {
    return (
      <>
        <span aria-hidden className="text-ink-4">
          —
        </span>
        <span className="sr-only">Nothing marked</span>
      </>
    );
  }
  return (
    <>
      <span aria-hidden className="inline-flex flex-col items-start gap-0.5 text-[11.5px] font-medium text-ink-2">
        <MarkCount status="PRESENT" value={day.present ?? 0} />
        <MarkCount status="LATE" value={day.late ?? 0} />
        <MarkCount status="ABSENT" value={day.absent ?? 0} />
        {excused && <MarkCount status="EXCUSED" value={day.excused ?? 0} />}
      </span>
      <span className="sr-only">
        {day.present ?? 0} joined, {day.late ?? 0} late, {day.absent ?? 0} absent
        {excused ? `, ${day.excused ?? 0} excused` : ""}
      </span>
    </>
  );
}

function TotalHeader({ children, first, last }: { children: React.ReactNode; first?: boolean; last?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        "sticky top-0 z-20 border-b border-line bg-surface px-3 py-2 text-right align-bottom text-[12.5px] font-semibold whitespace-nowrap text-ink-3",
        first && "border-l border-l-line pl-4",
        last && "pr-5 sm:pr-6",
      )}
    >
      {children}
    </th>
  );
}

function TotalCell({
  children,
  first,
  row,
  strong,
}: {
  children: React.ReactNode;
  first?: boolean;
  row?: boolean;
  strong?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-3 text-right whitespace-nowrap",
        row ? "border-b border-line py-2 text-ink-2 group-last/row:border-b-0" : "sticky bottom-0 z-20 border-t border-line-2 bg-surface py-2.5",
        first && "border-l border-l-line pl-4",
        strong && "font-semibold text-ink",
      )}
    >
      {children}
    </td>
  );
}

function RateCell({ counts, last, row }: { counts: AttendanceCounts; last?: boolean; row?: boolean }) {
  const rate = attendanceRate(counts);
  return (
    <td
      className={cn(
        "px-3 text-right font-semibold whitespace-nowrap text-ink",
        row ? "border-b border-line py-2 group-last/row:border-b-0" : "sticky bottom-0 z-20 border-t border-line-2 bg-surface py-2.5",
        last && "pr-5 sm:pr-6",
      )}
    >
      {rate === null ? (
        <>
          <span aria-hidden className="font-normal text-ink-4">
            —
          </span>
          <span className="sr-only">Nothing marked</span>
        </>
      ) : (
        formatRate(rate)
      )}
    </td>
  );
}

/**
 * "Export to Excel": the register as the API writes it, saved under the
 * server's file name. Busy while the file is made; a refusal says the API's
 * own message.
 */
function ExportButton({ courseId, courseSlug, today }: { courseId: UUID; courseSlug: string; today: string }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await downloadAttendanceExport(courseId, `attendance-${courseSlug}-${today}.xlsx`);
      toast.success("Attendance exported");
    } catch (e) {
      toast.error((e as NormalizedError).message || "Could not export the attendance");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      leftIcon={<FileSpreadsheet className="size-4" />}
      loading={busy}
      onClick={() => void run()}
    >
      {busy ? "Exporting…" : "Export to Excel"}
    </Button>
  );
}
