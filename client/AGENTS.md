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
  lib/autosave.ts               # pure autosave controller
  lib/markdown.ts               # unified: sanitize before KaTeX/Prism
  lib/export.ts                 # per-document export; safeFileName()
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

## Gotchas

- Monaco is heavy and lazy-loaded; keep a single instance (SplitView) so undo
  history survives view switches.
- Any IndexedDB schema change is a versioned upgrade with a migration test that
  proves no document is lost.
