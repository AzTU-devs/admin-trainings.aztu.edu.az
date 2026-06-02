import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Badge } from "@shared/components/ui/Badge";
import { DataTable } from "@shared/components/tables/DataTable";
import { useListMyEnrollmentsQuery } from "@features/enrollments/api/enrollmentsApi";
import type { EnrollmentDto } from "@features/enrollments/types";
import { ENROLLMENT_STATUS, type EnrollmentStatus } from "@shared/types/lms";

const TONE: Record<EnrollmentStatus, "neutral" | "warning" | "success" | "danger" | "brand"> = {
  [ENROLLMENT_STATUS.PENDING_PAYMENT]: "warning",
  [ENROLLMENT_STATUS.ACTIVE]: "brand",
  [ENROLLMENT_STATUS.COMPLETED]: "success",
  [ENROLLMENT_STATUS.CANCELLED]: "danger",
  [ENROLLMENT_STATUS.REFUNDED]: "neutral",
};

/**
 * Backend exposes the current user's OWN enrollments (`/portal/enrollments/mine`).
 * A tutor-facing "students enrolled in my courses" endpoint is pending — see GAP_REPORT.md.
 */
export default function EnrollmentsListPage() {
  const [page, setPage] = useState(0);
  const { data, isFetching } = useListMyEnrollmentsQuery({ page, size: 10 });

  const columns = useMemo<ColumnDef<EnrollmentDto>[]>(
    () => [
      { header: "Course", accessorKey: "courseTitle" },
      {
        header: "Progress",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 min-w-[140px]">
            <div className="h-1.5 flex-1 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
              <div className="h-full bg-brand-700" style={{ width: `${row.original.progressPercent}%` }} />
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-300 w-9 text-right">{row.original.progressPercent}%</span>
          </div>
        ),
      },
      { header: "Source", accessorKey: "source" },
      { header: "Status", cell: ({ row }) => <Badge tone={TONE[row.original.status]} dot>{row.original.status.replace(/_/g, " ")}</Badge> },
      { header: "Enrolled", cell: ({ row }) => new Date(row.original.enrolledAt).toLocaleDateString() },
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
      />
    </>
  );
}
