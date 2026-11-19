/**
 * rehype plugin: stamp `data-source-line` on top-level block elements.
 *
 * The value is the 1-based line in the source markdown where that block starts
 * (`node.position.start.line`). The sync-scroll feature uses these as anchors
 * to map a line in the Monaco editor to a vertical offset in the rendered
 * preview and back, which is far more stable than a plain scroll ratio when the
 * two panes have different block heights (images, tables, math, long code).
 *
 * Why a factory with a shared `lineByIndex` array:
 *
 * The plugin has to run BEFORE rehype-katex, because KaTeX builds fresh nodes
 * with no `position`, so the line numbers only exist up to that point. But KaTeX
 * also REPLACES the top-level `<pre>`/`<p>` that held a `$$…$$` block with its
 * own `<span class="katex-display">`, which would drop the attribute we just
 * set. KaTeX's replacement is 1-for-1 and keeps the top-level order, so we:
 *
 *   1. `captureSourceLines()` runs after rehype-sanitize, before KaTeX: it
 *      records each top-level element's start line by index and stamps the
 *      attribute (enough for every block KaTeX does not touch).
 *   2. `applySourceLines()` runs last, after KaTeX and Prism: for any top-level
 *      element still missing the attribute (the KaTeX-replaced math blocks), it
 *      re-applies the recorded line by the same index.
 *
 * `data-source-line` is a number the app computes from the parse tree, never
 * user input, so it is safe to add after sanitization.
 */
import type { Root, RootContent, Element } from 'hast';

const ATTR = 'dataSourceLine';

function isElement(node: RootContent): node is Element {
  return node.type === 'element';
}

/**
 * Line numbers captured per top-level element index, shared between the capture
 * pass (before KaTeX) and the apply pass (after KaTeX/Prism).
 */
export interface SourceLineStore {
  lineByIndex: Array<number | undefined>;
}

export function createSourceLineStore(): SourceLineStore {
  return { lineByIndex: [] };
}

/**
 * Pass 1 — run after rehype-sanitize, before rehype-katex.
 * Stamp each top-level element and remember its start line by index.
 */
export function captureSourceLines(store: SourceLineStore) {
  return (tree: Root) => {
    store.lineByIndex = [];
    let index = -1;
    for (const node of tree.children) {
      if (!isElement(node)) continue;
      index += 1;
      const line = node.position?.start?.line;
      store.lineByIndex[index] = line;
      if (line != null) {
        node.properties = node.properties ?? {};
        node.properties[ATTR] = line;
      }
    }
  };
}

/**
 * Pass 2 — run last, after rehype-katex and rehype-prism.
 * Fill in `data-source-line` for top-level elements KaTeX replaced (its fresh
 * nodes carry no `position`), matching them to pass 1 by their index.
 */
export function applySourceLines(store: SourceLineStore) {
  return (tree: Root) => {
    let index = -1;
    for (const node of tree.children) {
      if (!isElement(node)) continue;
      index += 1;
      node.properties = node.properties ?? {};
      if (node.properties[ATTR] != null) continue;
      const line = store.lineByIndex[index];
      if (line != null) {
        node.properties[ATTR] = line;
      }
    }
  };
}
