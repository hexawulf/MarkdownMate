import { useEffect, useRef, useState } from 'react';
import { markdownToHtml } from '@/lib/markdown';
import 'katex/dist/katex.min.css';
import 'prismjs/themes/prism-tomorrow.css';

interface PreviewPaneProps {
  markdown: string;
  className?: string;
}

// Rendering runs the whole unified + KaTeX + Prism pipeline on the main thread,
// so wait for a short pause in typing instead of rendering on every keystroke.
const RENDER_DEBOUNCE_MS = 150;

export function PreviewPane({ markdown, className = '' }: PreviewPaneProps) {
  const [html, setHtml] = useState<string | null>(null);
  const hasRendered = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      let result: string;
      try {
        result = await markdownToHtml(markdown);
      } catch (error) {
        console.error('Error rendering markdown:', error);
        result = '<p style="color: var(--dt-seal-red)">Error rendering markdown</p>';
      }
      if (!cancelled) {
        hasRendered.current = true;
        setHtml(result);
      }
    };

    // The first render (opening the app or the preview) should not wait.
    const timer = setTimeout(render, hasRendered.current ? RENDER_DEBOUNCE_MS : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [markdown]);

  return (
    <div className={`h-full w-full overflow-y-auto bg-background ${className}`}>
      <div className="max-w-4xl mx-auto p-8">
        {html === null && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
        <div
          className="prose dark:prose-invert max-w-none
                     prose-headings:scroll-mt-20
                     prose-code:before:content-none prose-code:after:content-none
                     prose-img:rounded-lg prose-img:shadow-md"
          dangerouslySetInnerHTML={{ __html: html ?? '' }}
        />
      </div>
    </div>
  );
}
