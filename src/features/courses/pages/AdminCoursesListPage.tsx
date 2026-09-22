import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Plus } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Tabs, TabsList, TabsTrigger } from "@shared/components/ui/Tabs";
import { DataTable } from "@shared/components/tables/DataTable";
import { courseColumns } from "@features/courses/components/courseColumns";
import { COURSE_TABLE_PHONE } from "@features/courses/components/courseCells";
import { useListModerationCoursesQuery } from "@features/courses/api/coursesApi";
import type { CourseSummaryDto } from "@features/courses/types";
import { COURSE_STATUS, type CourseStatus } from "@shared/types/lms";
import { ROUTES } from "@shared/constants/routes";

const STATUS_TABS: { value: CourseStatus; label: string }[] = [
  { value: COURSE_STATUS.PUBLISHED, label: "Published" },
  { value: COURSE_STATUS.DRAFT, label: "Draft" },
  { value: COURSE_STATUS.IN_REVIEW, label: "In review" },
  { value: COURSE_STATUS.REJECTED, label: "Rejected" },
  { value: COURSE_STATUS.ARCHIVED, label: "Archived" },
];

/**
 * Every course on the platform, whoever teaches it — backed by
 * `GET /api/admin/courses`. That endpoint lists one status at a time, so the
 * tabs are the whole filter: there is no "all statuses" view to offer, and no
 * server-side text search either (the tutor list's `?q=` is portal-only).
 */
export default function AdminCoursesListPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<CourseStatus>(COURSE_STATUS.PUBLISHED);
  const [page, setPage] = useState(0);

  const { data, isFetching } = useListModerationCoursesQuery({ status, page, size: 10 });

  const columns = useMemo(() => courseColumns({ showTutor: true }), []);

  const statusLabel = STATUS_TABS.find((t) => t.value === status)?.label.toLowerCase() ?? "";

  return (
    <>
      <PageHeader
        title="Courses"
        description="Every course on the platform. Create one, edit it and publish it."
        actions={
          <Button leftIcon={<Plus className="size-4" />} onClick={() => navigate(ROUTES.adminCourseNew)}>
            New course
          </Button>
        }
      />

      <Tabs
        value={status}
        onValueChange={(v) => {
          setStatus(v as CourseStatus);
          setPage(0);
        }}
        className="mb-4"
      >
        <TabsList>
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable<CourseSummaryDto>
        data={data?.content ?? []}
        columns={columns}
        isLoading={isFetching}
        // A failed load says so, with a retry, instead of "No … courses".
        emptyTitle={`No ${statusLabel} courses`}
        emptyDescription="Pick another status, or create a course."
        pagination={data ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } : undefined}
        onPageChange={setPage}
        onRowClick={(row) => navigate(ROUTES.adminCourseEdit(row.id))}
        getRowId={(row) => row.id}
        className={COURSE_TABLE_PHONE}
      />
    </>
  );
}
