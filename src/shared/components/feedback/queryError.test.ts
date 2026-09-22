import { describe, expect, it } from "vitest";
import { describeQueryError, isLookupNotFound } from "./queryError";

const err = (status: number, message = "") => ({ status, message, isNormalized: true as const });

describe("describeQueryError: retryable", () => {
  // Regression: /admin/courses/not-a-uuid offered a Retry that got the same
  // 400 every time.
  it("does not offer a retry for a request the server refused as such", () => {
    for (const status of [400, 404, 409, 422]) {
      expect(describeQueryError(err(status)).retryable, String(status)).toBe(false);
    }
  });

  it("offers a retry when trying again can help", () => {
    for (const status of [0, 408, 429, 500, 502, 503]) {
      expect(describeQueryError(err(status)).retryable, String(status)).toBe(true);
    }
  });

  it("sends a 403 to sign in again rather than to retry", () => {
    expect(describeQueryError(err(403))).toMatchObject({ kind: "forbidden", retryable: false });
  });
});

describe("isLookupNotFound", () => {
  it("treats an unknown id (404) and a malformed one (400) as not found", () => {
    expect(isLookupNotFound(err(404))).toBe(true);
    expect(isLookupNotFound(err(400))).toBe(true);
  });

  it("leaves real failures to the error state", () => {
    expect(isLookupNotFound(err(500))).toBe(false);
    expect(isLookupNotFound(err(0))).toBe(false);
    expect(isLookupNotFound(err(403))).toBe(false);
  });
});
