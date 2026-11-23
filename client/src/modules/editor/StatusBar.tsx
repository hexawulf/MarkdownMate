import { useMemo } from 'react';
import { countMarkdown } from '@/lib/markdown';
import { formatDistanceToNow } from 'date-fns';
import { Circle } from 'lucide-react';

interface StatusBarProps {
  documentTitle: string;
  content: string;
  cursorPosition: { line: number; column: number };
  lastSaved: number | null;
  hasUnsavedChanges: boolean;
}

export function StatusBar({
  documentTitle,
  content,
  cursorPosition,
  lastSaved,
  hasUnsavedChanges,
}: StatusBarProps) {
  const stats = useMemo(() => countMarkdown(content), [content]);

  const lastSavedText = useMemo(() => {
    if (!lastSaved) return 'Never saved';
    return `Saved ${formatDistanceToNow(lastSaved, { addSuffix: true })}`;
  }, [lastSaved]);

  return (
    <footer className="no-print print:hidden flex items-center justify-between gap-3 px-3 sm:px-4 py-1.5 text-xs border-t bg-muted/30">
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-medium truncate" title={documentTitle}>
          {documentTitle}
        </span>
        {hasUnsavedChanges && (
          <span className="flex items-center gap-1 text-primary shrink-0">
            <Circle className="h-2 w-2 fill-current" />
            Unsaved
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-3 sm:gap-5 text-muted-foreground shrink-0 whitespace-nowrap">
        <span title="Word count">
          {stats.words} {stats.words === 1 ? 'word' : 'words'}
        </span>
        <span className="hidden sm:inline" title="Character count">
          {stats.characters} {stats.characters === 1 ? 'char' : 'chars'}
        </span>
        <span className="hidden md:inline" title="Cursor position">
          Ln {cursorPosition.line}, Col {cursorPosition.column}
        </span>
        <span title={lastSaved ? new Date(lastSaved).toLocaleString() : 'Never saved'}>
          {lastSavedText}
        </span>
      </div>
    </footer>
  );
}
