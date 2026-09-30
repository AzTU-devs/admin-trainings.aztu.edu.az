import { describe, expect, it } from "vitest";
import { legacySyllabusToItems, syllabusToLegacyText } from "@features/courses/lib/syllabus";

describe("legacySyllabusToItems", () => {
  it("makes one topic per line, without the typed list markers", () => {
    expect(legacySyllabusToItems("1. Intro\n2) Loops\n\n- Functions\n• Classes\r\n* Files\n– Tests")).toEqual([
      { title: "Intro", description: "" },
      { title: "Loops", description: "" },
      { title: "Functions", description: "" },
      { title: "Classes", description: "" },
      { title: "Files", description: "" },
      { title: "Tests", description: "" },
    ]);
  });

  it("keeps an over-long line whole in the description", () => {
    const line = "word ".repeat(60).trim();
    const [item] = legacySyllabusToItems(line);
    expect(item.title.length).toBeLessThanOrEqual(200);
    expect(item.title.endsWith("…")).toBe(true);
    expect(item.description).toBe(`<p>${line}</p>`);
  });

  it("gives nothing for an empty syllabus", () => {
    expect(legacySyllabusToItems(null)).toEqual([]);
    expect(legacySyllabusToItems("  \n ")).toEqual([]);
  });
});

describe("syllabusToLegacyText", () => {
  it("numbers the titles, and round-trips through the legacy reader", () => {
    const text = syllabusToLegacyText([{ title: "Intro" }, { title: " Loops " }, { title: "" }]);
    expect(text).toBe("1. Intro\n2. Loops");
    expect(legacySyllabusToItems(text).map((i) => i.title)).toEqual(["Intro", "Loops"]);
  });

  it("stays within the API's 20000-character limit on a full syllabus", () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ title: `${i + 1}`.padEnd(200, "x") }));
    const text = syllabusToLegacyText(items);
    expect(text.length).toBeLessThanOrEqual(20_000);
    expect(text.endsWith("x")).toBe(true);
    expect(text.split("\n").every((line) => /^\d+\. /.test(line))).toBe(true);
  });
});
