import { useState } from "react";
import { useNavigate } from "react-router";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Card, CardContent } from "@shared/components/ui/Card";
import { FormSection } from "@shared/components/forms/Form";
import { CourseDetailsForm } from "@features/courses/components/CourseDetailsForm";
import { TutorRosterPicker, type TutorRoster } from "@features/courses/components/TutorRosterPicker";
import { useCreateAdminCourseMutation } from "@features/courses/api/coursesApi";
import { ROUTES } from "@shared/constants/routes";

/**
 * Admin course creation. Unlike the tutor flow the teaching roster is stated
 * explicitly — an admin has no tutor profile of their own, and the course
 * belongs to the university whoever ends up teaching it.
 */
export default function AdminCourseNewPage() {
  const navigate = useNavigate();
  const [createAdminCourse] = useCreateAdminCourseMutation();
  const [roster, setRoster] = useState<TutorRoster>({ tutorIds: [] });
  // The roster is only flagged once a save has been attempted: the picker
  // starts empty by definition, and a red border on arrival reads as an error
  // the admin has made rather than a field still to fill.
  const [attempted, setAttempted] = useState(false);

  const rosterMissing = roster.tutorIds.length === 0 || !roster.authorizedTutorId;

  return (
    <>
      <PageHeader
        title="New course"
        description="Create a course for the university and assign the tutors who teach it."
      />
      <Card>
        <CardContent>
          <CourseDetailsForm
            submitLabel="Create course"
            extra={
              <FormSection
                title="Teaching roster"
                description="Everyone who teaches this course. The nominated editor is the one tutor allowed to change it."
              >
                <div className="md:col-span-2">
                  <TutorRosterPicker
                    value={roster}
                    onChange={setRoster}
                    invalid={attempted && rosterMissing}
                  />
                  {attempted && rosterMissing && (
                    <p className="mt-1.5 text-xs text-error-600">
                      Assign at least one tutor and nominate the editor.
                    </p>
                  )}
                </div>
              </FormSection>
            }
            onSubmit={async (values) => {
              setAttempted(true);
              // The roster sits outside the course schema, so this is the only
              // place it can be enforced; the form surfaces the throw as a toast.
              if (rosterMissing) {
                throw new Error("Assign at least one tutor and nominate the editor");
              }
              const created = await createAdminCourse({
                course: values,
                tutorIds: roster.tutorIds,
                authorizedTutorId: roster.authorizedTutorId!,
              }).unwrap();
              navigate(ROUTES.adminCourseEdit(created.id));
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
