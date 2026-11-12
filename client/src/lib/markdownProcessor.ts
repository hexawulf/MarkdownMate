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

// Create the unified processor
export const markdownProcessor = unified()
  .use(remarkParse) // Parse markdown
  .use(remarkGfm) // Support GFM (tables, strikethrough, task lists, etc.)
  .use(remarkMath) // Support math notation
  .use(remarkRehype, { allowDangerousHtml: false }) // Convert to HTML
  .use(rehypeSanitize, sanitizeSchema) // Sanitize the user's content first
  .use(rehypeKatex) // Render math with KaTeX
  .use(rehypePrism, { ignoreMissing: true }) // Syntax highlighting
  .use(rehypeStringify); // Serialize to HTML string
