# AGENTS.md - Client

The React 18 + TypeScript + Vite single-page app. **Local-first**: documents are
stored in the browser's IndexedDB; there is no server API for documents, no auth
and no WebSockets.

## Run

```bash
npm run dev      # from the repo root: Vite + Express on http://localhost:5004
npm run check    # tsc
npm run build    # client build into dist/public
npm test         # Vitest (component/store tests opt into jsdom)
```

## Layout

```
client/src/
  pages/Editor.tsx              # the editor page (loading/empty-state, autosave, cross-tab sync)
  stores/useDocumentsStore.ts   # Zustand + IndexedDB (idb); CRUD, soft-delete/trash, broadcast
  hooks/useAutosave.ts          # debounced autosave hook (pause + flush)
  hooks/useSyncScroll.ts        # Monaco <-> preview lock-step scroll (Split view only)
  lib/autosave.ts               # pure autosave controller
  lib/markdown.ts               # unified: sanitize before KaTeX/Prism; markdownToHtml({ sourceLines })
  lib/markdownProcessor.ts      # processor factory; { sourceLines } stamps data-source-line
  lib/rehypeSourceLines.ts      # rehype passes: data-source-line on top-level blocks
  lib/syncScrollMath.ts         # pure line<->offset maths for sync scroll (tested, no Monaco)
  lib/export.ts                 # per-document export; safeFileName() (no anchors)
  lib/backup.ts                 # Export all / Import (JSZip, dynamic import) + persist()
  modules/editor/SplitView.tsx  # one Monaco + one preview; view mode changes layout only
  modules/editor/EditorPane.tsx # Monaco wrapper (automaticLayout)
  modules/editor/PreviewPane.tsx
  components/DocumentsSidebar.tsx
  components/ui/                # shadcn/ui primitives
```

## Conventions

- Functional components, hooks, `@/` imports, Tailwind + `cn()`.
- Theme tokens are `rgb(var(--token))` (defined in `client/src/index.css`); never
  hardcode hex colors.
- State:
  - **Zustand** for documents (`useDocumentsStore`). Writes go through the store,
    which persists to IndexedDB in a single `readwrite` transaction and posts to a
    `BroadcastChannel('markdownmate')` so other tabs stay in sync.
  - Editor-local state (content, view mode, dialogs) lives in `Editor.tsx`.
- React Query is set up (`lib/queryClient.ts`) but there is no server data to
  fetch; do not add document APIs.

## Testing

- Vitest with `fake-indexeddb` and React Testing Library. Store/component tests
  start with `// @vitest-environment jsdom`. See
  `stores/useDocumentsStore.test.ts`, `stores/migration.test.ts`,
  `pages/Editor.test.tsx`, `lib/backup.test.ts`.
- End-to-end: `npm run test:e2e` runs the Playwright smoke test in `tests/e2e/`
  against the production build. It exercises the real browser paths (IndexedDB,
  BroadcastChannel, the CSP, KaTeX/Prism render) and must not mock them.

## Gotchas

- Monaco is heavy and lazy-loaded; keep a single instance (SplitView) so undo
  history survives view switches. Sync scroll (`useSyncScroll`) reads the Monaco
  instance through `EditorPane`'s `onEditorReady` callback and the preview's
  scroll container via a forwarded ref — it must not cause a remount.
- The preview renders with `markdownToHtml(md, { sourceLines: true })` so
  `data-source-line` anchors exist for sync scroll; the HTML export uses the
  default call (no anchors). Pure mapping maths live in `lib/syncScrollMath.ts`
  and stay free of Monaco so they can be unit-tested.
- Any IndexedDB schema change is a versioned upgrade with a migration test that
  proves no document is lost.
