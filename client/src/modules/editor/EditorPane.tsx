import { Editor, loader } from '@monaco-editor/react';
import { useTheme } from '@/hooks/useTheme';
import { useRef } from 'react';
import type { editor } from 'monaco-editor';
import * as monaco from 'monaco-editor';

// Import worker configuration (must be before Monaco initialization)
import '../../monaco-workers';

// Configure loader to use bundled Monaco instead of CDN
// Setting paths to false disables AMD loader completely
loader.config({ monaco, paths: { vs: '' } });

// GitHub-style Monaco themes with 0xWulf Teal accents
monaco.editor.defineTheme('github-light', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: '', foreground: '24292f', background: 'ffffff' },
    { token: 'comment', foreground: '6e7781', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'cf222e' },
    { token: 'string', foreground: '0a3069' },
    { token: 'number', foreground: '0d9488' },
    { token: 'type', foreground: '8250df' },
    { token: 'variable', foreground: '24292f' },
    { token: 'tag', foreground: '116329' },
    { token: 'attribute.name', foreground: '0d9488' },
    { token: 'attribute.value', foreground: '0a3069' },
    { token: 'delimiter', foreground: '57606a' },
    { token: 'meta.content', foreground: '24292f' },
    { token: 'markup.heading', foreground: '0f766e', fontStyle: 'bold' },
    { token: 'markup.bold', fontStyle: 'bold' },
    { token: 'markup.italic', fontStyle: 'italic' },
    { token: 'markup.underline', fontStyle: 'underline' },
  ],
  colors: {
    'editor.background': '#ffffff',
    'editor.foreground': '#24292f',
    'editor.selectionBackground': '#99f6e4',
    'editor.lineHighlightBackground': '#f6f8fa',
    'editor.lineHighlightBorder': '#00000000',
    'editorCursor.foreground': '#0d9488',
    'editorLineNumber.foreground': '#8c959f',
    'editorLineNumber.activeForeground': '#24292f',
    'editorIndentGuide.background': '#d0d7de',
    'editorIndentGuide.activeBackground': '#8c959f',
    'editor.inactiveSelectionBackground': '#99f6e480',
    'editorBracketMatch.background': '#99f6e440',
    'editorBracketMatch.border': '#14b8a6',
    'editorGutter.background': '#ffffff',
    'editorOverviewRuler.border': '#d0d7de',
    'editorWidget.background': '#f6f8fa',
    'editorWidget.border': '#d0d7de',
    'input.background': '#ffffff',
    'input.border': '#d0d7de',
    'input.foreground': '#24292f',
    'scrollbar.shadow': '#00000010',
    'scrollbarSlider.background': '#8c959f40',
    'scrollbarSlider.hoverBackground': '#8c959f60',
    'scrollbarSlider.activeBackground': '#8c959f80',
  },
});

monaco.editor.defineTheme('github-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'c9d1d9', background: '0d1117' },
    { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'ff7b72' },
    { token: 'string', foreground: 'a5d6ff' },
    { token: 'number', foreground: '5eead4' },
    { token: 'type', foreground: 'd2a8ff' },
    { token: 'variable', foreground: 'c9d1d9' },
    { token: 'tag', foreground: '7ee787' },
    { token: 'attribute.name', foreground: '5eead4' },
    { token: 'attribute.value', foreground: 'a5d6ff' },
    { token: 'delimiter', foreground: '8b949e' },
    { token: 'meta.content', foreground: 'c9d1d9' },
    { token: 'markup.heading', foreground: '2dd4bf', fontStyle: 'bold' },
    { token: 'markup.bold', fontStyle: 'bold' },
    { token: 'markup.italic', fontStyle: 'italic' },
    { token: 'markup.underline', fontStyle: 'underline' },
  ],
  colors: {
    'editor.background': '#0d1117',
    'editor.foreground': '#c9d1d9',
    'editor.selectionBackground': '#134e4a',
    'editor.lineHighlightBackground': '#161b22',
    'editor.lineHighlightBorder': '#00000000',
    'editorCursor.foreground': '#2dd4bf',
    'editorLineNumber.foreground': '#484f58',
    'editorLineNumber.activeForeground': '#c9d1d9',
    'editorIndentGuide.background': '#21262d',
    'editorIndentGuide.activeBackground': '#484f58',
    'editor.inactiveSelectionBackground': '#134e4a80',
    'editorBracketMatch.background': '#134e4a40',
    'editorBracketMatch.border': '#14b8a6',
    'editorGutter.background': '#0d1117',
    'editorOverviewRuler.border': '#21262d',
    'editorWidget.background': '#161b22',
    'editorWidget.border': '#30363d',
    'input.background': '#0d1117',
    'input.border': '#30363d',
    'input.foreground': '#c9d1d9',
    'scrollbar.shadow': '#00000020',
    'scrollbarSlider.background': '#484f5840',
    'scrollbarSlider.hoverBackground': '#484f5860',
    'scrollbarSlider.activeBackground': '#484f5880',
  },
});

interface EditorPaneProps {
  value: string;
  onChange: (value: string) => void;
  onCursorChange?: (line: number, column: number) => void;
  /** Called once Monaco has mounted, with the editor instance (for sync scroll). */
  onEditorReady?: (editor: editor.IStandaloneCodeEditor) => void;
  fontSize?: number;
  wordWrap?: boolean;
}

export function EditorPane({ 
  value, 
  onChange, 
  onCursorChange,
  onEditorReady,
  fontSize = 14,
  wordWrap = true,
}: EditorPaneProps) {
  const { theme } = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    onEditorReady?.(editor);

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

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage="markdown"
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme={theme === 'dark' ? 'github-dark' : 'github-light'}
        options={{
          fontSize,
          fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace',
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
