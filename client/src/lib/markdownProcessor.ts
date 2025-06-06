import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import rehypePrism from "rehype-prism-plus";

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype)
  .use(rehypeKatex)
  .use(rehypePrism, { ignoreMissing: true })
  .use(rehypeStringify);

export function processMarkdown(content: string): string {
  try {
    const result = processor.processSync(content);
    return String(result);
  } catch (error) {
    console.error("Error processing markdown:", error);
    return `<p>Error rendering markdown: ${error instanceof Error ? error.message : 'Unknown error'}</p>`;
  }
}
