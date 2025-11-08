import { Editor, loader } from '@monaco-editor/react';
import { useTheme } from '@/hooks/useTheme';
import { useEffect, useRef } from 'react';
import type { editor } from 'monaco-editor';
import * as monaco from 'monaco-editor';

// Import worker configuration (must be before Monaco initialization)
import '../../monaco-workers';

// Import Monaco configuration for language optimization
import { configureMonaco } from '@/lib/monacoConfig';

// Configure loader to use bundled Monaco instead of CDN
// Setting paths to false disables AMD loader completely
loader.config({ monaco, paths: { vs: '' } });

// Configure Monaco with essential languages only (reduces bundle size)
configureMonaco(monaco);

interface EditorPaneProps {
  value: string;
  onChange: (value: string) => void;
  onCursorChange?: (line: number, column: number) => void;
  fontSize?: number;
  wordWrap?: boolean;
  vimMode?: boolean;
}

export function EditorPane({ 
  value, 
  onChange, 
  onCursorChange,
  fontSize = 14,
  wordWrap = true,
  vimMode = false 
}: EditorPaneProps) {
  const { theme } = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChange) {
        onCursorChange(e.position.lineNumber, e.position.column);
      }
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    onChange(value || '');
  };

  // Apply vim mode if enabled (basic implementation)
  useEffect(() => {
    if (vimMode && editorRef.current) {
      // Monaco doesn't have built-in Vim mode
      // This would require monaco-vim extension
      console.log('Vim mode requested but not yet implemented');
    }
  }, [vimMode]);

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage="markdown"
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
        options={{
          fontSize,
          wordWrap: wordWrap ? 'on' : 'off',
          minimap: { enabled: false },
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          suggestOnTriggerCharacters: true,
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false,
          },
          tabSize: 2,
          insertSpaces: true,
          renderWhitespace: 'selection',
          bracketPairColorization: {
            enabled: true,
          },
        }}
      />
    </div>
  );
}
