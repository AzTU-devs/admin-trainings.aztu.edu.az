import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { crashDetails, errorDigest, reportCrash, resetCrashReports } from "./crashReport";

const withStack = (message: string, stack: string, name = "TypeError") =>
  Object.assign(new Error(message), { name, stack: `${name}: ${message}\n${stack}` });

describe("errorDigest", () => {
  it("gives one bug one id, whoever hits it", () => {
    const a = withStack("x is undefined", "    at Profile (assets/index-1.js:1:10)\n    at div");
    const b = withStack("x is undefined", "    at Profile (assets/index-1.js:1:10)\n    at div");
    expect(errorDigest(a)).toBe(errorDigest(b));
  });

  it("tells different bugs apart", () => {
    const a = withStack("x is undefined", "    at Profile (assets/index-1.js:1:10)");
    const b = withStack("x is undefined", "    at Settings (assets/index-1.js:9:99)");
    const c = withStack("y is undefined", "    at Profile (assets/index-1.js:1:10)");
    expect(new Set([errorDigest(a), errorDigest(b), errorDigest(c)]).size).toBe(3);
  });
});

describe("crashDetails", () => {
  it("lists the id, time, page, build, browser, error and components", () => {
    const text = crashDetails(withStack("boom", "    at A (a.js:1:1)"), {
      digest: "E-00000001",
      componentStack: "\n    at Profile\n    at Layout",
      at: new Date("2026-09-22T10:00:00Z"),
    });
    expect(text.split("\n").slice(0, 3)).toEqual([
      "Error ID: E-00000001",
      "Time: 2026-09-22T10:00:00.000Z",
      `Page: ${window.location.pathname}${window.location.search}`,
    ]);
    expect(text).toContain("TypeError: boom\nat A (a.js:1:1)");
    expect(text).toContain("Components:\nat Profile\nat Layout");
  });
});

describe("reportCrash", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    resetCrashReports();
    fetchSpy = vi.fn(() => Promise.resolve(new Response("")));
    vi.stubGlobal("fetch", fetchSpy);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sends one short GET per digest, so a crash loop is one log line", () => {
    const e = withStack("boom", "    at A (a.js:1:1)");
    reportCrash(e, { digest: "E-00000001" });
    reportCrash(e, { digest: "E-00000001" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init).toMatchObject({ method: "GET", keepalive: true, credentials: "omit" });
    expect(url.length).toBeLessThan(2000);
  });

  it("keeps the request line short for a huge message", () => {
    reportCrash(withStack("x".repeat(20_000), "    at A (a.js:1:1)"), { digest: "E-00000002" });
    expect(String(fetchSpy.mock.calls[0][0]).length).toBeLessThan(2000);
  });

  it("never throws, even without fetch", () => {
    vi.stubGlobal("fetch", undefined);
    expect(() => reportCrash(new Error("x"), { digest: "E-00000003" })).not.toThrow();
  });
});
