import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ParticipantsPicker } from "./ParticipantsPicker";
import { useListUsersQuery } from "@features/users/api/usersApi";
import {
  addParticipants,
  buildAdminCreateRequest,
  participantNamedIn,
  removeParticipant,
  type PickedParticipant,
} from "@features/courses/lib/participants";
import type { AdminUser } from "@features/users/types";
import type { CreateCourseRequest } from "@features/courses/types";

// GET /api/admin/users is mocked at the hook, answering with AdminUserDto rows.
vi.mock("@features/users/api/usersApi", () => ({ useListUsersQuery: vi.fn() }));

const user = (
  id: string,
  fullName: string,
  email: string,
  status: AdminUser["status"] = "ACTIVE",
): AdminUser => ({
  id,
  email,
  fullName,
  roles: ["USER"],
  status,
  createdAt: "2026-09-01T10:00:00Z",
});

const NIGAR = user("6f1c2d3e-0000-4000-8000-000000000001", "Nigar Quliyeva", "nigar@example.az");
const RAUF = user("6f1c2d3e-0000-4000-8000-000000000002", "Rauf Hüseynov", "rauf@example.az");
const SEVDA = user(
  "6f1c2d3e-0000-4000-8000-000000000003",
  "Sevda Kərimova",
  "sevda@example.az",
  "DISABLED",
);

function mockUsers(content: AdminUser[], extra: Record<string, unknown> = {}) {
  vi.mocked(useListUsersQuery).mockReturnValue({
    data: { content, page: 0, size: 20, totalElements: content.length, totalPages: 1 },
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
    ...extra,
  } as unknown as ReturnType<typeof useListUsersQuery>);
}

