import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Archive, EyeOff, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Card, CardContent } from "@shared/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/Tabs";
import { Button } from "@shared/components/ui/Button";
import { Spinner } from "@shared/components/ui/Spinner";
import { ConfirmDialog } from "@shared/components/ui/ConfirmDialog";
import { QueryErrorState } from "@shared/components/feedback/QueryErrorState";
import { NotFoundState } from "@shared/components/feedback/NotFoundState";
import { isLookupNotFound } from "@shared/components/feedback/queryError";
import { apiErrorMessage, toNormalizedError } from "@shared/lib/apiError";
import { CourseDetailsForm } from "@features/courses/components/CourseDetailsForm";
import { CourseContentView } from "@features/courses/components/CourseContentView";
import { ModulesEditor } from "@features/courses/components/ModulesEditor";
import { useListModulesQuery } from "@features/courses/api/modulesApi";
import { CourseStatusBadge } from "@features/courses/components/CourseStatusBadge";
import { TutorRosterPicker, type TutorRoster } from "@features/courses/components/TutorRosterPicker";
import {
  useArchiveAdminCourseMutation,
  useGetAdminCourseByIdQuery,
  usePublishCourseMutation,
  useSetCourseTutorsMutation,
  useUnpublishCourseMutation,
  useUpdateAdminCourseMutation,
} from "@features/courses/api/coursesApi";
import type { CourseDto } from "@features/courses/types";
import { COURSE_STATUS, COURSE_TYPE } from "@shared/types/lms";
import { ROUTES } from "@shared/constants/routes";
import { courseByline } from "@features/courses/components/courseByline";

/**
 * Admin course editing: any course, any tutor, any status. Modules and lessons
 * are shown read-only — editing them sits behind `course:update_own`, which
 * belongs to the course's authorised tutor — so an admin can at least see what
 * they are publishing.
 */
