import { useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Inbox,
  MousePointerClick,
  Search,
  SearchX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { Card } from "@shared/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/Tabs";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { Spinner } from "@shared/components/ui/Spinner";
import { Textarea } from "@shared/components/ui/Textarea";
import { Avatar, AvatarFallback } from "@shared/components/ui/Avatar";
import { CourseCover } from "@shared/components/bright";
import { cn } from "@shared/lib/cn";
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
        <TabsList>
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
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="space-y-3">
        {isFetching && rows.length === 0 ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : rows.length === 0 ? (
          <EmptyState Icon={Inbox} title="Nothing to review" description="No courses are awaiting approval right now." />
        ) : (
          <>
            <ul className="space-y-2.5">
              {rows.map((c) => (
                <li key={c.id}>
                  <QueueItem course={c} selected={selected?.id === c.id} onOpen={() => open(c)} />
                </li>
              ))}
            </ul>
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<ChevronLeft className="size-4" />}
                  disabled={data.page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <span className="inline-flex h-9 items-center rounded-full bg-navy-tint px-3.5 text-[13px] font-semibold tabular-nums text-navy">
                  Page {data.page + 1} / {data.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={data.page >= data.totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* The review stays in view while a long queue scrolls past it. */}
      <div className="lg:sticky lg:top-24">
        {!selected ? (
          <EmptyState
            Icon={MousePointerClick}
            title="Select a course"
            description="Pick a course from the queue to review it."
          />
        ) : loadingDetail || !course ? (
          <Card className="flex justify-center py-16"><Spinner /></Card>
        ) : (
          <ReviewCard
            pinned
            courseId={course.id}
            title={course.title}
            subtitle={course.subtitle}
            description={course.description}
            status={course.status}
            tutorName={course.tutorDisplayName}
            onDecided={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}

/**
 * One course in the queue: its cover (the summary carries no category, so it
 * is the category-less drawing seeded by the course id — the review card
 * draws the same one), the title and who submitted it. The open one takes
 * the navy wash, like the current item in the sidebar.
 */
function QueueItem({
  course,
  selected,
  onOpen,
}: {
  course: CourseSummaryDto;
  selected: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={selected}
      className={cn(
        "group flex w-full items-center gap-4 rounded-[22px] p-2 pr-4 text-left transition-[background-color,box-shadow] duration-200",
        selected
          ? "bg-navy-tint shadow-[0_0_0_1.5px_var(--navy)]"
          : "bg-surface shadow-[0_0_0_1px_var(--line)] hover:bg-paper-2 hover:shadow-[0_0_0_1px_var(--line-2)]",
      )}
    >
      <CourseCover seed={course.id} thumb className="size-[72px] rounded-[16px]" />
      <div className="min-w-0 flex-1">
        {/* Spans, not <p>: a button may only hold phrasing content. */}
        <span className={cn("clamp-2 break-words font-semibold leading-snug", selected ? "text-navy" : "text-ink")}>
          {course.title}
        </span>
        {course.tutorDisplayName ? (
          <span className="mt-1.5 flex min-w-0 items-center gap-2 text-[13px] text-ink-3">
            <Avatar size="xs" className="size-5 text-[9px]">
              <AvatarFallback name={course.tutorDisplayName} />
            </Avatar>
            <span className="truncate">{course.tutorDisplayName}</span>
          </span>
        ) : (
          <span className="mt-1.5 block truncate font-mono text-[12px] text-ink-3">{course.slug}</span>
        )}
      </div>
      <ChevronRight
        aria-hidden
        className={cn(
          "size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5",
          selected ? "text-navy" : "text-ink-3",
        )}
      />
    </button>
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
    <div className="space-y-5">
      <div className="flex gap-2">
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

      <div className="max-w-3xl">
        {isFetching || loadingAdmin ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : error ? (
          <EmptyState tone="warning" Icon={SearchX} title="Course not found" description="Check the slug and try again." />
        ) : course ? (
          <ReviewCard
            courseId={course.id}
            title={course.title}
            subtitle={course.subtitle}
            description={course.description}
            status={course.status}
            tutorName={course.tutorDisplayName}
          />
        ) : (
          <EmptyState Icon={Search} title="No course loaded" description="Enter a course slug above to begin moderation." />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── shared review card ──────────────────────────── */

/**
 * The course under review and the decision on it.
 *
 * Moderators work through the queue one course after another, so the note and
 * the decision buttons must not sit below a decorative cover: the cover is the
 * thumb beside the title (the same drawing as the course's queue item), and
 * with `pinned` (the queue, from lg up) the card fits the viewport — the
 * course details scroll inside it while the note and the buttons stay put.
 */
function ReviewCard({
  courseId,
  title,
  subtitle,
  description,
  status,
  tutorName,
  onDecided,
  pinned = false,
}: {
  courseId: string;
  title: string;
  subtitle?: string;
  description?: string;
  status: CourseSummaryDto["status"];
  tutorName?: string;
  onDecided?: () => void;
  pinned?: boolean;
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
    // 7.5rem = the sticky top (6rem) plus breathing room under the card.
    <Card className={cn("overflow-hidden", pinned && "lg:flex lg:max-h-[calc(100dvh-7.5rem)] lg:flex-col")}>
      <div className={cn("space-y-5 p-5 sm:p-6", pinned && "custom-scrollbar lg:min-h-0 lg:flex-1 lg:overflow-y-auto")}>
        <div className="flex items-start gap-4">
          <CourseCover
            seed={courseId}
            thumb
            className="size-[72px] shrink-0 rounded-[18px] sm:size-20 sm:rounded-[20px]"
          />
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <CourseStatusBadge status={status} />
            </div>
            <h2 className="break-words font-display text-[20px] font-bold leading-[1.2] tracking-[-0.02em] text-ink sm:text-[22px]">
              {title}
            </h2>
          </div>
        </div>

        {(subtitle || tutorName) && (
          <div>
            {subtitle && <p className="text-[15px] leading-relaxed text-ink-2">{subtitle}</p>}
            {tutorName && (
              <div className={cn("flex items-center gap-2.5", subtitle && "mt-3.5")}>
                <Avatar size="sm">
                  <AvatarFallback name={tutorName} />
                </Avatar>
                <span className="text-sm font-semibold text-ink">{tutorName}</span>
              </div>
            )}
          </div>
        )}

        {description && (
          <p className="whitespace-pre-wrap break-words rounded-[18px] bg-paper-2 px-5 py-4 text-sm leading-relaxed text-ink-2">
            {description}
          </p>
        )}
      </div>

      <div className={cn("space-y-4 border-t border-line p-5 sm:px-6", pinned && "lg:shrink-0")}>
        <Textarea
          rows={3}
          placeholder="Moderator note (sent to the tutor on rejection)…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {/* Publish is the one filled action; Reject is the outlined pill in
            the danger colour, so the two never compete for the eye. */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            leftIcon={<X className="size-4" />}
            loading={deciding}
            onClick={() => submit("REJECTED")}
            className="text-danger hover:bg-danger-tint hover:shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--danger)_45%,transparent)]"
          >
            Reject
          </Button>
          <Button leftIcon={<Check className="size-4" />} loading={deciding} onClick={() => submit("APPROVED")}>
            Publish
          </Button>
        </div>
      </div>
    </Card>
  );
}
