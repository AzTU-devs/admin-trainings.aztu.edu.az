import { baseApi } from "@lib/query/baseApi";
import type { ApiPage, PageRequest } from "@shared/types/api";
import type { ApiLogEntry, HttpMethod } from "@features/api-logs/types";

interface ListArgs extends PageRequest {
  search?: string;
  method?: HttpMethod;
  statusMin?: number;
  statusMax?: number;
  from?: string;
  to?: string;
  errorsOnly?: boolean;
}

export const apiLogsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listApiLogs: build.query<ApiPage<ApiLogEntry>, ListArgs | void>({
      query: (params) => ({ url: "/super/api-logs", method: "GET", params: params ?? undefined }),
      providesTags: [{ type: "ApiLog", id: "LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const { useListApiLogsQuery } = apiLogsApi;
