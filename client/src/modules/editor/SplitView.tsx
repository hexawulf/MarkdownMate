import { lazy, Suspense, useRef, useState } from 'react';
import type { editor } from 'monaco-editor';
import { PreviewPane } from './PreviewPane';
import { Button } from '@/components/ui/button';
import { useSyncScroll } from '@/hooks/useSyncScroll';
import { Code, Eye, Columns } from 'lucide-react';

// Monaco is by far the largest part of the app. Loading it as its own chunk
// lets the page shell and the preview appear first; the download starts as soon
// as this module is evaluated rather than when the editor is first rendered.
const editorPaneModule = import('./EditorPane');
const EditorPane = lazy(() => editorPaneModule.then((m) => ({ default: m.EditorPane })));

function EditorFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      Loading editor…
    </div>
  );
}

export type ViewMode = 'editor' | 'preview' | 'split';

interface SplitViewProps {
  content: string;
  onChange: (content: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onCursorChange?: (line: number, column: number) => void;
  fontSize?: number;
  wordWrap?: boolean;
  syncScroll?: boolean;
}

export function SplitView({
  content,
  onChange,
  viewMode,
  onViewModeChange,
  onCursorChange,
  fontSize = 14,
  wordWrap = true,
  syncScroll = true,
}: SplitViewProps) {
  // MM-06: there is a single EditorPane (one Monaco instance) that is never
  // unmounted while switching between Editor, Split and Preview. The layout
  // around it changes and panes are shown/hidden with CSS, so Monaco's undo
  // history survives view switches.
  const [editorInstance, setEditorInstance] = useState<editor.IStandaloneCodeEditor | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Sync scroll is live only in split view, when both panes have a real layout.
  // The editor instance is kept across view switches (it is never remounted),
  // so turning sync back on realigns the preview to the editor immediately.
  useSyncScroll({
    editor: editorInstance,
    previewRef,
    enabled: syncScroll && viewMode === 'split',
  });

  const editor = (
    <Suspense fallback={<EditorFallback />}>
      <EditorPane
        value={content}
        onChange={onChange}
        onCursorChange={onCursorChange}
        onEditorReady={setEditorInstance}
        fontSize={fontSize}
        wordWrap={wordWrap}
      />
    </Suspense>
  );

  return (
    <div className="flex flex-col h-full">
      {/* View mode toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
        <div className="flex gap-1 rounded-md bg-muted/50 p-1">
          <Button
            variant={viewMode === 'editor' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('editor')}
            className={`gap-2 ${viewMode === 'editor' ? 'shadow-sm bg-background' : ''}`}
          >
            <Code className="h-4 w-4" />
            Editor
          </Button>
          <Button
            variant={viewMode === 'split' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('split')}
            className={`gap-2 ${viewMode === 'split' ? 'shadow-sm bg-background' : ''}`}
          >
            <Columns className="h-4 w-4" />
            Split
          </Button>
          <Button
            variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('preview')}
            className={`gap-2 ${viewMode === 'preview' ? 'shadow-sm bg-background' : ''}`}
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
        </div>
      </div>

      {/* Content area. One EditorPane and one PreviewPane live in a single
          stable flex row for every mode, so Monaco is never remounted when the
          view changes. Widths/visibility change with the mode (MM-06). */}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full w-full">
          <div
            className={
              viewMode === 'preview'
                ? 'hidden'
                : viewMode === 'split'
                  ? 'h-full w-1/2 border-r'
                  : 'h-full w-full'
            }
          >
            {editor}
          </div>
          <div
            className={
              viewMode === 'editor'
                ? 'hidden'
                : viewMode === 'split'
                  ? 'h-full w-1/2'
                  : 'h-full w-full'
            }
          >
            <PreviewPane ref={previewRef} markdown={content} />
          </div>
        </div>
      </div>
    </div>
  );
}
