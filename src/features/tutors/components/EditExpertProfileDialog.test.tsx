import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { EditExpertProfileDialog } from "./EditExpertProfileDialog";
import authReducer from "@features/auth/store/authSlice";
import uiReducer from "@lib/redux/uiSlice";
import { baseApi } from "@lib/query/baseApi";
import { httpClient } from "@lib/axios/httpClient";
import type { TutorAward, TutorProfileDto } from "@features/tutors/types";

/* An admin's edit of another expert's profile, on a real store against a fake API: which endpoints it uses. */

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

const CATEGORY = {
  id: "c0000000-0000-4000-8000-000000000001",
  slug: "it",
  name: "Information Technology",
  sortOrder: 0,
  active: true,
};
const TUTOR_ID = "a0000000-0000-4000-8000-000000000077";
const HONOUR: TutorAward = {
  id: "f0000000-0000-4000-8000-000000000002",
  nameAz: "Fəxri fərman",
  nameEn: "Certificate of Honour",
  mediaId: null,
  fileUrl: null,
  fileKind: null,
  createdAt: "2026-11-02T10:00:00Z",
};
const GRANT: TutorAward = { ...HONOUR, id: "f0000000-0000-4000-8000-000000000003", nameAz: "Prezident təqaüdü" };
const TUTOR: TutorProfileDto = {
  id: TUTOR_ID,
  userId: "a0000000-0000-4000-8000-000000000078",
  firstName: "Rəşad",
  lastName: "Əliyev",
  approvalStatus: "APPROVED",
  ratingCount: 0,
  expertiseCategoryIds: [CATEGORY.id],
  certificates: [],
  awards: [GRANT],
};

type Handler = (config: AxiosRequestConfig) => unknown;
let routes: Record<string, Handler> = {};
let calls: string[] = [];

beforeEach(() => {
  calls = [];
  routes = { "GET /public/categories": () => [CATEGORY] };
  vi.spyOn(httpClient, "request").mockImplementation(async (config: AxiosRequestConfig) => {
    const key = `${(config.method ?? "GET").toUpperCase()} ${config.url ?? ""}`;
    calls.push(key);
    const handler = routes[key];
    if (!handler) throw { status: 404, code: "NOT_FOUND", message: `No route for ${key}`, isNormalized: true };
    return { data: { data: await handler(config) } } as AxiosResponse;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("EditExpertProfileDialog — awards", () => {
  it("adds and deletes the expert's awards through the admin endpoints", async () => {
    const user = userEvent.setup();
    let posted: unknown;
    routes[`POST /admin/tutors/${TUTOR_ID}/awards`] = (config) => {
      posted = config.data;
      return HONOUR;
    };
    routes[`DELETE /admin/tutors/${TUTOR_ID}/awards/${GRANT.id}`] = () => "";
    const store = configureStore({
      reducer: { auth: authReducer, ui: uiReducer, [baseApi.reducerPath]: baseApi.reducer },
      middleware: (gdm) => gdm({ serializableCheck: false }).concat(baseApi.middleware),
    });
    render(
      <Provider store={store}>
        <EditExpertProfileDialog tutor={TUTOR} onClose={vi.fn()} />
      </Provider>,
    );

    const editor = await screen.findByRole("dialog", { name: /Edit expert profile/ });
    await user.click(within(editor).getByRole("button", { name: "Add award" }));
    const dialog = await screen.findByRole("dialog", { name: "Add award" });
    await user.type(within(dialog).getByRole("textbox", { name: /^Name \(AZ\)/ }), "Fəxri fərman");
    await user.type(within(dialog).getByRole("textbox", { name: /^Name \(EN\)/ }), "Certificate of Honour");
    await user.click(within(dialog).getByRole("button", { name: "Add award" }));

    await waitFor(() => expect(posted).toEqual({ nameAz: "Fəxri fərman", nameEn: "Certificate of Honour" }));
    const list = await within(editor).findByRole("list", { name: "Awards" });
    expect(await within(list).findByText("Fəxri fərman")).toBeInTheDocument();

    await user.click(within(editor).getByRole("button", { name: "Delete Prezident təqaüdü" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Delete this award?" })).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(within(list).queryByText("Prezident təqaüdü")).not.toBeInTheDocument());

    // Never the expert's own endpoints, nor the profile PATCH.
    expect(calls.filter((c) => c.includes("/portal/tutor/me") || c.startsWith("PATCH"))).toEqual([]);
  });
});
