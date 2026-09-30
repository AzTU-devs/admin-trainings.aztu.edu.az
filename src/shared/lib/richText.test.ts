import { describe, expect, it } from "vitest";
import {
  isRichTextEmpty,
  tidyEditorHtml,
  looksLikeHtml,
  plainTextToHtml,
  richTextToPlain,
  sanitizeRichText,
  toEditorHtml,
} from "@shared/lib/richText";

describe("sanitizeRichText", () => {
  it("keeps the formatting the editor produces", () => {
    const html =
      '<h2>Intro</h2><p><strong>Bold</strong> <em>it</em> <u>u</u> <s>s</s> <mark>hi</mark></p>' +
      "<ul><li>one</li></ul><ol start=\"3\"><li>three</li></ol><blockquote><p>q</p></blockquote><hr>";
    expect(sanitizeRichText(html)).toBe(
      '<h2>Intro</h2><p><strong>Bold</strong> <em>it</em> <u>u</u> <s>s</s> <mark>hi</mark></p>' +
        '<ul><li>one</li></ul><ol start="3"><li>three</li></ol><blockquote><p>q</p></blockquote><hr>',
    );
  });

  it("removes scripts, event handlers and dangerous links", () => {
    const out = sanitizeRichText(
      '<p onclick="x()">a<script>alert(1)</script><img src=x onerror="alert(2)">' +
        '<a href="javascript:alert(3)">bad</a><iframe src="https://evil"></iframe></p>',
    );
    expect(out).not.toMatch(/script|onerror|onclick|javascript:|iframe|<img/i);
    expect(out).toContain("bad");
  });

  it("forces links to open safely in a new tab", () => {
    const out = sanitizeRichText('<p><a href="https://aztu.edu.az" target="_self" rel="opener">AzTU</a></p>');
    expect(out).toBe('<p><a href="https://aztu.edu.az" target="_blank" rel="noopener noreferrer nofollow">AzTU</a></p>');
  });

  it("keeps only text alignment from inline styles, and only on blocks", () => {
    expect(sanitizeRichText('<p style="text-align: center; color: red">x</p>')).toBe("<p>x</p>");
    expect(sanitizeRichText('<p style="text-align:CENTER">x</p>')).toBe('<p style="text-align: center">x</p>');
    expect(sanitizeRichText('<h3 style="text-align: right;">x</h3>')).toBe('<h3 style="text-align: right">x</h3>');
    expect(sanitizeRichText('<p><strong style="text-align: center">x</strong></p>')).toBe("<p><strong>x</strong></p>");
    expect(sanitizeRichText('<p style="position:fixed;top:0">x</p>')).toBe("<p>x</p>");
  });

  it("drops classes, ids and unknown tags but keeps their text", () => {
    expect(sanitizeRichText('<div class="x" id="y"><span style="color:red">Word</span> paste</div>')).toBe(
      "Word paste",
    );
  });
});

describe("plain text and emptiness", () => {
  it("tells markup from legacy plain text", () => {
    expect(looksLikeHtml("<p>x</p>")).toBe(true);
    expect(looksLikeHtml("a < b and c > d")).toBe(false);
    expect(looksLikeHtml("")).toBe(false);
    expect(looksLikeHtml(null)).toBe(false);
  });

  it("treats an emptied editor as no content", () => {
    expect(isRichTextEmpty("<p></p>")).toBe(true);
    expect(isRichTextEmpty("<p> </p><p><br></p>")).toBe(true);
    expect(isRichTextEmpty("")).toBe(true);
    expect(isRichTextEmpty(undefined)).toBe(true);
    expect(isRichTextEmpty("<hr>")).toBe(false);
    expect(isRichTextEmpty("<p>x</p>")).toBe(false);
    expect(isRichTextEmpty("plain")).toBe(false);
  });

  it("turns legacy text into escaped paragraphs for the editor", () => {
    expect(plainTextToHtml("Line one\nline two\n\n<b>& more</b>")).toBe(
      "<p>Line one<br>line two</p><p>&lt;b&gt;&amp; more&lt;/b&gt;</p>",
    );
    expect(toEditorHtml("<p>kept</p>")).toBe("<p>kept</p>");
    expect(toEditorHtml(null)).toBe("");
  });

  it("reads the text back out of markup with block breaks", () => {
    expect(richTextToPlain("<h2>Title</h2><p>One</p><ul><li>a</li><li>b</li></ul>")).toBe("Title\nOne\na\nb");
    expect(richTextToPlain("plain stays")).toBe("plain stays");
  });
});

describe("links", () => {
  it("keeps web and mail links only", () => {
    expect(sanitizeRichText('<p><a href="mailto:info@aztu.edu.az">m</a></p>')).toContain('href="mailto:info@aztu.edu.az"');
    expect(sanitizeRichText('<p><a href="/admin/users">rel</a></p>')).not.toContain("href");
    expect(sanitizeRichText('<p><a href="data:text/html,x">d</a></p>')).not.toContain("href");
    expect(sanitizeRichText('<p><a href=" JavaScript:alert(1)">j</a></p>')).not.toContain("href");
  });
});

describe("tidyEditorHtml", () => {
  it("drops the editor's trailing empty paragraphs and nothing else", () => {
    expect(tidyEditorHtml("<ul><li><p>a</p></li></ul><p></p>")).toBe("<ul><li><p>a</p></li></ul>");
    expect(tidyEditorHtml("<p>a</p><p><br></p><p></p>")).toBe("<p>a</p>");
    expect(tidyEditorHtml("<p></p><p>a</p>")).toBe("<p></p><p>a</p>");
  });
});
