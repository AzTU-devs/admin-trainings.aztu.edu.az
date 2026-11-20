import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { tutorsApi } from "./tutorsApi";
import authReducer from "@features/auth/store/authSlice";
import uiReducer from "@lib/redux/uiSlice";
import { baseApi } from "@lib/query/baseApi";
import { httpClient } from "@lib/axios/httpClient";
import type { TutorCertificate, TutorProfileDto } from "@features/tutors/types";

/*
 * Certificate changes against a real store and a fake API: what each one
 * writes into the cached own profile, and what it asks the API for again.
 * The profile form may hold unsaved edits while they run, so the own profile
 * is never fetched again under it.
 */

const ME_URL = "/portal/tutor/me";
const LIST_URL = "/portal/tutor/admin";
const ME_ID = "a0000000-0000-4000-8000-000000000001";

const certificate = (n: number): TutorCertificate => ({
  id: `e0000000-0000-4000-8000-00000000000${n}`,
  title: `Certificate ${n}`,
  issuer: null,
  issuedYear: null,
  mediaId: `d0000000-0000-4000-8000-00000000000${n}`,
  fileUrl: `/api/public/media/d0000000-0000-4000-8000-00000000000${n}/content`,
  createdAt: "2026-11-01T10:00:00Z",
});

const ME: TutorProfileDto = {
  id: ME_ID,
  userId: "a0000000-0000-4000-8000-000000000002",
  firstName: "Leyla",
  lastName: "Məmmədova",
  approvalStatus: "APPROVED",
  ratingCount: 0,
  expertiseCategoryIds: [],
  certificates: [certificate(1)],
};

type Handler = (config: AxiosRequestConfig) => unknown;
let routes: Record<string, Handler> = {};
let calls: Array<{ method: string; url: string }> = [];
const callsTo = (method: string, url: string) =>
  calls.filter((c) => c.method === method && c.url === url).length;

function refusal(status: number, code: string, message: string) {
  return { status, code, message, isNormalized: true };
}

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, ui: uiReducer, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm({ serializableCheck: false }).concat(baseApi.middleware),
  });
}
type Store = ReturnType<typeof makeStore>;

/** The own profile and the tutors table, both on screen (subscribed), as on the profile page of an admin-tutor. */
async function loaded(): Promise<Store> {
  const store = makeStore();
  await store.dispatch(tutorsApi.endpoints.getMyTutorProfile.initiate());
  await store.dispatch(tutorsApi.endpoints.listTutors.initiate());
  return store;
}

const cached = (store: Store) =>
  tutorsApi.endpoints.getMyTutorProfile.select()(store.getState()).data;
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

