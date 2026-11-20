import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router";
import CourseEditPage from "./CourseEditPage";
import AdminCourseEditPage from "./AdminCourseEditPage";
import { useGetAdminCourseByIdQuery, useGetCourseBySlugQuery } from "@features/courses/api/coursesApi";
import { ROUTES } from "@shared/constants/routes";
import type { CourseDto } from "@features/courses/types";
import type { CourseType } from "@shared/types/lms";

/*
 * Where attendance is reached: the course page's header, beside İştirakçilər
 * on the admin page — and only for an in-person course. The editors under the
 * header are not what is under test, so they are left out.
 */

vi.mock("@features/courses/api/coursesApi", () => {
  const mutation = () => [vi.fn(), { isLoading: false }];
  return {
    useGetCourseBySlugQuery: vi.fn(),
    useGetAdminCourseByIdQuery: vi.fn(),
    useUpdateCourseMutation: mutation,
    useSubmitForReviewMutation: mutation,
    useUpdateAdminCourseMutation: mutation,
    usePublishCourseMutation: mutation,
    useUnpublishCourseMutation: mutation,
    useSetCourseTutorsMutation: mutation,
  };
});
vi.mock("@features/courses/components/CourseDetailsForm", () => ({ CourseDetailsForm: () => null }));
vi.mock("@features/courses/components/ModulesEditor", () => ({ ModulesEditor: () => null }));
vi.mock("@features/courses/components/CourseSummaryCard", () => ({ CourseSummaryCard: () => null }));
vi.mock("@features/courses/components/TutorRosterPicker", () => ({ TutorRosterPicker: () => null }));
vi.mock("@features/courses/hooks/useCourseCategories", () => ({
  useCourseCategories: () => [],
  courseHue: () => "k-navy",
}));

const COURSE_ID = "c0ffee00-0000-4000-8000-000000000001";

function course(courseType: CourseType): CourseDto {
  return {
    id: COURSE_ID,
    slug: "python-basics",
    title: "Python basics",
    courseType,
    status: "DRAFT",
    tutors: [],
    categoryIds: [],
    tagIds: [],
    modules: [],
  } as unknown as CourseDto;
}

function loaded(c: CourseDto) {
  return { data: c, isLoading: false, error: undefined } as never;
}

function renderAt(path: string, pattern: string, page: React.ReactNode) {
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={pattern} element={page} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("attendance from the course pages", () => {
  it.each(["OFFLINE", "ONE_TIME"] as const)("links an expert's %s course to its attendance, by slug", (type) => {
    vi.mocked(useGetCourseBySlugQuery).mockReturnValue(loaded(course(type)));
    renderAt(ROUTES.tutorCourseEdit("python-basics"), ROUTES.tutorCourseEdit(), <CourseEditPage />);

    expect(screen.getByRole("link", { name: "Attendance" })).toHaveAttribute(
      "href",
      "/tutor/courses/python-basics/attendance",
    );
  });

  it("offers an expert no attendance on an online course", () => {
    vi.mocked(useGetCourseBySlugQuery).mockReturnValue(loaded(course("ONLINE")));
    renderAt(ROUTES.tutorCourseEdit("python-basics"), ROUTES.tutorCourseEdit(), <CourseEditPage />);

    expect(screen.getByRole("button", { name: "Submit for review" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Attendance" })).not.toBeInTheDocument();
  });

  it("puts Attendance beside İştirakçilər on the admin page of an in-person course", () => {
    vi.mocked(useGetAdminCourseByIdQuery).mockReturnValue(loaded(course("OFFLINE")));
    renderAt(ROUTES.adminCourseEdit(COURSE_ID), ROUTES.adminCourseEdit(), <AdminCourseEditPage />);

    expect(screen.getByRole("button", { name: "İştirakçilər" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Attendance" })).toHaveAttribute(
      "href",
      `/admin/courses/${COURSE_ID}/attendance`,
    );
  });

  it("offers staff no attendance on an online course", () => {
    vi.mocked(useGetAdminCourseByIdQuery).mockReturnValue(loaded(course("ONLINE")));
    renderAt(ROUTES.adminCourseEdit(COURSE_ID), ROUTES.adminCourseEdit(), <AdminCourseEditPage />);

    expect(screen.getByRole("button", { name: "İştirakçilər" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Attendance" })).not.toBeInTheDocument();
  });
});
