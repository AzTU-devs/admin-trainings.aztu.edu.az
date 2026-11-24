import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import authReducer from "@features/auth/store/authSlice";
import uiReducer from "@lib/redux/uiSlice";
import { baseApi } from "@lib/query/baseApi";
import { httpClient } from "@lib/axios/httpClient";
import { calendarApi } from "./calendarApi";
import { roomRequestsApi } from "@features/room-requests/api/roomRequestsApi";
import { coursesApi } from "@features/courses/api/coursesApi";
import { roomsApi } from "@features/rooms/api/roomsApi";

/*
 * The calendar against a real store and a fake API: an open calendar (a
 * subscribed range) is fetched again after every write that changes what it
 * shows — a booking decided, cancelled or removed, a course changed — and a
 * range that is only cached is fetched again when it is shown next.
 */

const CALENDAR_URL = "/admin/calendar";
const BOOKING_ID = "b0000000-0000-4000-8000-000000000001";
const SERIES_ID = "5e000000-0000-4000-8000-000000000001";
const COURSE_ID = "c0000000-0000-4000-8000-000000000001";
const ROOM_ID = "a0000000-0000-4000-8000-000000000301";

type Handler = (config: AxiosRequestConfig) => unknown;
let routes: Record<string, Handler> = {};
let calls: Array<{ method: string; url: string; params?: unknown }> = [];
const calendarFetches = () => calls.filter((c) => c.method === "GET" && c.url === CALENDAR_URL);

function answer(config: AxiosRequestConfig) {
  const method = (config.method ?? "GET").toUpperCase();
  const url = config.url ?? "";
  calls.push({ method, url, params: config.params });
  const handler = routes[`${method} ${url}`];
  if (!handler)
    throw {
      status: 404,
      code: "NOT_FOUND",
      message: `No route for ${method} ${url}`,
      isNormalized: true,
    };
  return { data: { data: handler(config) } } as AxiosResponse;
}

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, ui: uiReducer, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm({ serializableCheck: false }).concat(baseApi.middleware),
  });
}
type Store = ReturnType<typeof makeStore>;

const NOVEMBER = { from: "2026-10-26", to: "2026-12-07" };
const DECEMBER = { from: "2026-11-30", to: "2027-01-11" };

