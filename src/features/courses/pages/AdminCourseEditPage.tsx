import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { EyeOff, SearchX, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/Tabs";
import { Button } from "@shared/components/ui/Button";
import { Spinner } from "@shared/components/ui/Spinner";
import { ConfirmDialog } from "@shared/components/ui/ConfirmDialog";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { CourseDetailsForm } from "@features/courses/components/CourseDetailsForm";
import { CourseStatusBadge } from "@features/courses/components/CourseStatusBadge";
import { CourseSummaryCard } from "@features/courses/components/CourseSummaryCard";
import { FormCard } from "@features/courses/components/FormCard";
import { TutorRosterPicker, type TutorRoster } from "@features/courses/components/TutorRosterPicker";
import { courseCrumb } from "@features/courses/lib/courseCrumb";
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
  if (error || !course) return <EmptyState tone="danger" Icon={SearchX} title="Course not found." />;

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
        // The record crumb names the course, not its id or slug.
        crumbLabel={courseCrumb(course.title)}
        actions={
          <div className="flex flex-wrap items-center gap-2">
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

      {/* Two columns on a wide screen: the editor, and the course's cover and
          facts in a sticky side card (above the editor on narrower screens). */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <CourseSummaryCard course={course} className="xl:sticky xl:top-[92px] xl:col-start-2 xl:row-start-1" />

        <Tabs defaultValue="details" className="min-w-0 xl:col-start-1 xl:row-start-1">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="tutors">Tutors</TabsTrigger>
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
                await updateAdminCourse({ id: course.id, body }).unwrap();
              }}
            />
          </TabsContent>

          <TabsContent value="tutors">
            <CourseTutorsCard course={course} />
          </TabsContent>
        </Tabs>
      </div>

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
    <FormCard
      icon={<Users />}
      title="Teaching roster"
      description="Tutors left off the list are removed from the course. The editor is the one tutor allowed to change the course and its lessons."
      grid={false}
      footer={
        <Button onClick={save} loading={saving} disabled={incomplete}>
          Save roster
        </Button>
      }
    >
      <TutorRosterPicker value={roster} onChange={setRoster} invalid={incomplete} labels={labels} />
    </FormCard>
  );
}
