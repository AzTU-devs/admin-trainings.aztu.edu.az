import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@shared/components/ui/Badge";
import { CourseStatusBadge } from "@features/courses/components/CourseStatusBadge";
import type { CourseSummaryDto } from "@features/courses/types";
import { enumLabel } from "@shared/constants/enumLabels";

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
/** Friendly labels rather than the raw enum codes (OFFLINE, BEGINNER). */
export const typeColumn: ColumnDef<CourseSummaryDto> = {
  header: "Type",
  cell: ({ row }) => enumLabel("courseType", row.original.courseType),
};

export const levelColumn: ColumnDef<CourseSummaryDto> = {
  header: "Level",
  cell: ({ row }) => enumLabel("courseLevel", row.original.level),
};

/**
 * @param coTutorOf  The viewer's tutor profile id. Rows it is on the roster of
 *   but not the editor of get a "Co-tutor" tag, so the tutor knows before opening
 *   one that it will be read-only.
 */
export function courseColumns(
  opts: { showTutor?: boolean; coTutorOf?: string } = {},
): ColumnDef<CourseSummaryDto>[] {
  const title: ColumnDef<CourseSummaryDto> = opts.coTutorOf
    ? {
        header: "Title",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">
              {row.original.title}
              {row.original.tutorId !== opts.coTutorOf && (
                <Badge tone="neutral" className="ml-2">Co-tutor</Badge>
              )}
            </p>
            <p className="text-xs text-gray-500 truncate">{row.original.subtitle ?? row.original.slug}</p>
          </div>
        ),
      }
    : titleColumn;
  return [
    title,
    ...(opts.showTutor ? [tutorColumn] : []),
    statusColumn,
    typeColumn,
    levelColumn,
    { header: "Enrolled", cell: ({ row }) => row.original.enrolledCount.toLocaleString() },
    priceColumn,
  ];
}
