// Manual Monaco worker configuration for Vite ESM builds
// This configures Monaco to use local bundled workers instead of CDN
//
// OPTIMIZATION: Only load essential workers for markdown editing
// - editorWorker: Base editor functionality (required)
// - Removed: json, css, html, ts workers (12MB+ of unnecessary code)
//
// Impact: For markdown editing, syntax highlighting happens in the preview pane
// via rehype-prism, not in the Monaco editor. The editor only needs basic
// text editing capabilities, not full IDE language services.

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

self.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    // All languages fall back to the basic editor worker
    // This provides text editing, but not advanced language features
    // (IntelliSense, type checking, etc.) which aren't needed for markdown
    return new editorWorker();
  },
};
