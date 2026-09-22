import { describe, expect, it } from "vitest";
import { pageWindow } from "./pageWindow";

describe("pageWindow", () => {
  it("lists every page when there are few", () => {
    expect(pageWindow(0, 1)).toEqual([0]);
    expect(pageWindow(0, 3)).toEqual([0, 1, 2]);
    expect(pageWindow(2, 5)).toEqual([0, 1, 2, 3, 4]);
  });

  it("keeps first, last and the neighbours of the current page", () => {
    expect(pageWindow(0, 85)).toEqual([0, 1, 2, 3, 4, "gap", 84]);
    expect(pageWindow(39, 85)).toEqual([0, "gap", 38, 39, 40, "gap", 84]);
    expect(pageWindow(84, 85)).toEqual([0, "gap", 80, 81, 82, 83, 84]);
  });

  it("stays the same length while paging, so the buttons hold still", () => {
    for (let p = 0; p < 20; p++) expect(pageWindow(p, 20)).toHaveLength(7);
    for (let p = 0; p < 20; p++) expect(pageWindow(p, 20, 0)).toHaveLength(5);
  });
});
