/**
 * Renders the real app — App, AppProviders, the real store and router — at
 * every route, as each role that may open it, with the API answered from
 * fixtures captured from the dev API (nulls and all).
 *
 * Nothing used to render pages in tests, which is how a profile page that
 * threw on every visit (React.Children.only) and an "Update course" that
 * silently failed for almost every course both reached production with CI green.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@app/App";
import { AppProviders } from "@app/providers/AppProviders";
import { store } from "@lib/redux/store";
import { baseApi } from "@lib/query/baseApi";
import { httpClient } from "@lib/axios/httpClient";
import { authSuccess, logout } from "@features/auth/store/authSlice";
import { ROUTES } from "@shared/constants/routes";
import { ROLES, type Role } from "@shared/constants/roles";
import { ENUM_LABELS } from "@shared/constants/enumLabels";
import { MENU_GROUPS, filterMenuForRoles } from "@shared/components/navigation/menu";
import {
  coTaughtCourse,
  courseWithLessons,
  fixtureAdapter,
  fixtures,
  nullHeavyCourse,
  offlineCourse,
  othersCourse,
  permissionsFor,
  type RecordedWrite,
} from "./apiFixture";

let roles: Role[] = [ROLES.ADMIN];
const writes: RecordedWrite[] = [];

beforeAll(() => {
  // No live socket in tests (useNotificationStream bails out without WebSocket).
  vi.stubGlobal("WebSocket", undefined);
  httpClient.defaults.adapter = fixtureAdapter(() => roles, writes);
});

beforeEach(() => {
  writes.length = 0;
});

afterEach(() => {
  cleanup();
  store.dispatch(baseApi.util.resetApiState());
  store.dispatch(logout());
});

/** Signs in as `asRoles`, renders the app at `path` and waits for the page to settle. */
async function renderAt(path: string, asRoles: Role[]) {
  roles = asRoles;
  store.dispatch(
    authSuccess({
      user: { id: "u1", email: "fixture-me@example.com", fullName: "Fixture User", roles: asRoles, permissions: permissionsFor(asRoles) },
      accessToken: "test-token",
    }),
  );
  window.history.pushState({}, "", path);
  const errors: string[] = [];
  const spy = vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => {
    errors.push(a.map(String).join(" ").slice(0, 300));
  });
  // Warnings too: Radix reports a select flipping between controlled and
  // uncontrolled with console.warn, which is how /settings lost the saved locale.
  const warnSpy = vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => {
    errors.push(`WARN ${a.map(String).join(" ").slice(0, 300)}`);
  });
  render(
    <AppProviders>
      <App />
    </AppProviders>,
  );
  await waitFor(() => expect(document.querySelector("main h1, main [role=alert]")).not.toBeNull(), { timeout: 8000 });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 200));
  });
  spy.mockRestore();
  warnSpy.mockRestore();
  // RTK's dev-only invariant middlewares warn when a check takes over 32 ms,
  // which says how busy the test machine is, not anything about the page.
  return errors.filter((e) => !/not wrapped in act|act\(\.\.\.\)|InvariantMiddleware took \d+ms/.test(e));
}

/**
 * API codes on screen as-is ("ACTIVE", "IN_APP", or "ADMIN GRANT" from the old
 * replace-underscores habit). Only codes whose label differs are looked for, so
 * PDF and SMS are allowed. Each text node is checked on its own: jsdom has no
 * innerText, and textContent runs neighbouring cells together.
 */
const RAW_CODE_RE = (() => {
  const codes = new Set<string>();
  for (const labels of Object.values(ENUM_LABELS)) {
    for (const [code, label] of Object.entries(labels)) {
      if (code !== label) {
        codes.add(code);
        codes.add(code.replace(/_/g, " "));
      }
    }
  }
  const alternatives = [...codes].sort((a, b) => b.length - a.length).join("|");
  return new RegExp(`(?<![A-Za-z])(${alternatives})(?![A-Za-z])`);
})();

