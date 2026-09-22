import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Input } from "@shared/components/ui/Input";
import { DataTable } from "@shared/components/tables/DataTable";
import { cn } from "@shared/lib/cn";
import {
  DateCell,
  PersonCell,
  ProgressCell,
  StackedProgress,
} from "@features/participants/components/PersonCell";
import { useListMyStudentsQuery } from "@features/students/api/studentsApi";
import type { Student } from "@features/students/types";

export default function StudentsListPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const { data, isFetching } = useListMyStudentsQuery({ page, size: 10, search: search || undefined });

  const columns = useMemo<ColumnDef<Student>[]>(
    () => [
      {
        header: "İştirakçi",
        cell: ({ row }) => (
          <PersonCell name={row.original.fullName} email={row.original.email} avatarUrl={row.original.avatarUrl} />
        ),
      },
      {
        header: "Active",
        cell: ({ row }) => <Count value={row.original.activeEnrollments} />,
      },
      {
        header: "Total enrollments",
        cell: ({ row }) => <Count value={row.original.totalEnrollments} />,
      },
      {
        header: "Avg. progress",
        cell: ({ row }) => <ProgressCell value={row.original.averageProgressPct} />,
      },
      {
        header: "Last active",
        cell: ({ row }) => <DateCell value={row.original.lastActivityAt} />,
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader title="İştirakçilər" description="Everyone who has enrolled in one of your courses." />
      <Input
        placeholder="Search İştirakçilər…"
        leftIcon={<Search className="size-4" />}
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        className="mb-5 sm:max-w-sm"
      />
      <DataTable<Student>
        data={data?.content ?? []}
        columns={columns}
        isLoading={isFetching}
        emptyTitle="No İştirakçilər yet"
        emptyDescription="Once someone enrolls in your courses, they'll appear here."
        pagination={data ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } : undefined}
        onPageChange={setPage}
        getRowId={(r) => String(r.id)}
        renderMobileRow={(s) => <StudentPhoneRow student={s} />}
      />
    </>
  );
}

/**
 * A count as a plain tabular number — both count columns read as the same kind
 * of data (pills are for statuses). Zero steps back to ink-3 so the people
 * still studying stand out down the column.
 */
function Count({ value }: { value: number }) {
  return <span className={cn("font-medium tabular-nums", value > 0 ? "text-ink" : "text-ink-3")}>{value}</span>;
}

/**
 * A student on a phone (below md), where the five columns do not fit: the
 * person, their average progress across the full width, then the counts and
 * the last activity on one meta line — each labelled with its column's name.
 */
function StudentPhoneRow({ student: s }: { student: Student }) {
  return (
    <div className="space-y-3">
      <PersonCell name={s.fullName} email={s.email} avatarUrl={s.avatarUrl} />
      <StackedProgress label="Avg. progress" value={s.averageProgressPct} />
      <dl className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-3">
        <div className="flex gap-1.5">
          <dt>Active</dt>
          <dd><Count value={s.activeEnrollments} /></dd>
        </div>
        <span aria-hidden>·</span>
        <div className="flex gap-1.5">
          <dt>Total enrollments</dt>
          <dd><Count value={s.totalEnrollments} /></dd>
        </div>
        <span aria-hidden>·</span>
        <div className="flex gap-1.5">
          <dt>Last active</dt>
          <dd><DateCell value={s.lastActivityAt} /></dd>
        </div>
      </dl>
    </div>
  );
}
