import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Search } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { Badge } from "@shared/components/ui/Badge";
import { DataTable } from "@shared/components/tables/DataTable";
import { CourseStatusBadge } from "@features/courses/components/CourseStatusBadge";
import { useBrowseCoursesQuery } from "@features/courses/api/coursesApi";
import type { CourseSummaryDto } from "@features/courses/types";
import { ROUTES } from "@shared/constants/routes";

/**
 * NOTE: the backend has no "list my courses" endpoint yet, only the public
 * catalog (PUBLISHED only). This page browses the public catalog as a stand-in.
 * See GAP_REPORT.md → `GET /api/portal/courses` (list own) is pending.
 */
export default function CoursesListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const { data, isFetching } = useBrowseCoursesQuery({ page, size: 10 });

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
        title="Courses"
        description="Browse the published catalog. (Listing your own drafts needs a backend endpoint — see gap report.)"
        actions={
          <Button leftIcon={<Plus className="size-4" />} onClick={() => navigate(ROUTES.tutorCourseNew)}>
            New course
          </Button>
        }
      />

      <Input
        placeholder="Filter by title…"
        leftIcon={<Search className="size-4" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="sm:max-w-sm mb-4"
      />

      <DataTable<CourseSummaryDto>
        data={filtered}
        columns={columns}
        isLoading={isFetching}
        emptyTitle="No published courses"
        emptyDescription="Create a course and submit it for review to see it here once published."
        pagination={data ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } : undefined}
        onPageChange={setPage}
        onRowClick={(row) => navigate(ROUTES.tutorCourseEdit(row.slug))}
        getRowId={(row) => row.id}
      />
    </>
  );
}
