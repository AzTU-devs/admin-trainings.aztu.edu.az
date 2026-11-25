import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, ShieldOff, TriangleAlert, X } from "lucide-react";
import { DataTable } from "@shared/components/tables/DataTable";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { Badge } from "@shared/components/ui/Badge";
import { Button } from "@shared/components/ui/Button";
import { ROUTES } from "@shared/constants/routes";
import { cn } from "@shared/lib/cn";
import { COURSE_TYPE_LABEL } from "@shared/types/lms";
import type { NormalizedError } from "@lib/axios/httpClient";
import { PersonCell } from "@features/participants/components/PersonCell";
import { ViewProfileLink } from "@features/user-profile/components/ViewProfileLink";
import { formatDateTime } from "@features/user-profile/lib/format";
import { useListEnrollmentRequestsQuery } from "@features/enrollments/api/enrollmentRequestsApi";
import {
  RequestDecisionDialog,
  type RequestDecision,
  type RequestDecisionKind,
} from "@features/enrollments/components/RequestDecisionDialog";
import { priceText, seatsLeftText, studentName } from "@features/enrollments/lib/requests";
import type { EnrollmentRequestDto, EnrollmentRequestStatus } from "@features/enrollments/types";

/**
 * Whose requests are listed: "own" — an expert's, for the courses they own
 * (the course links to their course page); "all" — the super admin's, every
 * course (the course links to its admin page). The API decides what is in
 * the list; this only picks the links and the words.
 */
export type RequestsScope = "own" | "all";

type Decide = (request: EnrollmentRequestDto, kind: RequestDecisionKind) => void;

function CourseCell({
  request: r,
  scope,
}: {
  request: EnrollmentRequestDto;
  scope: RequestsScope;
}) {
  const to =
    scope === "own" ? ROUTES.tutorCourseEdit(r.courseSlug) : ROUTES.adminCourseEdit(r.courseId);
  return (
    <div className="min-w-[11rem] max-w-[20rem]">
      <Link
        to={to}
        className="line-clamp-2 break-words font-semibold leading-snug text-ink decoration-gold decoration-2 underline-offset-4 hover:underline"
      >
        {r.courseTitle}
      </Link>
      <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
        {COURSE_TYPE_LABEL[r.courseType] ?? r.courseType}
      </p>
    </div>
  );
}

/** Free seats of an in-person course; red once full. An online course has no limit. */
function SeatsCell({ seatsLeft }: { seatsLeft: number | null }) {
  if (seatsLeft === null || seatsLeft === undefined) {
    return (
      <span className="text-ink-3" title="An online course has no seat limit">
        —
      </span>
    );
  }
  if (seatsLeft <= 0) {
    return (
      <Badge tone="danger" size="sm">
        Full
      </Badge>
    );
  }
  return (
    <span className="whitespace-nowrap tabular-nums text-ink">{seatsLeftText(seatsLeft)}</span>
  );
}

/** Free or paid: a paid approval asks the student to pay, so the price is part of the decision. */
function PriceCell({ request: r }: { request: EnrollmentRequestDto }) {
  return r.paid ? (
    <Badge tone="gold" size="sm" className="tabular-nums">
      Paid · {priceText(r)}
    </Badge>
  ) : (
    <Badge tone="neutral" size="sm">
      Free
    </Badge>
  );
}

function Decided({ request: r }: { request: EnrollmentRequestDto }) {
  return (
    <span className="block whitespace-nowrap text-[12.5px] leading-snug">
      <span className="block text-ink-2 tabular-nums">{formatDateTime(r.decidedAt)}</span>
      {r.decidedByName && <span className="block text-ink-3">by {r.decidedByName}</span>}
    </span>
  );
}

function Reason({ request: r, className }: { request: EnrollmentRequestDto; className?: string }) {
  const reason = r.rejectionReason?.trim();
  if (!reason) return <span className="text-ink-3">No reason given</span>;
  return (
    <p
      className={cn(
        "whitespace-pre-line break-words text-[13px] leading-snug text-ink-2",
        className,
      )}
      title={reason}
    >
      {reason}
    </p>
  );
}

/** The queues' decision pair: Approve in a navy outline with a green tick, Reject as quiet red text. */
function DecisionButtons({
  request,
  onDecide,
  className,
}: {
  request: EnrollmentRequestDto;
  onDecide: Decide;
  className?: string;
}) {
  const name = studentName(request);
  return (
    <div className={cn("flex items-center justify-end gap-2", className)}>
      <Button
        size="sm"
        variant="outline"
        leftIcon={<Check className="size-4 text-ok" />}
        aria-label={`Approve ${name}`}
        onClick={() => onDecide(request, "approve")}
      >
        Approve
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-danger hover:bg-danger-tint hover:text-danger"
        leftIcon={<X className="size-4" />}
        aria-label={`Reject ${name}`}
        onClick={() => onDecide(request, "reject")}
      >
        Reject
      </Button>
    </div>
  );
}

/**
 * Enrolment requests in one state, as a table: who, which course, when,
 * the seats left and the price — what the decision depends on — and, while
 * pending, Approve / Reject. Rejected ones are history (the student may ask
 * again), so they show the decision and its reason instead of buttons.
 *
 * Shared by the expert's Enrollments page and the super admin's page. A 403
 * (an expert whose own approval does not stand) is said plainly; so is a
 * decision refused for a course the viewer does not own, in the dialog.
 */
