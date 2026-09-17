import { env } from "@shared/config/env";

/**
 * Typed wrapper over Web Storage.
 * Switches between localStorage and sessionStorage based on env.auth.storage.
 * Safe on SSR / non-browser environments (returns null).
 */

type StorageKind = "localStorage" | "sessionStorage";

function backing(kind: StorageKind): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    // Anything but an explicit localStorage opt-in gets sessionStorage: a typo in
    // VITE_AUTH_TOKEN_STORAGE must not quietly park the access token on disk.
    return kind === "localStorage" ? window.localStorage : window.sessionStorage;
  } catch {
    // Safari with storage blocked throws on the property access itself. Degrading to
    // "no storage" costs the session on reload; throwing here would blank the app.
    return null;
  }
}

export function makeStorage(kind: StorageKind = "sessionStorage") {
  return {
    get<T = string>(key: string): T | null {
      const s = backing(kind);
      if (!s) return null;
      const raw = s.getItem(key);
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    },
    set<T>(key: string, value: T): void {
      const s = backing(kind);
      if (!s) return;
      try {
        s.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
      } catch {
        // Quota or a private-browsing refusal. This runs inside the authSuccess
        // reducer, so an escaping throw would turn a successful login into an error.
      }
    },
    remove(key: string): void {
      backing(kind)?.removeItem(key);
    },
    clear(): void {
      backing(kind)?.clear();
    },
  };
}

/** Default app storage (picks the backend declared in env). */
export const appStorage = makeStorage(env.auth.storage);

/**
 * Storage keys — keep here so they don't drift across modules.
 *
 * There is deliberately no refresh-token key. This is the SUPER_ADMIN surface, so a
 * 30-day refresh token must never be readable by a script on this origin: the API
 * keeps it in the httpOnly `ep_portal_rt` cookie instead and `httpClient` refreshes
 * against that. The access token below is short-lived and, with
 * VITE_AUTH_TOKEN_STORAGE=sessionStorage, dies with the tab.
 */
export const STORAGE_KEYS = {
  accessToken: "aztu.auth.accessToken",
  user: "aztu.auth.user",
  theme: "aztu.ui.theme",
  sidebarCollapsed: "aztu.ui.sidebarCollapsed",
} as const;
