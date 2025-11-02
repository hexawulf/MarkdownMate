import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypePrism from 'rehype-prism-plus';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

// Create the unified processor
export const markdownProcessor = unified()
  .use(remarkParse) // Parse markdown
  .use(remarkGfm) // Support GFM (tables, strikethrough, task lists, etc.)
  .use(remarkMath) // Support math notation
  .use(remarkRehype, { allowDangerousHtml: false }) // Convert to HTML
  .use(rehypeKatex) // Render math with KaTeX
  .use(rehypePrism, { ignoreMissing: true }) // Syntax highlighting
  .use(rehypeSanitize) // Sanitize HTML with default schema
  .use(rehypeStringify); // Serialize to HTML string

/**
 * Convert markdown to sanitized HTML
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  try {
    const result = await markdownProcessor.process(markdown);
    return String(result);
  } catch (error) {
    console.error('Error processing markdown:', error);
    return '<p>Error processing markdown</p>';
  }
}

/**
 * Extract plain text from markdown (for word/char counting)
 */
export function extractPlainText(markdown: string): string {
  // Remove code blocks
  let text = markdown.replace(/```[\s\S]*?```/g, '');
  // Remove inline code
  text = text.replace(/`[^`]+`/g, '');
  // Remove images
  text = text.replace(/!\[.*?\]\(.*?\)/g, '');
  // Remove links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, '');
  // Remove markdown formatting
  text = text.replace(/[*_~`#]/g, '');
  // Remove extra whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

/**
 * Count words and characters in markdown
 */
export function countMarkdown(markdown: string): { words: number; characters: number; charactersNoSpaces: number } {
  const text = extractPlainText(markdown);
  const words = text.length > 0 ? text.split(/\s+/).length : 0;
  const characters = markdown.length;
  const charactersNoSpaces = markdown.replace(/\s/g, '').length;
  
  return { words, characters, charactersNoSpaces };
}

/**
 * Extract headings from markdown for TOC
 */
export function extractHeadings(markdown: string): Array<{ level: number; text: string; id: string }> {
  const headings: Array<{ level: number; text: string; id: string }> = [];
  const lines = markdown.split('\n');
  
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      headings.push({ level, text, id });
    }
  }
  
  return headings;
}
