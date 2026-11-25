import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configure, render, screen, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router";
import type { AxiosResponse } from "axios";
import UsersPage from "./UsersPage";
import authReducer, { authSuccess } from "@features/auth/store/authSlice";
import uiReducer from "@lib/redux/uiSlice";
import { baseApi } from "@lib/query/baseApi";
import { httpClient } from "@lib/axios/httpClient";
import { ROLES, type Role } from "@shared/constants/roles";
import { ROUTES } from "@shared/constants/routes";
import type { AdminUser } from "@features/users/types";

/*
 * Sign-ups waiting for (or refused) approval on the Users table: their status
 * reads as such, and they are sent to Account approvals instead of being
 * switched on with the table's enable/disable toggle.
 */

configure({ asyncUtilTimeout: 5_000 });

const user = (id: string, fullName: string, status: AdminUser["status"]): AdminUser => ({
  id,
  email: `${id}@example.az`,
  fullName,
  roles: ["USER"],
  status,
  createdAt: "2026-11-20T08:00:00Z",
});

const USERS = [
  user("u-pending", "Leyla Əliyeva", "PENDING_APPROVAL"),
  user("u-rejected", "Orxan Məmmədli", "REJECTED"),
  user("u-active", "Kamran Quliyev", "ACTIVE"),
];

function renderPage(roles: Role[]) {
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
      <HelmetProvider>
        <MemoryRouter initialEntries={[ROUTES.adminUsers]}>
          <UsersPage />
        </MemoryRouter>
      </HelmetProvider>
    </Provider>,
  );
}

beforeEach(() => {
  vi.spyOn(httpClient, "request").mockImplementation(
    async () =>
      ({
        data: {
          data: { content: USERS, page: 0, size: 10, totalElements: USERS.length, totalPages: 1 },
        },
      }) as AxiosResponse,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** A user's phone card (the test environment's layout), by the name in it. */
const card = async (name: string) => (await screen.findByText(name)).closest("li")!;

describe("UsersPage — sign-ups awaiting approval", () => {
  it("shows the new statuses and sends a super admin to Account approvals instead of the toggle", async () => {
    renderPage([ROLES.SUPER_ADMIN]);

    const pending = await card("Leyla Əliyeva");
    expect(within(pending).getByText("Pending approval")).toBeInTheDocument();
    expect(within(pending).queryByRole("button", { name: "Disable" })).not.toBeInTheDocument();
    expect(within(pending).getByRole("link", { name: "Review sign-up" })).toHaveAttribute(
      "href",
      ROUTES.superAccountApprovals,
    );

    const rejected = await card("Orxan Məmmədli");
    expect(within(rejected).getByText("Rejected")).toBeInTheDocument();
    expect(within(rejected).getByRole("link", { name: "Review sign-up" })).toHaveAttribute(
      "href",
      ROUTES.superAccountApprovalsRejected,
    );

    // Any other account keeps its toggle.
    const active = await card("Kamran Quliyev");
    expect(within(active).getByRole("button", { name: "Disable" })).toBeInTheDocument();
  });

  it("offers an admin no way to switch a waiting sign-up on", async () => {
    renderPage([ROLES.ADMIN]);
    const pending = await card("Leyla Əliyeva");
    expect(within(pending).getByText("Pending approval")).toBeInTheDocument();
    expect(within(pending).queryByRole("button", { name: "Disable" })).not.toBeInTheDocument();
    expect(within(pending).queryByRole("link", { name: "Review sign-up" })).not.toBeInTheDocument();
  });
});
