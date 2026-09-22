import { describe, expect, it } from "vitest";
import { PERSON_HUES, hueFor, initialsOf } from "./hue";
import { categoryStyle } from "./categoryStyle";
import { BRAND_TILES, brandVariant, coverArt, hash, tileMotif } from "./art";

describe("initialsOf", () => {
  it("maps the Azerbaijani dotted and dotless i by hand", () => {
    // toUpperCase() would turn "ilkin" into "I…" — the wrong letter in Azerbaijani.
    expect(initialsOf("ilkin ısmayılov")).toBe("İI");
    expect(initialsOf("əli şahin")).toBe("ƏŞ");
  });

  it("takes at most two words and ignores extra spaces", () => {
    expect(initialsOf("  Test   Super Admin ")).toBe("TS");
    expect(initialsOf("Tutor")).toBe("T");
  });

  it("returns an empty string for no name", () => {
    expect(initialsOf("")).toBe("");
    expect(initialsOf(null)).toBe("");
  });
});

describe("hueFor", () => {
  it("is stable for the same input and stays in the palette", () => {
    expect(hueFor("user-42")).toBe(hueFor("user-42"));
    expect(PERSON_HUES).toContain(hueFor("user-42"));
  });

  it("falls back to navy with no seed", () => {
    expect(hueFor(undefined)).toBe("k-navy");
  });
});

describe("categoryStyle", () => {
  it("knows the website's category slugs", () => {
    expect(categoryStyle({ slug: "data-ai", name: "Data" })).toEqual({ k: "k-data", art: "data" });
  });

  it("matches later categories by keyword, data before information", () => {
    expect(categoryStyle({ slug: "data-information-systems", name: "" }).k).toBe("k-data");
    expect(categoryStyle({ slug: "x", name: "Günəş enerjisi" }).k).toBe("k-energy");
  });

  it("paints unknown and missing categories navy, with the neutral art", () => {
    // Not the IT drawing: an unmatched category must not read as "Information Technology".
    expect(categoryStyle({ slug: "misc", name: "Other" })).toEqual({ k: "k-navy", art: "brand" });
    expect(categoryStyle(null)).toEqual({ k: "k-navy", art: "brand" });
  });
});

describe("tileMotif", () => {
  it("gives a known family its own motif", () => {
    expect(tileMotif("it", "anything")).toBe("window");
    expect(tileMotif("data")).toBe("dots");
  });

  it("varies the neutral family by seed, never with a discipline's motif", () => {
    const picks = new Set(["a", "b", "c", "d", "e", "f", "g", "h"].map((s) => tileMotif("brand", s)));
    expect(picks.size).toBeGreaterThan(1);
    for (const m of picks) expect(BRAND_TILES).toContain(m);
    expect(tileMotif("brand", "x")).toBe(tileMotif("brand", "x"));
  });
});

describe("coverArt", () => {
  it("draws the same cover for the same course", () => {
    expect(coverArt("eng", "course-1")).toBe(coverArt("eng", "course-1"));
    expect(hash("course-1")).toBe(hash("course-1"));
  });

  it("gives a course without a category the same neutral shape as its thumbnail", () => {
    for (const seed of ["8bb61b", "5033", "a", "b", "c", "d", "e", "f"]) {
      const v = brandVariant(seed);
      expect(tileMotif("brand", seed)).toBe(BRAND_TILES[v]);
      expect(coverArt("brand", seed)).toBe(coverArt("brand", seed, v));
    }
    // Every tile has its own cover drawing (no two variants draw alike).
    const covers = new Set(BRAND_TILES.map((_, v) => coverArt("brand", "same-seed", v)));
    expect(covers.size).toBe(BRAND_TILES.length);
  });
});
