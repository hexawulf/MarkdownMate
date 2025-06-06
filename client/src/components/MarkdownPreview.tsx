import { useMemo } from "react";
import { processMarkdown } from "@/lib/markdownProcessor";

interface MarkdownPreviewProps {
  content: string;
}

export default function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const processedContent = useMemo(() => {
    return processMarkdown(content);
  }, [content]);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-card">
      <article 
        className="prose-editor"
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
    </div>
  );
}
