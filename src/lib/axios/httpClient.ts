import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { env } from "@shared/config/env";
import { appStorage, STORAGE_KEYS } from "@lib/storage";
import type { ApiErrorBody } from "@shared/types/api";

/**
 * Single source of truth for HTTP calls.
 *
 *  Request:  attaches `Authorization: Bearer <accessToken>`
 *  Response: on 401 (once per request), performs silent refresh and replays the
 *            original request. Concurrent 401s share one refresh promise.
 *            On refresh failure, fires `auth:logout` window event so the
 *            auth slice can clear state.
 *            Any other error is normalized to `NormalizedError`.
 */

export interface NormalizedError {
  status: number;
  message: string;
  code?: string;
  fieldErrors?: Record<string, string>;
  /** marker so re-normalizing is a no-op and the shape stays serializable */
  isNormalized: true;
}

function isNormalizedError(e: unknown): e is NormalizedError {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { isNormalized?: unknown }).isNormalized === true
  );
}

declare module "axios" {
  export interface InternalAxiosRequestConfig {
    /** internal flag — prevents infinite refresh loops */
    _retry?: boolean;
    /** opt out of attaching the auth header */
    skipAuth?: boolean;
  }
  export interface AxiosRequestConfig {
    /** opt out of attaching the auth header (login, refresh, register) */
    skipAuth?: boolean;
  }
}

/* ─────────────────────────────  refresh queue  ──────────────────────────── */

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  const refreshToken = appStorage.get<string>(STORAGE_KEYS.refreshToken);
  if (!refreshToken) {
    throw new Error("No refresh token");
  }

  refreshPromise = axios
    .post<{ data: { accessToken: string; refreshToken?: string } }>(
      `${env.api.baseUrl}/auth/refresh`,
      { refreshToken },
      { timeout: env.api.timeoutMs },
    )
    .then((res) => {
      // Unwrap the { data: ... } envelope.
      const tokens = res.data.data;
      appStorage.set(STORAGE_KEYS.accessToken, tokens.accessToken);
      if (tokens.refreshToken) {
        appStorage.set(STORAGE_KEYS.refreshToken, tokens.refreshToken);
      }
      return tokens.accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

function broadcastLogout(reason: "refresh_failed" | "no_refresh_token") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth:logout", { detail: { reason } }));
  }
}

/* ──────────────────────────────  instance  ──────────────────────────────── */

export const httpClient: AxiosInstance = axios.create({
  baseURL: env.api.baseUrl,
  timeout: env.api.timeoutMs,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!config.skipAuth) {
    const token = appStorage.get<string>(STORAGE_KEYS.accessToken);
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
  }
  return config;
});

httpClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as InternalAxiosRequestConfig | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry && !original.skipAuth) {
      original._retry = true;
      try {
        const newToken = await refreshAccessToken();
        original.headers.set("Authorization", `Bearer ${newToken}`);
        return httpClient(original);
      } catch (refreshErr) {
        appStorage.remove(STORAGE_KEYS.accessToken);
        appStorage.remove(STORAGE_KEYS.refreshToken);
        appStorage.remove(STORAGE_KEYS.user);
        broadcastLogout("refresh_failed");
        return Promise.reject(normalizeError(refreshErr));
      }
    }

    return Promise.reject(normalizeError(error));
  },
);

/* ──────────────────────────────  helpers  ───────────────────────────────── */

export function normalizeError(err: unknown): NormalizedError {
  // Idempotent: never re-wrap an already-normalized error (avoids losing
  // status/message and keeps the value serializable for Redux state).
  if (isNormalizedError(err)) return err;

  if (axios.isAxiosError(err)) {
    const body = err.response?.data as ApiErrorBody | undefined;
    return {
      status: err.response?.status ?? 0,
      message:
        body?.message ||
        err.message ||
        "Unexpected network error. Please try again.",
      code: body?.code ?? body?.error ?? err.code,
      fieldErrors: body?.fieldErrors ?? body?.errors,
      isNormalized: true,
    };
  }
  if (err instanceof Error) {
    return { status: 0, message: err.message, isNormalized: true };
  }
  return { status: 0, message: "Unknown error", isNormalized: true };
}

/** Thin typed wrappers — prefer these in feature `api/` modules. */
export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    httpClient.get<T>(url, config).then((r) => r.data),
  post: <T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig) =>
    httpClient.post<T>(url, body, config).then((r) => r.data),
  put: <T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig) =>
    httpClient.put<T>(url, body, config).then((r) => r.data),
  patch: <T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig) =>
    httpClient.patch<T>(url, body, config).then((r) => r.data),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    httpClient.delete<T>(url, config).then((r) => r.data),
};
