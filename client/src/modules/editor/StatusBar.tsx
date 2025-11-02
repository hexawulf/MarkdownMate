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
    <div className="flex items-center justify-between px-4 py-2 text-sm border-t bg-muted/50">
      <div className="flex items-center gap-4">
        <span className="font-medium truncate max-w-xs" title={documentTitle}>
          {documentTitle}
        </span>
        {hasUnsavedChanges && (
          <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
            <Circle className="h-2 w-2 fill-current" />
            Unsaved
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-6 text-muted-foreground">
        <span title="Word count">
          {stats.words} {stats.words === 1 ? 'word' : 'words'}
        </span>
        <span title="Character count">
          {stats.characters} {stats.characters === 1 ? 'char' : 'chars'}
        </span>
        <span title="Cursor position">
          Ln {cursorPosition.line}, Col {cursorPosition.column}
        </span>
        <span className="text-xs" title={lastSaved ? new Date(lastSaved).toLocaleString() : 'Never saved'}>
          {lastSavedText}
        </span>
      </div>
    </div>
  );
}
