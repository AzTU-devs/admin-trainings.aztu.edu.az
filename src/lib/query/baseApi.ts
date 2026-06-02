import { createApi, type BaseQueryFn } from "@reduxjs/toolkit/query/react";
import type { AxiosRequestConfig } from "axios";
import { httpClient, normalizeError, type NormalizedError } from "@lib/axios/httpClient";

/**
 * RTK Query base. Uses our axios `httpClient` so all calls go through the same
 * auth + refresh + error-normalization interceptors. Endpoints are injected
 * per-feature via `baseApi.injectEndpoints`.
 */

type AxiosBaseQueryArgs =
  | string
  | (Pick<AxiosRequestConfig, "url" | "method" | "params" | "headers"> & {
      data?: unknown;
      /** Skip attaching the Authorization header (login, refresh, register). */
      skipAuth?: boolean;
    });

const axiosBaseQuery =
  (): BaseQueryFn<AxiosBaseQueryArgs, unknown, NormalizedError> =>
  async (args) => {
    try {
      const config: AxiosRequestConfig =
        typeof args === "string"
          ? { url: args, method: "GET" }
          : {
              url: args.url,
              method: args.method ?? "GET",
              params: args.params,
              headers: args.headers,
              data: args.data,
              skipAuth: args.skipAuth,
            };

      const response = await httpClient.request(config);
      // Every backend endpoint wraps payloads in `{ data, meta, timestamp }`.
      // Unwrap here so feature endpoints work with the inner payload directly
      // (list endpoints expose the PageResponse, which matches ApiPage<T>).
      const body = response.data;
      const payload =
        body && typeof body === "object" && "data" in body
          ? (body as { data: unknown }).data
          : body;
      return { data: payload };
    } catch (err) {
      return { error: normalizeError(err) };
    }
  };

export const TAGS = [
  "Course",
  "Training",
  "Module",
  "Lesson",
  "Video",
  "Enrollment",
  "Student",
  "Room",
  "RoomRequest",
  "Category",
  "User",
  "Tutor",
  "Notification",
  "AuditLog",
  "ApiLog",
  "Analytics",
  "Me",
] as const;

export type ApiTag = (typeof TAGS)[number];

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: axiosBaseQuery(),
  tagTypes: TAGS,
  endpoints: () => ({}),
});

/** Re-export for ergonomic feature imports. */
export const { reducer: baseApiReducer, middleware: baseApiMiddleware } = baseApi;
