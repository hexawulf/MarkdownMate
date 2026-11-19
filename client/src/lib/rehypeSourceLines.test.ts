import { describe, expect, it } from "vitest";
import { markdownToHtml } from "./markdown";

/**
 * Parse `data-source-line` attributes out of rendered HTML as a list of
 * { tag, line } in document order, so a test can assert which top-level blocks
 * got anchored and to which source line.
 */
function anchors(html: string): Array<{ tag: string; line: number }> {
  const out: Array<{ tag: string; line: number }> = [];
  const re = /<([a-z][a-z0-9]*)\b[^>]*\bdata-source-line="(\d+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push({ tag: m[1].toLowerCase(), line: Number(m[2]) });
  }
  return out;
}

const DOC = [
  "# Heading", // line 1
  "", // 2
  "A paragraph.", // 3
  "", // 4
  "```js", // 5
  "const answer = 42;", // 6
  "```", // 7
  "", // 8
  "| a | b |", // 9
  "| --- | --- |", // 10
  "| 1 | 2 |", // 11
  "", // 12
  "$$", // 13
  "\\int_0^1 x\\,dx", // 14
  "$$", // 15
  "", // 16
  "![alt](https://example.com/i.png)", // 17
  "",
].join("\n");

describe("source-line anchors (preview pipeline)", () => {
  it("stamps data-source-line on each top-level block at its source line", async () => {
    const html = await markdownToHtml(DOC, { sourceLines: true });
    const got = anchors(html);

    // One anchor per top-level block, in order, with the right source lines.
    expect(got).toEqual([
      { tag: "h1", line: 1 },
      { tag: "p", line: 3 },
      { tag: "pre", line: 5 },
      { tag: "table", line: 9 },
      // The $$ math block: KaTeX replaces the <pre> with a <span class="katex-display">;
      // the anchor is re-applied to that wrapper by the apply pass.
      { tag: "span", line: 13 },
      { tag: "p", line: 17 },
    ]);
  });

  it("keeps the anchor on the KaTeX display wrapper after math renders", async () => {
    const html = await markdownToHtml("$$\n\\int_0^1 x\\,dx\n$$", { sourceLines: true });
    // The math still renders as a KaTeX display block...
    expect(html).toContain('class="katex-display"');
    // ...and the wrapper carries the source line of the `$$` fence.
    expect(/<span[^>]*class="katex-display"[^>]*data-source-line="1"|<span[^>]*data-source-line="1"[^>]*class="katex-display"/.test(html)).toBe(true);
  });

  it("anchors a heading, a paragraph, a fenced code block, a table, a math block and an image", async () => {
    const html = await markdownToHtml(DOC, { sourceLines: true });
    const tags = anchors(html).map((a) => a.tag);
    expect(tags).toContain("h1"); // heading
    expect(tags).toContain("pre"); // fenced code
    expect(tags).toContain("table"); // table
    expect(tags).toContain("span"); // katex-display math wrapper
    // Two paragraphs are anchored: the prose paragraph and the image paragraph.
    expect(tags.filter((t) => t === "p")).toHaveLength(2);
    // The image lives inside the last anchored paragraph (line 17).
    expect(html).toContain('src="https://example.com/i.png"');
  });

  it("does NOT add data-source-line without the option (export/default)", async () => {
    const withAnchors = await markdownToHtml(DOC, { sourceLines: true });
    const withoutAnchors = await markdownToHtml(DOC);
    const plain = await markdownToHtml(DOC, { sourceLines: false });

    expect(withAnchors).toContain("data-source-line");
    expect(withoutAnchors).not.toContain("data-source-line");
    expect(plain).not.toContain("data-source-line");
  });

  it("still renders math and highlighted code with anchors on", async () => {
    const html = await markdownToHtml(DOC, { sourceLines: true });
    expect(html).toContain('class="katex-display"');
    expect(html).toContain('class="language-js"');
    expect(html).toContain('class="token keyword"');
  });

  it("does not let the anchor weaken sanitization", async () => {
    const html = await markdownToHtml(
      'hi <script>alert(1)</script> <img src=x onerror="alert(1)">',
      { sourceLines: true },
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
  });
});
