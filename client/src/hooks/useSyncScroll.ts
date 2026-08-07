import { useEffect } from 'react';
import type { editor } from 'monaco-editor';

interface UseSyncScrollOptions {
  editor: editor.IStandaloneCodeEditor | null;
  previewRef: React.RefObject<HTMLDivElement>;
  enabled: boolean;
}

/**
 * Keeps a Monaco editor and the preview pane scrolled in lock step,
 * using proportional (percentage-based) scroll positions.
 */
export function useSyncScroll({ editor, previewRef, enabled }: UseSyncScrollOptions) {
  useEffect(() => {
    const preview = previewRef.current;
    if (!enabled || !editor || !preview) return;

    // Last programmatically applied scrollTop per pane. A scroll event
    // reporting (approximately) that value is our own echo, not user input,
    // and must not be relayed back — that would cause a feedback loop.
    const applied: { editor: number | null; preview: number | null } = {
      editor: null,
      preview: null,
    };
    const isEcho = (pane: 'editor' | 'preview', scrollTop: number) => {
      const expected = applied[pane];
      applied[pane] = null;
      return expected !== null && Math.abs(scrollTop - expected) < 1.5;
    };

    const editorMaxScroll = () => editor.getScrollHeight() - editor.getLayoutInfo().height;
    const previewMaxScroll = () => preview.scrollHeight - preview.clientHeight;
    const ratio = (top: number, max: number) => (max > 0 ? Math.min(top / max, 1) : 0);

    const syncPreviewToEditor = () => {
      const target = ratio(editor.getScrollTop(), editorMaxScroll()) * previewMaxScroll();
      if (Math.abs(preview.scrollTop - target) < 1) return;
      applied.preview = target;
      preview.scrollTop = target;
    };

    const syncEditorToPreview = () => {
      const target = ratio(preview.scrollTop, previewMaxScroll()) * editorMaxScroll();
      if (Math.abs(editor.getScrollTop() - target) < 1) return;
      applied.editor = target;
      editor.setScrollTop(target);
    };

    const editorScrollListener = editor.onDidScrollChange((e) => {
      if (!e.scrollTopChanged) return;
      if (isEcho('editor', e.scrollTop)) return;
      syncPreviewToEditor();
    });

    const handlePreviewScroll = () => {
      if (isEcho('preview', preview.scrollTop)) return;
      syncEditorToPreview();
    };
    preview.addEventListener('scroll', handlePreviewScroll, { passive: true });

    // Align immediately on attach, so enabling the option (or entering split
    // view) doesn't leave the panes out of sync until the next scroll.
    syncPreviewToEditor();

    // The preview renders markdown asynchronously, so its scroll height can
    // change after the alignment above ran; re-align whenever it does.
    const resizeObserver = new ResizeObserver(() => syncPreviewToEditor());
    if (preview.firstElementChild) {
      resizeObserver.observe(preview.firstElementChild);
    }

    return () => {
      editorScrollListener.dispose();
      preview.removeEventListener('scroll', handlePreviewScroll);
      resizeObserver.disconnect();
    };
  }, [editor, previewRef, enabled]);
}
