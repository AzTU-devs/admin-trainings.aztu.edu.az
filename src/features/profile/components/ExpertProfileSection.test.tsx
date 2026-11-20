import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { ExpertProfileSection } from "./ExpertProfileSection";
import authReducer from "@features/auth/store/authSlice";
import uiReducer from "@lib/redux/uiSlice";
import { baseApi } from "@lib/query/baseApi";
import { httpClient } from "@lib/axios/httpClient";
import { tutorsApi } from "@features/tutors/api/tutorsApi";
import type { TutorProfileDto } from "@features/tutors/types";

/* The expert's own profile section on a real store, against a fake API. */

vi.mock("@shared/components/upload/ImageUploader", () => ({ ImageUploader: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const ME_URL = "/portal/tutor/me";
const CATEGORY = {
  id: "c0000000-0000-4000-8000-000000000001",
  slug: "it",
  name: "Information Technology",
  sortOrder: 0,
  active: true,
};
const ME: TutorProfileDto = {
  id: "a0000000-0000-4000-8000-000000000001",
  userId: "a0000000-0000-4000-8000-000000000002",
  firstName: "Leyla",
  lastName: "Məmmədova",
  approvalStatus: "APPROVED",
  ratingCount: 0,
  expertiseCategoryIds: [CATEGORY.id],
  certificates: [],
};

type Handler = (config: AxiosRequestConfig) => unknown;
let routes: Record<string, Handler> = {};
let profileGets = 0;

function refusal(status: number, code: string, message: string) {
  return { status, code, message, isNormalized: true };
}

function renderSection() {
  const store = configureStore({
    reducer: { auth: authReducer, ui: uiReducer, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm({ serializableCheck: false }).concat(baseApi.middleware),
  });
  render(
    <Provider store={store}>
      <ExpertProfileSection />
    </Provider>,
  );
  return store;
}

beforeEach(() => {
  profileGets = 0;
  routes = {
    [`GET ${ME_URL}`]: () => ME,
    "GET /public/categories": () => [CATEGORY],
  };
  vi.spyOn(httpClient, "request").mockImplementation(async (config: AxiosRequestConfig) => {
    const method = (config.method ?? "GET").toUpperCase();
    const url = config.url ?? "";
    if (method === "GET" && url === ME_URL) profileGets++;
    const handler = routes[`${method} ${url}`];
    if (!handler) throw refusal(404, "NOT_FOUND", `No route for ${method} ${url}`);
    return { data: { data: await handler(config) } } as AxiosResponse;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ExpertProfileSection", () => {
  it("keeps the form, and the edits in it, when a later reload of the profile fails", async () => {
    const user = userEvent.setup();
    const store = renderSection();
    const headline = await screen.findByRole("textbox", { name: "Headline" });
    await user.type(headline, "Data scientist");

    // The connection drops, and the profile is asked for again (after a save, say).
    routes[`GET ${ME_URL}`] = () => {
      throw refusal(503, "SERVICE_UNAVAILABLE", "Service unavailable");
    };
    act(() => {
      store.dispatch(tutorsApi.util.invalidateTags([{ type: "Tutor", id: "ME" }]));
    });
    await waitFor(() => expect(profileGets).toBe(2));
    await waitFor(() =>
      expect(tutorsApi.endpoints.getMyTutorProfile.select()(store.getState()).isError).toBe(true),
    );
    // Whatever the failed reload renders has rendered by now.
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    expect(screen.queryByText("Couldn't load your expert profile")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Headline" })).toHaveValue("Data scientist");
  });

  it("says so when the profile can't be loaded at all", async () => {
    routes[`GET ${ME_URL}`] = () => {
      throw refusal(503, "SERVICE_UNAVAILABLE", "Service unavailable");
    };
    renderSection();

    expect(await screen.findByText("Couldn't load your expert profile")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Headline" })).not.toBeInTheDocument();
  });

  it("says when the account has no expert profile (404)", async () => {
    routes[`GET ${ME_URL}`] = () => {
      throw refusal(404, "TUTOR_PROFILE_NOT_FOUND", "No tutor profile");
    };
    renderSection();

    expect(await screen.findByText("No expert profile yet")).toBeInTheDocument();
  });
});
