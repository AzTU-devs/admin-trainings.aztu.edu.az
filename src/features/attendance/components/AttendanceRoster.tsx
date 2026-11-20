import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { CheckCheck, Lock, Pencil, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { SoftEmpty } from "@shared/components/bright";
import { Button } from "@shared/components/ui/Button";
import { Card } from "@shared/components/ui/Card";
import { ConfirmDialog } from "@shared/components/ui/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { resolveApiUrl } from "@shared/config/env";
import { cn } from "@shared/lib/cn";
import type { UUID } from "@shared/types/lms";
import type { NormalizedError } from "@lib/axios/httpClient";
import { StickySaveBar } from "@features/profile/components/StickySaveBar";
import { TutorAvatar } from "@features/tutors/components/TutorAvatar";
import {
  useChangeAttendanceMarkMutation,
  useDeleteAttendanceMarkMutation,
  useMarkAttendanceMutation,
} from "@features/attendance/api/attendanceApi";
import { MarkBadge, MarkPicker } from "@features/attendance/components/marks";
import { MARK_LABEL, formatDay, formatMarkedAt, studentName } from "@features/attendance/lib/attendance";
import type {
  AttendanceMark,
  AttendanceRecord,
  AttendanceStudent,
  CourseAttendanceView,
} from "@features/attendance/types";

interface Props {
  /** One course day; key the roster by its date, so choices never carry over to another day. */
  view: CourseAttendanceView;
  /** New marks may be added: the course's expert or a super admin, on a day that can be marked. */
  canAdd: boolean;
  /** Today in Baku, as the page shows it. */
  today: string;
  /** Reads today from the clock again (the page follows) and returns it. */
  recheckToday: () => string;
  /** The day is being reloaded (after a save elsewhere, say). */
  refreshing?: boolean;
}

/** The mark a change or delete was for no longer exists (a super admin deleted it elsewhere). */
const RECORD_GONE = "ATTENDANCE_RECORD_NOT_FOUND";

/** The 409 is someone else's save landing first: nothing of this one was kept. */
const ALREADY_MARKED_MESSAGE =
  "Someone else marked some of these students first, so nothing was saved. The list now shows their marks — check it and save the rest again.";

/**
 * The students of one course day. A student without a mark gets Joined / Late
 * / Absent to choose from, and every choice is saved together. A saved mark
 * shows what it is, who saved it and when — final for an expert; a super
 * admin (`canManage`) can change or delete it.
 */
export function AttendanceRoster({ view, canAdd, today, recheckToday, refreshing }: Props) {
  const [pending, setPending] = useState<Record<UUID, AttendanceMark>>({});
  const [changing, setChanging] = useState<AttendanceStudent | null>(null);
  const [deleting, setDeleting] = useState<AttendanceStudent | null>(null);
  const [markAttendance, { isLoading: saving }] = useMarkAttendanceMutation();
  const [deleteMark] = useDeleteAttendanceMarkMutation();
  // Saving disables the Save button, and a mark that is gone (deleted here,
  // or found deleted already) takes its row's buttons with it: focus then
  // goes to the list's heading, not the page's start.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  const markGone = useRef(false);
  const focusHeadingIfGone = (e: Event) => {
    if (!markGone.current) return;
    markGone.current = false;
    e.preventDefault();
    headingRef.current?.focus();
  };

  // A student who has a mark now (someone else's, after a refresh) can take no
  // new one: drop the choice made for them.
  useEffect(() => {
    setPending((current) => {
      const open = new Set(view.students.filter((s) => !s.record).map((s) => s.enrollmentId));
      const kept = Object.entries(current).filter(([id]) => open.has(id));
      return kept.length === Object.keys(current).length ? current : Object.fromEntries(kept);
    });
  }, [view.students]);

  const unmarked = view.students.filter((s) => !s.record);
  const chosen = unmarked.filter((s) => pending[s.enrollmentId]);
  const marked = view.students.length - unmarked.length;
  const allChosen = chosen.length === unmarked.length;

  const choose = (id: UUID, mark: AttendanceMark | null) =>
    setPending((current) => {
      const next = { ...current };
      if (mark) next[id] = mark;
      else delete next[id];
      return next;
    });

  const markRestJoined = () => {
    // Rendered at once, so the Save button it enables can take the focus — the
    // next step, and this button is about to be disabled.
    flushSync(() =>
      setPending((current) => {
        const next = { ...current };
        for (const s of unmarked) next[s.enrollmentId] ??= "PRESENT";
        return next;
      }),
    );
    saveRef.current?.focus();
  };

  const save = async () => {
    const marks = chosen.map((s) => ({ enrollmentId: s.enrollmentId, status: pending[s.enrollmentId] }));
    if (marks.length === 0) return;
    // Shown as today's, but the day may have turned in Baku since the page
    // last looked (a laptop that slept, say). Marks are final, so none are
    // filed under a day that is no longer today: the page moves on instead.
    if (view.date === today) {
      const now = recheckToday();
      if (now !== today) {
        toast.error(
          `It's ${formatDay(now)} in Baku now, so nothing was saved for ${formatDay(view.date)}. Check the day and save again.`,
        );
        return;
      }
    }
    try {
      await markAttendance({ courseId: view.courseId, body: { date: view.date, marks } }).unwrap();
      setPending((current) => {
        const next = { ...current };
        for (const m of marks) delete next[m.enrollmentId];
        return next;
      });
      headingRef.current?.focus();
      toast.success(marks.length === 1 ? "1 mark saved" : `${marks.length} marks saved`);
    } catch (e) {
      const err = e as NormalizedError;
      // The day is refetched by the mutation itself; the list then shows those marks.
      if (err.code === "ATTENDANCE_ALREADY_MARKED") {
        toast.error(ALREADY_MARKED_MESSAGE);
        return;
      }
      toast.error(err.message || "Could not save the marks");
    }
  };

  const confirmDelete = async () => {
    const record = deleting?.record;
    if (!deleting || !record) return;
    try {
      await deleteMark({ courseId: view.courseId, recordId: record.id }).unwrap();
      markGone.current = true;
      toast.success(`Mark deleted for ${studentName(deleting)}`);
    } catch (e) {
      const err = e as NormalizedError;
      // Deleted elsewhere meanwhile: the day is reloaded without it.
      if (err.code === RECORD_GONE) markGone.current = true;
      toast.error(err.message || "Could not delete the mark");
    }
  };

  const summary = [
    `${view.students.length} ${view.students.length === 1 ? "student" : "students"}`,
    `${marked} marked`,
    ...(unmarked.length > 0 ? [`${unmarked.length} not marked`] : []),
  ].join(" · ");

  return (
    <div className="space-y-4">
      <Card aria-busy={refreshing || undefined} className={cn("overflow-hidden transition-opacity", refreshing && "opacity-75")}>
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="font-display text-[17px] font-bold tracking-[-0.012em] text-ink focus:outline-none"
            >
              Students
            </h2>
            <p className="mt-0.5 text-[13px] text-ink-3">{summary}</p>
          </div>
          {canAdd && unmarked.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              leftIcon={<CheckCheck className="size-4" />}
              onClick={markRestJoined}
              disabled={allChosen}
              className="self-start sm:self-auto"
            >
              Mark the rest as joined
            </Button>
          )}
        </div>

        {view.students.length === 0 ? (
          <div className="p-5 sm:p-6">
            <SoftEmpty icon={<Users />} title="No students on this course yet." hint="Enrolled İştirakçilər appear here." />
          </div>
        ) : (
          <ul aria-label="Students" className="divide-y divide-line">
            {view.students.map((s) => (
              <StudentRow
                key={s.enrollmentId}
                student={s}
                canAdd={canAdd}
                canManage={view.canManage}
                choice={pending[s.enrollmentId]}
                onChoose={(mark) => choose(s.enrollmentId, mark)}
                onChange={() => setChanging(s)}
                onDelete={() => setDeleting(s)}
              />
            ))}
          </ul>
        )}
      </Card>

      {canAdd && !view.canManage && unmarked.length > 0 && (
        <p className="flex items-start gap-2 px-1 text-[12.5px] leading-snug text-ink-3">
          <Lock aria-hidden className="mt-px size-3.5 shrink-0" />
          Saved marks are final: only a super admin can change or delete one.
        </p>
      )}

      {canAdd && unmarked.length > 0 && (
        <StickySaveBar label={`${chosen.length} of ${unmarked.length} chosen for ${formatDay(view.date)}`}>
          <Button
            ref={saveRef}
            type="button"
            onClick={() => void save()}
            loading={saving}
            disabled={chosen.length === 0}
            className="shrink-0"
          >
            {chosen.length === 0 ? "Save marks" : chosen.length === 1 ? "Save 1 mark" : `Save ${chosen.length} marks`}
          </Button>
        </StickySaveBar>
      )}

      {changing?.record && (
        <ChangeMarkDialog
          key={changing.record.id}
          courseId={view.courseId}
          date={view.date}
          student={changing}
          record={changing.record}
          onClose={() => setChanging(null)}
          onGone={() => {
            markGone.current = true;
            setChanging(null);
          }}
          onCloseAutoFocus={focusHeadingIfGone}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this mark?"
        description={
          deleting?.record
            ? `${studentName(deleting)}'s mark for ${formatDay(view.date)} (${MARK_LABEL[deleting.record.status]}) is removed, and they show as not marked.`
            : undefined
        }
        confirmLabel="Delete mark"
        destructive
        onConfirm={confirmDelete}
        onCloseAutoFocus={focusHeadingIfGone}
      />
    </div>
  );
}

function StudentRow({
  student: s,
  canAdd,
  canManage,
  choice,
  onChoose,
  onChange,
  onDelete,
}: {
  student: AttendanceStudent;
  canAdd: boolean;
  canManage: boolean;
  choice: AttendanceMark | undefined;
  onChoose: (mark: AttendanceMark | null) => void;
  onChange: () => void;
  onDelete: () => void;
}) {
  const name = studentName(s);
  const rowRef = useRef<HTMLLIElement>(null);
  return (
    // One line from md up (who, then the mark); stacked on a phone.
    <li ref={rowRef} className="flex flex-col gap-3 px-5 py-3.5 sm:px-6 md:flex-row md:items-center md:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <TutorAvatar src={s.avatarUrl ? resolveApiUrl(s.avatarUrl) : null} name={name} size="md" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink" title={name}>
            {name}
          </p>
          <p className="truncate text-[12.5px] text-ink-3" title={s.email}>
            {s.email}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 md:justify-end">
        {s.record ? (
          <>
            <MarkBadge status={s.record.status} />
            <MarkedBy record={s.record} />
            {canManage && (
              <span className="-my-1 flex items-center">
                <Button type="button" size="icon" variant="ghost" aria-label={`Change ${name}'s mark`} onClick={onChange}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete ${name}'s mark`}
                  className="text-ink-3 hover:bg-danger-tint hover:text-danger"
                  onClick={onDelete}
                >
                  <Trash2 className="size-4" />
                </Button>
              </span>
            )}
          </>
        ) : canAdd ? (
          <>
            <MarkPicker name={`mark-${s.enrollmentId}`} label={`Mark for ${name}`} value={choice} onChange={onChoose} />
            {choice && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Clear the choice for ${name}`}
                className="-my-1 text-ink-3"
                onClick={() => {
                  // This button goes with the choice: focus stays in the row, on its marks.
                  flushSync(() => onChoose(null));
                  rowRef.current?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus();
                }}
              >
                <X className="size-4" />
              </Button>
            )}
          </>
        ) : (
          <span className="text-[13px] text-ink-3">Not marked</span>
        )}
      </div>
    </li>
  );
}

function MarkedBy({ record }: { record: AttendanceRecord }) {
  const when = formatMarkedAt(record.markedAt);
  return (
    <span className="text-[12.5px] leading-snug text-ink-3">
      {record.markedByName ? (
        <>
          by <span className="font-medium text-ink-2">{record.markedByName}</span>
          {when && ` · ${when}`}
        </>
      ) : (
        when
      )}
    </span>
  );
}

/** A super admin's correction of one mark (audited by the API, old → new). */
function ChangeMarkDialog({
  courseId,
  date,
  student,
  record,
  onClose,
  onGone,
  onCloseAutoFocus,
}: {
  courseId: UUID;
  date: string;
  student: AttendanceStudent;
  record: AttendanceRecord;
  onClose: () => void;
  /** The mark was deleted elsewhere meanwhile: nothing is left to change. */
  onGone: () => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const [changeMark, { isLoading }] = useChangeAttendanceMarkMutation();
  const current = record.status === "EXCUSED" ? undefined : record.status;
  const [next, setNext] = useState<AttendanceMark | undefined>(current);
  const name = studentName(student);

  const save = async () => {
    if (!next || next === current) return;
    try {
      await changeMark({ courseId, recordId: record.id, status: next }).unwrap();
      toast.success(`${name} is now marked ${MARK_LABEL[next].toLowerCase()}`);
      onClose();
    } catch (e) {
      const err = e as NormalizedError;
      toast.error(err.message || "Could not change the mark");
      if (err.code === RECORD_GONE) onGone();
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !isLoading && onClose()}>
      <DialogContent size="md" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader icon={<Pencil />}>
          <DialogTitle>Change mark</DialogTitle>
          <DialogDescription>
            {name} · {formatDay(date)}. Now {MARK_LABEL[record.status].toLowerCase()}
            {record.markedByName ? `, marked by ${record.markedByName}` : ""}.
          </DialogDescription>
        </DialogHeader>
        <MarkPicker name="change-mark" label={`New mark for ${name}`} value={next} onChange={setNext} />
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} loading={isLoading} disabled={!next || next === current}>
            Save mark
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
