import { saveAs } from 'file-saver';
import { markdownToHtml } from './markdown';

const FALLBACK_FILE_NAME = 'Untitled';
// Reserved device names on Windows; a file called "con.md" cannot be created there.
const RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/**
 * Turn a document title into a file name that is valid on Windows, macOS and Linux.
 */
export function safeFileName(title: string): string {
  const cleaned = title
    // Path separators, characters Windows forbids, and control characters
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '-')
    .replace(/\s+/g, ' ')
    // Windows drops trailing dots and spaces; leading dots hide the file on Unix
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
    .slice(0, 120)
    .trim();

  if (!cleaned || RESERVED_NAMES.test(cleaned)) return FALLBACK_FILE_NAME;
  return cleaned;
}

/**
 * Export document as Markdown file
 */
export function exportAsMarkdown(title: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, `${safeFileName(title)}.md`);
}

/**
 * Wrap rendered markdown in a standalone HTML page.
 *
 * Everything is inline except the KaTeX stylesheet and fonts, which are loaded
 * from jsDelivr at the version of KaTeX that produced the markup.
 */
export function buildHtmlDocument(title: string, html: string, katexVersion: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@${katexVersion}/dist/katex.min.css">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }
    
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 600;
      line-height: 1.3;
    }
    
    h1 { font-size: 2.25em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; }
    h2 { font-size: 1.75em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h3 { font-size: 1.5em; }
    h4 { font-size: 1.25em; }
    h5 { font-size: 1.1em; }
    h6 { font-size: 1em; color: #666; }
    
    p { margin-bottom: 1em; }
    
    a {
      color: #0066cc;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    code {
      background: #f4f4f4;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 0.9em;
      color: #e01e5a;
    }
    
    pre {
      background: #f6f8fa;
      padding: 1em;
      border-radius: 6px;
      overflow-x: auto;
      margin: 1em 0;
    }
    
    pre code {
      background: none;
      padding: 0;
      color: inherit;
    }
    
    blockquote {
      border-left: 4px solid #ddd;
      padding-left: 1em;
      margin: 1em 0;
      color: #666;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    
    table th,
    table td {
      border: 1px solid #ddd;
      padding: 0.75em;
      text-align: left;
    }
    
    table th {
      background: #f6f8fa;
      font-weight: 600;
    }
    
    table tr:nth-child(even) {
      background: #f9f9f9;
    }
    
    img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 1em 0;
    }
    
    ul, ol {
      margin: 1em 0;
      padding-left: 2em;
    }
    
    li {
      margin: 0.5em 0;
    }
    
    hr {
      border: none;
      border-top: 2px solid #eee;
      margin: 2em 0;
    }
    
    /* Syntax highlighting (Prism token classes) */
    .token.comment, .token.prolog, .token.doctype, .token.cdata { color: #6e7781; font-style: italic; }
    .token.punctuation { color: #57606a; }
    .token.property, .token.tag, .token.constant, .token.symbol, .token.deleted { color: #116329; }
    .token.boolean, .token.number { color: #0550ae; }
    .token.selector, .token.attr-name, .token.string, .token.char, .token.builtin, .token.inserted { color: #0a3069; }
    .token.operator, .token.entity, .token.url { color: #57606a; }
    .token.atrule, .token.attr-value, .token.keyword { color: #cf222e; }
    .token.function, .token.class-name { color: #8250df; }
    .token.regex, .token.important, .token.variable { color: #953800; }
    .token.important, .token.bold { font-weight: bold; }
    .token.italic { font-style: italic; }

    /* Task lists */
    input[type="checkbox"] {
      margin-right: 0.5em;
    }
    
    /* Print styles */
    @media print {
      body {
        padding: 0;
        max-width: none;
      }
      
      a {
        color: #000;
        text-decoration: underline;
      }
      
      pre {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
}

/**
 * Export document as a standalone HTML file
 */
export async function exportAsHtml(title: string, content: string) {
  // KaTeX is already loaded with the rendering pipeline; importing it here
  // lazily keeps it out of the initial bundle.
  const [html, { version: katexVersion }] = await Promise.all([
    markdownToHtml(content),
    import('katex'),
  ]);
  const blob = new Blob([buildHtmlDocument(title, html, katexVersion)], { type: 'text/html;charset=utf-8' });
  saveAs(blob, `${safeFileName(title)}.html`);
}

/**
 * Trigger print dialog for PDF export
 */
export function exportAsPdf() {
  window.print();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
