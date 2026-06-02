import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Input } from "@shared/components/ui/Input";
import { DataTable } from "@shared/components/tables/DataTable";
import { Avatar, AvatarFallback, AvatarImage } from "@shared/components/ui/Avatar";
import { useListMyStudentsQuery } from "@features/students/api/studentsApi";
import type { Student } from "@features/students/types";

function initials(name: string) {
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function StudentsListPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const { data, isFetching } = useListMyStudentsQuery({ page, size: 10, search: search || undefined });

  const columns = useMemo<ColumnDef<Student>[]>(
    () => [
      {
        header: "Student",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar size="sm">
              <AvatarImage src={row.original.avatarUrl} />
              <AvatarFallback>{initials(row.original.fullName)}</AvatarFallback>
            </Avatar>
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

  return (
    <>
      <PageHeader title="Students" description="Everyone who has enrolled in one of your courses." />
      <Input
        placeholder="Search students…"
        leftIcon={<Search className="size-4" />}
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        className="sm:max-w-sm mb-4"
      />
      <DataTable<Student>
        data={data?.content ?? []}
        columns={columns}
        isLoading={isFetching}
        emptyTitle="No students yet"
        emptyDescription="Once students enroll in your courses, they'll appear here."
        pagination={data ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } : undefined}
        onPageChange={setPage}
        getRowId={(r) => String(r.id)}
      />
    </>
  );
}
