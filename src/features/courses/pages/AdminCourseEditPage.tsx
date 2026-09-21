import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { EyeOff, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Card, CardContent } from "@shared/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/Tabs";
import { Button } from "@shared/components/ui/Button";
import { Spinner } from "@shared/components/ui/Spinner";
import { ConfirmDialog } from "@shared/components/ui/ConfirmDialog";
import { CourseDetailsForm } from "@features/courses/components/CourseDetailsForm";
import { CourseStatusBadge } from "@features/courses/components/CourseStatusBadge";
import { TutorRosterPicker, type TutorRoster } from "@features/courses/components/TutorRosterPicker";
import {
  useGetAdminCourseByIdQuery,
  usePublishCourseMutation,
  useSetCourseTutorsMutation,
  useUnpublishCourseMutation,
  useUpdateAdminCourseMutation,
} from "@features/courses/api/coursesApi";
import type { CourseDto } from "@features/courses/types";
import { COURSE_STATUS } from "@shared/types/lms";
import { ROUTES } from "@shared/constants/routes";
import type { NormalizedError } from "@lib/axios/httpClient";

/**
 * Admin course editing: any course, any tutor, any status. Content (modules and
 * lessons) is deliberately absent — that lives behind `course:update_own` and
 * belongs to the course's authorised tutor, so an admin tab for it would only
 * ever 403.
 */
export default function AdminCourseEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  // `isLoading` rather than `isFetching`: every save invalidates this query, and
  // swapping the loaded form for a spinner on each one throws away the admin's
  // place on the page.
  const { data: course, isLoading, error } = useGetAdminCourseByIdQuery(id!, { skip: !id });
  const [updateAdminCourse] = useUpdateAdminCourseMutation();
  const [publishCourse, { isLoading: publishing }] = usePublishCourseMutation();
  const [unpublishCourse, { isLoading: unpublishing }] = useUnpublishCourseMutation();
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error || !course) return <p className="text-sm text-error-600">Course not found.</p>;

  const published = course.status === COURSE_STATUS.PUBLISHED;

  const publish = async () => {
    try {
      await publishCourse(course.id).unwrap();
      toast.success("Course published");
    } catch (e) {
      toast.error((e as NormalizedError).message || "Could not publish");
    }
  };

  const unpublish = async () => {
    try {
      await unpublishCourse(course.id).unwrap();
      toast.success("Course unpublished");
    } catch (e) {
      toast.error((e as NormalizedError).message || "Could not unpublish");
    }
  };

  return (
    <>
      <PageHeader
        title={course.title}
        description={course.tutorDisplayName ? `by ${course.tutorDisplayName}` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <CourseStatusBadge status={course.status} />
            <Button
              variant="secondary"
              leftIcon={<Users className="size-4" />}
              onClick={() => navigate(ROUTES.adminCourseParticipants(course.id))}
            >
              İştirakçilər
            </Button>
            {published ? (
              <Button
                variant="secondary"
                leftIcon={<EyeOff className="size-4" />}
                loading={unpublishing}
                onClick={() => setConfirmUnpublish(true)}
              >
                Unpublish
              </Button>
            ) : (
              <Button
                variant="gold"
                leftIcon={<Send className="size-4" />}
                loading={publishing}
                onClick={publish}
              >
                Publish
              </Button>
            )}
          </div>
        }
      />

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="tutors">Tutors</TabsTrigger>
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
                  await updateAdminCourse({ id: course.id, body }).unwrap();
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tutors">
          <CourseTutorsCard course={course} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmUnpublish}
        onOpenChange={setConfirmUnpublish}
        title="Unpublish this course?"
        description="It returns to draft and disappears from the public catalogue. Enrolled İştirakçilər keep their access."
        confirmLabel="Unpublish"
        destructive
        onConfirm={unpublish}
      />
    </>
  );
}

/** Teaching roster editor — a full replacement, as `PUT /tutors` expects. */
function CourseTutorsCard({ course }: { course: CourseDto }) {
  const [setCourseTutors, { isLoading: saving }] = useSetCourseTutorsMutation();
  const [roster, setRoster] = useState<TutorRoster>({
    tutorIds: course.tutors.map((t) => t.tutorId),
    authorizedTutorId: course.tutors.find((t) => t.authorized)?.tutorId,
  });

  const incomplete = roster.tutorIds.length === 0 || !roster.authorizedTutorId;

  const labels = useMemo(() => {
    const byId: Record<string, string> = {};
    for (const t of course.tutors) if (t.displayName) byId[t.tutorId] = t.displayName;
    return byId;
  }, [course.tutors]);

  const save = async () => {
    try {
      await setCourseTutors({
        id: course.id,
        body: { tutorIds: roster.tutorIds, authorizedTutorId: roster.authorizedTutorId! },
      }).unwrap();
      toast.success("Roster updated");
    } catch (e) {
      toast.error((e as NormalizedError).message || "Could not update the roster");
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Teaching roster</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tutors left off the list are removed from the course. The editor is the one tutor allowed
            to change the course and its lessons.
          </p>
        </div>
        <TutorRosterPicker value={roster} onChange={setRoster} invalid={incomplete} labels={labels} />
        <div className="flex justify-end">
          <Button onClick={save} loading={saving} disabled={incomplete}>
            Save roster
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
