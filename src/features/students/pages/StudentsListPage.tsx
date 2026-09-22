import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Input } from "@shared/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/Select";
import { DataTable } from "@shared/components/tables/DataTable";
import { resolveApiUrl } from "@shared/config/env";
import { useDebouncedValue } from "@shared/lib/useDebouncedValue";
import { TutorAvatar } from "@features/tutors/components/TutorAvatar";
import { useListMyStudentsQuery } from "@features/students/api/studentsApi";
import { useListMyCoursesQuery } from "@features/courses/api/coursesApi";
import type { Student } from "@features/students/types";

const ALL = "__all__";

export default function StudentsListPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState<string>(ALL);
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data: courses } = useListMyCoursesQuery({ size: 100 });
  // The API filters by course (`courseId`); the page never offered it, so there
  // was no way to see who is on one particular course.
  const { currentData: data, isFetching, isError, error, refetch } = useListMyStudentsQuery({
    page,
    size: 10,
    search: debouncedSearch.trim() || undefined,
    courseId: courseId === ALL ? undefined : courseId,
  });

  const columns = useMemo<ColumnDef<Student>[]>(
    () => [
      {
        header: "İştirakçi",
        meta: { lang: "az" },
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            {/* The avatar URL is the authenticated media route, which a plain
                <img> cannot load (no bearer token) — it always showed initials.
                TutorAvatar fetches it through the API client. */}
            <TutorAvatar size="sm" src={resolveApiUrl(row.original.avatarUrl) || null} name={row.original.fullName} />
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">{row.original.fullName}</p>
              <p className="text-xs text-gray-500 truncate">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      { header: "Active", cell: ({ row }) => row.original.activeEnrollments },
      { header: "Total enrollments", cell: ({ row }) => row.original.totalEnrollments },
      {
        header: "Avg. progress",
        cell: ({ row }) => `${row.original.averageProgressPct}%`,
      },
      {
        header: "Last active",
        cell: ({ row }) => row.original.lastActivityAt ? new Date(row.original.lastActivityAt).toLocaleDateString() : "—",
      },
    ],
    [],
  );

  const filtered = debouncedSearch.trim() || courseId !== ALL;

  return (
    <>
      <PageHeader title="İştirakçilər" description="Everyone who has enrolled in one of your courses." />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
        <Input
          placeholder="Search İştirakçilər…"
          leftIcon={<Search className="size-4" />}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="sm:max-w-sm"
          aria-label="Search İştirakçilər"
        />
        <Select value={courseId} onValueChange={(v) => { setCourseId(v); setPage(0); }}>
          <SelectTrigger className="sm:max-w-xs" aria-label="Filter by course"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All my courses</SelectItem>
            {(courses?.content ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DataTable<Student>
        data={data?.content ?? []}
        columns={columns}
        isLoading={isFetching && !data}
        isError={isError}
        error={error}
        onRetry={refetch}
        errorWhat="İştirakçilər"
        emptyTitle={filtered ? "No matching İştirakçilər" : "No İştirakçilər yet"}
        emptyDescription={filtered ? "Try another name or course." : "Once someone enrolls in your courses, they'll appear here."}
        pagination={data ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } : undefined}
        onPageChange={setPage}
        getRowId={(r) => String(r.id)}
      />
    </>
  );
}
