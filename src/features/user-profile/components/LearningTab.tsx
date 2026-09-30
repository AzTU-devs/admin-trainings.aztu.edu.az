import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, BookOpen, CreditCard, EyeOff, MessageSquareText, Receipt } from "lucide-react";
import { SoftEmpty } from "@shared/components/bright";
import { Badge, StatusBadge } from "@shared/components/ui/Badge";
import { Card } from "@shared/components/ui/Card";
import { DataTable } from "@shared/components/tables/DataTable";
import { formatEnum } from "@shared/lib/enums";
import { ProgressCell, StackedProgress } from "@features/participants/components/PersonCell";
import { CourseLink, ProfileSection, Stars, Value } from "@features/user-profile/components/ProfileBits";
import {
  attendanceParts,
  courseTypeLabel,
  formatDate,
  formatDateTime,
  formatMoney,
} from "@features/user-profile/lib/format";
import type {
  ProfileAttendance,
  ProfileEnrollment,
  ProfileLearner,
  ProfileOrder,
  ProfileReview,
} from "@features/user-profile/types";

/** "4 / 10" lessons done. */
function LessonsValue({ e }: { e: ProfileEnrollment }) {
  return (
    <span className="whitespace-nowrap tabular-nums">
      <span className="font-semibold text-ink">{e.lessonsCompleted.toLocaleString()}</span>
      <span className="text-ink-3"> / {e.lessonsTotal.toLocaleString()}</span>
    </span>
  );
}

/** Session attendance: "5 of 6 present", the other statuses under it; a dash where none is taken. */
function AttendanceValue({ attendance }: { attendance: ProfileAttendance | null }) {
  if (!attendance) return <Value />;
  const parts = attendanceParts(attendance);
  const present = parts.find((p) => p.status === "PRESENT");
  const others = parts.filter((p) => p.status !== "PRESENT");
  return (
    <span className="block min-w-[8rem] leading-snug">
      <span className="block whitespace-nowrap text-ink tabular-nums">
        {present ? `${present.count.toLocaleString()} of ${attendance.total.toLocaleString()} present` : `${attendance.total.toLocaleString()} sessions`}
      </span>
      {others.length > 0 && (
        <span className="mt-0.5 block text-[12.5px] text-ink-3 tabular-nums">
          {others.map((p) => `${p.label} ${p.count.toLocaleString()}`).join(" · ")}
        </span>
      )}
    </span>
  );
}

/** Enrolled, completed and last-active dates, one per line. */
function EnrollmentDates({ e }: { e: ProfileEnrollment }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 whitespace-nowrap text-[12.5px] leading-snug">
      <dt className="text-ink-3">Enrolled</dt>
      <dd className="text-ink-2 tabular-nums">{formatDate(e.enrolledAt)}</dd>
      <dt className="text-ink-3">Completed</dt>
      <dd className="text-ink-2 tabular-nums">{formatDate(e.completedAt)}</dd>
      <dt className="text-ink-3">Last active</dt>
      <dd className="text-ink-2 tabular-nums">{formatDateTime(e.lastAccessedAt)}</dd>
    </dl>
  );
}

const ENROLLMENT_COLUMNS: ColumnDef<ProfileEnrollment>[] = [
  {
    header: "Course",
    cell: ({ row }) => (
      <div className="min-w-[13rem] max-w-[22rem]">
        <CourseLink course={{ id: row.original.courseId, title: row.original.courseTitle }} className="line-clamp-2" />
        <p className="mt-0.5 truncate text-[12.5px] text-ink-3">{courseTypeLabel(row.original.courseType)}</p>
      </div>
    ),
  },
  { header: "Status", cell: ({ row }) => <StatusBadge value={row.original.status} /> },
  {
    header: "Source",
    // How the seat was granted is a system value, not a state: a quiet pill with no dot, as on the roster.
    cell: ({ row }) => <StatusBadge value={row.original.source} dot={false} size="sm" />,
  },
  { header: "Progress", cell: ({ row }) => <ProgressCell value={row.original.progressPercent} /> },
  { header: "Lessons", cell: ({ row }) => <LessonsValue e={row.original} /> },
  { header: "Attendance", cell: ({ row }) => <AttendanceValue attendance={row.original.attendance} /> },
  { header: "Dates", cell: ({ row }) => <EnrollmentDates e={row.original} /> },
];

