import { env } from "@shared/config/env";

/*
 * Crash reporting without new infrastructure.
 *
 * A render crash used to reach only the browser console of the person who hit
 * it, so the team heard about it (if at all) as "something went wrong on the
 * profile page". Three things change that, none of which needs a new service:
 *
 * 1. A digest: a short id derived from the error itself ("E-1A2B3C4D"). The
 *    same bug in the same build gives the same id for everyone, so a user can
 *    quote it and several reports of one bug group together.
 * 2. The details to copy: id, time, page, build, browser, message and stacks,
 *    as plain text the user can paste into an email or chat.
 * 3. A beacon: one GET to /client-error on the dashboard's own origin. nginx
 *    serves it like any SPA path (index.html) and writes it to its access log,
 *    which the stock image sends to the container's stdout, with the time,
 *    client address and user agent it already records. So
 *      docker logs <dashboard container> 2>&1 | grep client-error
 *    lists every production crash, and grep E-1A2B3C4D finds the one a user
 *    quoted. Same-origin, so the CSP's connect-src 'self' already allows it.
 */

/** Keeps the beacon's request line far below nginx's 8 KB header buffer. */
const MAX_MESSAGE = 300;
const MAX_STACK = 700;

/** The first few frames of a stack: enough to find the code, stable across users. */
function topFrames(stack: string | undefined, n: number): string {
  if (!stack) return "";
  return stack
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("at ") || l.includes("@"))
    .slice(0, n)
    .join("\n");
}

/** FNV-1a, 32-bit. Not for security: only to give one bug one short, stable name. */
function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * "E-" + 8 hex digits, from the error's type, message and top stack frames.
 * Deliberately not random: a random id per crash could not tell ten users
 * hitting one bug from ten bugs.
 */
export function errorDigest(error: Error): string {
  const basis = `${error.name}: ${error.message}\n${topFrames(error.stack, 3)}`;
  return `E-${fnv1a(basis).toString(16).toUpperCase().padStart(8, "0")}`;
}

export interface CrashContext {
  digest: string;
  /** React's component stack, from componentDidCatch. */
  componentStack?: string | null;
  /** When it happened; defaults to now. */
  at?: Date;
}

/** Plain text for "Copy details": everything a developer needs, nothing about the user. */
export function crashDetails(error: Error, { digest, componentStack, at = new Date() }: CrashContext): string {
  const components = (componentStack ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 8)
    .join("\n");
  const lines = [
    `Error ID: ${digest}`,
    `Time: ${at.toISOString()}`,
    `Page: ${window.location.pathname}${window.location.search}`,
    `Build: ${env.app.version} (${env.app.mode})`,
    `Browser: ${navigator.userAgent}`,
    "",
    `${error.name}: ${error.message}`,
    topFrames(error.stack, 12),
  ];
  if (components) lines.push("", "Components:", components);
  return lines.join("\n").trim();
}

/** Digests already reported by this page load: a crash loop sends one beacon, not hundreds. */
const reported = new Set<string>();

/** Test hook: forget what this page load has reported. */
export function resetCrashReports() {
  reported.clear();
}

/**
 * Sends the crash to the dashboard's access log (see the file comment). Never
 * throws and never waits: reporting must not be able to make a crash worse.
 */
export function reportCrash(error: Error, { digest }: CrashContext): void {
  if (reported.has(digest)) return;
  reported.add(digest);
  try {
    const q = new URLSearchParams({
      id: digest,
      v: env.app.version,
      page: window.location.pathname.slice(0, 200),
      msg: `${error.name}: ${error.message}`.slice(0, MAX_MESSAGE),
      at: topFrames(error.stack, 3).slice(0, MAX_STACK),
    });
    // BASE_URL, so a build served under a sub-path still reaches its own nginx.
    const url = `${import.meta.env.BASE_URL}client-error?${q.toString()}`;
    // GET, not sendBeacon: a POST to a static path is a 405 in nginx, and a GET
    // is answered by the SPA fallback like any page. keepalive lets it finish
    // even if the user reloads straight away.
    void fetch(url, { method: "GET", keepalive: true, credentials: "omit", cache: "no-store" }).catch(() => {});
  } catch {
    // No fetch, or a URL the browser refuses: the on-screen id still works.
  }
}