function rawCodesOnScreen(): string[] {
  const found: string[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.parentElement?.closest("script, style")) continue;
    const m = n.textContent?.match(RAW_CODE_RE);
    if (m) found.push(`${m[1]} in "${n.textContent!.trim().slice(0, 60)}"`);
  }
  return found;
}

const T = [ROLES.TUTOR];
const A = [ROLES.ADMIN];
const S = [ROLES.SUPER_ADMIN];

/** Every route the shell serves, with a role allowed to open it. */
const CASES: [Role[], string][] = [
  [T, ROUTES.dashboard],
  [T, ROUTES.tutorCourses],
  [T, ROUTES.tutorCourseNew],
  [T, ROUTES.tutorCourseEdit(nullHeavyCourse.slug)],
  [T, ROUTES.tutorCourseEdit(courseWithLessons.slug)],
  [T, ROUTES.tutorStudents],
  [T, ROUTES.tutorRooms],
  [T, ROUTES.tutorRoomRequests],
  [T, ROUTES.tutorApprovals],
  [T, ROUTES.tutorVideos],
  [T, ROUTES.profile],
  [T, ROUTES.settings],
  [T, ROUTES.notifications],
  [A, ROUTES.dashboard],
  [A, ROUTES.adminCourses],
  [A, ROUTES.adminCourseNew],
  [A, ROUTES.adminCourseEdit(nullHeavyCourse.id)],
  [A, ROUTES.adminCourseEdit(courseWithLessons.id)],
  [A, ROUTES.adminCourseParticipants(nullHeavyCourse.id)],
  [A, ROUTES.adminTutors],
  [A, ROUTES.adminRooms],
  [A, ROUTES.adminRoomPricing],
  [A, ROUTES.adminRoomRequests],
  [A, ROUTES.adminCategories],
  [A, ROUTES.adminUsers],
  [A, ROUTES.adminCourseModeration],
  [A, ROUTES.adminAnalytics],
  [A, ROUTES.adminNotifications],
  [A, ROUTES.profile],
  [A, ROUTES.settings],
  [A, ROUTES.notifications],
  [S, ROUTES.dashboard],
  [S, ROUTES.superAuditLogs],
  [S, ROUTES.superSystemMonitoring],
  [S, ROUTES.superApiLogs],
  [S, ROUTES.superSecurity],
  // An expert applicant holds only USER; the dashboard shows the application.
  [[ROLES.USER], ROUTES.dashboard],
  [[ROLES.USER], ROUTES.profile],
];

/** Routes that are not pages of the shell: public screens and redirects. */
const NOT_SHELL_PAGES = new Set<string>([
  "root",
  "signIn",
  "forgotPassword",
  "unauthorized",
  "notFound",
  "tutorEnrollments",
  "adminNotificationsLegacy",
]);

describe("route table", () => {
  it("has a render case for every route (add one when you add a route)", () => {
    const missing = Object.entries(ROUTES)
      .filter(([key]) => !NOT_SHELL_PAGES.has(key))
      .map(([key, value]) => [key, typeof value === "function" ? value() : value] as const)
      .filter(([, pattern]) => {
        const re = new RegExp(`^${pattern.replace(/:[^/]+/g, "[^/]+")}$`);
        return !CASES.some(([, path]) => re.test(path));
      })
      .map(([key]) => key);
    expect(missing).toEqual([]);
  });
});

describe("every route renders for its role", () => {
  it.each(CASES.map(([r, p]) => [r.join("+"), p, r] as const))("%s %s", async (_label, path, asRoles) => {
    const errors = await renderAt(path, [...asRoles]);
    expect(screen.queryByText(/Something went wrong/)).toBeNull();
    expect(screen.queryByText(/Your access has changed|Couldn't load|Can't reach the server/)).toBeNull();
    expect(window.location.pathname).toBe(path); // no bounce to /403 or /sign-in
    expect(errors).toEqual([]);
    // Users, participants, notifications, profile, videos and security printed
    // raw codes (DISABLED, ADMIN GRANT, IN_APP SENT, READY, HIGH, FAILED LOGIN).
    expect(rawCodesOnScreen()).toEqual([]);
  });
});

