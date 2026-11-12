/**
 * Convert markdown to sanitized HTML
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  try {
    const { markdownProcessor } = await import('./markdownProcessor');
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
