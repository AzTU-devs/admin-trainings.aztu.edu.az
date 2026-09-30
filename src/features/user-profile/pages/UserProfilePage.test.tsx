import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { HelmetProvider } from "react-helmet-async";
import UserProfilePage from "./UserProfilePage";
import { useGetUserProfileQuery } from "@features/user-profile/api/userProfileApi";
import { resolveAuthedMediaUrl } from "@shared/lib/authedMediaUrl";
import type { UserProfileDto } from "@features/user-profile/types";

// The endpoint is mocked at the hook: the page is tested against the contract's
// JSON shape, with no store and no network.
vi.mock("@features/user-profile/api/userProfileApi", () => ({ useGetUserProfileQuery: vi.fn() }));
// Avatars are on the authenticated media route: they must be fetched with the
// token (and handed over as a blob URL), never put in an <img src> directly.
vi.mock("@shared/lib/authedMediaUrl", () => ({
  resolveAuthedMediaUrl: vi.fn(async () => ({ url: "blob:avatar", revoke: false })),
}));

type QueryResult = ReturnType<typeof useGetUserProfileQuery>;

function mockQuery(result: Partial<QueryResult>) {
  vi.mocked(useGetUserProfileQuery).mockReturnValue({
    data: undefined,
    error: undefined,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
    ...result,
  } as unknown as QueryResult);
}

