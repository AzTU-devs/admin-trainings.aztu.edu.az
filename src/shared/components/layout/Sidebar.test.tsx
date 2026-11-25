import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configure, render, screen, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { Sidebar } from "./Sidebar";
import authReducer, { authSuccess } from "@features/auth/store/authSlice";
import uiReducer from "@lib/redux/uiSlice";
import { baseApi } from "@lib/query/baseApi";
import { httpClient } from "@lib/axios/httpClient";
import { ROLES, type Role } from "@shared/constants/roles";

/*
 * The menu's live counts: how many sign-ups and enrolment requests wait, on
 * the items that lead to them — asked for only for the roles that see them.
 */

configure({ asyncUtilTimeout: 5_000 });

const ACCOUNTS_URL = "/super/account-approvals";
const REQUESTS_URL = "/portal/enrollment-requests";

let totals: Record<string, number> = {};
let calls: string[] = [];

const realMatchMedia = window.matchMedia;

function renderSidebar(roles: Role[]) {
  const store = configureStore({
    reducer: { auth: authReducer, ui: uiReducer, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm({ serializableCheck: false }).concat(baseApi.middleware),
  });
  store.dispatch(
    authSuccess({
      user: { id: 1, email: "x@aztu.edu.az", fullName: "X", roles },
      accessToken: "t",
    }),
  );
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar />
      </MemoryRouter>
    </Provider>,
  );
}

beforeEach(() => {
  calls = [];
  totals = { [ACCOUNTS_URL]: 3, [REQUESTS_URL]: 120 };
  // The desktop sidebar (from 1024px): off-canvas it is inert.
  window.matchMedia = ((query: string) => ({
    ...realMatchMedia(query),
    matches: true,
  })) as typeof window.matchMedia;
  vi.spyOn(httpClient, "request").mockImplementation(async (config: AxiosRequestConfig) => {
    const url = config.url ?? "";
    calls.push(url);
    const totalElements = totals[url] ?? 0;
    return {
      data: { data: { content: [], page: 0, size: 1, totalElements, totalPages: totalElements } },
    } as AxiosResponse;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  window.matchMedia = realMatchMedia;
});

describe("Sidebar — live counts", () => {
  it("shows a super admin how many sign-ups and enrolment requests wait", async () => {
    renderSidebar([ROLES.SUPER_ADMIN]);

    const accounts = await screen.findByRole("link", { name: "Account approvals, 3 waiting" });
    expect(within(accounts).getByText("3")).toBeInTheDocument();
    // Past 99 the pill says 99+; the link's name keeps the number.
    const requests = await screen.findByRole("link", { name: "Enrolment requests, 120 waiting" });
    expect(within(requests).getByText("99+")).toBeInTheDocument();
  });

  it("shows no pill while nothing waits", async () => {
    totals = { [ACCOUNTS_URL]: 0, [REQUESTS_URL]: 0 };
    renderSidebar([ROLES.SUPER_ADMIN]);
    await waitFor(() => expect(calls).toContain(ACCOUNTS_URL));
    await waitFor(() => expect(calls).toContain(REQUESTS_URL));
    expect(screen.getByRole("link", { name: "Account approvals" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Enrolment requests" })).toBeInTheDocument();
  });

  it("counts an expert's requests on their Enrollments item", async () => {
    totals = { [REQUESTS_URL]: 2 };
    renderSidebar([ROLES.TUTOR]);
    expect(await screen.findByRole("link", { name: "Enrollments, 2 waiting" })).toBeInTheDocument();
    expect(calls).not.toContain(ACCOUNTS_URL);
  });

  it("asks an admin for neither: the queues are not theirs", async () => {
    renderSidebar([ROLES.ADMIN]);
    expect(await screen.findByRole("link", { name: "Users" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Account approvals/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Enrolment requests/ })).not.toBeInTheDocument();
    expect(calls).not.toContain(ACCOUNTS_URL);
    expect(calls).not.toContain(REQUESTS_URL);
  });
});
