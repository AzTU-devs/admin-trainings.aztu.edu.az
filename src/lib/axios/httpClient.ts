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
 *
 * The refresh token is never held by this app: the API keeps it in an httpOnly
 * `ep_portal_rt` cookie scoped to /api/auth, so the silent refresh sends no token
 * of its own and nothing readable by a script on this origin can mint a session.
 */

export interface NormalizedError {
  status: number;
  message: string;
  code?: string;
  /**
   * Field path → message, first message per field. The API sends validation
   * errors as an array of `{ field, code, message }`; it is folded into a map
   * here so every form can look a field up by the same name it registered.
   */
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

/** What `/auth/refresh` hands back that the portal uses. */
export interface RefreshedSession {
  accessToken: string;
  /** The backend UserDto, when the API includes it (it does today). */
  user?: unknown;
}

let refreshPromise: Promise<RefreshedSession> | null = null;

/**
 * Mints a new access token from the refresh cookie. Exported because it is not
 * only the 401 interceptor's business: the notification socket must present a
 * live token on every reconnect, and a new tab has to turn the 30-day cookie
 * into a session before its first request. Concurrent callers share one call.
 *
 * Every success is also announced as an `auth:token` window event, so the auth
 * slice follows the stored token instead of keeping the one it was born with.
 */
export async function refreshAccessToken(): Promise<string> {
  return (await refreshSession()).accessToken;
}

export function refreshSession(): Promise<RefreshedSession> {
  if (refreshPromise) return refreshPromise;

  // Nothing to send and nothing to check first: the token is in a cookie this app
  // cannot read, so whether a session survives is the server's call and
  // `withCredentials` is what puts it on the wire. The body is an empty object
  // rather than nothing at all, so the request always has a Content-Length and a
  // payload the API can deserialize. Bare `axios` on purpose — going through
  // `httpClient` would re-enter the interceptor below on the refresh's own 401.
  refreshPromise = axios
    .post<{ data: { accessToken: string; user?: unknown } }>(
      `${env.api.baseUrl}/auth/refresh`,
      {},
      { timeout: env.api.timeoutMs, withCredentials: true },
    )
    .then((res) => {
      // Unwrap the { data: ... } envelope. The response still carries the rotated
      // refresh token — deliberately ignored, the cookie the API just re-set is
      // the only copy this app keeps.
      const { accessToken, user } = res.data.data;
      appStorage.set(STORAGE_KEYS.accessToken, accessToken);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:token", { detail: { accessToken } }));
      }
      return { accessToken, user };
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

function broadcastLogout(reason: "refresh_failed") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth:logout", { detail: { reason } }));
  }
}

/* ──────────────────────────────  instance  ──────────────────────────────── */

export const httpClient: AxiosInstance = axios.create({
  baseURL: env.api.baseUrl,
  timeout: env.api.timeoutMs,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  // Instance-wide rather than per-call: /auth/login must be credentialed for the
  // browser to store the refresh cookie and /auth/logout for the API to clear it,
  // and both go through RTK Query's base query, which forwards only url/method/
  // params/headers/data. Only the /api/auth-scoped cookie is ever sent, so other
  // endpoints gain nothing but the CORS credentials flag.
  withCredentials: true,
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
        appStorage.remove(STORAGE_KEYS.user);
        broadcastLogout("refresh_failed");
        return Promise.reject(normalizeError(refreshErr));
      }
    }

    return Promise.reject(normalizeError(error));
  },
);

/* ──────────────────────────────  helpers  ───────────────────────────────── */

/**
 * Turns the `Retry-After` header into something worth reading.
 *
 * The header is exposed by the API's CORS config, but it can still be absent — a
 * proxy may strip it, and in same-origin production the SPA reads it through
 * nginx. Fall back to advice rather than to a bare "too many requests", which
 * tells the user nothing they can act on.
 */
function retryAfterMessage(header: unknown): string {
  const seconds = Number(header);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "Too many attempts from this network. Please wait a little and try again.";
  }
  if (seconds < 60) {
    return `Too many attempts from this network. Please try again in ${Math.ceil(seconds)} seconds.`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `Too many attempts from this network. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

export function normalizeError(err: unknown): NormalizedError {
  // Idempotent: never re-wrap an already-normalized error (avoids losing
  // status/message and keeps the value serializable for Redux state).
  if (isNormalizedError(err)) return err;

  if (axios.isAxiosError(err)) {
    const body = err.response?.data as ApiErrorBody | undefined;
    const status = err.response?.status ?? 0;

    // 429 is worth its own wording. The API rate-limits the auth endpoints per IP,
    // and campus networks are NATed — a whole building shares one address — so
    // being throttled is a normal thing for an innocent user to hit. Left to the
    // generic handler it reads as "login failed", i.e. as a wrong password, and
    // the one useful instruction (wait, then retry) never reaches them.
    if (status === 429) {
      return {
        status,
        message: retryAfterMessage(err.response?.headers?.["retry-after"]),
        code: body?.code ?? "RATE_LIMITED",
        isNormalized: true,
      };
    }

    // No response at all: the request never reached the API (offline, DNS,
    // CORS, a proxy that dropped it, a timeout). Axios's own "Network Error"
    // tells the user nothing they can act on.
    if (!err.response) {
      return {
        status: 0,
        message:
          err.code === "ECONNABORTED"
            ? "The server took too long to answer. Please try again."
            : "Can't reach the server. Check your connection and try again.",
        code: err.code ?? "NETWORK_ERROR",
        isNormalized: true,
      };
    }

    return {
      status,
      message:
        body?.message ||
        err.message ||
        "Unexpected network error. Please try again.",
      code: body?.code ?? body?.error ?? err.code,
      fieldErrors: toFieldErrorMap(body?.fieldErrors ?? body?.errors),
      isNormalized: true,
    };
  }
  if (err instanceof Error) {
    return { status: 0, message: err.message, isNormalized: true };
  }
  return { status: 0, message: "Unknown error", isNormalized: true };
}

/**
 * Folds the API's validation errors into `{ field: message }`.
 *
 * The API answers a 400 with `errors: [{ field, code, message, rejectedValue }]`,
 * but this used to be passed through as if it were already a map, so callers
 * that did `Object.entries(fieldErrors)` got `["0", {…}]` and called
 * `setError("0", …)` — no field was ever marked. The first message per field
 * wins, which is the one the API considers most specific.
 */
function toFieldErrorMap(raw: ApiErrorBody["errors"]): Record<string, string> | undefined {
  if (!raw) return undefined;
  const out: Record<string, string> = {};
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item.field !== "string" || !item.field) continue;
      if (!(item.field in out)) out[item.field] = item.message || item.code || "Invalid value";
    }
  } else {
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === "string" && !(k in out)) out[k] = v;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
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
