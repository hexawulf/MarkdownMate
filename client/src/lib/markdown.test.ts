import { describe, expect, it } from "vitest";
import { countMarkdown, extractPlainText, markdownToHtml } from "./markdown";

describe("extractPlainText", () => {
  it("drops fenced and inline code", () => {
    expect(extractPlainText("before\n```js\nconst a = 1;\n```\nafter `x` end")).toBe(
      "before after end",
    );
  });

  it("keeps link text and drops images", () => {
    expect(extractPlainText("see [the docs](https://example.com) ![alt](a.png)")).toBe(
      "see the docs",
    );
  });

  it("strips formatting characters and collapses whitespace", () => {
    expect(extractPlainText("# Title\n\n**bold**   _it_ ~~gone~~")).toBe("Title bold it gone");
  });
});

describe("countMarkdown", () => {
  it("returns zero words for an empty document", () => {
    expect(countMarkdown("")).toEqual({ words: 0, characters: 0, charactersNoSpaces: 0 });
  });

  it("counts words from plain text and characters from the raw source", () => {
    expect(countMarkdown("# Hello world")).toEqual({
      words: 2,
      characters: 13,
      charactersNoSpaces: 11,
    });
  });
});

describe("markdownToHtml", () => {
  it("renders headings, emphasis and links", async () => {
    const html = await markdownToHtml("# Title\n\nsome *text* and [a link](https://example.com)");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<em>text</em>");
    expect(html).toContain('<a href="https://example.com">a link</a>');
  });

  it("renders GFM tables, strikethrough and task lists", async () => {
    const html = await markdownToHtml(
      "| a | b |\n|---|---|\n| 1 | 2 |\n\n~~old~~\n\n- [x] done\n- [ ] todo",
    );
    expect(html).toContain("<table>");
    expect(html).toContain("<del>old</del>");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("checked");
  });

  it("does not let raw HTML or scripts through", async () => {
    const html = await markdownToHtml(
      'hello <script>alert(1)</script> <img src=x onerror="alert(1)"> world',
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
  });

  it("drops javascript: links", async () => {
    const html = await markdownToHtml("[click](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
  });
});
