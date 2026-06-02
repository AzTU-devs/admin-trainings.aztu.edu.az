/**
 * Typed, validated access to Vite env vars.
 * Import via `import { env } from "@shared/config/env"`.
 */

type TokenStorage = "localStorage" | "sessionStorage";

function str(key: string, fallback?: string): string {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  if (v === undefined || v === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required env: ${key}`);
  }
  return v;
}

function num(key: string, fallback: number): number {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(key: string, fallback: boolean): boolean {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  if (v === undefined) return fallback;
  return v === "true" || v === "1";
}

export const env = {
  app: {
    name: str("VITE_APP_NAME", "AzTU Portal"),
    shortName: str("VITE_APP_SHORT_NAME", "AzTU"),
    version: str("VITE_APP_VERSION", "0.0.0"),
    mode: import.meta.env.MODE,
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD,
  },
  api: {
    baseUrl: str("VITE_API_BASE_URL", "/api"),
    timeoutMs: num("VITE_API_TIMEOUT_MS", 30_000),
  },
  auth: {
    storage: str("VITE_AUTH_TOKEN_STORAGE", "localStorage") as TokenStorage,
    refreshBeforeExpiryS: num("VITE_REFRESH_BEFORE_EXPIRY_S", 60),
    /** DEV ONLY — skips ProtectedRoute and injects a synthetic super-user. */
    bypass: bool("VITE_AUTH_BYPASS", false),
  },
  uploads: {
    maxImageMb: num("VITE_UPLOAD_MAX_IMAGE_MB", 10),
    maxVideoMb: num("VITE_UPLOAD_MAX_VIDEO_MB", 2048),
    chunkSizeMb: num("VITE_UPLOAD_CHUNK_SIZE_MB", 5),
  },
  features: {
    wsNotifications: bool("VITE_ENABLE_WS_NOTIFICATIONS", true),
    darkMode: bool("VITE_ENABLE_DARK_MODE", true),
  },
} as const;
