import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { toast } from "sonner";
import AccountApprovalsPage from "./AccountApprovalsPage";
import authReducer, { authSuccess } from "@features/auth/store/authSlice";
import uiReducer from "@lib/redux/uiSlice";
import { baseApi } from "@lib/query/baseApi";
import { httpClient } from "@lib/axios/httpClient";
import { ROLES } from "@shared/constants/roles";
import { ROUTES } from "@shared/constants/routes";
import type { AccountApprovalDto } from "@features/account-approvals/types";

/*
 * The super admin's queue of sign-ups. A real store against a fake API, as
 * the other pages with decisions are tested: the URLs, the query, the bodies
 * and what is asked for again afterwards are all under test.
 */

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

configure({ asyncUtilTimeout: 5_000 });

const LIST_URL = "/super/account-approvals";

const LEYLA: AccountApprovalDto = {
  userId: "a1111111-1111-4111-8111-111111111111",
  firstName: "Leyla",
  lastName: "Əliyeva",
  email: "leyla@example.az",
  phone: "+994 50 111 22 33",
  emailVerified: true,
  signUpMethod: "PASSWORD",
  createdAt: "2026-11-20T08:00:00Z",
  decidedAt: null,
  decidedByName: null,
  rejectionReason: null,
};

const KAMRAN: AccountApprovalDto = {
  ...LEYLA,
  userId: "a2222222-2222-4222-8222-222222222222",
  firstName: "Kamran",
  lastName: "Quliyev",
  email: "kamran@gmail.com",
  phone: null,
  emailVerified: false,
  signUpMethod: "GOOGLE",
  createdAt: "2026-11-21T09:30:00Z",
};

const REJECTED: AccountApprovalDto = {
  ...LEYLA,
  userId: "a3333333-3333-4333-8333-333333333333",
  firstName: "Orxan",
  lastName: "Məmmədli",
  email: "orxan@icloud.com",
  signUpMethod: "APPLE",
  decidedAt: "2026-11-22T10:00:00Z",
  decidedByName: "Nigar Super",
  rejectionReason: "Not an AzTU student",
};

type Handler = (config: AxiosRequestConfig) => unknown;
let routes: Record<string, Handler> = {};
let calls: Array<{
  method: string;
  url: string;
  params?: Record<string, unknown>;
  data?: unknown;
}> = [];
const callsTo = (method: string, url: string) =>
  calls.filter((c) => c.method === method && c.url === url);
const refusal = (status: number, code: string, message: string) => ({
  status,
  code,
  message,
  isNormalized: true,
});
const pageOf = (content: AccountApprovalDto[], size = 10) => ({
  content: content.slice(0, size),
  page: 0,
  size,
  totalElements: content.length,
  totalPages: Math.ceil(content.length / size),
});

let pending: AccountApprovalDto[] = [];
let rejected: AccountApprovalDto[] = [];

