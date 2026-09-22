import { useParams } from "react-router";
import { SearchX, Send } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/Tabs";
import { Button } from "@shared/components/ui/Button";
import { Spinner } from "@shared/components/ui/Spinner";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { CourseDetailsForm } from "@features/courses/components/CourseDetailsForm";
import { CourseStatusBadge } from "@features/courses/components/CourseStatusBadge";
import { ModulesEditor } from "@features/courses/components/ModulesEditor";
import { CourseSummaryCard } from "@features/courses/components/CourseSummaryCard";
import { courseHue, useCourseCategories } from "@features/courses/hooks/useCourseCategories";
import { courseCrumb } from "@features/courses/lib/courseCrumb";
import {
  useGetCourseBySlugQuery,
  useSubmitForReviewMutation,
  useUpdateCourseMutation,
} from "@features/courses/api/coursesApi";
import { COURSE_STATUS } from "@shared/types/lms";

export default function CourseEditPage() {
  // Route param carries the course slug (the only detail lookup the backend exposes).
  const { id: slug } = useParams();
  const { data: course, isFetching, error } = useGetCourseBySlugQuery(slug!, { skip: !slug });
  const [updateCourse] = useUpdateCourseMutation();
  const [submitForReview, { isLoading: submitting }] = useSubmitForReviewMutation();
  // Called before the early returns (hooks rule); empty until the course loads.
  const categories = useCourseCategories(course?.categoryIds);

  if (isFetching) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error || !course) return <EmptyState tone="danger" Icon={SearchX} title="Course not found." />;

  const canSubmit = course.status === COURSE_STATUS.DRAFT || course.status === COURSE_STATUS.REJECTED;

  return (
    <>
      <PageHeader
        title={course.title}
        description={course.tutorDisplayName ? `by ${course.tutorDisplayName}` : undefined}
        // The record crumb names the course, not its id or slug.
        crumbLabel={courseCrumb(course.title)}
        actions={
          <div className="flex items-center gap-2">
            <CourseStatusBadge status={course.status} />
            <Button
              variant="gold"
              leftIcon={<Send className="size-4" />}
              disabled={!canSubmit}
              loading={submitting}
              onClick={async () => {
                try {
                  await submitForReview(course.id).unwrap();
                  toast.success("Submitted for review");
                } catch {
                  toast.error("Could not submit");
                }
              }}
            >
              Submit for review
            </Button>
          </div>
        }
      />

      {/* Two columns on a wide screen: the editor, and the course's cover and
          facts in a sticky side card (above the editor on narrower screens). */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <CourseSummaryCard course={course} className="xl:sticky xl:top-[92px] xl:col-start-2 xl:row-start-1" />

        <Tabs defaultValue="details" className="min-w-0 xl:col-start-1 xl:row-start-1">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="modules">Modules &amp; lessons</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <CourseDetailsForm
              initial={course}
              editing
              submitLabel="Update course"
              onSubmit={async (values) => {
                // slug is immutable on update — strip it.
                const { slug: _slug, ...body } = values;
                void _slug;
                await updateCourse({ id: course.id, body }).unwrap();
              }}
            />
          </TabsContent>

          <TabsContent value="modules">
            <ModulesEditor courseId={course.id} hue={courseHue(categories)} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
