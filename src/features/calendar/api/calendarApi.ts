import { baseApi } from "@lib/query/baseApi";
import { httpClient, normalizeError } from "@lib/axios/httpClient";
import { normalizeCalendarResponse } from "@features/calendar/lib/calendarEvents";
import type { CalendarRange, CalendarResponse } from "@features/calendar/types";

/**
 * The super-admin training calendar (`calendar:view`).
 *
 * A `queryFn` rather than the shared base query: that one keeps only the
 * envelope's `data`, and the API may report a capped result as
 * `meta.truncated` instead of a field beside `events` — the contract allows
 * either, so both have to be readable here.
 */
export const calendarApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminCalendar: build.query<CalendarResponse, CalendarRange>({
      queryFn: async ({ from, to }, { signal }) => {
        try {
          const res = await httpClient.get("/admin/calendar", { params: { from, to }, signal });
          return { data: normalizeCalendarResponse(res.data) };
        } catch (e) {
          return { error: normalizeError(e) };
        }
      },
    }),
  }),
  overrideExisting: false,
});

export const { useGetAdminCalendarQuery } = calendarApi;