describe("sidebar labels name the page they open", () => {
  // "Booking requests" and "My room requests" both opened "Room bookings".
  const cases = [T, A, S].flatMap((roles) =>
    filterMenuForRoles(MENU_GROUPS, roles, (perm) => permissionsFor(roles).includes(perm))
      .flatMap((g) => g.items)
      // The dashboard greets by name ("Welcome, …") rather than repeating its label.
      .filter((item) => item.path && item.path !== ROUTES.dashboard)
      .map((item) => [roles.join("+"), item.label, item.path!, roles] as const),
  );
  it.each(cases)("%s: %s", async (_r, label, path, roles) => {
    await renderAt(path, [...roles]);
    expect(document.querySelector("main h1")?.textContent).toBe(label);
  });
});

describe("a course that is not there", () => {
  const NO_SUCH = "00000000-0000-4000-8000-000000000000";
  // A bare red "Course not found." with no heading, crumbs or way back, and a
  // Retry that could never succeed for a malformed id (HTTP 400).
  it.each([
    [A, ROUTES.adminCourseEdit(NO_SUCH), "Back to courses", ROUTES.adminCourses],
    [A, ROUTES.adminCourseEdit("not-a-uuid"), "Back to courses", ROUTES.adminCourses],
    [A, ROUTES.adminCourseParticipants(NO_SUCH), "Back to courses", ROUTES.adminCourses],
    [A, ROUTES.adminCourseParticipants("not-a-uuid"), "Back to courses", ROUTES.adminCourses],
    [T, ROUTES.tutorCourseEdit("no-such-course"), "Back to my courses", ROUTES.tutorCourses],
  ])("%s %s", async (roles, path, back, backTo) => {
    const errors = await renderAt(path, roles);
    expect(await screen.findByRole("heading", { level: 1, name: "Course not found" })).toBeInTheDocument();
    const crumbs = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(crumbs).getByText("Not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: back })).toHaveAttribute("href", backTo);
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(errors).toEqual([]);
  });
});

describe("tutor course page: who is looking", () => {
  it("a co-tutor on the roster is told they teach it as a co-tutor", async () => {
    await renderAt(ROUTES.tutorCourseEdit(coTaughtCourse.slug), T);
    expect(await screen.findByText(/You teach this course as a co-tutor/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit for review" })).toBeNull();
  });

  // Regression: any tutor at another expert's published course URL was told
  // "You teach this course as a co-tutor".
  it("a tutor who is not on the roster is not called a co-tutor", async () => {
    await renderAt(ROUTES.tutorCourseEdit(othersCourse.slug), T);
    expect(await screen.findByText(/isn't one of your courses/)).toBeInTheDocument();
    expect(screen.queryByText(/co-tutor/i)).toBeNull();
    expect(screen.getByRole("link", { name: "Go to my courses" })).toHaveAttribute("href", ROUTES.tutorCourses);
    expect(screen.queryByRole("button", { name: "Submit for review" })).toBeNull();
  });

  it("the editor gets the edit tabs and no banner", async () => {
    await renderAt(ROUTES.tutorCourseEdit(courseWithLessons.slug), T);
    expect(await screen.findByRole("tab", { name: /Modules/ })).toBeInTheDocument();
    expect(screen.queryByText(/co-tutor|isn't one of your courses/)).toBeNull();
  });
});

describe("selects keep their value", () => {
  // Regression: /settings always showed "Choose a language" although the
  // account's locale was saved (the fixture account's is "en").
  it("settings shows the saved language", async () => {
    const errors = await renderAt(ROUTES.settings, A);
    expect(screen.getByRole("combobox", { name: "Language" })).toHaveTextContent("English");
    expect(errors).toEqual([]);
  });

  // Regression: "New booking" flipped its room picker between uncontrolled and
  // controlled, and after the form reset the picker still showed the old room.
  it("the booking dialog's room picker resets with the form and stays controlled", async () => {
    await renderAt(ROUTES.tutorRoomRequests, T);
    const warnings: string[] = [];
    const warn = vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => void warnings.push(a.map(String).join(" ")));
    const err = vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => void warnings.push(a.map(String).join(" ")));
    try {
      await userEvent.click(screen.getByRole("button", { name: "New booking" }));
      let dialog = await screen.findByRole("dialog");
      const room = await within(dialog).findByRole("combobox", { name: /Room/ });
      await waitFor(() => expect(room).toBeEnabled());
      await userEvent.click(room);
      await userEvent.click(await screen.findByRole("option", { name: new RegExp(fixtures.rooms[0].name) }));
      expect(within(dialog).getByRole("combobox", { name: /Room/ })).toHaveTextContent(fixtures.rooms[0].name);
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

      await userEvent.click(screen.getByRole("button", { name: "New booking" }));
      dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByRole("combobox", { name: /Room/ })).toHaveTextContent("Choose a room");
      expect(warnings.filter((w) => /controlled/.test(w))).toEqual([]);
    } finally {
      warn.mockRestore();
      err.mockRestore();
    }
  });
});

describe("edit forms send what the API returned", () => {
  it("admin course: Update course sends a PATCH for a course with null media and details", async () => {
    await renderAt(ROUTES.adminCourseEdit(nullHeavyCourse.id), A);
    await userEvent.type(await screen.findByLabelText("Subtitle"), "New subtitle");
    await userEvent.click(screen.getByRole("button", { name: "Update course" }));
    await waitFor(() =>
      expect(writes).toContainEqual({
        method: "PATCH",
        url: `/admin/courses/${nullHeavyCourse.id}`,
        body: { subtitle: "New subtitle", version: nullHeavyCourse.version },
      }),
    );
  });

  it("tutor course: an offline course with blank hours saves", async () => {
    await renderAt(ROUTES.tutorCourseEdit(offlineCourse.slug), T);
    await userEvent.clear(await screen.findByLabelText(/^Title/));
    await userEvent.type(screen.getByLabelText(/^Title/), "Renamed offline course");
    await userEvent.click(screen.getByRole("button", { name: "Update course" }));
    await waitFor(() =>
      expect(writes.find((w) => w.method === "PATCH")).toMatchObject({
        url: `/portal/courses/${offlineCourse.id}`,
        body: { title: "Renamed offline course" },
      }),
    );
  });

  it("users: Edit on an expert ([USER, TUTOR]) saves and keeps USER", async () => {
    const expert = fixtures.users.find((u) => u.roles.includes(ROLES.TUTOR))!;
    await renderAt(ROUTES.adminUsers, A);
    const row = (await screen.findByText(expert.email)).closest("tr")!;
    await userEvent.click(within(row).getByRole("button", { name: "Edit" }));
    await userEvent.click(await screen.findByRole("button", { name: "Save" }));
    await waitFor(() => expect(writes.find((w) => w.method === "PUT")).toBeDefined());
    const put = writes.find((w) => w.method === "PUT")!;
    expect(put.url).toBe(`/admin/users/${expert.id}`);
    expect((put.body as { roles: string[] }).roles).toEqual(expect.arrayContaining(["USER", "TUTOR"]));
    expect(put.body).not.toHaveProperty("password");
  });

  it("rooms: Edit saves", async () => {
    await renderAt(ROUTES.adminRooms, A);
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    await userEvent.click(await screen.findByRole("button", { name: "Save" }));
    await waitFor(() => expect(writes).toContainEqual(expect.objectContaining({ method: "PUT", url: `/admin/rooms/${fixtures.rooms[0].id}` })));
  });

  it("categories: editing a sub-category keeps its parent", async () => {
    const child = fixtures.categories.find((c) => c.parentId)!;
    await renderAt(ROUTES.adminCategories, A);
    const row = (await screen.findByText(child.slug)).closest("tr")!;
    await userEvent.click(within(row).getByRole("button", { name: "Edit" }));
    await userEvent.click(await screen.findByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(writes).toContainEqual(
        expect.objectContaining({ method: "PUT", url: `/admin/categories/${child.id}`, body: expect.objectContaining({ parentId: child.parentId }) }),
      ),
    );
  });

  it("categories: a sub-category whose parent was deleted says so and saves at the top level", async () => {
    // Left behind by deletes from before the API refused them; resending the
    // dead parent id fails with CATEGORY_NOT_FOUND.
    const orphan = fixtures.categories.find((c) => c.slug === "fixture-orphan")!;
    await renderAt(ROUTES.adminCategories, A);
    const row = (await screen.findByText(orphan.slug)).closest("tr")!;
    expect(within(row).getByText("Deleted category")).toBeInTheDocument();
    await userEvent.click(within(row).getByRole("button", { name: "Edit" }));
    await userEvent.click(await screen.findByRole("button", { name: "Save" }));
    await waitFor(() => expect(writes.find((w) => w.method === "PUT")).toBeDefined());
    const put = writes.find((w) => w.method === "PUT")!;
    expect(put.url).toBe(`/admin/categories/${orphan.id}`);
    expect(put.body).not.toHaveProperty("parentId");
  });

  it("lessons: editing a title keeps the lesson's link", async () => {
    const lesson = courseWithLessons.modules[0].lessons[0];
    await renderAt(ROUTES.tutorCourseEdit(courseWithLessons.slug), T);
    await userEvent.click(await screen.findByRole("tab", { name: /Modules/ }));
    await userEvent.click((await screen.findAllByRole("button", { name: "Edit lesson" }))[0]);
    const dialog = await screen.findByRole("dialog");
    await userEvent.clear(within(dialog).getByLabelText(/^Title/));
    await userEvent.type(within(dialog).getByLabelText(/^Title/), "Renamed lesson");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(writes).toContainEqual(
        expect.objectContaining({
          method: "PUT",
          url: `/portal/lessons/${lesson.id}`,
          body: expect.objectContaining({ title: "Renamed lesson", videoUrl: lesson.videoUrl }),
        }),
      ),
    );
  });

  it("modules: adding one posts it", async () => {
    await renderAt(ROUTES.tutorCourseEdit(courseWithLessons.slug), T);
    await userEvent.click(await screen.findByRole("tab", { name: /Modules/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Add module" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText(/^Title/), "New module");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add" }));
    await waitFor(() =>
      expect(writes).toContainEqual(expect.objectContaining({ method: "POST", url: `/portal/courses/${courseWithLessons.id}/modules` })),
    );
  });

  it("rejected applicant: sees the reviewer's note and can resubmit", async () => {
    const rejected = fixtures.tutors[2];
    await renderAt(ROUTES.dashboard, [ROLES.USER]);
    expect(await screen.findByText("Your application was not approved")).toBeInTheDocument();
    expect(screen.getByText(rejected.rejectionReason!)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Edit and resubmit" }));
    await userEvent.click(await screen.findByRole("button", { name: "Resubmit for approval" }, { timeout: 5000 }));
    await waitFor(() =>
      expect(writes).toContainEqual(expect.objectContaining({ method: "POST", url: "/portal/tutor/me/resubmit" })),
    );
  });

  it("expert profile: saving sends a PATCH with the profile version", async () => {
    await renderAt(ROUTES.profile, T);
    const headline = await screen.findByLabelText(/Headline/);
    await userEvent.type(headline, "Data engineer");
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));
    await waitFor(() =>
      expect(writes).toContainEqual(
        expect.objectContaining({ method: "PATCH", url: "/portal/tutor/me", body: expect.objectContaining({ headline: "Data engineer", version: fixtures.tutors[0].version }) }),
      ),
    );
  });
});
