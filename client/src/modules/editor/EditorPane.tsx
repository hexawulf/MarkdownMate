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

// DoubleTrees Sepia — custom Monaco themes
monaco.editor.defineTheme('doubletrees-light', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: '', foreground: '2D2A24', background: 'EDE4D4' },
    { token: 'comment', foreground: '8A8279', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'B2221C' },
    { token: 'string', foreground: '3D6E35' },
    { token: 'number', foreground: '2E5A8C' },
    { token: 'type', foreground: '996515' },
    { token: 'variable', foreground: '5C4632' },
    { token: 'tag', foreground: 'B2221C' },
    { token: 'attribute.name', foreground: '996515' },
    { token: 'attribute.value', foreground: '3D6E35' },
    { token: 'delimiter', foreground: '6E665C' },
    { token: 'meta.content', foreground: '2D2A24' },
    { token: 'markup.heading', foreground: '2D2A24', fontStyle: 'bold' },
    { token: 'markup.bold', fontStyle: 'bold' },
    { token: 'markup.italic', fontStyle: 'italic' },
    { token: 'markup.underline', fontStyle: 'underline' },
  ],
  colors: {
    'editor.background': '#EDE4D4',
    'editor.foreground': '#2D2A24',
    'editor.selectionBackground': '#D4A57466',
    'editor.lineHighlightBackground': '#E3D8C540',
    'editor.lineHighlightBorder': '#00000000',
    'editorCursor.foreground': '#996515',
    'editorLineNumber.foreground': '#8A8279',
    'editorLineNumber.activeForeground': '#5C4632',
    'editorIndentGuide.background': '#D0C8BA',
    'editorIndentGuide.activeBackground': '#B0A898',
    'editor.inactiveSelectionBackground': '#D4A57433',
    'editorBracketMatch.background': '#D4A57440',
    'editorBracketMatch.border': '#996515',
    'editorGutter.background': '#EDE4D4',
    'editorOverviewRuler.border': '#D0C8BA',
    'editorWidget.background': '#E3D8C5',
    'editorWidget.border': '#D0C8BA',
    'input.background': '#EDE4D4',
    'input.border': '#D0C8BA',
    'input.foreground': '#2D2A24',
    'scrollbar.shadow': '#00000010',
    'scrollbarSlider.background': '#8A827940',
    'scrollbarSlider.hoverBackground': '#8A827960',
    'scrollbarSlider.activeBackground': '#8A827980',
  },
});

monaco.editor.defineTheme('doubletrees-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'E0D8C8', background: '1E1B17' },
    { token: 'comment', foreground: '9A9289', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'B83A2E' },
    { token: 'string', foreground: '7AAF70' },
    { token: 'number', foreground: '5A9ED6' },
    { token: 'type', foreground: 'C19747' },
    { token: 'variable', foreground: 'A08060' },
    { token: 'tag', foreground: 'B83A2E' },
    { token: 'attribute.name', foreground: 'C19747' },
    { token: 'attribute.value', foreground: '7AAF70' },
    { token: 'delimiter', foreground: '9A9289' },
    { token: 'meta.content', foreground: 'E0D8C8' },
    { token: 'markup.heading', foreground: 'E0D8C8', fontStyle: 'bold' },
    { token: 'markup.bold', fontStyle: 'bold' },
    { token: 'markup.italic', fontStyle: 'italic' },
    { token: 'markup.underline', fontStyle: 'underline' },
  ],
  colors: {
    'editor.background': '#1E1B17',
    'editor.foreground': '#E0D8C8',
    'editor.selectionBackground': '#6B503066',
    'editor.lineHighlightBackground': '#2A262140',
    'editor.lineHighlightBorder': '#00000000',
    'editorCursor.foreground': '#C19747',
    'editorLineNumber.foreground': '#6E665C',
    'editorLineNumber.activeForeground': '#9A9289',
    'editorIndentGuide.background': '#4A453E',
    'editorIndentGuide.activeBackground': '#6E665C',
    'editor.inactiveSelectionBackground': '#6B503033',
    'editorBracketMatch.background': '#6B503040',
    'editorBracketMatch.border': '#C19747',
    'editorGutter.background': '#1E1B17',
    'editorOverviewRuler.border': '#4A453E',
    'editorWidget.background': '#2A2621',
    'editorWidget.border': '#4A453E',
    'input.background': '#1E1B17',
    'input.border': '#4A453E',
    'input.foreground': '#E0D8C8',
    'scrollbar.shadow': '#00000020',
    'scrollbarSlider.background': '#6E665C40',
    'scrollbarSlider.hoverBackground': '#6E665C60',
    'scrollbarSlider.activeBackground': '#6E665C80',
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
        theme={theme === 'dark' ? 'doubletrees-dark' : 'doubletrees-light'}
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
