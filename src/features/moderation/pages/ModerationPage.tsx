import { useState } from "react";
import { Check, Search, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { Card, CardContent } from "@shared/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/Tabs";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { Spinner } from "@shared/components/ui/Spinner";
import { Textarea } from "@shared/components/ui/Textarea";
import { CourseStatusBadge } from "@features/courses/components/CourseStatusBadge";
import {
  useDecideCourseMutation,
  useGetAdminCourseByIdQuery,
  useLazyGetCourseBySlugQuery,
  useListModerationCoursesQuery,
} from "@features/courses/api/coursesApi";
import type { CourseSummaryDto } from "@features/courses/types";
import { COURSE_STATUS } from "@shared/types/lms";

/**
 * Course moderation. The primary flow is the pending-review queue
 * (`GET /api/admin/courses?status=IN_REVIEW`): pick a course, review its
 * detail, then approve/reject. A slug lookup is kept as a secondary option.
 */
export default function ModerationPage() {
  const [tab, setTab] = useState<"queue" | "lookup">("queue");

  return (
    <>
      <PageHeader
        title="Course moderation"
        description="Review courses awaiting approval and publish or reject them."
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as "queue" | "lookup")}>
        <TabsList className="mb-4">
          <TabsTrigger value="queue">Pending queue</TabsTrigger>
          <TabsTrigger value="lookup">Slug lookup</TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <QueueModeration />
        </TabsContent>
        <TabsContent value="lookup">
          <SlugModeration />
        </TabsContent>
      </Tabs>
    </>
  );
}

/* ─────────────────────────── pending-review queue ─────────────────────────── */

function QueueModeration() {
  const [page, setPage] = useState(0);
  const { data, isFetching } = useListModerationCoursesQuery({
    status: COURSE_STATUS.IN_REVIEW,
    page,
    size: 20,
  });
  const [selected, setSelected] = useState<CourseSummaryDto | null>(null);

  // Load the full detail via the admin endpoint (works for ANY status, incl.
  // IN_REVIEW). The public slug endpoint only returns PUBLISHED courses.
  const { data: course, isFetching: loadingDetail } = useGetAdminCourseByIdQuery(selected?.id ?? "", {
    skip: !selected,
  });

  const open = (row: CourseSummaryDto) => {
    setSelected(row);
  };

  const rows = data?.content ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-2 space-y-2">
        {isFetching && rows.length === 0 ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : rows.length === 0 ? (
          <EmptyState title="Nothing to review" description="No courses are awaiting approval right now." />
        ) : (
          <>
            <ul className="space-y-2">
              {rows.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => open(c)}
                    className={
                      "w-full text-left rounded-xl border px-3 py-2.5 transition-colors " +
                      (selected?.id === c.id
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                        : "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5")
                    }
                  >
                    <p className="font-medium text-gray-900 dark:text-white truncate">{c.title}</p>
                    <p className="text-xs text-gray-500 truncate">{c.tutorDisplayName ?? c.slug}</p>
                  </button>
                </li>
              ))}
            </ul>
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-sm">
                <Button variant="secondary" size="sm" disabled={data.page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  Previous
                </Button>
                <span className="text-gray-500">Page {data.page + 1} / {data.totalPages}</span>
                <Button variant="secondary" size="sm" disabled={data.page >= data.totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="lg:col-span-3">
        {!selected ? (
          <EmptyState title="Select a course" description="Pick a course from the queue to review it." />
        ) : loadingDetail || !course ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <ReviewCard
            courseId={course.id}
            title={course.title}
            subtitle={course.subtitle}
            description={course.description}
            status={course.status}
            onDecided={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────── slug lookup ─────────────────────────────── */

function SlugModeration() {
  const [slug, setSlug] = useState("");
  const [trigger, { data: lookup, isFetching, error }] = useLazyGetCourseBySlugQuery();

  // Once the slug resolves to a course we have its id, so re-resolve the detail
  // through the admin endpoint (consistent with the queue; works for any status).
  const { data: adminCourse, isFetching: loadingAdmin } = useGetAdminCourseByIdQuery(lookup?.id ?? "", {
    skip: !lookup?.id,
  });
  const course = adminCourse ?? lookup;

  const review = () => {
    if (slug.trim()) trigger(slug.trim());
  };

  return (
    <>
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="course-slug"
          leftIcon={<Search className="size-4" />}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && review()}
          className="sm:max-w-sm"
        />
        <Button onClick={review} loading={isFetching}>Load</Button>
      </div>

      {isFetching || loadingAdmin ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : error ? (
        <EmptyState title="Course not found" description="Check the slug and try again." />
      ) : course ? (
        <ReviewCard
          courseId={course.id}
          title={course.title}
          subtitle={course.subtitle}
          description={course.description}
          status={course.status}
        />
      ) : (
        <EmptyState title="No course loaded" description="Enter a course slug above to begin moderation." />
      )}
    </>
  );
}

/* ─────────────────────────── shared review card ──────────────────────────── */

function ReviewCard({
  courseId,
  title,
  subtitle,
  description,
  status,
  onDecided,
}: {
  courseId: string;
  title: string;
  subtitle?: string;
  description?: string;
  status: CourseSummaryDto["status"];
  onDecided?: () => void;
}) {
  const [decide, { isLoading: deciding }] = useDecideCourseMutation();
  const [note, setNote] = useState("");

  const submit = async (decision: "APPROVED" | "REJECTED") => {
    try {
      await decide({ id: courseId, decision, note: note.trim() || undefined }).unwrap();
      toast.success(decision === "APPROVED" ? "Course published" : "Course rejected");
      setNote("");
      onDecided?.();
    } catch {
      toast.error("Could not save decision");
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
          <CourseStatusBadge status={status} />
        </div>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{description}</p>
        )}
        <Textarea
          rows={3}
          placeholder="Moderator note (sent to the tutor on rejection)…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="danger" leftIcon={<X className="size-4" />} loading={deciding} onClick={() => submit("REJECTED")}>
            Reject
          </Button>
          <Button variant="secondary" leftIcon={<Check className="size-4" />} loading={deciding} onClick={() => submit("APPROVED")}>
            Publish
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