function renderPage({
  entry = ROUTES.superAccountApprovals,
  permissions,
}: { entry?: string; permissions?: string[] } = {}) {
  const store = configureStore({
    reducer: { auth: authReducer, ui: uiReducer, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm({ serializableCheck: false }).concat(baseApi.middleware),
  });
  store.dispatch(
    authSuccess({
      user: {
        id: 1,
        email: "super@aztu.edu.az",
        fullName: "Super",
        roles: [ROLES.SUPER_ADMIN],
        ...(permissions ? { permissions } : {}),
      },
      accessToken: "t",
    }),
  );
  render(
    <Provider store={store}>
      <HelmetProvider>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path={ROUTES.superAccountApprovals} element={<AccountApprovalsPage />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    </Provider>,
  );
}

const realMatchMedia = window.matchMedia;
/** The table layout (from 768px); the test environment otherwise matches no media query (phone cards). */
function wide() {
  window.matchMedia = ((query: string) => ({
    ...realMatchMedia(query),
    matches: true,
  })) as typeof window.matchMedia;
}

beforeEach(() => {
  calls = [];
  pending = [LEYLA, KAMRAN];
  rejected = [REJECTED];
  routes = {
    [`GET ${LIST_URL}`]: (config) => {
      const params = config.params as { status: string; size: number; q?: string };
      const rows = params.status === "REJECTED" ? rejected : pending;
      const matching = params.q ? rows.filter((r) => r.email.includes(params.q!)) : rows;
      return pageOf(matching, params.size);
    },
    [`POST ${LIST_URL}/${LEYLA.userId}/approve`]: () => {
      pending = pending.filter((r) => r.userId !== LEYLA.userId);
      return LEYLA;
    },
    [`POST ${LIST_URL}/${KAMRAN.userId}/reject`]: () => {
      pending = pending.filter((r) => r.userId !== KAMRAN.userId);
      return { ...KAMRAN, rejectionReason: "x" };
    },
    [`POST ${LIST_URL}/${REJECTED.userId}/approve`]: () => {
      rejected = [];
      return REJECTED;
    },
  };
  vi.spyOn(httpClient, "request").mockImplementation(async (config: AxiosRequestConfig) => {
    const method = (config.method ?? "GET").toUpperCase();
    const url = config.url ?? "";
    calls.push({
      method,
      url,
      params: config.params as Record<string, unknown>,
      data: config.data,
    });
    const handler = routes[`${method} ${url}`];
    if (!handler) throw refusal(404, "NOT_FOUND", `No route for ${method} ${url}`);
    return { data: { data: await handler(config) } } as AxiosResponse;
  });
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  vi.mocked(toast.info).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.matchMedia = realMatchMedia;
});

const listCalls = (status: string, size = 10) =>
  callsTo("GET", LIST_URL).filter((c) => c.params?.status === status && c.params?.size === size);

describe("AccountApprovalsPage", () => {
  it("lists the waiting sign-ups with their e-mail, whether it is verified, the method and the date", async () => {
    wide();
    renderPage();

    const table = await screen.findByRole("table");
    expect(await within(table).findByText("Leyla Əliyeva")).toBeInTheDocument();
    expect(listCalls("PENDING_APPROVAL")[0].params).toMatchObject({
      status: "PENDING_APPROVAL",
      page: 0,
      size: 10,
    });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Name", "E-mail", "Verified", "Method", "Signed up", ""]);
    const leyla = within(table).getByText("Leyla Əliyeva").closest("tr")!;
    expect(leyla).toHaveTextContent("leyla@example.az");
    expect(leyla).toHaveTextContent("Verified");
    expect(leyla).toHaveTextContent("Email & password");
    const kamran = within(table).getByText("Kamran Quliyev").closest("tr")!;
    expect(kamran).toHaveTextContent("Not verified");
    expect(kamran).toHaveTextContent("Google");
    // The tab says how many wait, from a one-row page the menu shares.
    expect(screen.getByRole("tab", { name: /Pending/ })).toHaveTextContent("Pending2");
    expect(listCalls("PENDING_APPROVAL", 1)).toHaveLength(1);
  });

  it("approves a sign-up after a confirm, then asks for the list and the count again", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Approve Leyla Əliyeva" }));

    const dialog = await screen.findByRole("dialog", { name: "Approve this account?" });
    expect(dialog).toHaveTextContent(
      "They can sign in on the website straight away, and are e-mailed",
    );
    expect(
      within(dialog).queryByText("The e-mail address is not verified yet"),
    ).not.toBeInTheDocument();
    const before = {
      list: listCalls("PENDING_APPROVAL").length,
      count: listCalls("PENDING_APPROVAL", 1).length,
    };
    await user.click(within(dialog).getByRole("button", { name: "Approve account" }));

    await waitFor(() =>
      expect(callsTo("POST", `${LIST_URL}/${LEYLA.userId}/approve`)).toHaveLength(1),
    );
    expect(toast.success).toHaveBeenCalledWith("Leyla Əliyeva's account is approved");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(listCalls("PENDING_APPROVAL").length).toBeGreaterThan(before.list));
    await waitFor(() =>
      expect(listCalls("PENDING_APPROVAL", 1).length).toBeGreaterThan(before.count),
    );
    await waitFor(() => expect(screen.queryByText("Leyla Əliyeva")).not.toBeInTheDocument());
    expect(screen.getByRole("tab", { name: /Pending/ })).toHaveTextContent("Pending1");
  });

  it("warns before approving an address nobody has verified", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Approve Kamran Quliyev" }));
    const dialog = await screen.findByRole("dialog", { name: "Approve this account?" });
    expect(within(dialog).getByText("The e-mail address is not verified yet")).toBeInTheDocument();
  });

  it("needs a reason to reject, and sends it trimmed", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Reject Kamran Quliyev" }));
    const dialog = await screen.findByRole("dialog", { name: "Reject this sign-up?" });

    await user.click(within(dialog).getByRole("button", { name: "Reject sign-up" }));
    expect(
      await within(dialog).findByText(
        "Say why the sign-up is rejected; the person is e-mailed this reason",
      ),
    ).toBeInTheDocument();
    expect(callsTo("POST", `${LIST_URL}/${KAMRAN.userId}/reject`)).toHaveLength(0);

    await user.type(within(dialog).getByLabelText(/Reason/), "  Not an AzTU student  ");
    await user.click(within(dialog).getByRole("button", { name: "Reject sign-up" }));

    await waitFor(() =>
      expect(callsTo("POST", `${LIST_URL}/${KAMRAN.userId}/reject`)).toHaveLength(1),
    );
    expect(callsTo("POST", `${LIST_URL}/${KAMRAN.userId}/reject`)[0].data).toEqual({
      reason: "Not an AzTU student",
    });
    expect(toast.success).toHaveBeenCalledWith("Kamran Quliyev's sign-up is rejected");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("refuses a reason over 500 characters before sending it", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Reject Kamran Quliyev" }));
    const dialog = await screen.findByRole("dialog", { name: "Reject this sign-up?" });
    await user.click(within(dialog).getByLabelText(/Reason/));
    await user.paste("x".repeat(501));
    await user.click(within(dialog).getByRole("button", { name: "Reject sign-up" }));
    expect(await within(dialog).findByText("At most 500 characters")).toBeInTheDocument();
    expect(callsTo("POST", `${LIST_URL}/${KAMRAN.userId}/reject`)).toHaveLength(0);
  });

  it("closes with the API's message when someone else decided first", async () => {
    routes[`POST ${LIST_URL}/${LEYLA.userId}/approve`] = () => {
      throw refusal(409, "ACCOUNT_NOT_PENDING", "This account is no longer waiting for approval.");
    };
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Approve Leyla Əliyeva" }));
    const dialog = await screen.findByRole("dialog", { name: "Approve this account?" });
    const before = listCalls("PENDING_APPROVAL").length;
    await user.click(within(dialog).getByRole("button", { name: "Approve account" }));

    await waitFor(() =>
      expect(toast.info).toHaveBeenCalledWith("This account is no longer waiting for approval."),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // The list is asked for again, to show the account as it is now.
    await waitFor(() => expect(listCalls("PENDING_APPROVAL").length).toBeGreaterThan(before));
  });

  it("keeps any other refusal in the dialog, with the API's message", async () => {
    routes[`POST ${LIST_URL}/${KAMRAN.userId}/reject`] = () => {
      throw refusal(400, "VALIDATION_FAILED", "Something is wrong with this request");
    };
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Reject Kamran Quliyev" }));
    const dialog = await screen.findByRole("dialog", { name: "Reject this sign-up?" });
    await user.type(within(dialog).getByLabelText(/Reason/), "Duplicate account");
    await user.click(within(dialog).getByRole("button", { name: "Reject sign-up" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Something is wrong with this request",
    );
    expect(screen.getByRole("dialog", { name: "Reject this sign-up?" })).toBeInTheDocument();
  });

  it("lists rejected sign-ups with who decided and why, and can still approve them", async () => {
    wide();
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Leyla Əliyeva");
    await user.click(screen.getByRole("tab", { name: "Rejected" }));

    const table = await screen.findByRole("table");
    const row = (await within(table).findByText("Orxan Məmmədli")).closest("tr")!;
    expect(listCalls("REJECTED")).toHaveLength(1);
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toContain("Reason");
    expect(row).toHaveTextContent("by Nigar Super");
    expect(row).toHaveTextContent("Not an AzTU student");
    expect(row).toHaveTextContent("Apple");
    expect(within(row).queryByRole("button", { name: /^Reject/ })).not.toBeInTheDocument();

    await user.click(within(row).getByRole("button", { name: "Approve Orxan Məmmədli" }));
    const dialog = await screen.findByRole("dialog", { name: "Approve this account?" });
    await user.click(within(dialog).getByRole("button", { name: "Approve account" }));
    await waitFor(() =>
      expect(callsTo("POST", `${LIST_URL}/${REJECTED.userId}/approve`)).toHaveLength(1),
    );
    await waitFor(() => expect(screen.queryByText("Orxan Məmmədli")).not.toBeInTheDocument());
  });

  it("opens on the Rejected tab from the URL", async () => {
    renderPage({ entry: ROUTES.superAccountApprovalsRejected });
    expect(await screen.findByText("Orxan Məmmədli")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Rejected" })).toHaveAttribute("aria-selected", "true");
  });

  it("searches by name or e-mail on the server", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Leyla Əliyeva");
    await user.type(screen.getByRole("textbox", { name: "Search sign-ups" }), "gmail");

    await waitFor(() =>
      expect(callsTo("GET", LIST_URL).some((c) => c.params?.q === "gmail")).toBe(true),
    );
    await waitFor(() => expect(screen.queryByText("Leyla Əliyeva")).not.toBeInTheDocument());
    expect(screen.getByText("Kamran Quliyev")).toBeInTheDocument();
  });

  it("asks for nothing without user:approve, and says why", async () => {
    routes[`GET ${LIST_URL}`] = () => {
      throw refusal(403, "FORBIDDEN", "Access denied");
    };
    renderPage({ permissions: ["user:manage"] });
    expect(await screen.findByText("No access to account approvals")).toBeInTheDocument();
    // The count is not even asked for.
    expect(listCalls("PENDING_APPROVAL", 1)).toHaveLength(0);
  });
});
