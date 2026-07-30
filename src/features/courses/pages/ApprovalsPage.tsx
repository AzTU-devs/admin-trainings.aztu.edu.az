import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@shared/components/ui/Tabs";
import { DataTable } from "@shared/components/tables/DataTable";
import { CourseStatusBadge } from "@features/courses/components/CourseStatusBadge";
import { useListMyCoursesQuery } from "@features/courses/api/coursesApi";
import type { CourseSummaryDto } from "@features/courses/types";
import { COURSE_STATUS, type CourseStatus } from "@shared/types/lms";
import { ROUTES } from "@shared/constants/routes";

type Filter = Extract<CourseStatus, "IN_REVIEW" | "REJECTED" | "PUBLISHED">;

/**
 * Tracks the review status of a tutor's own submissions.
 * Backed by `GET /api/portal/courses?status=...` (own courses).
 */
export default function ApprovalsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Filter>(COURSE_STATUS.IN_REVIEW);
  const [page, setPage] = useState(0);

  const { data, isFetching } = useListMyCoursesQuery({ status, page, size: 10 });

  const columns = useMemo<ColumnDef<CourseSummaryDto>[]>(
    () => [
      {
        header: "Course",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">{row.original.title}</p>
            <p className="text-xs text-gray-500 truncate">{row.original.subtitle ?? row.original.slug}</p>
          </div>
        ),
      },
      { header: "Status", cell: ({ row }) => <CourseStatusBadge status={row.original.status} /> },
      { header: "Type", accessorKey: "courseType" },
      { header: "Level", accessorKey: "level" },
      {
        header: "Submitted",
        cell: ({ row }) =>
          row.original.publishedAt ? new Date(row.original.publishedAt).toLocaleDateString() : "—",
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Approval status"
        description="Track which of your courses are awaiting review, rejected or published."
      />

      <Tabs
        value={status}
        onValueChange={(v) => {
          setStatus(v as Filter);
          setPage(0);
        }}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value={COURSE_STATUS.IN_REVIEW}>In review</TabsTrigger>
          <TabsTrigger value={COURSE_STATUS.REJECTED}>Rejected</TabsTrigger>
          <TabsTrigger value={COURSE_STATUS.PUBLISHED}>Published</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable<CourseSummaryDto>
        data={data?.content ?? []}
        columns={columns}
        isLoading={isFetching}
        emptyTitle={
          status === COURSE_STATUS.IN_REVIEW
            ? "Nothing awaiting review"
            : status === COURSE_STATUS.REJECTED
              ? "No rejected courses"
              : "No published courses"
        }
        emptyDescription={
          status === COURSE_STATUS.IN_REVIEW
            ? "Submit a draft course for review and it'll appear here."
            : "Open a course to edit and resubmit it."
        }
        pagination={data ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } : undefined}
        onPageChange={setPage}
        onRowClick={(row) => navigate(ROUTES.tutorCourseEdit(row.slug))}
        getRowId={(row) => row.id}
      />
    </>
  );
}
