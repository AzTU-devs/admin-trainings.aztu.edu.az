import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import AdminCourseNewPage from "./AdminCourseNewPage";
import { useCreateAdminCourseMutation } from "@features/courses/api/coursesApi";
import { useListUsersQuery } from "@features/users/api/usersApi";
import type { CoursePayload } from "@features/courses/components/CourseDetailsForm";
import type { CourseType } from "@shared/types/lms";
import type { AdminUser } from "@features/users/types";

/*
 * The page is tested around its own job — the roster, the İştirakçilər and
 * the create request — so the course form is replaced by a stub that hands
 * over a finished payload, renders the page's extra cards for the type it was
 * given, and shows a thrown error as the real form's toast would.
 */
const PAYLOAD = {
  slug: "python-day",
  title: "Python day",
  courseType: "ONE_TIME",
} as CoursePayload;

vi.mock("@features/courses/components/CourseDetailsForm", () => ({
  CourseDetailsForm: function CourseDetailsFormStub(props: {
    defaultCourseType?: CourseType;
    submitLabel?: string;
    extra?: React.ReactNode | ((t: CourseType) => React.ReactNode);
    onSubmit: (v: CoursePayload) => Promise<unknown>;
  }) {
    const [error, setError] = useState<string | null>(null);
    const type = props.defaultCourseType ?? "ONLINE";
    return (
      <div>
        <p data-testid="form-type">{type}</p>
        {typeof props.extra === "function" ? props.extra(type) : props.extra}
        <button
          type="button"
          onClick={() => {
            setError(null);
            props.onSubmit(PAYLOAD).catch((e: Error) => setError(e.message));
          }}
        >
          {props.submitLabel}
        </button>
        {error && <p role="alert">{error}</p>}
      </div>
    );
  },
}));
// The roster picker has its own data; here one click assigns a tutor and editor.
vi.mock("@features/courses/components/TutorRosterPicker", () => ({
  TutorRosterPicker: ({
    onChange,
  }: {
    onChange: (r: { tutorIds: string[]; authorizedTutorId?: string }) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange({ tutorIds: ["tutor-1"], authorizedTutorId: "tutor-1" })}
    >
      Assign tutor
    </button>
  ),
}));
vi.mock("@features/courses/api/coursesApi", () => ({ useCreateAdminCourseMutation: vi.fn() }));
vi.mock("@features/users/api/usersApi", () => ({ useListUsersQuery: vi.fn() }));

const NIGAR: AdminUser = {
  id: "6f1c2d3e-0000-4000-8000-000000000001",
  email: "nigar@example.az",
  fullName: "Nigar Quliyeva",
  roles: ["USER"],
  status: "ACTIVE",
  createdAt: "2026-09-01T10:00:00Z",
};
const RAUF: AdminUser = {
  ...NIGAR,
  id: "6f1c2d3e-0000-4000-8000-000000000002",
  email: "rauf@example.az",
  fullName: "Rauf Hüseynov",
};
const CREATED_ID = "99999999-8888-4777-8666-555555555555";

const create = vi.fn();

function Where() {
  const { pathname } = useLocation();
  return <p data-testid="where">{pathname}</p>;
}

function renderAt(url: string) {
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/admin/courses/new" element={<AdminCourseNewPage />} />
          <Route path="/admin/courses/:id" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  create.mockReset();
  vi.mocked(useCreateAdminCourseMutation).mockReturnValue([create, {}] as unknown as ReturnType<
    typeof useCreateAdminCourseMutation
  >);
  vi.mocked(useListUsersQuery).mockReturnValue({
    data: { content: [NIGAR, RAUF], page: 0, size: 20, totalElements: 2, totalPages: 1 },
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useListUsersQuery>);
});