function renderAt(userId: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/super/users/${userId}`]}>
        <Routes>
          <Route path="/super/users/:userId" element={<UserProfilePage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

const EXPERT_USER_ID = "0b6f7a3e-5a1c-4d7e-9c1a-2f3b4c5d6e70";
const PARTICIPANT_ID = "5d2c9b1a-3e4f-4a6b-8c7d-9e0f1a2b3c4d";
const ADMIN_ID = "9a8b7c6d-5e4f-4321-8765-4321fedcba98";
const AVATAR_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const ONE_TIME_COURSE = "11111111-2222-4333-8444-555555555555";
const EXCEL_COURSE = "66666666-7777-4888-9999-aaaaaaaaaaaa";

/** (a) An approved expert who is also enrolled on a course as an İştirakçi. */
const expertAndParticipant: UserProfileDto = {
  account: {
    id: EXPERT_USER_ID,
    email: "leyla.mammadova@aztu.edu.az",
    phone: "+994 50 123 45 67",
    firstName: "Leyla",
    lastName: "Məmmədova",
    fullName: "Leyla Məmmədova",
    finKod: "5ABC7DE",
    locale: "az",
    status: "ACTIVE",
    roles: ["USER", "TUTOR"],
    emailVerifiedAt: "2026-01-10T09:00:00Z",
    lastLoginAt: "2026-09-29T08:30:00Z",
    failedLogins: 2,
    lockedUntil: null,
    createdAt: "2026-01-10T08:55:00Z",
    updatedAt: "2026-09-01T10:00:00Z",
    deletedAt: null,
    avatarUrl: `/api/media/${AVATAR_ID}/content`,
    identities: [
      {
        provider: "LOCAL",
        emailAtProvider: "leyla.mammadova@aztu.edu.az",
        displayName: null,
        emailVerified: true,
        linkedAt: "2026-01-10T08:55:00Z",
        lastLoginAt: "2026-09-20T08:00:00Z",
      },
      {
        provider: "GOOGLE",
        emailAtProvider: "leyla.m@gmail.com",
        displayName: "Leyla M.",
        emailVerified: true,
        linkedAt: "2026-03-02T12:00:00Z",
        lastLoginAt: "2026-09-29T08:30:00Z",
      },
    ],
  },
  expert: {
    id: "a1b2c3d4-0000-4000-8000-000000000001",
    displayName: "Dr. Leyla Məmmədova",
    headline: "Data scientist and ML lecturer",
    bio: "Teaches machine learning.\nTen years in industry.",
    yearsExperience: 10,
    websiteUrl: "javascript:alert(1)",
    linkedinUrl: "https://www.linkedin.com/in/leyla",
    academicTitle: "Dosent",
    department: "Faculty of Information Technology",
    education: "PhD in Computer Science, AzTU\nMSc, ADA University",
    certifications: "AWS Certified Solutions Architect",
    languages: "Azerbaijani, English",
    googleScholarUrl: null,
    researchGateUrl: null,
    orcid: "0000-0002-1825-0097",
    githubUrl: "https://github.com/leyla",
    avatarUrl: null,
    approvalStatus: "APPROVED",
    approvedAt: "2026-02-01T10:00:00Z",
    rejectionReason: null,
    ratingAvg: 4.6,
    ratingCount: 12,
    expertise: [{ id: "c0000000-0000-4000-8000-000000000001", name: "Information Technology" }],
    customExpertise: ["Computer vision"],
    approvalHistory: [
      {
        id: "b0000000-0000-4000-8000-000000000002",
        status: "APPROVED",
        decisionNote: "Welcome aboard",
        decidedByName: "Anar Əliyev",
        decidedAt: "2026-02-01T10:00:00Z",
        submittedAt: "2026-01-12T09:00:00Z",
      },
      {
        id: "b0000000-0000-4000-8000-000000000001",
        status: "REJECTED",
        decisionNote: "Please add your education",
        decidedByName: "Anar Əliyev",
        decidedAt: "2026-01-11T09:00:00Z",
        submittedAt: "2026-01-10T09:00:00Z",
      },
    ],
    courses: [
      {
        id: ONE_TIME_COURSE,
        slug: "python-in-a-day",
        title: "Python in a day",
        courseType: "ONE_TIME",
        status: "PUBLISHED",
        editor: true,
        enrolledCount: 25,
        ratingAvg: 4.8,
        ratingCount: 5,
        publishedAt: "2026-03-01T10:00:00Z",
        createdAt: "2026-02-20T10:00:00Z",
      },
    ],
    roomBookings: [
      {
        id: "d0000000-0000-4000-8000-000000000001",
        roomName: "Room 301",
        startsAt: "2026-10-10T06:00:00Z",
        endsAt: "2026-10-10T09:30:00Z",
        status: "APPROVED",
        totalFee: 120,
        currency: "AZN",
      },
    ],
    stats: { courseCount: 1, publishedCourseCount: 1, totalEnrolled: 25, distinctParticipants: 23 },
  },
  learner: {
    enrollments: [
      {
        id: "e0000000-0000-4000-8000-000000000001",
        courseId: EXCEL_COURSE,
        courseSlug: "advanced-excel",
        courseTitle: "Advanced Excel",
        courseType: "OFFLINE",
        status: "ACTIVE",
        source: "PURCHASE",
        progressPercent: 40,
        enrolledAt: "2026-05-01T10:00:00Z",
        completedAt: null,
        lastAccessedAt: "2026-09-28T18:00:00Z",
        lessonsCompleted: 4,
        lessonsTotal: 10,
        attendance: { total: 6, byStatus: { PRESENT: 5, ABSENT: 1 } },
      },
    ],
    orders: [
      {
        id: "f0000000-0000-4000-8000-000000000001",
        orderNumber: "ORD-2026-000123",
        status: "PAID",
        subtotal: 50,
        discount: 5,
        tax: 0,
        total: 45,
        currency: "AZN",
        placedAt: "2026-05-01T09:55:00Z",
        paidAt: "2026-05-01T10:00:00Z",
        items: [
          {
            itemType: "COURSE",
            description: null,
            courseTitle: "Advanced Excel",
            quantity: 1,
            unitPrice: 50,
            totalPrice: 50,
            currency: "AZN",
          },
        ],
        payments: [
          {
            provider: "KAPITAL_BANK",
            status: "FAILED",
            amount: 45,
            currency: "AZN",
            method: "CARD",
            createdAt: "2026-05-01T09:56:00Z",
            errorMessage: "Card declined by the issuer",
          },
        ],
      },
    ],
    reviews: [
      {
        id: "a0000000-0000-4000-8000-00000000000a",
        courseId: EXCEL_COURSE,
        courseTitle: "Advanced Excel",
        rating: 5,
        title: "Very practical",
        body: "Loved the pivot tables.",
        visible: false,
        createdAt: "2026-06-01T10:00:00Z",
      },
    ],
    stats: { enrollmentCount: 1, activeCount: 1, completedCount: 0, averageProgress: 40 },
  },
  activity: {
    sessions: [
      {
        id: "50000000-0000-4000-8000-000000000001",
        issuedAt: "2026-09-29T08:30:00Z",
        expiresAt: "2026-10-29T08:30:00Z",
        revokedAt: null,
        revokeReason: null,
        ipAddress: "203.0.113.7",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)",
        active: true,
      },
    ],
    securityEvents: [
      {
        id: "60000000-0000-4000-8000-000000000001",
        eventType: "FAILED_LOGIN",
        ipAddress: "198.51.100.4",
        userAgent: null,
        detail: { reason: "BAD_PASSWORD", attempt: 2 },
        occurredAt: "2026-09-28T07:00:00Z",
      },
    ],
    auditTrail: [
      {
        id: "70000000-0000-4000-8000-000000000001",
        action: "UPDATE",
        entityType: "USER",
        entityId: EXPERT_USER_ID,
        actorId: ADMIN_ID,
        actorRole: "SUPER_ADMIN",
        occurredAt: "2026-09-01T10:00:00Z",
        ipAddress: "192.0.2.1",
      },
    ],
  },
};

/** (b) A participant with no expert profile. */
const participantOnly: UserProfileDto = {
  account: {
    ...expertAndParticipant.account,
    id: PARTICIPANT_ID,
    email: "murad.huseynov@example.az",
    firstName: "Murad",
    lastName: "Hüseynov",
    fullName: "Murad Hüseynov",
    finKod: null,
    roles: ["USER"],
    failedLogins: 0,
    avatarUrl: null,
    identities: [],
  },
  expert: null,
  learner: expertAndParticipant.learner,
  activity: expertAndParticipant.activity,
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("UserProfilePage", () => {
  it("shows an expert who is also an İştirakçi, with every tab and all of it", async () => {
    mockQuery({ data: expertAndParticipant });
    const user = userEvent.setup();
    renderAt(EXPERT_USER_ID);

    // Header: who, their roles and status, the quick facts.
    expect(screen.getByRole("heading", { level: 2, name: "Leyla Məmmədova" })).toBeInTheDocument();
    expect(screen.getByText("leyla.mammadova@aztu.edu.az", { selector: "p" })).toBeInTheDocument();
    const hero = screen.getByRole("region", { name: "Leyla Məmmədova" });
    expect(within(hero).getByText("İştirakçi")).toBeInTheDocument();
    expect(within(hero).getByText("Tutor")).toBeInTheDocument();
    expect(within(hero).getByText("Active")).toBeInTheDocument();
    for (const fact of ["Joined", "Last login", "Email verified", "Locked until"]) {
      expect(screen.getByText(fact)).toBeInTheDocument();
    }

    // The photo is fetched through the authenticated client, never a bare <img src>.
    await waitFor(() => expect(resolveAuthedMediaUrl).toHaveBeenCalledWith(`/api/media/${AVATAR_ID}/content`));
    await waitFor(() => expect(document.querySelector('img[src="blob:avatar"]')).not.toBeNull());
    expect(document.querySelector('img[src*="/api/media"]')).toBeNull();

    // Every tab has something to show.
    const tabs = screen.getAllByRole("tab").map((t) => t.textContent);
    expect(tabs).toEqual(["Overview", "Expert", "Learning", "Activity & security"]);

    // Overview: both sides' numbers, the account record, the sign-in methods.
    let panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("As an expert")).toBeInTheDocument();
    expect(within(panel).getByText("As an İştirakçi")).toBeInTheDocument();
    expect(within(panel).getByText("5ABC7DE")).toBeInTheDocument();
    expect(within(panel).getByText("+994 50 123 45 67")).toBeInTheDocument();
    expect(within(panel).getByText("Google")).toBeInTheDocument();
    expect(within(panel).getByText("Email & password")).toBeInTheDocument();

    // Expert: the profile, areas, links, approval story, courses and bookings.
    await user.click(screen.getByRole("tab", { name: "Expert" }));
    panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("Dosent")).toBeInTheDocument();
    const bio = within(panel).getByText("Teaches machine learning. Ten years in industry.");
    expect(bio).toHaveClass("whitespace-pre-line");
    expect(within(panel).getByText("PhD in Computer Science, AzTU")).toBeInTheDocument();
    expect(within(panel).getByText("Information Technology")).toBeInTheDocument();
    expect(within(panel).getByText("Computer vision")).toBeInTheDocument();
    expect(within(panel).getByText("Welcome aboard")).toBeInTheDocument();
    expect(within(panel).getByText("Please add your education")).toBeInTheDocument();

    const linkedin = within(panel).getByRole("link", { name: /linkedin\.com\/in\/leyla/ });
    expect(linkedin).toHaveAttribute("href", "https://www.linkedin.com/in/leyla");
    expect(linkedin).toHaveAttribute("target", "_blank");
    expect(linkedin).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(panel).getByRole("link", { name: /orcid\.org/ })).toHaveAttribute(
      "href",
      "https://orcid.org/0000-0002-1825-0097",
    );
    // A typed address that is not http(s) stays text: it never becomes an href.
    expect(within(panel).getByText("javascript:alert(1)").closest("a")).toBeNull();

    expect(within(panel).getByRole("link", { name: "Python in a day" })).toHaveAttribute(
      "href",
      `/admin/courses/${ONE_TIME_COURSE}`,
    );
    expect(within(panel).getByText("One-time")).toBeInTheDocument();
    expect(within(panel).getByText("Editor")).toBeInTheDocument();
    expect(within(panel).getByText("Room 301")).toBeInTheDocument();

    // Learning: the enrolment with its progress and attendance, the order, the review.
    await user.click(screen.getByRole("tab", { name: "Learning" }));
    panel = screen.getByRole("tabpanel");
    // The enrolment and the review both lead to the course's admin page.
    for (const link of within(panel).getAllByRole("link", { name: "Advanced Excel" })) {
      expect(link).toHaveAttribute("href", `/admin/courses/${EXCEL_COURSE}`);
    }
    expect(within(panel).getByText("40%")).toBeInTheDocument();
    expect(within(panel).getByText("5 of 6 present")).toBeInTheDocument();
    expect(within(panel).getByText("Absent 1")).toBeInTheDocument();
    expect(within(panel).getByText("ORD-2026-000123")).toBeInTheDocument();
    expect(within(panel).getByText("Card declined by the issuer")).toBeInTheDocument();
    expect(within(panel).getByText("Very practical")).toBeInTheDocument();
    expect(within(panel).getByText("Hidden")).toBeInTheDocument();

    // Activity & security: sessions, events with their detail, the audit trail.
    await user.click(screen.getByRole("tab", { name: "Activity & security" }));
    panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("203.0.113.7")).toBeInTheDocument();
    expect(within(panel).getByText("Failed login")).toBeInTheDocument();
    expect(within(panel).getByText("reason:")).toBeInTheDocument();
    expect(within(panel).getByText("BAD_PASSWORD")).toBeInTheDocument();
    expect(within(panel).getByText("Update")).toBeInTheDocument();
  });

  it("shows an İştirakçi with no expert profile, without an Expert tab", async () => {
    mockQuery({ data: participantOnly });
    const user = userEvent.setup();
    renderAt(PARTICIPANT_ID);

    expect(screen.getByRole("heading", { level: 2, name: "Murad Hüseynov" })).toBeInTheDocument();
    const hero = screen.getByRole("region", { name: "Murad Hüseynov" });
    expect(within(hero).getByText("İştirakçi")).toBeInTheDocument();
    expect(within(hero).queryByText("Tutor")).not.toBeInTheDocument();

    expect(screen.queryByRole("tab", { name: "Expert" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "Overview",
      "Learning",
      "Activity & security",
    ]);

    const overview = screen.getByRole("tabpanel");
    expect(within(overview).queryByText("As an expert")).not.toBeInTheDocument();
    expect(within(overview).getByText("As an İştirakçi")).toBeInTheDocument();
    expect(within(overview).getByText("No sign-in methods linked.")).toBeInTheDocument();
    // No photo: nothing to fetch.
    expect(resolveAuthedMediaUrl).not.toHaveBeenCalled();

    await user.click(screen.getByRole("tab", { name: "Learning" }));
    expect(within(screen.getByRole("tabpanel")).getByText("ORD-2026-000123")).toBeInTheDocument();
  });

  it("leaves out every tab a new account has nothing for", () => {
    mockQuery({
      data: {
        ...participantOnly,
        account: { ...participantOnly.account, emailVerifiedAt: null, lastLoginAt: null },
        learner: {
          enrollments: [],
          orders: [],
          reviews: [],
          stats: { enrollmentCount: 0, activeCount: 0, completedCount: 0, averageProgress: 0 },
        },
        activity: { sessions: [], securityEvents: [], auditTrail: [] },
      },
    });
    renderAt(PARTICIPANT_ID);

    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Overview"]);
    expect(screen.getByText("Not verified")).toBeInTheDocument();
  });

  it("says the user was not found on a 404", () => {
    mockQuery({ error: { status: 404, code: "USER_NOT_FOUND", message: "User not found", isNormalized: true } });
    renderAt(PARTICIPANT_ID);
    expect(screen.getByText("User not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to users" })).toHaveAttribute("href", "/admin/users");
  });

  it("refuses an id that is not a UUID without asking the API", () => {
    mockQuery({});
    renderAt("not-a-user-id");
    expect(screen.getByText("User not found")).toBeInTheDocument();
    expect(useGetUserProfileQuery).toHaveBeenCalledWith("not-a-user-id", expect.objectContaining({ skip: true }));
  });

  it("offers a retry when the profile cannot be loaded", async () => {
    const refetch = vi.fn();
    mockQuery({ error: { status: 500, message: "Internal error", isNormalized: true }, refetch });
    renderAt(PARTICIPANT_ID);
    expect(screen.getByText("Couldn't load this profile")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("shows a spinner while the profile loads", () => {
    mockQuery({ isLoading: true, isFetching: true });
    renderAt(PARTICIPANT_ID);
    expect(screen.getByText("Loading profile…")).toBeInTheDocument();
  });
});
