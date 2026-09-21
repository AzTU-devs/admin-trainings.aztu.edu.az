import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@shared/components/ui/Badge";
import { CourseStatusBadge } from "@features/courses/components/CourseStatusBadge";
import type { CourseSummaryDto } from "@features/courses/types";

const titleColumn: ColumnDef<CourseSummaryDto> = {
  header: "Title",
  cell: ({ row }) => (
    <div className="min-w-0">
      <p className="font-medium text-gray-900 dark:text-white truncate">{row.original.title}</p>
      <p className="text-xs text-gray-500 truncate">{row.original.subtitle ?? row.original.slug}</p>
    </div>
  ),
};

const tutorColumn: ColumnDef<CourseSummaryDto> = {
  header: "Tutor",
  cell: ({ row }) => (
    <span className="text-gray-700 dark:text-gray-200">{row.original.tutorDisplayName ?? "—"}</span>
  ),
};

const statusColumn: ColumnDef<CourseSummaryDto> = {
  header: "Status",
  cell: ({ row }) => <CourseStatusBadge status={row.original.status} />,
};

const priceColumn: ColumnDef<CourseSummaryDto> = {
  header: "Price",
  cell: ({ row }) =>
    row.original.free ? (
      <Badge tone="success">Free</Badge>
    ) : (
      `${row.original.price} ${row.original.currency}`
    ),
};

/**
 * Columns shared by the tutor's own-course list and the admin's all-course
 * list. The tutor column only earns its width when rows can come from
 * different tutors, which is never the case in a tutor's own list.
 */
export function courseColumns(opts: { showTutor?: boolean } = {}): ColumnDef<CourseSummaryDto>[] {
  return [
    titleColumn,
    ...(opts.showTutor ? [tutorColumn] : []),
    statusColumn,
    { header: "Type", accessorKey: "courseType" },
    { header: "Level", accessorKey: "level" },
    { header: "Enrolled", cell: ({ row }) => row.original.enrolledCount.toLocaleString() },
    priceColumn,
  ];
}
