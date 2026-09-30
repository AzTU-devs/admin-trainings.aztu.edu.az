import DOMPurify, { type Config } from "dompurify";

/**
 * The rich-text fields (course description, requirements, learning outcomes,
 * syllabus items, module and lesson descriptions) hold HTML written by
 * <RichTextEditor>. Older rows hold plain text, and both have to keep working,
 * so every reader goes through {@link looksLikeHtml} first: markup is shown as
 * sanitised HTML, anything else as text with its line breaks kept.
 *
 * The allowlist is the one the API applies on write (RichTextSanitizer in the
 * API repo) and the website applies on render. Sanitising here as well is not
 * redundant: the API only cleans what it is sent from now on, and rows written
 * before it did are rendered by this same code.
 */
export const RICH_TEXT_TAGS = [
  "p", "br", "h2", "h3", "h4",
  "strong", "b", "em", "i", "u", "s", "del", "strike", "mark", "sub", "sup",
  "blockquote", "ul", "ol", "li", "a", "code", "pre", "hr",
] as const;

/** Blocks that may carry an alignment, and the only alignments kept. */
const ALIGNABLE = new Set(["P", "H2", "H3", "H4"]);
const ALIGNMENT = /^\s*text-align\s*:\s*(left|center|right|justify)\s*;?\s*$/i;

const CONFIG: Config = {
  ALLOWED_TAGS: [...RICH_TEXT_TAGS],
  ALLOWED_ATTR: ["href", "target", "rel", "start", "style"],
  ALLOW_DATA_ATTR: false,
};

/**
 * http(s) and mailto only: no javascript:, data:, or relative links that would
 * resolve against the dashboard's own origin. Checked in the hook rather than
 * through DOMPurify's ALLOWED_URI_REGEXP, which it also applies to every
 * non-URL attribute — it would strip `start="3"` from a numbered list.
 */
const LINK_PROTOCOL = /^(?:https?:|mailto:)/i;

let hooksInstalled = false;

function installHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (!(node instanceof Element)) return;
    // `style` survives the attribute allowlist only as a block's alignment;
    // anything else a pasted document brings (colours, fonts, positioning) goes.
    const style = node.getAttribute("style");
    if (style !== null) {
      const match = ALIGNABLE.has(node.tagName) ? ALIGNMENT.exec(style) : null;
      if (match) node.setAttribute("style", `text-align: ${match[1].toLowerCase()}`);
      else node.removeAttribute("style");
    }
    if (node.tagName === "A") {
      const href = node.getAttribute("href");
      if (href !== null && !LINK_PROTOCOL.test(href.trim())) node.removeAttribute("href");
      // Always a new tab, and never hand the opened page a handle on this one.
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow");
    } else {
      node.removeAttribute("target");
      node.removeAttribute("rel");
    }
    if (node.tagName !== "OL") node.removeAttribute("start");
  });
}

/** True when the value is markup rather than legacy plain text. */
export function looksLikeHtml(value: string | null | undefined): boolean {
  return !!value && /<\/?[a-z][^>]*>/i.test(value);
}

/** The value reduced to the allowlist above. */
export function sanitizeRichText(html: string): string {
  installHooks();
  return DOMPurify.sanitize(html, CONFIG) as unknown as string;
}

/** The visible text of a value, for length checks, previews and emptiness. */
export function richTextToPlain(value: string | null | undefined): string {
  if (!value) return "";
  if (!looksLikeHtml(value)) return value;
  const doc = new DOMParser().parseFromString(sanitizeRichText(value), "text/html");
  // Block boundaries become line breaks so "<p>a</p><p>b</p>" does not read "ab".
  doc.querySelectorAll("p, h2, h3, h4, li, blockquote, pre, br").forEach((el) => {
    el.append("\n");
  });
  return (doc.body.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

/** An editor that was cleared still produces `<p></p>`; that is no content. */
export function isRichTextEmpty(value: string | null | undefined): boolean {
  if (!value) return true;
  if (!looksLikeHtml(value)) return value.trim() === "";
  // A horizontal rule is content even with no text around it.
  return richTextToPlain(value) === "" && !/<hr\b/i.test(value);
}

/**
 * Legacy plain text as editor content: blank lines separate paragraphs and
 * single newlines become line breaks, so an old description opens in the
 * editor looking the way it was typed.
 */
export function plainTextToHtml(text: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escape(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * The editor's HTML as it should be stored: without the empty paragraphs
 * Tiptap keeps after a closing list or quote so the cursor can leave it
 * (StarterKit's trailing node). They are editing scaffolding, not content,
 * and on a page they would render as a gap under the text.
 */
export function tidyEditorHtml(html: string): string {
  return html.replace(/(?:<p>(?:\s|<br\s*\/?>)*<\/p>)+$/i, "");
}

/** What the editor should open with for a stored value of either kind. */
export function toEditorHtml(value: string | null | undefined): string {
  if (!value) return "";
  return looksLikeHtml(value) ? sanitizeRichText(value) : plainTextToHtml(value);
}
