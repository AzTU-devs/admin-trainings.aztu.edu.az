import { useNavigate } from "react-router";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { CourseDetailsForm } from "@features/courses/components/CourseDetailsForm";
import { useCreateCourseMutation } from "@features/courses/api/coursesApi";

export default function CourseNewPage() {
  const navigate = useNavigate();
  const [createCourse] = useCreateCourseMutation();

  return (
    <>
      <PageHeader title="New course" description="Draft a new course, then submit it for review." />
      {/* The form brings its own section cards, so it is not wrapped in one.
          Capped so the two-column fields keep a readable line on wide screens. */}
      <div className="max-w-[1040px]">
        <CourseDetailsForm
          submitLabel="Create draft"
          onSubmit={async (values) => {
            const created = await createCourse(values).unwrap();
            navigate(`/tutor/courses/${created.slug}`);
          }}
        />
      </div>
    </>
  );
}
