import { useEffect, useRef, useState } from 'react';
import type { editor } from 'monaco-editor';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { EditorPane } from './EditorPane';
import { PreviewPane } from './PreviewPane';
import { Button } from '@/components/ui/button';
import { useSyncScroll } from '@/hooks/useSyncScroll';
import { Code, Eye, Columns } from 'lucide-react';

export type ViewMode = 'editor' | 'preview' | 'split';

interface SplitViewProps {
  content: string;
  onChange: (content: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onCursorChange?: (line: number, column: number) => void;
  fontSize?: number;
  wordWrap?: boolean;
  vimMode?: boolean;
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
  vimMode = false,
  syncScroll = true,
}: SplitViewProps) {
  const [editorInstance, setEditorInstance] = useState<editor.IStandaloneCodeEditor | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Panes remount when the view mode changes; drop the disposed editor instance
  useEffect(() => {
    if (viewMode !== 'split') {
      setEditorInstance(null);
    }
  }, [viewMode]);

  useSyncScroll({
    editor: editorInstance,
    previewRef,
    enabled: syncScroll && viewMode === 'split',
  });

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

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'editor' && (
          <EditorPane
            value={content}
            onChange={onChange}
            onCursorChange={onCursorChange}
            fontSize={fontSize}
            wordWrap={wordWrap}
            vimMode={vimMode}
          />
        )}

        {viewMode === 'preview' && (
          <PreviewPane markdown={content} />
        )}

        {viewMode === 'split' && (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={50} minSize={20}>
              <EditorPane
                value={content}
                onChange={onChange}
                onCursorChange={onCursorChange}
                onEditorMount={setEditorInstance}
                fontSize={fontSize}
                wordWrap={wordWrap}
                vimMode={vimMode}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={20}>
              <PreviewPane ref={previewRef} markdown={content} />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
}
