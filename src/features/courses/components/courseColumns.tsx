import type { ColumnDef } from "@tanstack/react-table";
import { CourseStatusBadge } from "@features/courses/components/CourseStatusBadge";
import {
  CourseLevelValue,
  CoursePriceValue,
  CourseRowMeta,
  CourseTitleCell,
  CourseTypeValue,
  TutorCell,
} from "@features/courses/components/courseCells";
import type { CourseSummaryDto } from "@features/courses/types";

function titleColumn(showTutor?: boolean): ColumnDef<CourseSummaryDto> {
  return {
    header: "Title",
    cell: ({ row }) => (
      <CourseTitleCell course={row.original} meta={<CourseRowMeta course={row.original} showTutor={showTutor} />} />
    ),
  };
}

const tutorColumn: ColumnDef<CourseSummaryDto> = {
  header: "Tutor",
  cell: ({ row }) => <TutorCell name={row.original.tutorDisplayName} />,
};

const statusColumn: ColumnDef<CourseSummaryDto> = {
  header: "Status",
  cell: ({ row }) => <CourseStatusBadge status={row.original.status} />,
};

const priceColumn: ColumnDef<CourseSummaryDto> = {
  header: "Price",
  cell: ({ row }) => (
    <CoursePriceValue free={row.original.free} price={row.original.price} currency={row.original.currency} />
  ),
};

/**
 * Columns shared by the tutor's own-course list and the admin's all-course
 * list. The tutor column only earns its width when rows can come from
 * different tutors, which is never the case in a tutor's own list.
 *
 * Type and level keep their `accessorKey`, so they stay sortable exactly as
 * before; the `cell` only dresses the value (icon, level meter).
 */
export function courseColumns(opts: { showTutor?: boolean } = {}): ColumnDef<CourseSummaryDto>[] {
  return [
    titleColumn(opts.showTutor),
    ...(opts.showTutor ? [tutorColumn] : []),
    statusColumn,
    {
      header: "Type",
      accessorKey: "courseType",
      cell: ({ row }) => <CourseTypeValue type={row.original.courseType} />,
    },
    {
      header: "Level",
      accessorKey: "level",
      cell: ({ row }) => <CourseLevelValue level={row.original.level} />,
    },
    {
      header: "Enrolled",
      cell: ({ row }) => (
        <span className="font-medium text-ink tabular-nums">{row.original.enrolledCount.toLocaleString()}</span>
      ),
    },
    priceColumn,
  ];
}
