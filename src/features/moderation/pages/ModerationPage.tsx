import { useState } from "react";
import { Link } from "react-router";
import { Check, Search, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { Badge } from "@shared/components/ui/Badge";
import { Card, CardContent } from "@shared/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/Tabs";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { QueryErrorState } from "@shared/components/feedback/QueryErrorState";
import { Spinner } from "@shared/components/ui/Spinner";
import { Textarea } from "@shared/components/ui/Textarea";
import { MediaImage } from "@shared/components/ui/MediaImage";
import { apiErrorMessage, toNormalizedError } from "@shared/lib/apiError";
import { CourseStatusBadge } from "@features/courses/components/CourseStatusBadge";
import { CourseContentView } from "@features/courses/components/CourseContentView";
import {
  useDecideCourseMutation,
  useGetAdminCourseByIdQuery,
  useLazyGetCourseBySlugQuery,
  useListModerationCoursesQuery,
} from "@features/courses/api/coursesApi";
import { useListCategoriesQuery } from "@features/categories/api/categoriesApi";
import type { CourseDto, CourseSummaryDto } from "@features/courses/types";
import { COURSE_STATUS, COURSE_TYPE } from "@shared/types/lms";
import { enumLabel } from "@shared/constants/enumLabels";
import { ROUTES } from "@shared/constants/routes";

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
  const { currentData: data, isFetching, isError, error, refetch } = useListModerationCoursesQuery({
    status: COURSE_STATUS.IN_REVIEW,
    page,
    size: 20,
  });
  const [selected, setSelected] = useState<CourseSummaryDto | null>(null);

  // Load the full detail via the admin endpoint (works for ANY status, incl.
  // IN_REVIEW). The public slug endpoint only returns PUBLISHED courses.
  const detail = useGetAdminCourseByIdQuery(selected?.id ?? "", { skip: !selected });
  const course = detail.currentData;

  const rows = data?.content ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-2 space-y-2">
        {isFetching && !data ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : isError ? (
          <QueryErrorState error={error} onRetry={refetch} what="the review queue" />
        ) : rows.length === 0 ? (
          <EmptyState title="Nothing to review" description="No courses are awaiting approval right now." />
        ) : (
          <>
            <ul className="space-y-2">
              {rows.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(c)}
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
        ) : detail.isError ? (
          <QueryErrorState error={detail.error} onRetry={detail.refetch} what="this course" />
        ) : !course ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          // Keyed by course: the note typed for one course used to stay in the
          // box when another was selected, so B could be rejected with A's reason.
          <ReviewCard key={course.id} course={course} onDecided={() => setSelected(null)} />
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
  const admin = useGetAdminCourseByIdQuery(lookup?.id ?? "", { skip: !lookup?.id });
  const course = admin.currentData ?? lookup;

  const review = () => {
    if (slug.trim()) void trigger(slug.trim());
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
          aria-label="Course slug"
        />
        <Button onClick={review} loading={isFetching}>Load</Button>
      </div>

      {isFetching || admin.isFetching ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : error ? (
        toNormalizedError(error).status === 404 ? (
          <EmptyState title="Course not found" description="Check the slug and try again." />
        ) : (
          <QueryErrorState error={error} onRetry={review} what="the course" />
        )
      ) : course ? (
        <ReviewCard key={course.id} course={course} />
      ) : (
        <EmptyState title="No course loaded" description="Enter a course slug above to begin moderation." />
      )}
    </>
  );
}

/* ─────────────────────────── shared review card ──────────────────────────── */

function ReviewCard({ course, onDecided }: { course: CourseDto; onDecided?: () => void }) {
  const [decide, { isLoading: deciding }] = useDecideCourseMutation();
  const { data: categories } = useListCategoriesQuery("admin");
  const [note, setNote] = useState("");
  const inReview = course.status === COURSE_STATUS.IN_REVIEW;

  const submit = async (decision: "APPROVED" | "REJECTED") => {
    try {
      await decide({ id: course.id, decision, note: note.trim() || undefined }).unwrap();
      toast.success(decision === "APPROVED" ? "Course published" : "Course rejected");
      setNote("");
      onDecided?.();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not save the decision"));
    }
  };

  const categoryNames = course.categoryIds
    .map((id) => categories?.find((c) => c.id === id)?.path ?? null)
    .filter((n): n is string => !!n);
  const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0);

  return (
    <Card>
      <CardContent className="space-y-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{course.title}</h2>
            {course.subtitle && <p className="text-sm text-gray-500">{course.subtitle}</p>}
          </div>
          <CourseStatusBadge status={course.status} />
        </div>

        {course.thumbnailMediaId && (
          <div className="aspect-video overflow-hidden rounded-xl bg-gray-100 dark:bg-white/5">
            <MediaImage mediaId={course.thumbnailMediaId} className="h-full w-full object-cover" />
          </div>
        )}

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <Fact label="Type" value={enumLabel("courseType", course.courseType)} />
          <Fact label="Level" value={enumLabel("courseLevel", course.level)} />
          <Fact label="Language" value={course.language.toUpperCase()} />
          <Fact label="Price" value={course.free ? "Free" : `${course.price} ${course.currency}`} />
          <Fact
            label="Tutors"
            value={course.tutors.map((t) => `${t.displayName ?? "Tutor"}${t.authorized ? " (editor)" : ""}`).join(", ") || "—"}
          />
          <Fact label="Categories" value={categoryNames.join(", ") || "—"} />
          {course.courseType === COURSE_TYPE.OFFLINE && course.offlineDetails && (
            <Fact
              label="Schedule"
              value={`${course.offlineDetails.startDate ?? "?"} → ${course.offlineDetails.endDate ?? "?"} · ${course.offlineDetails.studentLimit ?? "?"} seats`}
            />
          )}
        </dl>

        {course.description && <Section title="Description">{course.description}</Section>}
        {course.requirements && <Section title="Requirements">{course.requirements}</Section>}
        {course.learningOutcomes && <Section title="Learning outcomes">{course.learningOutcomes}</Section>}

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Content</h3>
          <CourseContentView modules={course.modules} />
        </div>

        {inReview ? (
          <>
            {course.courseType === COURSE_TYPE.ONLINE && lessonCount === 0 && (
              <Badge tone="warning">No lessons — publishing now gives enrolled people nothing to study</Badge>
            )}
            {/* Only an API that delivers the note (in-app and by email, shown on
                the course) may be promised to; an older one stored it unseen.
                A versioned course means the newer API. */}
            <Textarea
              rows={3}
              placeholder={
                typeof course.version === "number"
                  ? "Note to the tutor — sent with the decision and shown on the course…"
                  : "Internal note (not sent to the tutor)…"
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              aria-label="Moderation note"
            />
            <div className="flex justify-end gap-2">
              <Button variant="danger" leftIcon={<X className="size-4" />} loading={deciding} onClick={() => submit("REJECTED")}>
                Reject
              </Button>
              <Button variant="secondary" leftIcon={<Check className="size-4" />} loading={deciding} onClick={() => submit("APPROVED")}>
                Publish
              </Button>
            </div>
          </>
        ) : (
          // A decision on anything but IN_REVIEW is refused (409
          // INVALID_COURSE_TRANSITION); point to where it can be managed instead.
          <p className="rounded-xl bg-gray-50 dark:bg-white/5 p-3 text-sm text-gray-600 dark:text-gray-300">
            This course is {enumLabel("courseStatus", course.status).toLowerCase()}, not awaiting review.{" "}
            <Link to={ROUTES.adminCourseEdit(course.id)} className="font-medium text-brand-700 dark:text-brand-300 hover:underline">
              Open it in Courses
            </Link>{" "}
            to publish, unpublish or archive it.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-gray-900 dark:text-gray-100 break-words">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{children}</p>
    </div>
  );
}
