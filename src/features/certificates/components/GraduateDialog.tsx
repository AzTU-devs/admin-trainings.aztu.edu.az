import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, GraduationCap, Info, Users } from "lucide-react";
import { toast } from "sonner";
import { SoftEmpty } from "@shared/components/bright";
import { Button } from "@shared/components/ui/Button";
import { Checkbox } from "@shared/components/ui/Checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { cn } from "@shared/lib/cn";
import { formatWeekdayDate } from "@shared/lib/weekdays";
import { isInPerson, type UUID } from "@shared/types/lms";
import type { NormalizedError } from "@lib/axios/httpClient";
import { usePermissions } from "@features/auth/hooks/usePermissions";
import { useBakuToday } from "@features/attendance/hooks/useBakuToday";
import { MarkCount } from "@features/attendance/components/marks";
import { MARK_LABEL } from "@features/attendance/lib/attendance";
import { formatRate } from "@features/attendance/lib/register";
import { useEndCourseMutation, useIssueCertificatesMutation } from "@features/certificates/api/certificatesApi";
import {
  beforeLastDay,
  graduatable,
  graduateCountLabel,
  graduateName,
} from "@features/certificates/lib/certificates";
import type { CourseGraduationView, GraduationAttendance, GraduationStudent } from "@features/certificates/types";

export type GraduateMode = "end" | "issue";

interface Props {
  view: CourseGraduationView;
  /** "end": end the course and graduate; "issue": graduate more students of an ended course. */
  mode: GraduateMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "End course & graduate" and "Graduate more students": the students who may
 * be graduated (no live certificate), each with how they did — attendance for
 * an in-person course, progress for an online one — all ticked to begin with.
 * Those left unticked keep their enrolment as it is and can be graduated later.
 */
export function GraduateDialog({ view, mode, open, onOpenChange }: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      {/* Mounted only while open: every opening starts with everyone ticked. */}
      {open && (
        <GraduateBody view={view} mode={mode} onBusyChange={setBusy} onClose={() => onOpenChange(false)} />
      )}
    </Dialog>
  );
}