/** The calendar open on November, as the page holds it (subscribed). */
async function openCalendar(): Promise<Store> {
  const store = makeStore();
  await store.dispatch(calendarApi.endpoints.getAdminCalendar.initiate(NOVEMBER));
  expect(calendarFetches()).toHaveLength(1);
  return store;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

beforeEach(() => {
  calls = [];
  const ok = () => ({});
  routes = {
    [`GET ${CALENDAR_URL}`]: () => ({ timezone: "Asia/Baku", events: [], truncated: false }),
    [`POST /portal/room-bookings`]: ok,
    [`DELETE /portal/room-bookings/${BOOKING_ID}`]: ok,
    [`POST /portal/room-bookings/admin/${BOOKING_ID}/decision`]: ok,
    [`POST /portal/room-bookings/series`]: ok,
    [`DELETE /portal/room-bookings/series/${SERIES_ID}`]: ok,
    [`POST /portal/room-bookings/series/admin/${SERIES_ID}/decision`]: ok,
    [`DELETE /super/room-bookings/${BOOKING_ID}`]: ok,
    [`DELETE /super/room-bookings/series/${SERIES_ID}`]: ok,
    [`POST /admin/courses`]: () => ({ id: COURSE_ID, slug: "excel" }),
    [`PATCH /admin/courses/${COURSE_ID}`]: () => ({ id: COURSE_ID, slug: "excel" }),
    [`POST /admin/courses/${COURSE_ID}/publish`]: () => ({ id: COURSE_ID, slug: "excel" }),
    [`POST /admin/courses/${COURSE_ID}/unpublish`]: () => ({ id: COURSE_ID, slug: "excel" }),
    [`PUT /admin/courses/${COURSE_ID}/tutors`]: () => ({ id: COURSE_ID, slug: "excel" }),
    [`POST /admin/courses/${COURSE_ID}/decision`]: () => ({ id: COURSE_ID, slug: "excel" }),
    [`POST /portal/courses/${COURSE_ID}/archive`]: ok,
    [`DELETE /admin/rooms/${ROOM_ID}`]: ok,
  };
  // The calendar reads through `httpClient.get` (it needs the whole envelope),
  // the other endpoints through the shared base query's `request`.
  vi.spyOn(httpClient, "request").mockImplementation(async (config) => answer(config));
  vi.spyOn(httpClient, "get").mockImplementation(async (url, config) =>
    answer({ ...config, url, method: "GET" }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

const WRITES: Array<[string, (store: Store) => Promise<unknown>]> = [
  [
    "approving a booking",
    (s) =>
      s.dispatch(
        roomRequestsApi.endpoints.decideRoomBooking.initiate({
          id: BOOKING_ID,
          decision: "APPROVED",
        }),
      ),
  ],
  [
    "rejecting a booking",
    (s) =>
      s.dispatch(
        roomRequestsApi.endpoints.decideRoomBooking.initiate({
          id: BOOKING_ID,
          decision: "REJECTED",
          note: "No",
        }),
      ),
  ],
  [
    "cancelling a booking",
    (s) => s.dispatch(roomRequestsApi.endpoints.cancelRoomBooking.initiate(BOOKING_ID)),
  ],
  [
    "requesting a booking",
    (s) =>
      s.dispatch(
        roomRequestsApi.endpoints.createRoomBooking.initiate({
          roomId: ROOM_ID,
          startsAt: "2026-11-02T06:00:00Z",
          endsAt: "2026-11-02T08:00:00Z",
        }),
      ),
  ],
  [
    "deciding a long-term booking",
    (s) =>
      s.dispatch(
        roomRequestsApi.endpoints.decideRoomBookingSeries.initiate({
          id: SERIES_ID,
          decision: "APPROVED",
          note: null,
        }),
      ),
  ],
  [
    "cancelling a long-term booking",
    (s) => s.dispatch(roomRequestsApi.endpoints.cancelRoomBookingSeries.initiate(SERIES_ID)),
  ],
  [
    "requesting a long-term booking",
    (s) =>
      s.dispatch(
        roomRequestsApi.endpoints.createRoomBookingSeries.initiate({
          roomId: ROOM_ID,
          offlineCourseId: null,
          startDate: "2026-11-02",
          endDate: "2026-11-30",
          daysOfWeek: ["MONDAY"],
          startTime: "10:00",
          endTime: "12:00",
          note: null,
        }),
      ),
  ],
  [
    "removing a booking",
    (s) => s.dispatch(roomRequestsApi.endpoints.removeRoomBooking.initiate(BOOKING_ID)),
  ],
  [
    "removing a long-term booking",
    (s) => s.dispatch(roomRequestsApi.endpoints.removeRoomBookingSeries.initiate(SERIES_ID)),
  ],
  [
    "creating a course",
    (s) => s.dispatch(coursesApi.endpoints.createAdminCourse.initiate({} as never)),
  ],
  [
    "editing a course",
    (s) =>
      s.dispatch(
        coursesApi.endpoints.updateAdminCourse.initiate({ id: COURSE_ID, body: {} as never }),
      ),
  ],
  [
    "publishing a course",
    (s) => s.dispatch(coursesApi.endpoints.publishCourse.initiate(COURSE_ID)),
  ],
  [
    "unpublishing a course",
    (s) => s.dispatch(coursesApi.endpoints.unpublishCourse.initiate(COURSE_ID)),
  ],
  [
    "changing a course's tutors",
    (s) =>
      s.dispatch(
        coursesApi.endpoints.setCourseTutors.initiate({ id: COURSE_ID, body: {} as never }),
      ),
  ],
  [
    "deciding on a course",
    (s) =>
      s.dispatch(
        coursesApi.endpoints.decideCourse.initiate({ id: COURSE_ID, decision: "APPROVED" }),
      ),
  ],
  ["archiving a course", (s) => s.dispatch(coursesApi.endpoints.archiveCourse.initiate(COURSE_ID))],
  ["deleting a room", (s) => s.dispatch(roomsApi.endpoints.deleteRoom.initiate(ROOM_ID))],
];

describe("the open calendar after a change", () => {
  it.each(WRITES)("is fetched again after %s", async (_name, write) => {
    const store = await openCalendar();
    await write(store);
    await vi.waitFor(() => expect(calendarFetches()).toHaveLength(2));
    expect(calendarFetches()[1].params).toEqual(NOVEMBER);
  });

  it("fetches a range that was only cached again when it is shown next", async () => {
    const store = makeStore();
    // December was looked at, then the calendar went back to November.
    const december = store.dispatch(calendarApi.endpoints.getAdminCalendar.initiate(DECEMBER));
    await december;
    december.unsubscribe();
    await store.dispatch(calendarApi.endpoints.getAdminCalendar.initiate(NOVEMBER));
    expect(calendarFetches()).toHaveLength(2);

    await store.dispatch(roomRequestsApi.endpoints.removeRoomBooking.initiate(BOOKING_ID));
    await settle();
    // November (on screen) at once; December only once it is shown again.
    expect(calendarFetches().map((c) => c.params)).toEqual([DECEMBER, NOVEMBER, NOVEMBER]);
    await store.dispatch(calendarApi.endpoints.getAdminCalendar.initiate(DECEMBER));
    expect(calendarFetches().map((c) => c.params)).toEqual([
      DECEMBER,
      NOVEMBER,
      NOVEMBER,
      DECEMBER,
    ]);
  });

  it("is fetched again when a removal is refused as already done", async () => {
    const store = await openCalendar();
    routes[`DELETE /super/room-bookings/${BOOKING_ID}`] = () => {
      throw {
        status: 404,
        code: "ROOM_BOOKING_NOT_FOUND",
        message: "Booking not found",
        isNormalized: true,
      };
    };
    await store.dispatch(roomRequestsApi.endpoints.removeRoomBooking.initiate(BOOKING_ID));
    await vi.waitFor(() => expect(calendarFetches()).toHaveLength(2));
  });
});
