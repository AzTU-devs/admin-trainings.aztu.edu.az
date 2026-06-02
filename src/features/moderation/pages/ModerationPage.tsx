import { useState } from "react";
import { Check, Search, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { Card, CardContent } from "@shared/components/ui/Card";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { Spinner } from "@shared/components/ui/Spinner";
import { Textarea } from "@shared/components/ui/Textarea";
import { CourseStatusBadge } from "@features/courses/components/CourseStatusBadge";
import {
  useDecideCourseMutation,
  useLazyGetCourseBySlugQuery,
} from "@features/courses/api/coursesApi";

/**
 * Single-course moderation by slug lookup. There's no "pending courses" list
 * endpoint yet (GAP_REPORT.md), so a moderator pastes/opens a course slug,
 * reviews it, and approves/rejects.
 */
export default function ModerationPage() {
  const [slug, setSlug] = useState("");
  const [trigger, { data: course, isFetching, error }] = useLazyGetCourseBySlugQuery();
  const [decide, { isLoading: deciding }] = useDecideCourseMutation();
  const [note, setNote] = useState("");

  const review = async () => {
    if (!slug.trim()) return;
    trigger(slug.trim());
  };

  const submit = async (decision: "APPROVED" | "REJECTED") => {
    if (!course) return;
    try {
      await decide({ id: course.id, decision, note: note.trim() || undefined }).unwrap();
      toast.success(decision === "APPROVED" ? "Course published" : "Course rejected");
      setNote("");
    } catch {
      toast.error("Could not save decision");
    }
  };

  return (
    <>
      <PageHeader
        title="Course moderation"
        description="Look up a course by slug to review and approve or reject it."
      />

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

      {isFetching ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : error ? (
        <EmptyState title="Course not found" description="Check the slug and try again." />
      ) : course ? (
        <Card>
          <CardContent className="space-y-4 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{course.title}</h2>
                <p className="text-sm text-gray-500">{course.subtitle}</p>
              </div>
              <CourseStatusBadge status={course.status} />
            </div>
            {course.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{course.description}</p>
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
      ) : (
        <EmptyState title="No course loaded" description="Enter a course slug above to begin moderation." />
      )}
    </>
  );
}