/** The picker with its value held like the page holds it; `onChange` sees every list. */
function Harness({ max, onChange }: { max?: number; onChange?: (v: PickedParticipant[]) => void }) {
  const [value, setValue] = useState<PickedParticipant[]>([]);
  return (
    <ParticipantsPicker
      value={value}
      max={max}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

const chips = () => screen.queryByRole("list", { name: "Selected İştirakçilər" });

beforeEach(() => {
  vi.mocked(useListUsersQuery).mockReset();
});

describe("ParticipantsPicker", () => {
  it("searches participant accounts (role USER) once typing settles", async () => {
    mockUsers([NIGAR, RAUF]);
    render(<Harness />);
    expect(useListUsersQuery).toHaveBeenLastCalledWith({
      search: undefined,
      role: "USER",
      page: 0,
      size: 20,
    });

    await userEvent.type(screen.getByRole("textbox", { name: "Search İştirakçilər" }), "nig");
    await waitFor(() =>
      expect(useListUsersQuery).toHaveBeenLastCalledWith({
        search: "nig",
        role: "USER",
        page: 0,
        size: 20,
      }),
    );
    // Not one request per keystroke.
    const searches = vi
      .mocked(useListUsersQuery)
      .mock.calls.map(([args]) => (args as { search?: string }).search);
    expect(searches).not.toContain("n");
  });

  it("adds people as chips with name and email, counts them, and removes them", async () => {
    mockUsers([NIGAR, RAUF]);
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Add Nigar Quliyeva" }));
    await userEvent.click(screen.getByRole("button", { name: "Add Rauf Hüseynov" }));

    const list = chips()!;
    expect(within(list).getByText("Nigar Quliyeva")).toBeInTheDocument();
    expect(within(list).getByText("nigar@example.az")).toBeInTheDocument();
    expect(within(list).getByText("rauf@example.az")).toBeInTheDocument();
    expect(screen.getByText(/selected/)).toHaveTextContent("2 selected");

    // Once added, the result row offers removal instead of a second add.
    expect(screen.queryByRole("button", { name: "Add Nigar Quliyeva" })).not.toBeInTheDocument();

    await userEvent.click(within(list).getByRole("button", { name: "Remove Nigar Quliyeva" }));
    expect(onChange).toHaveBeenLastCalledWith([
      { id: RAUF.id, fullName: RAUF.fullName, email: RAUF.email },
    ]);
    expect(screen.getByText(/selected/)).toHaveTextContent("1 selected");
  });

  it("adds every result at once without duplicating anyone already picked", async () => {
    mockUsers([NIGAR, RAUF, SEVDA]);
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Add Rauf Hüseynov" }));
    await userEvent.click(screen.getByRole("button", { name: "Add all 2" }));

    expect(onChange).toHaveBeenLastCalledWith([
      { id: RAUF.id, fullName: RAUF.fullName, email: RAUF.email },
      { id: NIGAR.id, fullName: NIGAR.fullName, email: NIGAR.email },
      { id: SEVDA.id, fullName: SEVDA.fullName, email: SEVDA.email },
    ]);
    // An account that is not active says so.
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("adds the first result on Enter instead of submitting the course form", async () => {
    mockUsers([NIGAR, RAUF]);
    const submit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={submit}>
        <Harness />
      </form>,
    );
    await userEvent.type(screen.getByRole("textbox", { name: "Search İştirakçilər" }), "{Enter}");
    expect(submit).not.toHaveBeenCalled();
    expect(within(chips()!).getByText("Nigar Quliyeva")).toBeInTheDocument();
  });

  it("stops at the limit", async () => {
    mockUsers([NIGAR, RAUF, SEVDA]);
    render(<Harness max={2} />);
    await userEvent.click(screen.getByRole("button", { name: "Add Nigar Quliyeva" }));
    await userEvent.click(screen.getByRole("button", { name: "Add Rauf Hüseynov" }));
    expect(screen.getByRole("button", { name: "Add Sevda Kərimova" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Add all/ })).not.toBeInTheDocument();
    expect(screen.getByText(/most a course can be created with/)).toBeInTheDocument();
  });

  it("says when nothing matches and when the search fails", async () => {
    mockUsers([]);
    const { rerender } = render(<Harness />);
    expect(screen.getByText("No İştirakçi accounts yet.")).toBeInTheDocument();

    const refetch = vi.fn();
    mockUsers([], { isError: true, refetch });
    rerender(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe("participant list helpers", () => {
  const a = { id: "a", fullName: "A", email: "a@x.az" };
  const b = { id: "b", fullName: "B", email: "b@x.az" };
  const c = { id: "c", fullName: "C", email: "c@x.az" };

  it("dedupes, keeps pick order and caps the list", () => {
    expect(addParticipants([a], [b, a, b])).toEqual([a, b]);
    expect(addParticipants([a, b], [c], 2)).toEqual([a, b]);
    const same = [a];
    expect(addParticipants(same, [a])).toBe(same);
    expect(removeParticipant([a, b], "a")).toEqual([b]);
  });

  it("sends participantUserIds only when someone was picked", () => {
    const course = { slug: "s", title: "T", courseType: "ONE_TIME" } as CreateCourseRequest;
    const roster = { tutorIds: ["t1", "t2"], authorizedTutorId: "t1" };
    expect(buildAdminCreateRequest(course, roster, [a, b, a])).toEqual({
      course,
      tutorIds: ["t1", "t2"],
      authorizedTutorId: "t1",
      participantUserIds: ["a", "b"],
    });
    expect(buildAdminCreateRequest(course, roster, [])).not.toHaveProperty("participantUserIds");
  });

  it("finds the person a USER_NOT_FOUND message names", () => {
    const people = [NIGAR, RAUF].map((u) => ({ id: u.id, fullName: u.fullName, email: u.email }));
    expect(participantNamedIn(`User not found: ${RAUF.id}`, people)?.email).toBe("rauf@example.az");
    expect(participantNamedIn("User not found", people)).toBeNull();
    expect(participantNamedIn(undefined, people)).toBeNull();
  });
});