describe("AdminCourseNewPage", () => {
  it("opens as a one-time training from ?type=ONE_TIME with the roster and İştirakçilər cards", () => {
    renderAt("/admin/courses/new?type=ONE_TIME");
    expect(
      screen.getByRole("heading", { level: 1, name: "New one-time training" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("form-type")).toHaveTextContent("ONE_TIME");
    expect(screen.getByRole("heading", { name: "Teaching roster" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "İştirakçilər" })).toBeInTheDocument();
    // Open straight away for a one-time training.
    expect(screen.getByRole("textbox", { name: "Search İştirakçilər" })).toBeInTheDocument();
  });

  it("ignores an unknown ?type and keeps the picker folded for other types", async () => {
    renderAt("/admin/courses/new?type=WEBINAR");
    expect(screen.getByRole("heading", { level: 1, name: "New course" })).toBeInTheDocument();
    expect(screen.getByTestId("form-type")).toHaveTextContent("ONLINE");
    expect(screen.queryByRole("textbox", { name: "Search İştirakçilər" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add İştirakçilər now" }));
    expect(screen.getByRole("textbox", { name: "Search İştirakçilər" })).toBeInTheDocument();
  });

  it("creates the training with its tutors and participantUserIds, then opens it", async () => {
    create.mockReturnValue({ unwrap: () => Promise.resolve({ id: CREATED_ID }) });
    renderAt("/admin/courses/new?type=ONE_TIME");

    await userEvent.click(screen.getByRole("button", { name: "Assign tutor" }));
    await userEvent.click(screen.getByRole("button", { name: "Add Nigar Quliyeva" }));
    await userEvent.click(screen.getByRole("button", { name: "Add Rauf Hüseynov" }));
    await userEvent.click(screen.getByRole("button", { name: "Create training" }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith({
      course: PAYLOAD,
      tutorIds: ["tutor-1"],
      authorizedTutorId: "tutor-1",
      participantUserIds: [NIGAR.id, RAUF.id],
    });
    expect(await screen.findByTestId("where")).toHaveTextContent(`/admin/courses/${CREATED_ID}`);
  });

  it("refuses to send without a roster", async () => {
    renderAt("/admin/courses/new?type=ONE_TIME");
    await userEvent.click(screen.getByRole("button", { name: "Create training" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Assign at least one tutor");
    expect(create).not.toHaveBeenCalled();
  });

  it("names and flags the person a 400 USER_NOT_FOUND is about, and saves once they are removed", async () => {
    create.mockReturnValueOnce({
      unwrap: () =>
        Promise.reject({
          status: 400,
          code: "USER_NOT_FOUND",
          message: `User not found: ${RAUF.id}`,
          isNormalized: true,
        }),
    });
    renderAt("/admin/courses/new?type=ONE_TIME");

    await userEvent.click(screen.getByRole("button", { name: "Assign tutor" }));
    await userEvent.click(screen.getByRole("button", { name: "Add Nigar Quliyeva" }));
    await userEvent.click(screen.getByRole("button", { name: "Add Rauf Hüseynov" }));
    await userEvent.click(screen.getByRole("button", { name: "Create training" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Rauf Hüseynov (rauf@example.az) no longer has an account. Remove them and save again.",
    );
    const chips = screen.getByRole("list", { name: "Selected İştirakçilər" });
    const raufChip = within(chips).getByText("Rauf Hüseynov").closest("li")!;
    expect(raufChip).toHaveAttribute("title", expect.stringContaining("No account"));
    expect(screen.getByTestId("form-type")).toBeInTheDocument(); // still on the form

    // Saving again while the flagged chip is there is stopped on this side.
    await userEvent.click(screen.getByRole("button", { name: "Create training" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("marked in red");
    expect(create).toHaveBeenCalledTimes(1);

    await userEvent.click(within(chips).getByRole("button", { name: "Remove Rauf Hüseynov" }));
    create.mockReturnValueOnce({ unwrap: () => Promise.resolve({ id: CREATED_ID }) });
    await userEvent.click(screen.getByRole("button", { name: "Create training" }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(create.mock.calls[1][0].participantUserIds).toEqual([NIGAR.id]);
  });
});
