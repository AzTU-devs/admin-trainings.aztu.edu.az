import { baseApi } from "@lib/query/baseApi";
import type { SystemHealth } from "@features/system-monitoring/types";

export const systemApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSystemHealth: build.query<SystemHealth, void>({
      query: () => ({ url: "/super/system/health", method: "GET" }),
    }),
  }),
  overrideExisting: false,
});

export const { useGetSystemHealthQuery } = systemApi;
