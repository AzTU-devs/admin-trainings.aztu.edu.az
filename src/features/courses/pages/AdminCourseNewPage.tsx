import { useState } from "react";
import { useNavigate } from "react-router";
import { Users } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { CourseDetailsForm } from "@features/courses/components/CourseDetailsForm";
import { FormCard } from "@features/courses/components/FormCard";
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
      {/* The form brings its own section cards; the roster is one more.
          Capped so the two-column fields keep a readable line on wide screens. */}
      <div className="max-w-[1040px]">
        <CourseDetailsForm
          submitLabel="Create course"
          extra={
            <FormCard
              icon={<Users />}
              title="Teaching roster"
              description="Everyone who teaches this course. The nominated editor is the one tutor allowed to change it."
              grid={false}
            >
              <TutorRosterPicker
                value={roster}
                onChange={setRoster}
                invalid={attempted && rosterMissing}
              />
              {attempted && rosterMissing && (
                <p className="mt-2 text-[12.5px] font-medium text-danger">
                  Assign at least one tutor and nominate the editor.
                </p>
              )}
            </FormCard>
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
      </div>
    </>
  );
}
