import { describe, expect, it } from "vitest";
import { version as katexVersion } from "katex";
import { buildHtmlDocument, safeFileName } from "./export";

describe("safeFileName", () => {
  it("keeps an ordinary title unchanged", () => {
    expect(safeFileName("Meeting notes 2026")).toBe("Meeting notes 2026");
  });

  it("replaces path separators and characters Windows forbids", () => {
    expect(safeFileName("a/b\\c: d*e?f\"g<h>i|j")).toBe("a-b-c- d-e-f-g-h-i-j");
  });

  it("strips leading dots and trailing dots or spaces", () => {
    expect(safeFileName("../../etc/passwd")).toBe("etc-passwd");
    expect(safeFileName("  draft.  ")).toBe("draft");
  });

  it("collapses whitespace and control characters", () => {
    expect(safeFileName("line\none\ttwo")).toBe("line-one-two");
  });

  it("falls back for empty and reserved names", () => {
    expect(safeFileName("")).toBe("Untitled");
    expect(safeFileName("///")).toBe("Untitled");
    expect(safeFileName("CON")).toBe("Untitled");
  });

  it("caps very long titles", () => {
    expect(safeFileName("x".repeat(500)).length).toBe(120);
  });
});

describe("buildHtmlDocument", () => {
  it("escapes the title", () => {
    const doc = buildHtmlDocument('<script>alert("x")</script> & co', "<p>body</p>");
    expect(doc).toContain("<title>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; co</title>");
  });

  it("links the KaTeX stylesheet of the installed KaTeX version", () => {
    const doc = buildHtmlDocument("t", "");
    expect(doc).toContain(`https://cdn.jsdelivr.net/npm/katex@${katexVersion}/dist/katex.min.css`);
  });

  it("includes the body and token colours for highlighted code", () => {
    const doc = buildHtmlDocument("t", '<pre><code><span class="token keyword">const</span></code></pre>');
    expect(doc).toContain('<span class="token keyword">const</span>');
    expect(doc).toContain(".token.keyword");
  });
});
