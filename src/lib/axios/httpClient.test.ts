import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import { httpClient } from "@lib/axios/httpClient";

/*
 * A file download (`responseType: "blob"`) gets its error body as a Blob as
 * well. The request runs through the real client and its interceptors down to
 * a fake adapter, so what the caller is handed is what a page would show.
 */

const originalAdapter = httpClient.defaults.adapter;
let answer: (config: InternalAxiosRequestConfig) => never;

function refusedWith(data: unknown, status = 403) {
  return (config: InternalAxiosRequestConfig): never => {
    throw new AxiosError("Request failed with status code " + status, "ERR_BAD_REQUEST", config, null, {
      data,
      status,
      statusText: "",
      headers: {},
      config,
    });
  };
}

beforeEach(() => {
  httpClient.defaults.adapter = (async (config: InternalAxiosRequestConfig) => answer(config)) as AxiosAdapter;
});

afterEach(() => {
  httpClient.defaults.adapter = originalAdapter;
});

describe("httpClient — errors of a blob request", () => {
  it("reads the API's message and code out of a JSON error body that came as a Blob", async () => {
    answer = refusedWith(
      new Blob([JSON.stringify({ status: 403, code: "FORBIDDEN", message: "You are not on this course's roster" })], {
        type: "application/json",
      }),
    );

    await expect(httpClient.request({ url: "/x/export", responseType: "blob" })).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
      message: "You are not on this course's roster",
    });
  });

  it("keeps the generic message when the Blob is not the API's JSON", async () => {
    answer = refusedWith(new Blob(["<html>Bad gateway</html>"], { type: "text/html" }), 502);

    await expect(httpClient.request({ url: "/x/export", responseType: "blob" })).rejects.toMatchObject({
      status: 502,
      message: "Request failed with status code 502",
    });
  });
});
