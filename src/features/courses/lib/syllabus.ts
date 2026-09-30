import { plainTextToHtml } from "@shared/lib/richText";
import type { SyllabusItemDto } from "@features/courses/types";

const TITLE_MAX = 200;

/** The API's @Size on the legacy `syllabus` text. */
const LEGACY_TEXT_MAX = 20_000;

/** Leading list markers people typed into the old box: "1.", "2)", "-", "•", "*", "–". */
const MARKER = /^\s*(?:\d{1,3}[.)]|[-•*–])\s+/;

/**
 * An old course's free-text syllabus as editable topics: every non-empty line
 * becomes one, with its typed list marker dropped. A line too long for a title
 * keeps its full text as the topic's description, so nothing is lost when the
 * author saves.
 */
export function legacySyllabusToItems(text: string | null | undefined): { title: string; description: string }[] {
  if (!text?.trim()) return [];
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(MARKER, "").trim())
    .filter(Boolean)
    .map((line) =>
      line.length <= TITLE_MAX
        ? { title: line, description: "" }
        : { title: `${line.slice(0, TITLE_MAX - 1).trimEnd()}…`, description: plainTextToHtml(line) },
    );
}

/**
 * The topics as the legacy `syllabus` text: a numbered list of titles.
 *
 * Saved alongside `syllabusItems` so every reader that only knows the old field
 * — an API that predates the items, the website's fallback — still gets the
 * outline instead of nothing. It is derived, never edited: the dashboard always
 * rebuilds the topics from `syllabusItems` when the API sends them.
 */
export function syllabusToLegacyText(items: Pick<SyllabusItemDto, "title">[]): string {
  const lines = items
    .map((item) => item.title.trim())
    .filter(Boolean)
    .map((title, i) => `${i + 1}. ${title}`);
  // A full syllabus (100 topics of 200 characters) runs past the API's limit on
  // this field, and the save would fail on a field the form does not even show.
  // Whole lines only, so what is kept still reads as the start of the outline.
  let text = "";
  for (const line of lines) {
    const next = text ? `${text}\n${line}` : line;
    if (next.length > LEGACY_TEXT_MAX) break;
    text = next;
  }
  return text;
}
