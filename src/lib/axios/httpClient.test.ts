import { describe, expect, it } from "vitest";
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { normalizeError } from "./httpClient";

const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
const withResponse = (status: number, data: unknown) =>
  new AxiosError("Request failed", "ERR_BAD_REQUEST", config, {}, { status, statusText: "", headers: {}, config, data });

describe("normalizeError", () => {
  // The API sends validation errors as an array. It used to be passed through as
  // a map, so forms called setError("0", {...}) and no field was ever marked.
  it("folds the API's errors array into a field → message map, first message winning", () => {
    const err = normalizeError(
      withResponse(400, {
        status: 400,
        code: "VALIDATION_FAILED",
        message: "Request validation failed",
        errors: [
          { field: "title", code: "NOTBLANK", message: "must not be blank" },
          { field: "title", code: "SIZE", message: "size must be between 3 and 160" },
          { field: "course.slug", code: "PATTERN", message: "bad slug" },
        ],
      }),
    );
    expect(err.fieldErrors).toEqual({ title: "must not be blank", "course.slug": "bad slug" });
    expect(err.code).toBe("VALIDATION_FAILED");
  });

  it("still accepts a map", () => {
    expect(normalizeError(withResponse(400, { message: "x", fieldErrors: { email: "taken" } })).fieldErrors).toEqual({ email: "taken" });
  });

  it("gives a request that never reached the server a message a person can act on", () => {
    const err = normalizeError(new AxiosError("Network Error", "ERR_NETWORK", config));
    expect(err.status).toBe(0);
    expect(err.message).toMatch(/Can't reach the server/);
  });

  it("keeps the server's own message and code", () => {
    const err = normalizeError(withResponse(409, { code: "SLUG_ALREADY_EXISTS", message: "Category slug 'x' is taken" }));
    expect(err).toMatchObject({ status: 409, code: "SLUG_ALREADY_EXISTS", message: "Category slug 'x' is taken" });
  });
});
