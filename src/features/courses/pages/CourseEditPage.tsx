import { useParams } from "react-router";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Card, CardContent } from "@shared/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/Tabs";
import { Button } from "@shared/components/ui/Button";
import { Spinner } from "@shared/components/ui/Spinner";
import { CourseDetailsForm } from "@features/courses/components/CourseDetailsForm";
import { CourseStatusBadge } from "@features/courses/components/CourseStatusBadge";
import { ModulesEditor } from "@features/courses/components/ModulesEditor";
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

  if (isFetching) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error || !course) return <p className="text-sm text-error-600">Course not found.</p>;

  const canSubmit = course.status === COURSE_STATUS.DRAFT || course.status === COURSE_STATUS.REJECTED;

  return (
    <>
      <PageHeader
        title={course.title}
        description={course.tutorDisplayName ? `by ${course.tutorDisplayName}` : undefined}
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

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="modules">Modules &amp; lessons</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardContent>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules">
          <ModulesEditor courseId={course.id} />
        </TabsContent>
      </Tabs>
    </>
  );
}
