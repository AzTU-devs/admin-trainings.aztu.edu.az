import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Archive, Info, Send } from "lucide-react";
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
import { CourseDetailsForm } from "@features/courses/components/CourseDetailsForm";
import { CourseStatusBadge } from "@features/courses/components/CourseStatusBadge";
import { CourseContentView } from "@features/courses/components/CourseContentView";
import { ModulesEditor } from "@features/courses/components/ModulesEditor";
import {
  useArchiveCourseMutation,
  useGetCourseBySlugQuery,
  useSubmitForReviewMutation,
  useUpdateCourseMutation,
} from "@features/courses/api/coursesApi";
import { useGetMyTutorProfileQuery } from "@features/tutors/api/tutorsApi";
import { COURSE_STATUS, COURSE_TYPE } from "@shared/types/lms";
import { ROUTES } from "@shared/constants/routes";
import { courseByline } from "@features/courses/components/courseByline";
import { courseAccess } from "@features/courses/components/courseAccess";

export default function CourseEditPage() {
  // Route param carries the course slug (the only detail lookup the backend exposes).
  const { id: slug } = useParams();
  const navigate = useNavigate();
  // `currentData`: never show the previous course under a new URL, and only the
  // first load swaps the page for a spinner. Spinning on every refetch remounted
  // the tabs, so each Submit or Update threw the tutor back to the Details tab.
  const { currentData: course, isFetching, error, refetch } = useGetCourseBySlugQuery(slug!, { skip: !slug });
  const { data: me } = useGetMyTutorProfileQuery();
  const [updateCourse] = useUpdateCourseMutation();
  const [submitForReview, { isLoading: submitting }] = useSubmitForReviewMutation();
  const [archiveCourse, { isLoading: archiving }] = useArchiveCourseMutation();
  const [confirm, setConfirm] = useState<"submit" | "archive" | null>(null);
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
        description="None of your courses is at this address. It may have been deleted, or the link may be wrong."
        backTo={ROUTES.tutorCourses}
        backLabel="Back to my courses"
        missingSegment={slug}
      />
    );
  }

  // Only the authorised tutor may edit; co-tutors on the roster can look, and
  // so can any tutor at a published course's URL (see courseAccess).
  const access = courseAccess(course, me?.id);
  const isEditor = access === "editor";
  const canSubmit =
    isEditor && (course.status === COURSE_STATUS.DRAFT || course.status === COURSE_STATUS.REJECTED);
  const canArchive =
    isEditor &&
    (course.status === COURSE_STATUS.DRAFT ||
      course.status === COURSE_STATUS.REJECTED ||
      course.status === COURSE_STATUS.PUBLISHED);
  const lessonCount = course.modules?.reduce((n, m) => n + m.lessons.length, 0) ?? 0;
  const emptyOnline = course.courseType === COURSE_TYPE.ONLINE && lessonCount === 0;

  return (
    <>
      <PageHeader
        title={course.title}
        description={courseByline(course)}
        crumbLabels={slug ? { [slug]: course.title } : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CourseStatusBadge status={course.status} />
            {canArchive && (
              <Button
                variant="secondary"
                leftIcon={<Archive className="size-4" />}
                loading={archiving}
                onClick={() => setConfirm("archive")}
              >
                Archive
              </Button>
            )}
            {isEditor && (
              <Button
                variant="gold"
                leftIcon={<Send className="size-4" />}
                disabled={!canSubmit}
                loading={submitting}
                onClick={() => setConfirm("submit")}
              >
                Submit for review
              </Button>
            )}
          </div>
        }
      />

      {/* The moderator's reason was stored and never shown: the tutor saw only
          a "Rejected" badge and had to guess what to change. */}
      {course.status === COURSE_STATUS.REJECTED && isEditor && (
        <div role="status" className="mb-4 flex gap-2.5 rounded-2xl border border-error-200 dark:border-error-500/30 bg-error-50 dark:bg-error-500/10 p-4 text-sm text-error-700 dark:text-error-300">
          <Info className="size-4 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">An administrator sent this course back.</p>
            {course.rejectionReason ? (
              <p className="mt-1 whitespace-pre-wrap break-words">“{course.rejectionReason}”</p>
            ) : (
              <p className="mt-1">No reason was given.</p>
            )}
            <p className="mt-1">Make the changes, then submit it for review again.</p>
          </div>
        </div>
      )}

      {!isEditor && (
        <div role="status" className="mb-4 flex gap-2.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5 p-4 text-sm text-gray-600 dark:text-gray-300">
          <Info className="size-4 mt-0.5 shrink-0" />
          {access === "coTutor" ? (
            <p>
              You teach this course as a co-tutor. Only its editor
              {course.tutorDisplayName ? `, ${course.tutorDisplayName},` : ""} can change it.
            </p>
          ) : (
            <p>
              This isn&apos;t one of your courses: you are not on its teaching team, so it is shown read-only.
              Only its editor{course.tutorDisplayName ? `, ${course.tutorDisplayName},` : ""} can change it.{" "}
              <Link to={ROUTES.tutorCourses} className="font-medium text-brand-700 hover:underline dark:text-brand-300">
                Go to my courses
              </Link>
            </p>
          )}
        </div>
      )}

      {isEditor ? (
        <Tabs key={course.id} defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="modules">Modules &amp; lessons</TabsTrigger>
          </TabsList>

          {/* Force-mounted: switching to Modules and back used to unmount the
              form and throw away whatever had not been saved yet. */}
          <TabsContent value="details" forceMount>
            <Card>
              <CardContent>
                <CourseDetailsForm
                  key={`${course.id}:${formKey}`}
                  initial={course}
                  editing
                  submitLabel="Update course"
                  onStale={reloadForm}
                  onSubmit={(_values, update) => updateCourse({ id: course.id, body: update }).unwrap()}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modules">
            <ModulesEditor courseId={course.id} />
          </TabsContent>
        </Tabs>
      ) : (
        <CourseContentView modules={course.modules ?? []} />
      )}

      <ConfirmDialog
        open={confirm === "submit"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Submit for review?"
        description="An administrator reviews the course before it is published. You can't edit its status while it is in review."
        confirmLabel="Submit"
        onConfirm={async () => {
          await submitForReview(course.id).unwrap();
          toast.success("Submitted for review");
        }}
      >
        {emptyOnline && (
          <p role="alert" className="mb-2 rounded-xl bg-warning-50 dark:bg-warning-500/10 p-3 text-sm text-warning-800 dark:text-warning-200">
            This online course has no lessons yet. Add them under Modules &amp; lessons first, or it is
            likely to be rejected.
          </p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === "archive"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Archive this course?"
        description="It leaves the catalogue and your active lists. Contact an administrator to bring it back."
        confirmLabel="Archive"
        destructive
        onConfirm={async () => {
          await archiveCourse({ id: course.id, slug: course.slug }).unwrap();
          toast.success("Course archived");
          navigate(ROUTES.tutorCourses);
        }}
      />
    </>
  );
}
