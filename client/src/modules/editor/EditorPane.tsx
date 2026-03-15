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

// GitHub-style Monaco themes
monaco.editor.defineTheme('github-light', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: '', foreground: '24292f', background: 'ffffff' },
    { token: 'comment', foreground: '6e7781', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'cf222e' },
    { token: 'string', foreground: '0a3069' },
    { token: 'number', foreground: '0550ae' },
    { token: 'type', foreground: '8250df' },
    { token: 'variable', foreground: '24292f' },
    { token: 'tag', foreground: '116329' },
    { token: 'attribute.name', foreground: '0550ae' },
    { token: 'attribute.value', foreground: '0a3069' },
    { token: 'delimiter', foreground: '57606a' },
    { token: 'meta.content', foreground: '24292f' },
    { token: 'markup.heading', foreground: '0550ae', fontStyle: 'bold' },
    { token: 'markup.bold', fontStyle: 'bold' },
    { token: 'markup.italic', fontStyle: 'italic' },
    { token: 'markup.underline', fontStyle: 'underline' },
  ],
  colors: {
    'editor.background': '#ffffff',
    'editor.foreground': '#24292f',
    'editor.selectionBackground': '#b6e3ff',
    'editor.lineHighlightBackground': '#f6f8fa',
    'editor.lineHighlightBorder': '#00000000',
    'editorCursor.foreground': '#0969da',
    'editorLineNumber.foreground': '#8c959f',
    'editorLineNumber.activeForeground': '#24292f',
    'editorIndentGuide.background': '#d0d7de',
    'editorIndentGuide.activeBackground': '#8c959f',
    'editor.inactiveSelectionBackground': '#b6e3ff80',
    'editorBracketMatch.background': '#b6e3ff40',
    'editorBracketMatch.border': '#b6e3ff',
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
    { token: 'number', foreground: '79c0ff' },
    { token: 'type', foreground: 'd2a8ff' },
    { token: 'variable', foreground: 'c9d1d9' },
    { token: 'tag', foreground: '7ee787' },
    { token: 'attribute.name', foreground: '79c0ff' },
    { token: 'attribute.value', foreground: 'a5d6ff' },
    { token: 'delimiter', foreground: '8b949e' },
    { token: 'meta.content', foreground: 'c9d1d9' },
    { token: 'markup.heading', foreground: '58a6ff', fontStyle: 'bold' },
    { token: 'markup.bold', fontStyle: 'bold' },
    { token: 'markup.italic', fontStyle: 'italic' },
    { token: 'markup.underline', fontStyle: 'underline' },
  ],
  colors: {
    'editor.background': '#0d1117',
    'editor.foreground': '#c9d1d9',
    'editor.selectionBackground': '#1f4273',
    'editor.lineHighlightBackground': '#161b22',
    'editor.lineHighlightBorder': '#00000000',
    'editorCursor.foreground': '#58a6ff',
    'editorLineNumber.foreground': '#484f58',
    'editorLineNumber.activeForeground': '#c9d1d9',
    'editorIndentGuide.background': '#21262d',
    'editorIndentGuide.activeBackground': '#484f58',
    'editor.inactiveSelectionBackground': '#1f427380',
    'editorBracketMatch.background': '#1f427340',
    'editorBracketMatch.border': '#1f4273',
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
