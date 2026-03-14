import { useEffect, useState } from 'react';
import { markdownToHtml } from '@/lib/markdown';
import 'katex/dist/katex.min.css';
import 'prismjs/themes/prism-tomorrow.css';

interface PreviewPaneProps {
  markdown: string;
  className?: string;
}

export function PreviewPane({ markdown, className = '' }: PreviewPaneProps) {
  const [html, setHtml] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const processMarkdown = async () => {
      setIsLoading(true);
      try {
        const result = await markdownToHtml(markdown);
        if (!cancelled) {
          setHtml(result);
        }
      } catch (error) {
        console.error('Error rendering markdown:', error);
        if (!cancelled) {
          setHtml('<p style="color: var(--dt-seal-red)">Error rendering markdown</p>');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    processMarkdown();

    return () => {
      cancelled = true;
    };
  }, [markdown]);

  return (
    <div className={`h-full w-full overflow-y-auto bg-background ${className}`}>
      <div className="max-w-4xl mx-auto p-8">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
        <div 
          className="prose dark:prose-invert max-w-none
                     prose-headings:scroll-mt-20
                     prose-code:before:content-none prose-code:after:content-none
                     prose-img:rounded-lg prose-img:shadow-md"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
