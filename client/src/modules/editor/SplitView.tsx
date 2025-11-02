import { useState } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { EditorPane } from './EditorPane';
import { PreviewPane } from './PreviewPane';
import { Button } from '@/components/ui/button';
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
}: SplitViewProps) {
  return (
    <div className="flex flex-col h-full">
      {/* View mode toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-background">
        <div className="flex gap-1 rounded-md border p-1">
          <Button
            variant={viewMode === 'editor' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('editor')}
            className="gap-2"
          >
            <Code className="h-4 w-4" />
            Editor
          </Button>
          <Button
            variant={viewMode === 'split' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('split')}
            className="gap-2"
          >
            <Columns className="h-4 w-4" />
            Split
          </Button>
          <Button
            variant={viewMode === 'preview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('preview')}
            className="gap-2"
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
                fontSize={fontSize}
                wordWrap={wordWrap}
                vimMode={vimMode}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={20}>
              <PreviewPane markdown={content} />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
}
