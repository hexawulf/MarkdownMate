// The markdown rendering pipeline. unified, KaTeX and Prism (with every Prism
// grammar) add up to well over a megabyte of JavaScript, so this module is only
// ever loaded through the dynamic import in ./markdown.ts.
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypePrism from 'rehype-prism-plus';
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import {
  applySourceLines,
  captureSourceLines,
  createSourceLineStore,
} from './rehypeSourceLines';

/**
 * Sanitize schema for user-authored markdown.
 *
 * Sanitizing has to happen BEFORE KaTeX and Prism run: both generate their own
 * trusted markup (classes, inline styles, MathML) that the default schema would
 * strip again, leaving math and code blocks unstyled. The only extra thing the
 * user's content needs is the class names remark-math puts on `<code>` so that
 * rehype-katex can find the math nodes.
 */
export const sanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [['className', /^language-./, 'math-inline', 'math-display']],
  },
};

export interface MarkdownProcessorOptions {
  /**
   * Add `data-source-line` anchors to top-level blocks for sync scroll.
   * Off by default, so exported HTML stays clean.
   */
  sourceLines?: boolean;
}

/**
 * Build a unified processor. With `sourceLines`, the pipeline stamps
 * `data-source-line` on top-level blocks (see ./rehypeSourceLines): one pass
 * before KaTeX to capture positions, one pass after KaTeX/Prism to re-apply
 * them to the nodes KaTeX replaced.
 */
export function createMarkdownProcessor(options: MarkdownProcessorOptions = {}) {
  const base = unified()
    .use(remarkParse) // Parse markdown
    .use(remarkGfm) // Support GFM (tables, strikethrough, task lists, etc.)
    .use(remarkMath) // Support math notation
    .use(remarkRehype, { allowDangerousHtml: false }) // Convert to HTML
    .use(rehypeSanitize, sanitizeSchema); // Sanitize the user's content first

  if (options.sourceLines) {
    const store = createSourceLineStore();
    return base
      .use(captureSourceLines, store) // Stamp top-level line anchors (pre-KaTeX)
      .use(rehypeKatex) // Render math with KaTeX
      .use(rehypePrism, { ignoreMissing: true }) // Syntax highlighting
      .use(applySourceLines, store) // Re-apply anchors KaTeX dropped
      .use(rehypeStringify); // Serialize to HTML string
  }

  return base
    .use(rehypeKatex) // Render math with KaTeX
    .use(rehypePrism, { ignoreMissing: true }) // Syntax highlighting
    .use(rehypeStringify); // Serialize to HTML string
}

// Default processor (no source-line anchors), kept for the HTML export and any
// other caller that just wants sanitized, rendered HTML.
export const markdownProcessor = createMarkdownProcessor();

// Processor with source-line anchors, used by the live preview for sync scroll.
export const markdownProcessorWithSourceLines = createMarkdownProcessor({ sourceLines: true });
