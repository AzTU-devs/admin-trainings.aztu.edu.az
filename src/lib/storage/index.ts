import { env } from "@shared/config/env";

/**
 * Typed wrapper over Web Storage.
 * Switches between localStorage and sessionStorage based on env.auth.storage.
 * Safe on SSR / non-browser environments (returns null).
 */

type StorageKind = "localStorage" | "sessionStorage";

function backing(kind: StorageKind): Storage | null {
  if (typeof window === "undefined") return null;
  return kind === "sessionStorage" ? window.sessionStorage : window.localStorage;
}

export function makeStorage(kind: StorageKind = "localStorage") {
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
      s.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
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

/** Storage keys — keep here so they don't drift across modules. */
export const STORAGE_KEYS = {
  accessToken: "aztu.auth.accessToken",
  refreshToken: "aztu.auth.refreshToken",
  user: "aztu.auth.user",
  theme: "aztu.ui.theme",
  sidebarCollapsed: "aztu.ui.sidebarCollapsed",
} as const;
