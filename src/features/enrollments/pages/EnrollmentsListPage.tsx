import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { StatusBadge } from "@shared/components/ui/Badge";
import { DataTable } from "@shared/components/tables/DataTable";
import { CourseCover } from "@shared/components/bright";
import { DateCell, ProgressCell, StackedProgress } from "@features/participants/components/PersonCell";
import { useListMyEnrollmentsQuery } from "@features/enrollments/api/enrollmentsApi";
import type { EnrollmentDto } from "@features/enrollments/types";

/**
 * Backend exposes the current user's OWN enrollments (`/portal/enrollments/mine`).
 * A tutor-facing "students enrolled in my courses" endpoint is pending — see GAP_REPORT.md.
 */
export default function EnrollmentsListPage() {
  const [page, setPage] = useState(0);
  const { data, isFetching } = useListMyEnrollmentsQuery({ page, size: 10 });

  const columns = useMemo<ColumnDef<EnrollmentDto>[]>(
    () => [
      {
        header: "Course",
        // accessorKey stays: it is what the column sorts on.
        accessorKey: "courseTitle",
        cell: ({ row }) => <CourseTitle enrollment={row.original} />,
      },
      {
        header: "Progress",
        cell: ({ row }) => <ProgressCell value={row.original.progressPercent} />,
      },
      {
        header: "Source",
        accessorKey: "source",
        // A source is not a state: a neutral pill with no status dot.
        cell: ({ row }) => <StatusBadge value={row.original.source} dot={false} size="sm" />,
      },
      { header: "Status", cell: ({ row }) => <StatusBadge value={row.original.status} /> },
      { header: "Enrolled", cell: ({ row }) => <DateCell value={row.original.enrolledAt} /> },
    ],
    [],
  );

  return (
    <>
      <PageHeader title="My enrollments" description="Courses you're enrolled in and your progress." />
      <DataTable<EnrollmentDto>
        data={data?.content ?? []}
        columns={columns}
        isLoading={isFetching}
        emptyTitle="No enrollments"
        emptyDescription="Courses you enroll in will appear here."
        pagination={data ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } : undefined}
        onPageChange={setPage}
        getRowId={(r) => r.id}
        renderMobileRow={(e) => <EnrollmentPhoneRow enrollment={e} />}
      />
    </>
  );
}

/**
 * The course: the same generated cover it has everywhere else (seeded by its
 * id; this DTO carries no category, so it is drawn in navy) and its title —
 * one truncated line beside the other columns, two lines on a phone, where it
 * has the row to itself.
 */
function CourseTitle({ enrollment: e }: { enrollment: EnrollmentDto }) {
  return (
    <div className="flex min-w-0 items-center gap-3.5">
      <CourseCover seed={e.courseId} thumb className="size-11 shrink-0 rounded-[14px]" />
      <p
        className="break-words font-semibold text-ink max-md:line-clamp-2 md:max-w-[26rem] md:truncate"
        title={e.courseTitle}
      >
        {e.courseTitle}
      </p>
    </div>
  );
}

/**
 * An enrollment on a phone (below md): the course, its progress across the
 * full width, then status, source and the enrolment date on one meta line.
 */
function EnrollmentPhoneRow({ enrollment: e }: { enrollment: EnrollmentDto }) {
  return (
    <div className="space-y-3">
      <CourseTitle enrollment={e} />
      <StackedProgress label="Progress" value={e.progressPercent} />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12.5px] text-ink-3">
        <StatusBadge value={e.status} size="sm" />
        <StatusBadge value={e.source} dot={false} size="sm" />
        <span className="flex gap-1.5">
          Enrolled <DateCell value={e.enrolledAt} />
        </span>
      </div>
    </div>
  );
}
