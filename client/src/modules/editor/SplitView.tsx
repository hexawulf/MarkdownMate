import { lazy, Suspense, useRef, useState } from 'react';
import type { editor } from 'monaco-editor';
import { PreviewPane } from './PreviewPane';
import { useSyncScroll } from '@/hooks/useSyncScroll';

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
  onCursorChange?: (line: number, column: number) => void;
  fontSize?: number;
  wordWrap?: boolean;
  syncScroll?: boolean;
}

export function SplitView({
  content,
  onChange,
  viewMode,
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
    <div className="flex flex-col h-full print:h-auto">
      {/* Content area. One EditorPane and one PreviewPane live in a single
          stable flex row for every mode, so Monaco is never remounted when the
          view changes. Widths/visibility change with the mode (MM-06). */}
      <div className="flex-1 overflow-hidden print:overflow-visible print:h-auto">
        <div className="flex h-full w-full print:block print:h-auto">
          <div
            className={`no-print print:hidden ${
              viewMode === 'preview'
                ? 'hidden'
                : viewMode === 'split'
                  ? 'h-full w-1/2 border-r'
                  : 'h-full w-full'
            }`}
          >
            {editor}
          </div>
          <div
            className={`print:block print:w-full print:h-auto ${
              viewMode === 'editor'
                ? 'hidden'
                : viewMode === 'split'
                  ? 'h-full w-1/2'
                  : 'h-full w-full'
            }`}
          >
            <PreviewPane ref={previewRef} markdown={content} />
          </div>
        </div>
      </div>
    </div>
  );
}
