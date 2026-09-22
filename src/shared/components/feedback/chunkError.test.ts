import { describe, expect, it } from "vitest";
import { isChunkLoadError } from "./chunkError";

describe("isChunkLoadError", () => {
  it.each([
    new TypeError("Failed to fetch dynamically imported module: https://x/assets/Page-abc.js"),
    new TypeError("error loading dynamically imported module"),
    new Error("Importing a module script failed."),
  ])("recognises %s", (e) => expect(isChunkLoadError(e)).toBe(true));

  it("leaves ordinary errors alone", () => {
    expect(isChunkLoadError(new Error("Cannot read properties of null"))).toBe(false);
  });
});
