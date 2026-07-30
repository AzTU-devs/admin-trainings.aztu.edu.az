import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Search } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { Badge } from "@shared/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger } from "@shared/components/ui/Tabs";
import { DataTable } from "@shared/components/tables/DataTable";
import { CourseStatusBadge } from "@features/courses/components/CourseStatusBadge";
import { useListMyCoursesQuery } from "@features/courses/api/coursesApi";
import type { CourseSummaryDto } from "@features/courses/types";
import { COURSE_STATUS, type CourseStatus } from "@shared/types/lms";
import { ROUTES } from "@shared/constants/routes";

type StatusFilter = "ALL" | CourseStatus;

/**
 * Tutor's own courses (all statuses) — backed by `GET /api/portal/courses`,
 * optionally filtered by `?status=`.
 */
export default function CoursesListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");

  const { data, isFetching } = useListMyCoursesQuery({
    page,
    size: 10,
    status: status === "ALL" ? undefined : status,
  });

  const filtered = useMemo(() => {
    const rows = data?.content ?? [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((c) => c.title.toLowerCase().includes(q));
  }, [data, search]);

  const columns = useMemo<ColumnDef<CourseSummaryDto>[]>(
    () => [
      {
        header: "Title",
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
      { header: "Enrolled", cell: ({ row }) => row.original.enrolledCount.toLocaleString() },
      {
        header: "Price",
        cell: ({ row }) => (row.original.free ? <Badge tone="success">Free</Badge> : `${row.original.price} ${row.original.currency}`),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="My courses"
        description="Every course you've created, across all statuses."
        actions={
          <Button leftIcon={<Plus className="size-4" />} onClick={() => navigate(ROUTES.tutorCourseNew)}>
            New course
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <Tabs
          value={status}
          onValueChange={(v) => {
            setStatus(v as StatusFilter);
            setPage(0);
          }}
        >
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value={COURSE_STATUS.DRAFT}>Draft</TabsTrigger>
            <TabsTrigger value={COURSE_STATUS.IN_REVIEW}>In review</TabsTrigger>
            <TabsTrigger value={COURSE_STATUS.PUBLISHED}>Published</TabsTrigger>
            <TabsTrigger value={COURSE_STATUS.REJECTED}>Rejected</TabsTrigger>
            <TabsTrigger value={COURSE_STATUS.ARCHIVED}>Archived</TabsTrigger>
          </TabsList>
        </Tabs>

        <Input
          placeholder="Filter by title…"
          leftIcon={<Search className="size-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs sm:ml-auto"
        />
      </div>

      <DataTable<CourseSummaryDto>
        data={filtered}
        columns={columns}
        isLoading={isFetching}
        emptyTitle="No courses yet"
        emptyDescription="Create your first course and submit it for review."
        pagination={data ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } : undefined}
        onPageChange={setPage}
        onRowClick={(row) => navigate(ROUTES.tutorCourseEdit(row.slug))}
        getRowId={(row) => row.id}
      />
    </>
  );
}
