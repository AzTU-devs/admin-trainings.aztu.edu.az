import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
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
import { useDebouncedValue } from "@shared/lib/useDebouncedValue";

type StatusFilter = "ALL" | CourseStatus;

/**
 * Tutor's own courses (all statuses) — backed by `GET /api/portal/courses`.
 * Both the status tabs and the search box are server-side filters (`?status=`,
 * `?q=`), so they narrow the whole result set rather than the current page.
 */
export default function CoursesListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState(urlQuery);
  const [status, setStatus] = useState<StatusFilter>("ALL");

  // The header's search box navigates here with ?q=. Adopting it in an effect
  // rather than only as useState's initial value matters when this page is
  // already mounted: a second search from the header changes the URL without
  // remounting, and initial state would ignore it.
  useEffect(() => {
    setSearch(urlQuery);
    setPage(0);
  }, [urlQuery]);

  // Debounced, because the query goes to the server on every change. Searching
  // in the browser instead would only ever look at the ten rows on this page,
  // so a tutor past page one could not find a course by name.
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isFetching } = useListMyCoursesQuery({
    page,
    size: 10,
    status: status === "ALL" ? undefined : status,
    q: debouncedSearch.trim() || undefined,
  });

  const rows = data?.content ?? [];

  // Drives the empty state's wording: "no courses yet" is wrong and discouraging
  // when the tutor has plenty and simply mistyped a search.
  const activeFilter = debouncedSearch.trim().length > 0 || status !== "ALL";

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
          placeholder="Search title, subtitle or slug…"
          leftIcon={<Search className="size-4" />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="sm:max-w-xs sm:ml-auto"
        />
      </div>

      <DataTable<CourseSummaryDto>
        data={rows}
        columns={columns}
        isLoading={isFetching}
        emptyTitle={activeFilter ? "No matching courses" : "No courses yet"}
        emptyDescription={
          activeFilter
            ? "No course matches this search and status. Try a different term."
            : "Create your first course and submit it for review."
        }
        pagination={data ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } : undefined}
        onPageChange={setPage}
        onRowClick={(row) => navigate(ROUTES.tutorCourseEdit(row.slug))}
        getRowId={(row) => row.id}
      />
    </>
  );
}