export default function AdminCourseEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  // `currentData`, not `data`: `data` keeps the previous course while another
  // id loads, so navigating from course A to course B used to show A's form
  // under B's URL — and saving would have written A's values into B.
  // Only the first load shows a spinner; a refetch after each save keeps the
  // page (and any unsaved input) where it is.
  const { currentData: course, isFetching, error, refetch } = useGetAdminCourseByIdQuery(id!, { skip: !id });
  const [updateAdminCourse] = useUpdateAdminCourseMutation();
  const [publishCourse, { isLoading: publishing }] = usePublishCourseMutation();
  const [unpublishCourse, { isLoading: unpublishing }] = useUnpublishCourseMutation();
  const [archiveCourse, { isLoading: archiving }] = useArchiveAdminCourseMutation();
  const [confirm, setConfirm] = useState<"publish" | "unpublish" | "archive" | null>(null);
  // Bumped after a 409 STALE_RESOURCE: remounts the form on the freshly loaded course.
  const [formKey, setFormKey] = useState(0);
  const reloadForm = async () => {
    await refetch();
    setFormKey((k) => k + 1);
  };

  if (!course) {
    if (isFetching) return <div className="flex justify-center py-12"><Spinner /></div>;
    if (error && !isLookupNotFound(error)) {
      return <QueryErrorState error={error} onRetry={refetch} what="this course" />;
    }
    return (
      <NotFoundState
        title="Course not found"
        description="There is no course at this address. It may have been deleted, or the link may be wrong."
        backTo={ROUTES.adminCourses}
        backLabel="Back to courses"
        missingSegment={id}
      />
    );
  }

  const published = course.status === COURSE_STATUS.PUBLISHED;
  const archived = course.status === COURSE_STATUS.ARCHIVED;
  const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const emptyOnline = course.courseType === COURSE_TYPE.ONLINE && lessonCount === 0;

  return (
    <>
      <PageHeader
        title={course.title}
        description={courseByline(course)}
        crumbLabels={{ [course.id]: course.title }}
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
            {!archived && (
              <Button
                variant="secondary"
                leftIcon={<Archive className="size-4" />}
                loading={archiving}
                onClick={() => setConfirm("archive")}
              >
                Archive
              </Button>
            )}
            {published ? (
              <Button
                variant="secondary"
                leftIcon={<EyeOff className="size-4" />}
                loading={unpublishing}
                onClick={() => setConfirm("unpublish")}
              >
                Unpublish
              </Button>
            ) : (
              <Button
                variant="gold"
                leftIcon={<Send className="size-4" />}
                loading={publishing}
                onClick={() => setConfirm("publish")}
              >
                Publish
              </Button>
            )}
          </div>
        }
      />

      {/* Keyed by course so switching course starts from that course's values,
          and the Details and Tutors panels are force-mounted so a glance at
          another tab no longer throws away unsaved input. */}
      <Tabs key={course.id} defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="content">
            Modules &amp; lessons{lessonCount > 0 ? ` (${lessonCount})` : ""}
          </TabsTrigger>
          <TabsTrigger value="tutors">Tutors</TabsTrigger>
        </TabsList>

        <TabsContent value="details" forceMount>
          <Card>
            <CardContent>
              <CourseDetailsForm
                key={`${course.id}:${formKey}`}
                initial={course}
                editing
                submitLabel="Update course"
                onStale={reloadForm}
                onSubmit={(_values, update) => updateAdminCourse({ id: course.id, body: update }).unwrap()}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <AdminCourseContent course={course} />
        </TabsContent>

        <TabsContent value="tutors" forceMount>
          <CourseTutorsCard key={course.id} course={course} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirm === "publish"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Publish this course?"
        description="It goes live in the public catalogue and people can enrol straight away."
        confirmLabel="Publish"
        onConfirm={async () => {
          await publishCourse(course.id).unwrap();
          toast.success("Course published");
        }}
      >
        {emptyOnline && (
          <p role="alert" className="mb-2 rounded-xl bg-warning-50 dark:bg-warning-500/10 p-3 text-sm text-warning-800 dark:text-warning-200">
            This online course has no lessons yet. Anyone who enrols will find nothing to study.
          </p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === "unpublish"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Unpublish this course?"
        description="It returns to draft and disappears from the public catalogue. Enrolled İştirakçilər can't open it until it is published again."
        confirmLabel="Unpublish"
        destructive
        onConfirm={async () => {
          await unpublishCourse(course.id).unwrap();
          toast.success("Course unpublished");
        }}
      />

      <ConfirmDialog
        open={confirm === "archive"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Archive this course?"
        description="It leaves the catalogue and moves to the Archived list. Publishing it again brings it back."
        confirmLabel="Archive"
        destructive
        onConfirm={async () => {
          try {
            await archiveCourse(course.id).unwrap();
          } catch (e) {
            const err = toNormalizedError(e);
            // No such route on an API that predates admin archiving.
            if ((err.status === 404 && err.code !== "COURSE_NOT_FOUND") || err.status === 405) {
              throw new Error("This API version can't archive courses from the admin screen yet.");
            }
            throw new Error(apiErrorMessage(err, "Could not archive the course"));
          }
          toast.success("Course archived");
        }}
      />
    </>
  );
}

/**
 * Modules and lessons for staff. Admins publish courses, so they need to see —
 * and on an API that grants `course:manage` on the content endpoints, fix —
 * what learners will get. An older API refuses staff there (403); the outline
 * the admin course DTO already carries is shown read-only instead.
 */
function AdminCourseContent({ course }: { course: CourseDto }) {
  const modules = useListModulesQuery(course.id);
  if (modules.isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  const status = modules.isError ? toNormalizedError(modules.error).status : 0;
  if (status === 403 || status === 404) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Read-only: only the course's editor can change its lessons on this API version.
        </p>
        <CourseContentView modules={course.modules} />
      </div>
    );
  }
  return <ModulesEditor courseId={course.id} />;
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
      toast.error(apiErrorMessage(e, "Could not update the roster"));
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
