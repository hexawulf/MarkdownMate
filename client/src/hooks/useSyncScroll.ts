import { useEffect } from 'react';
import type { editor } from 'monaco-editor';
import { type Anchor, clamp, lineToOffset, offsetToLine } from '@/lib/syncScrollMath';

interface UseSyncScrollOptions {
  editor: editor.IStandaloneCodeEditor | null;
  previewRef: React.RefObject<HTMLDivElement | null>;
  enabled: boolean;
}

/**
 * Keep a Monaco editor and the preview pane scrolled in step, in both
 * directions, driven by the `data-source-line` anchors rehypeSourceLines puts
 * on the preview's top-level blocks.
 *
 * Editor -> preview: take the editor's top visible line (with the fractional
 * part inside that line), map it to a preview offset by interpolating between
 * the anchors around it, and scroll the preview there. Preview -> editor is the
 * inverse. With no anchors (an empty or single-block document) both directions
 * fall back to a plain scroll ratio.
 *
 * A feedback loop is avoided by remembering the exact scrollTop we apply to each
 * pane and ignoring the scroll event that echoes it back. Work is throttled to
 * one sync per animation frame, and the sync only runs in split view (the hook
 * is passed `enabled=false` otherwise, and does nothing without both panes).
 */
export function useSyncScroll({ editor, previewRef, enabled }: UseSyncScrollOptions) {
  useEffect(() => {
    const preview = previewRef.current;
    if (!enabled || !editor || !preview) return;

    // Instant scrolling only (no smooth behaviour). This also honours
    // prefers-reduced-motion: we never animate, we set scrollTop directly.

    // Values we applied programmatically; a scroll event reporting (about) this
    // value is our own echo and must not be relayed back.
    const applied: { editor: number | null; preview: number | null } = {
      editor: null,
      preview: null,
    };
    const isEcho = (pane: 'editor' | 'preview', scrollTop: number) => {
      const expected = applied[pane];
      applied[pane] = null;
      return expected !== null && Math.abs(scrollTop - expected) < 1.5;
    };

    const editorMaxScroll = () =>
      Math.max(0, editor.getScrollHeight() - editor.getLayoutInfo().height);
    const previewMaxScroll = () => Math.max(0, preview.scrollHeight - preview.clientHeight);

    // Read the anchors from the preview DOM: every element carrying
    // data-source-line, with its top offset relative to the scroll container.
    const readAnchors = (): Anchor[] => {
      const nodes = preview.querySelectorAll<HTMLElement>('[data-source-line]');
      const base = preview.getBoundingClientRect().top - preview.scrollTop;
      const anchors: Anchor[] = [];
      for (const node of Array.from(nodes)) {
        const line = Number(node.getAttribute('data-source-line'));
        if (!Number.isFinite(line)) continue;
        const top = node.getBoundingClientRect().top - base;
        anchors.push({ line, top });
      }
      // Stamped in document order already, but sort defensively by line.
      anchors.sort((a, b) => a.line - b.line);
      return anchors;
    };

    const lastLine = () => editor.getModel()?.getLineCount() ?? 1;

    // Pixel height of one editor line, derived from Monaco's own layout rather
    // than an option enum (whose numeric id shifts between versions).
    const lineHeightPx = (line: number): number => {
      const here = editor.getTopForLineNumber(line);
      const next = editor.getTopForLineNumber(line + 1);
      const h = next - here;
      return h > 0 ? h : 0;
    };

    // The editor's top visible line, including the fraction scrolled into it.
    const editorTopLine = (): number => {
      const ranges = editor.getVisibleRanges();
      const line = ranges.length > 0 ? ranges[0].startLineNumber : 1;
      const lineTop = editor.getTopForLineNumber(line);
      const within = editor.getScrollTop() - lineTop; // px past the line's top
      const h = lineHeightPx(line);
      const frac = h > 0 ? clamp(within / h, 0, 1) : 0;
      return line + frac;
    };

    const syncPreviewToEditor = () => {
      const maxPreview = previewMaxScroll();
      if (maxPreview <= 0) return;
      const maxEditor = editorMaxScroll();
      let target: number;
      if (editor.getScrollTop() <= 1) {
        // Top lock: both panes at 0.
        target = 0;
      } else if (maxEditor > 0 && editor.getScrollTop() >= maxEditor - 1) {
        // Bottom lock: both panes at their max.
        target = maxPreview;
      } else {
        target = lineToOffset(editorTopLine(), readAnchors(), maxPreview, lastLine());
      }
      target = clamp(target, 0, maxPreview);
      if (Math.abs(preview.scrollTop - target) < 1) return;
      applied.preview = target;
      preview.scrollTop = target;
    };

    const syncEditorToPreview = () => {
      const maxEditor = editorMaxScroll();
      if (maxEditor <= 0) return;
      const maxPreview = previewMaxScroll();
      let target: number;
      if (preview.scrollTop <= 1) {
        // Top lock.
        target = 0;
      } else if (maxPreview > 0 && preview.scrollTop >= maxPreview - 1) {
        // Bottom lock.
        target = maxEditor;
      } else {
        const line = offsetToLine(preview.scrollTop, readAnchors(), maxPreview, lastLine());
        const whole = Math.max(1, Math.floor(line));
        const frac = line - whole;
        const lineTop = editor.getTopForLineNumber(whole);
        target = lineTop + frac * lineHeightPx(whole);
      }
      target = clamp(target, 0, maxEditor);
      if (Math.abs(editor.getScrollTop() - target) < 1) return;
      // Monaco fires onDidScrollChange synchronously inside setScrollTop, so
      // mark the expected echo BEFORE applying it.
      applied.editor = target;
      editor.setScrollTop(target);
    };

    // One sync per animation frame, so a burst of scroll events coalesces.
    let frame: number | null = null;
    const schedule = (fn: () => void) => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        fn();
      });
    };

    const editorScrollListener = editor.onDidScrollChange((e) => {
      if (e.scrollTopChanged && isEcho('editor', e.scrollTop)) return;
      // A geometry-only change (font size, word wrap) shifts the mapping with no
      // scroll, so re-align on scrollHeightChanged too.
      if (!e.scrollTopChanged && !e.scrollHeightChanged) return;
      schedule(syncPreviewToEditor);
    });

    const handlePreviewScroll = () => {
      if (isEcho('preview', preview.scrollTop)) return;
      schedule(syncEditorToPreview);
    };
    preview.addEventListener('scroll', handlePreviewScroll, { passive: true });

    // Align once on attach (enabling the toggle, or entering split view), so the
    // panes are not out of step until the first scroll.
    schedule(syncPreviewToEditor);

    // The preview renders markdown asynchronously, so its content height can
    // change after the alignment above; re-align whenever it does.
    const observed = preview.firstElementChild ?? preview;
    const resizeObserver = new ResizeObserver(() => schedule(syncPreviewToEditor));
    resizeObserver.observe(observed);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      editorScrollListener.dispose();
      preview.removeEventListener('scroll', handlePreviewScroll);
      resizeObserver.disconnect();
    };
  }, [editor, previewRef, enabled]);
}
