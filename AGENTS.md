# AGENTS.md - MarkdownMate

## Project Snapshot

**MarkdownMate** is a fast, single-user, **local-first** Markdown editor with a
live preview. There is no account system, no collaboration and no database.

- **Type**: Static client served by a tiny Express static server.
- **Stack**: React 18 + TypeScript + Vite + Tailwind + shadcn/ui + Monaco +
  unified/remark/rehype (KaTeX, Prism). State lives in a Zustand store backed by
  the browser's **IndexedDB** (via `idb`). No PostgreSQL, Firebase or WebSockets.
- **Structure**: `client/` (the app), `server/` (static server + health check),
  `shared/` is not used.

## Root Setup Commands

```bash
npm install          # install dependencies
npm run dev          # Vite dev server + Express (http://localhost:5004)
npm run check        # TypeScript type check (tsc)
npm run lint         # ESLint (flat config)
npm test             # Vitest (node + jsdom, fake-indexeddb)
npm run test:coverage
npm run test:e2e     # Playwright smoke test against the production build
npm run build        # clean dist, build the client, bundle the server
npm start            # production: node dist/index.js
```

CI runs check, lint, test, build and the Playwright e2e smoke test. There is no
`db:push` and no migrations.

## Where things live

```
client/src/
  pages/Editor.tsx              # the single editor page
  stores/useDocumentsStore.ts   # Zustand store over IndexedDB (markdownmate-db, v2)
  hooks/useAutosave.ts          # debounced per-document autosave
  lib/autosave.ts               # autosave controller (pure, tested)
  lib/markdown.ts               # unified pipeline (sanitize -> KaTeX -> Prism)
  lib/export.ts                 # single-document .md / .html / print export
  lib/backup.ts                 # Export all / Import (.zip) + storage.persist()
  modules/editor/               # SplitView, EditorPane (Monaco), PreviewPane, StatusBar
  modules/about/                # About dialog
  components/DocumentsSidebar.tsx  # list, rename, duplicate, delete, trash
  components/ui/                # shadcn/ui primitives
server/
  app.ts                        # Express app factory + helmet CSP + /api/health
  static.ts                     # production static file serving
  vite.ts                       # dev Vite middleware
  index.ts                      # entry: dev vs prod wiring, listen
  src/logger/                   # Winston logger (LOG_FILE overridable)
```

## Conventions

- TypeScript strict; avoid `any`. Imports use the `@/` alias for `client/src`.
- Functional React components; Tailwind utility classes and `cn()` for styling;
  theme via CSS variables consumed as `rgb(var(--token))` (see `client/src/index.css`).
- Commits: `type(scope): description` (e.g. `fix(store): …`).
- Storage: any IndexedDB schema change must be a **versioned upgrade** that keeps
  every existing document, covered by a `fake-indexeddb` migration test.
- The CSP in `server/app.ts` is strict and local-first; `img-src` additionally
  allows `https:` so remote images render in the preview. Do not widen it further
  without a reason.

## Pre-PR checks

```bash
npm run check && npm run lint && npm test && npm run build && npm run test:e2e
```

The Playwright e2e suite lives in `tests/e2e/` and drives the production build
(`node dist/index.js`) on port 5098. Vitest does not pick it up (its `include`
is scoped to `client/src` and `server`); `tsc` and ESLint do cover it.

Module details: see [client/AGENTS.md](client/AGENTS.md) and
[server/AGENTS.md](server/AGENTS.md). Older planning notes are in `docs/archive/`.