function GraduateBody({
  view,
  mode,
  onBusyChange,
  onClose,
}: {
  view: CourseGraduationView;
  mode: GraduateMode;
  onBusyChange: (busy: boolean) => void;
  onClose: () => void;
}) {
  const { isSuperAdmin } = usePermissions();
  const [today] = useBakuToday();
  const [endCourse, { isLoading: ending }] = useEndCourseMutation();
  const [issueCertificates, { isLoading: issuing }] = useIssueCertificatesMutation();
  const sending = ending || issuing;
  const [error, setError] = useState<string | null>(null);

  // The view may be refetched while this is open (a refused send refreshes
  // it): the list follows it, and only ticked students still on it are sent.
  const students = useMemo(() => graduatable(view), [view]);
  const [ticked, setTicked] = useState<Set<UUID>>(() => new Set(students.map((s) => s.enrollmentId)));
  const chosen = students.filter((s) => ticked.has(s.enrollmentId));

  const isEnd = mode === "end";
  const early = isEnd && beforeLastDay(view, today);
  // The API's rule: an expert ends an in-person course on or after its last day.
  const tooEarly = early && !isSuperAdmin;

  const setAll = (on: boolean) => setTicked(new Set(on ? students.map((s) => s.enrollmentId) : []));
  const toggle = (id: UUID, on: boolean) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const send = async () => {
    if (sending || tooEarly || (!isEnd && chosen.length === 0)) return;
    const ids = chosen.map((s) => s.enrollmentId);
    setError(null);
    onBusyChange(true);
    try {
      if (isEnd) await endCourse({ courseId: view.courseId, body: { graduateEnrollmentIds: ids } }).unwrap();
      else await issueCertificates({ courseId: view.courseId, body: { enrollmentIds: ids } }).unwrap();
      onBusyChange(false);
      toast.success(successMessage(mode, ids.length));
      onClose();
    } catch (e) {
      onBusyChange(false);
      const err = e as NormalizedError;
      // Someone else ended it (or reopened it) meanwhile: the page shows that now.
      if (err.code === "COURSE_ALREADY_ENDED" || err.code === "COURSE_NOT_ENDED") {
        toast.error(err.message || (isEnd ? "The course has been ended already." : "The course is not ended."));
        onClose();
        return;
      }
      setError(refusalMessage(err, mode));
    }
  };

  return (
    <DialogContent size="lg">
      <DialogHeader icon={<GraduationCap />}>
        <DialogTitle>{isEnd ? "End course & graduate" : "Graduate more students"}</DialogTitle>
        <DialogDescription>
          <span className="font-semibold text-ink">{view.courseTitle}</span>
          {isEnd
            ? ". The students ticked below graduate: their enrolment is completed and they receive a certificate."
            : ". The students ticked below graduate and receive a certificate."}
        </DialogDescription>
      </DialogHeader>

      {isEnd && (
        <Note tone="warning" Icon={AlertTriangle}>
          Ending the course stops it taking enrolments: it leaves the website&apos;s catalogue and no one new can
          enrol. Students left unticked keep their place and can be graduated later.
        </Note>
      )}
      {tooEarly && view.endDate && (
        <Note tone="danger" Icon={CalendarClock} role="alert">
          This course runs until {formatWeekdayDate(view.endDate)}. Experts can end it from that day on; a super admin
          can end it earlier.
        </Note>
      )}
      {early && !tooEarly && view.endDate && (
        <Note tone="info" Icon={Info}>
          Its last day is {formatWeekdayDate(view.endDate)}: you are ending it early.
        </Note>
      )}

      {students.length === 0 ? (
        <SoftEmpty
          className="mt-4"
          icon={<Users />}
          title={isEnd ? "No students to graduate." : "Every student has a certificate."}
          hint={isEnd ? "The course ends without issuing certificates." : undefined}
        />
      ) : (
        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p aria-live="polite" className="text-[13.5px] font-semibold text-ink">
              {graduateCountLabel(chosen.length, students.length)}
            </p>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setAll(true)}
                disabled={sending || chosen.length === students.length}
              >
                Select all
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setAll(false)}
                disabled={sending || chosen.length === 0}
              >
                Select none
              </Button>
            </div>
          </div>
          <ul aria-label="Students to graduate" className="mt-2 divide-y divide-line rounded-[18px] border border-line">
            {students.map((s) => (
              <StudentRow
                key={s.enrollmentId}
                student={s}
                inPerson={isInPerson(view.courseType)}
                checked={ticked.has(s.enrollmentId)}
                disabled={sending}
                onCheckedChange={(on) => toggle(s.enrollmentId, on)}
              />
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-[16px] bg-danger-tint px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onClose} disabled={sending}>
          Cancel
        </Button>
        <Button
          type="button"
          variant={isEnd ? "gold" : "primary"}
          leftIcon={<GraduationCap className="size-4" />}
          loading={sending}
          disabled={tooEarly || (!isEnd && chosen.length === 0)}
          onClick={() => void send()}
        >
          {isEnd ? (chosen.length > 0 ? "End course & graduate" : "End course only") : "Graduate selected"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function successMessage(mode: GraduateMode, count: number): string {
  const issued = `${count} ${count === 1 ? "certificate" : "certificates"} issued`;
  if (mode === "issue") return issued;
  return count === 0 ? "Course ended" : `Course ended · ${issued}`;
}

function refusalMessage(err: NormalizedError, mode: GraduateMode): string {
  switch (err.code) {
    case "COURSE_NOT_OVER":
      return err.message || "The course has not reached its last day yet.";
    case "INVALID_GRADUATES":
      // The view is fetched again on a refusal, so the list is current now.
      return `${err.message || "Some of the students ticked can no longer be graduated."} The list has been refreshed.`;
    default:
      return err.message || (mode === "end" ? "Could not end the course." : "Could not graduate the students.");
  }
}

function StudentRow({
  student,
  inPerson,
  checked,
  disabled,
  onCheckedChange,
}: {
  student: GraduationStudent;
  inPerson: boolean;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const name = graduateName(student);
  const id = `graduate-${student.enrollmentId}`;
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <Checkbox
        id={id}
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        aria-label={`Graduate ${name}`}
      />
      <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-x-4 gap-y-1.5 sm:flex-row sm:items-center">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-ink" title={name}>
            {name}
          </span>
          <span className="block truncate text-[12.5px] text-ink-3" title={student.email}>
            {student.email}
          </span>
          {student.certificate?.revokedAt && (
            <span className="mt-0.5 block text-[12.5px] text-warn">Their earlier certificate was revoked.</span>
          )}
        </span>
        {inPerson ? <AttendanceFigures attendance={student.attendance} /> : <Progress value={student.progressPercent} />}
      </label>
    </li>
  );
}

/** Joined / Late / Absent (Excused when any) and the rate, as the register counts them. */
function AttendanceFigures({ attendance }: { attendance: GraduationAttendance | null }) {
  if (!attendance) return <span className="text-[12.5px] text-ink-3">No attendance</span>;
  const shown = (["PRESENT", "LATE", "ABSENT", "EXCUSED"] as const).filter(
    (status) => status !== "EXCUSED" || attendance.excused > 0,
  );
  const count = { PRESENT: attendance.present, LATE: attendance.late, ABSENT: attendance.absent, EXCUSED: attendance.excused };
  return (
    <span className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-2 tabular-nums">
      {shown.map((status) => (
        <span key={status} className="inline-flex items-center gap-1">
          <span>{MARK_LABEL[status]}</span>
          <MarkCount status={status} value={count[status] ?? 0} className="font-semibold text-ink" />
        </span>
      ))}
      <span className="min-w-[3.5rem] text-right font-semibold text-ink">
        {attendance.percent == null ? "No marks" : formatRate(attendance.percent)}
      </span>
    </span>
  );
}

/** An online student's progress: the bar and the number, or a dash before they start. */
function Progress({ value }: { value: number | null }) {
  if (value == null) return <span className="text-[12.5px] text-ink-3">No progress yet</span>;
  const width = Math.min(100, Math.max(0, value));
  return (
    <span className="flex w-full shrink-0 items-center gap-3 sm:w-44">
      <span className="hbar h-2 flex-1" aria-hidden>
        <i style={{ width: `${width}%` }} />
      </span>
      <span className="w-14 text-right text-[12.5px] font-semibold tabular-nums text-ink">
        {formatRate(value)}
        <span className="sr-only"> progress</span>
      </span>
    </span>
  );
}

const NOTE_TONE = {
  warning: "bg-warn-tint [&>svg]:text-warn",
  danger: "bg-danger-tint text-danger [&>svg]:text-danger",
  info: "bg-navy-tint [&>svg]:text-navy",
} as const;

function Note({
  tone,
  Icon,
  role,
  children,
}: {
  tone: keyof typeof NOTE_TONE;
  Icon: typeof Info;
  role?: "alert";
  children: React.ReactNode;
}) {
  return (
    <div role={role} className={cn("mt-3 flex gap-3 rounded-[16px] px-4 py-3 text-[13.5px] leading-relaxed text-ink-2", NOTE_TONE[tone])}>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p className="min-w-0">{children}</p>
    </div>
  );
}
