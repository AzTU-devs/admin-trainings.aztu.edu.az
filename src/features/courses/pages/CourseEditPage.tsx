import { useState } from "react";
import { useParams } from "react-router";
import { SearchX, Send } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/Tabs";
import { Button } from "@shared/components/ui/Button";
import { Spinner } from "@shared/components/ui/Spinner";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { CourseDetailsForm } from "@features/courses/components/CourseDetailsForm";
import { CourseEndedBadge, CourseStatusBadge } from "@features/courses/components/CourseStatusBadge";
import { ModulesEditor } from "@features/courses/components/ModulesEditor";
import { CourseSummaryCard } from "@features/courses/components/CourseSummaryCard";
import { courseHue, useCourseCategories } from "@features/courses/hooks/useCourseCategories";
import { courseCrumb } from "@features/courses/lib/courseCrumb";
import { CourseAttendanceButton } from "@features/attendance/components/CourseAttendanceButton";
import {
  CourseCertificatesCard,
  CourseEndedNotice,
  EndCourseAction,
  hasCertificatesSection,
  useCourseGraduation,
} from "@features/certificates";
import {
  useGetCourseBySlugQuery,
  useSubmitForReviewMutation,
  useUpdateCourseMutation,
} from "@features/courses/api/coursesApi";
import { COURSE_STATUS } from "@shared/types/lms";
import { ROUTES } from "@shared/constants/routes";
import type { NormalizedError } from "@lib/axios/httpClient";

export default function CourseEditPage() {
  // Route param carries the course slug (the only detail lookup the backend exposes).
  const { id: slug } = useParams();
  // `isLoading` rather than `isFetching`, as on the admin editor: every save
  // invalidates this query, and swapping the form for a spinner on the refetch
  // threw away the author's place on the page and re-downloaded the cover.
  const { data: course, isLoading, error } = useGetCourseBySlugQuery(slug!, { skip: !slug });
  const [updateCourse] = useUpdateCourseMutation();
  const [submitForReview, { isLoading: submitting }] = useSubmitForReviewMutation();
  // Called before the early returns (hooks rule); empty until the course loads.
  const categories = useCourseCategories(course?.categoryIds);
  // Ending the course and its certificates, for the experts the API lets end it.
  const graduation = useCourseGraduation(course);
  const [tab, setTab] = useState("details");

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error || !course) return <EmptyState tone="danger" Icon={SearchX} title="Course not found." />;

  const canSubmit = course.status === COURSE_STATUS.DRAFT || course.status === COURSE_STATUS.REJECTED;
  const showCertificates = hasCertificatesSection(graduation);
  const activeTab = tab === "certificates" && !showCertificates ? "details" : tab;

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
            <CourseEndedBadge endedAt={graduation ? graduation.endedAt : course.endedAt} />
            <CourseAttendanceButton courseType={course.courseType} to={ROUTES.tutorCourseAttendance(course.slug)} />
            <EndCourseAction view={graduation} />
            <Button
              variant="gold"
              leftIcon={<Send className="size-4" />}
              disabled={!canSubmit}
              loading={submitting}
              onClick={async () => {
                try {
                  await submitForReview(course.id).unwrap();
                  toast.success("Submitted for review");
                } catch (e) {
                  const err = e as NormalizedError;
                  // A draft from before course days were asked for: the fix is in the form below.
                  toast.error(
                    err.code === "OFFLINE_DAYS_REQUIRED"
                      ? "Pick the course days under Offline schedule and update the course, then submit it."
                      : err.message || "Could not submit",
                  );
                }
              }}
            >
              Submit for review
            </Button>
          </div>
        }
      />

      <CourseEndedNotice view={graduation} onShowCertificates={() => setTab("certificates")} className="mb-6" />

      {/* Two columns on a wide screen: the editor, and the course's cover and
          facts in a sticky side card (above the editor on narrower screens). */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <CourseSummaryCard course={course} className="xl:sticky xl:top-[92px] xl:col-start-2 xl:row-start-1" />

        <Tabs value={activeTab} onValueChange={setTab} className="min-w-0 xl:col-start-1 xl:row-start-1">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="modules">Modules &amp; lessons</TabsTrigger>
            {showCertificates && <TabsTrigger value="certificates">Certificates</TabsTrigger>}
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

          {showCertificates && (
            <TabsContent value="certificates">
              <CourseCertificatesCard view={graduation} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </>
  );
}