beforeEach(() => {
  calls = [];
  routes = {
    [`GET ${ME_URL}`]: () => ME,
    [`GET ${LIST_URL}`]: () => ({
      content: [ME],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 20,
    }),
  };
  vi.spyOn(httpClient, "request").mockImplementation(async (config: AxiosRequestConfig) => {
    const method = (config.method ?? "GET").toUpperCase();
    const url = config.url ?? "";
    calls.push({ method, url });
    const handler = routes[`${method} ${url}`];
    if (!handler) throw refusal(404, "NOT_FOUND", `No route for ${method} ${url}`);
    return { data: { data: await handler(config) } } as AxiosResponse;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("certificate changes and the cached profiles", () => {
  it("writes an added certificate into the own profile instead of fetching it again", async () => {
    const store = await loaded();
    routes[`POST ${ME_URL}/certificates`] = () => certificate(2);

    await store.dispatch(
      tutorsApi.endpoints.addMyCertificate.initiate({
        title: "Certificate 2",
        mediaId: certificate(2).mediaId,
      }),
    );

    expect(cached(store)?.certificates?.map((c) => c.id)).toEqual([
      certificate(1).id,
      certificate(2).id,
    ]);
    // The table is reloaded for its rows' certificates…
    await vi.waitFor(() => expect(callsTo("GET", LIST_URL)).toBe(2));
    // …the own profile, which the form was built from, is not.
    expect(callsTo("GET", ME_URL)).toBe(1);
  });

  it("asks for nothing again when an add is refused", async () => {
    const store = await loaded();
    routes[`POST ${ME_URL}/certificates`] = () => {
      throw refusal(400, "CERTIFICATE_LIMIT", "At most 30 certificates");
    };

    await store.dispatch(
      tutorsApi.endpoints.addMyCertificate.initiate({
        title: "One more",
        mediaId: certificate(2).mediaId,
      }),
    );
    await settle();

    expect(callsTo("GET", ME_URL)).toBe(1);
    expect(callsTo("GET", LIST_URL)).toBe(1);
    expect(cached(store)?.certificates).toEqual([certificate(1)]);
  });

  it("takes a deleted certificate off the own profile — also one already deleted elsewhere — without fetching it again", async () => {
    const store = await loaded();
    routes[`DELETE ${ME_URL}/certificates/${certificate(1).id}`] = () => "";

    await store.dispatch(tutorsApi.endpoints.deleteMyCertificate.initiate(certificate(1).id));
    expect(cached(store)?.certificates).toEqual([]);

    // Gone on the server already: the list there is as if this delete went through.
    store.dispatch(tutorsApi.util.upsertQueryData("getMyTutorProfile", undefined, ME));
    routes[`DELETE ${ME_URL}/certificates/${certificate(1).id}`] = () => {
      throw refusal(404, "CERTIFICATE_NOT_FOUND", "Certificate does not exist");
    };
    await store.dispatch(tutorsApi.endpoints.deleteMyCertificate.initiate(certificate(1).id));
    expect(cached(store)?.certificates).toEqual([]);

    await vi.waitFor(() => expect(callsTo("GET", LIST_URL)).toBe(3));
    expect(callsTo("GET", ME_URL)).toBe(1);
  });

  it("keeps a certificate whose delete is refused, and asks for nothing again", async () => {
    const store = await loaded();
    routes[`DELETE ${ME_URL}/certificates/${certificate(1).id}`] = () => {
      throw refusal(503, "SERVICE_UNAVAILABLE", "Try again");
    };

    await store.dispatch(tutorsApi.endpoints.deleteMyCertificate.initiate(certificate(1).id));
    await settle();

    expect(cached(store)?.certificates).toEqual([certificate(1)]);
    expect(callsTo("GET", ME_URL)).toBe(1);
    expect(callsTo("GET", LIST_URL)).toBe(1);
  });

  it("writes an admin's change into the own profile only when that profile is the one changed", async () => {
    const store = await loaded();
    const other = "a0000000-0000-4000-8000-000000000099";
    routes[`POST /admin/tutors/${other}/certificates`] = () => certificate(3);
    routes[`POST /admin/tutors/${ME_ID}/certificates`] = () => certificate(2);
    routes[`DELETE /admin/tutors/${ME_ID}/certificates/${certificate(1).id}`] = () => "";

    await store.dispatch(
      tutorsApi.endpoints.addTutorCertificate.initiate({
        tutorId: other,
        body: { title: "Other's", mediaId: certificate(3).mediaId },
      }),
    );
    expect(cached(store)?.certificates).toEqual([certificate(1)]);

    await store.dispatch(
      tutorsApi.endpoints.addTutorCertificate.initiate({
        tutorId: ME_ID,
        body: { title: "Mine", mediaId: certificate(2).mediaId },
      }),
    );
    await store.dispatch(
      tutorsApi.endpoints.deleteTutorCertificate.initiate({
        tutorId: ME_ID,
        id: certificate(1).id,
      }),
    );
    expect(cached(store)?.certificates).toEqual([certificate(2)]);

    await settle();
    expect(callsTo("GET", ME_URL)).toBe(1);
  });
});