function EnrollmentPhoneRow({ e }: { e: ProfileEnrollment }) {
  return (
    <div className="space-y-3 text-sm text-ink-2">
      <div>
        <CourseLink course={{ id: e.courseId, title: e.courseTitle }} />
        <p className="mt-0.5 text-[12.5px] text-ink-3">{courseTypeLabel(e.courseType)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge value={e.status} size="sm" />
        <StatusBadge value={e.source} dot={false} size="sm" />
      </div>
      <StackedProgress label="Progress" value={e.progressPercent} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[12.5px] text-ink-3">Lessons</p>
          <LessonsValue e={e} />
        </div>
        <div>
          <p className="text-[12.5px] text-ink-3">Attendance</p>
          <AttendanceValue attendance={e.attendance} />
        </div>
      </div>
      <EnrollmentDates e={e} />
    </div>
  );
}

/** One order: its number and state, what was bought, the totals, then every payment attempt. */
function OrderCard({ order: o }: { order: ProfileOrder }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5 sm:px-6">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[13px] font-semibold tracking-normal text-ink [overflow-wrap:anywhere]">
              {o.orderNumber}
            </span>
            <StatusBadge value={o.status} size="sm" />
          </p>
          <p className="meta mt-1.5 text-[12.5px]">
            <span>Placed {formatDateTime(o.placedAt)}</span>
            <span>Paid {formatDateTime(o.paidAt)}</span>
          </p>
        </div>
        <p className="font-display text-[22px] font-extrabold tracking-[-0.03em] text-ink tabular-nums">
          {formatMoney(o.total, o.currency)}
        </p>
      </div>

      {o.items.length > 0 && (
        <ul aria-label="Items" className="mt-4 divide-y divide-line border-t border-line">
          {o.items.map((item, i) => {
            const name = item.courseTitle || item.description || formatEnum(item.itemType);
            return (
              <li key={i} className="flex items-start justify-between gap-4 px-5 py-3 text-[13.5px] sm:px-6">
                <div className="min-w-0">
                  <p className="break-words font-medium text-ink">{name}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-3">
                    {formatEnum(item.itemType)}
                    {item.courseTitle && item.description ? ` · ${item.description}` : ""}
                    {` · ${item.quantity.toLocaleString()} × ${formatMoney(item.unitPrice, item.currency)}`}
                  </p>
                </div>
                <span className="shrink-0 whitespace-nowrap font-semibold text-ink tabular-nums">
                  {formatMoney(item.totalPrice, item.currency)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t border-line px-5 py-3 text-[13px] sm:px-6">
        <dt className="text-ink-3">Subtotal</dt>
        <dd className="text-right text-ink-2 tabular-nums">{formatMoney(o.subtotal, o.currency)}</dd>
        <dt className="text-ink-3">Discount</dt>
        <dd className="text-right text-ink-2 tabular-nums">{formatMoney(o.discount, o.currency)}</dd>
        <dt className="text-ink-3">Tax</dt>
        <dd className="text-right text-ink-2 tabular-nums">{formatMoney(o.tax, o.currency)}</dd>
        <dt className="font-semibold text-ink">Total</dt>
        <dd className="text-right font-semibold text-ink tabular-nums">{formatMoney(o.total, o.currency)}</dd>
      </dl>

      <div className="border-t border-line bg-paper-2/50 px-5 py-3.5 sm:px-6">
        <p className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-ink-3">
          <CreditCard aria-hidden className="size-3.5" /> Payments
        </p>
        {o.payments.length === 0 ? (
          <p className="text-[13px] text-ink-3">No payment attempts.</p>
        ) : (
          <ul className="space-y-2.5">
            {o.payments.map((p, i) => (
              <li key={i} className="text-[13px]">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="font-semibold text-ink">{formatEnum(p.provider)}</span>
                  {p.method && <span className="text-ink-3">{formatEnum(p.method)}</span>}
                  <StatusBadge value={p.status} size="sm" />
                  <span className="font-semibold text-ink tabular-nums">{formatMoney(p.amount, p.currency)}</span>
                  <span className="text-ink-3 tabular-nums">{formatDateTime(p.createdAt)}</span>
                </div>
                {p.errorMessage && (
                  <p className="mt-1 flex items-start gap-1.5 break-words text-[12.5px] text-danger">
                    <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                    {p.errorMessage}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function ReviewCard({ review: r }: { review: ProfileReview }) {
  return (
    <li className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <CourseLink course={{ id: r.courseId, title: r.courseTitle }} className="min-w-0" />
        <div className="flex shrink-0 items-center gap-2">
          <Stars rating={r.rating} />
          {r.visible ? (
            <Badge tone="success" size="sm">
              Visible
            </Badge>
          ) : (
            <Badge tone="neutral" size="sm">
              <EyeOff aria-hidden className="size-3" /> Hidden
            </Badge>
          )}
        </div>
      </div>
      {r.title?.trim() && <p className="mt-2.5 break-words font-semibold text-ink">{r.title.trim()}</p>}
      {r.body?.trim() && (
        <p className="mt-1 whitespace-pre-line break-words text-[14px] leading-relaxed text-ink-2">{r.body.trim()}</p>
      )}
      <p className="mt-2.5 text-[12.5px] text-ink-3">{formatDateTime(r.createdAt)}</p>
    </li>
  );
}

/** The participant side of the account: courses and progress, what they paid, and what they wrote. */
export function LearningTab({ learner }: { learner: ProfileLearner }) {
  return (
    <div className="space-y-8">
      <ProfileSection title="Enrollments" count={learner.enrollments.length}>
        {learner.enrollments.length === 0 ? (
          <SoftEmpty icon={<BookOpen />} title="Not enrolled on any course." />
        ) : (
          <DataTable<ProfileEnrollment>
            data={learner.enrollments}
            columns={ENROLLMENT_COLUMNS}
            getRowId={(e) => e.id}
            renderMobileRow={(e) => <EnrollmentPhoneRow e={e} />}
          />
        )}
      </ProfileSection>

      <ProfileSection title="Orders" count={learner.orders.length}>
        {learner.orders.length === 0 ? (
          <SoftEmpty icon={<Receipt />} title="No orders." />
        ) : (
          <ul className="space-y-4">
            {learner.orders.map((o) => (
              <li key={o.id}>
                <OrderCard order={o} />
              </li>
            ))}
          </ul>
        )}
      </ProfileSection>

      <ProfileSection title="Reviews" count={learner.reviews.length}>
        {learner.reviews.length === 0 ? (
          <SoftEmpty icon={<MessageSquareText />} title="No reviews written." />
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {learner.reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </ul>
        )}
      </ProfileSection>
    </div>
  );
}