export function EnrollmentRequestsTable({
  status,
  scope,
}: {
  status: EnrollmentRequestStatus;
  scope: RequestsScope;
}) {
  const [page, setPage] = useState(0);
  const [decision, setDecision] = useState<RequestDecision | null>(null);
  const { data, isFetching, error, refetch } = useListEnrollmentRequestsQuery({
    status,
    page,
    size: 10,
  });
  const pending = status === "PENDING_APPROVAL";

  const decide = useCallback<Decide>((request, kind) => setDecision({ request, kind }), []);

  const columns = useMemo<ColumnDef<EnrollmentRequestDto>[]>(
    () => [
      {
        header: "Student",
        cell: ({ row }) => (
          <PersonCell
            name={studentName(row.original)}
            email={row.original.email}
            avatarUrl={row.original.avatarUrl ?? undefined}
          />
        ),
      },
      { header: "Course", cell: ({ row }) => <CourseCell request={row.original} scope={scope} /> },
      {
        header: "Requested",
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums text-ink-2">
            {formatDateTime(row.original.requestedAt)}
          </span>
        ),
      },
      ...(pending
        ? ([
            {
              header: "Seats left",
              cell: ({ row }) => <SeatsCell seatsLeft={row.original.seatsLeft} />,
            },
            { header: "Price", cell: ({ row }) => <PriceCell request={row.original} /> },
          ] satisfies ColumnDef<EnrollmentRequestDto>[])
        : ([
            { header: "Rejected", cell: ({ row }) => <Decided request={row.original} /> },
            {
              header: "Reason",
              cell: ({ row }) => (
                <Reason
                  request={row.original}
                  className="line-clamp-3 min-w-[12rem] max-w-[20rem]"
                />
              ),
            },
          ] satisfies ColumnDef<EnrollmentRequestDto>[])),
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            {/* The student's whole account (super admins only; renders nothing otherwise). */}
            <ViewProfileLink userId={row.original.studentId} />
            {pending && <DecisionButtons request={row.original} onDecide={decide} />}
          </div>
        ),
      },
    ],
    [pending, scope, decide],
  );

  if (error && !data) {
    const err = error as Partial<NormalizedError>;
    return err.status === 403 ? (
      <EmptyState
        tone="danger"
        Icon={ShieldOff}
        title="You can't decide on enrolment requests"
        description={
          err.message ||
          "Only a course's owner, whose expert approval stands, and the super admin decide on its enrolment requests."
        }
      />
    ) : (
      <EmptyState
        tone="danger"
        Icon={TriangleAlert}
        title="Couldn't load the requests"
        description={err.message || "Please try again in a moment."}
        action={<Button onClick={() => void refetch()}>Try again</Button>}
      />
    );
  }

  return (
    <>
      <DataTable<EnrollmentRequestDto>
        data={data?.content ?? []}
        columns={columns}
        isLoading={isFetching}
        emptyTitle={pending ? "No requests waiting" : "No rejected requests"}
        emptyDescription={
          pending
            ? scope === "own"
              ? "When a student asks to join one of your courses, the request waits here for you."
              : "When a student asks to join a course, the request waits here until its owner or you decide."
            : "Requests turned down are kept here. The student may ask again."
        }
        pagination={
          data
            ? {
                page: data.page,
                size: data.size,
                totalElements: data.totalElements,
                totalPages: data.totalPages,
              }
            : undefined
        }
        onPageChange={setPage}
        getRowId={(r) => r.enrollmentId}
        renderMobileRow={(r) => (
          <RequestPhoneRow request={r} scope={scope} pending={pending} onDecide={decide} />
        )}
      />
      <RequestDecisionDialog decision={decision} onClose={() => setDecision(null)} />
    </>
  );
}

/**
 * A request on a phone (below md): the student, the course, then the facts
 * on one meta line, the reason of a rejected one, and the buttons in reach.
 */
function RequestPhoneRow({
  request: r,
  scope,
  pending,
  onDecide,
}: {
  request: EnrollmentRequestDto;
  scope: RequestsScope;
  pending: boolean;
  onDecide: Decide;
}) {
  return (
    <div className="space-y-3 text-sm text-ink-2">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <PersonCell name={studentName(r)} email={r.email} avatarUrl={r.avatarUrl ?? undefined} />
        </div>
        <ViewProfileLink userId={r.studentId} className="-mr-2" />
      </div>
      <CourseCell request={r} scope={scope} />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12.5px] text-ink-3">
        <span className="tabular-nums">Requested {formatDateTime(r.requestedAt)}</span>
        {pending && (
          <>
            <span aria-hidden>·</span>
            <SeatsCell seatsLeft={r.seatsLeft} />
            <PriceCell request={r} />
          </>
        )}
      </div>
      {!pending && (
        <div className="rounded-[14px] bg-paper-2 px-3.5 py-2.5">
          <p className="text-[12.5px] text-ink-3">
            Rejected {formatDateTime(r.decidedAt)}
            {r.decidedByName ? ` by ${r.decidedByName}` : ""}
          </p>
          <Reason request={r} className="mt-1" />
        </div>
      )}
      {pending && <DecisionButtons request={r} onDecide={onDecide} className="justify-start" />}
    </div>
  );
}
