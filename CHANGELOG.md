# Changelog

All notable changes to MarkdownMate will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.4.0] - 2026-11-19

### Added
- Sync scroll between the editor and the preview in Split view, in both
  directions (based on PR #51 by @AdelinoGP). The preview stamps
  `data-source-line` anchors on its top-level blocks, so the two panes track by
  source line rather than a plain scroll ratio, which stays accurate when blocks
  have different heights (images, tables, math, long code). A "Sync Scroll"
  toggle in Settings turns it on or off; it is on by default and remembered per
  browser. The exported HTML never contains the anchors.

### Fixed
- Windows path resolution in `vite.config.ts` (from PR #51): use `fileURLToPath`
  instead of `new URL(import.meta.url).pathname`, which produced `/D:/…` paths
  on Windows and broke the build and dev server. Linux and macOS are unchanged;
  `outDir` stays `dist/public`.
- Development-mode CSP (from PR #51): `script-src 'self'` blocked the inline
  react-refresh preamble `@vitejs/plugin-react` injects, so the app did not load
  under `npm run dev`. The preamble is now allowed by its sha256 hash, only when
  `NODE_ENV` is exactly `development`. Production (and any unset or other value)
  keeps the strict `script-src 'self'`.

## [3.3.1] - 2026-11-19

### Fixed
- Phone layout (MM-12): below 768 px the document list is a slide-over panel
  opened from a new "Documents" button in the header (Escape or a tap outside
  closes it), and the Settings/Export buttons show icons only. The page no
  longer scrolls sideways at 390 px.
- Security headers (MM-09): the piapps nginx vhost no longer adds its own
  X-Frame-Options, X-Content-Type-Options and X-XSS-Protection on top of the
  app's, so each is sent once, and X-XSS-Protection is the app's `0` instead of
  two conflicting values. The e2e header test now checks all three.

### Security
- `@tailwindcss/typography` pins `postcss-selector-parser` 6.0.10
  (GHSA-rj75-hqrm-r3gf, moderate, build time only). An npm override lifts it to
  6.1.6, which Tailwind already uses. The generated `prose` CSS is unchanged.
  `npm audit` now reports 0 findings, including dev dependencies.

## [3.3.0] - 2026-11-19

### Added
- A Playwright browser smoke test (headless Chromium) that drives the
  production build and covers rendering under the real CSP, the KaTeX + Prism
  output, IndexedDB persistence, the trash, the zip backup round-trip, two-tab
  sync and the v3.2.0 stuck-upgrade regression. It runs in CI after the build,
  and a read-only `@live` subset can run against the deployed site.

### Changed
- Upgraded KaTeX from 0.16.47 to 0.19.1, clearing the last four low-severity
  production `npm audit` findings (GHSA-238p-pmpm-9mq7). Math rendering, the
  `trust`-off default and the CSS/font loading are unchanged.
- A document created, renamed or deleted in another tab now appears in this
  tab's sidebar without a reload. A tab ignores its own broadcasts, so it does
  not rescan the database after each local autosave.
- The e2e server rebuilds before a local run and stops on a failed build, so the
  suite never runs against a stale `dist/`. CI uses its own build step.

### Fixed
- A flaky Editor unit test (about 1 run in 4 when run with its siblings) that
  read a document list a previous test could still rewrite.

## [3.2.1] - 2026-11-18

### Fixed
- The app no longer hangs on "Loading…" when a tab with an older version
  (3.1.0) is still open during the database upgrade to schema v2. The
  browser holds the upgrade until the old tab closes; the app now says so
  ("Close every other MarkdownMate tab or window") and continues by itself.
- A 3.2.x tab now releases its database connection and reloads when a newer
  version in another tab needs to upgrade, so future upgrades cannot get stuck.

## [3.2.0] - 2026-11-18

Audit 2026-11-18 (findings MM-01…MM-11).

### Fixed
- Deleting the only document no longer leaves the page stuck on "Loading…"; the
  app auto-creates a document or shows a "New document" empty state (MM-01).
- Re-selecting the already-open document is a no-op, so a pending edit is kept (MM-07).
- Writes use a single IndexedDB transaction and a `BroadcastChannel`, so two tabs
  stay in sync; a tab with unsaved edits sees a "Changed in another tab" banner (MM-02).
- Remote images render in the preview: `img-src` allows `https:` (http still blocked) (MM-03).
- Duplicate flushes the pending edit first; delete/duplicate/rename show a toast on
  failure; an edited document moves to the top of the list (MM-08).
- The editor keeps a single Monaco instance across Editor/Split/Preview, so undo
  history survives view switches (MM-06).
- The render-error colour uses a real theme token instead of an undefined one (MM-11).

### Added
- Persistent-storage request (`navigator.storage.persist()`), "Export all" (a
  `.zip` of `.md` files + `manifest.json`) and "Import"; the About dialog shows
  the persistence state (MM-04).
- A working Trash: IndexedDB schema version 2 (drops the invalid `by-isDeleted`
  index, keeps every record), restore, delete forever, empty trash, and a 30-day
  auto-purge (MM-05).
- `fake-indexeddb` + React Testing Library test harness.

### Changed
- `tailwindcss-animate` moved to devDependencies; production audit 14 → 4 (MM-10).
- pm2 runs `dist/index.js` directly; the log path comes from `LOG_FILE` (MM-09).
- `AGENTS.md` (root, client, server) rewritten for the real app; stale planning
  docs moved to `docs/archive/`; the screenshot script fixed as `.cjs` (MM-11).

## [3.1.0] - 2026-11-12

### Refactoring audit: fixes, smaller bundle, tests and CI

### 🐛 Fixed
- **Math and code highlighting**: `rehype-sanitize` ran after KaTeX and Prism and stripped their output; it now runs before them
- **Autosave**: tracked per document. Opening a document no longer re-saves it, and switching documents inside the debounce window no longer drops the pending edit. Pending edits are flushed on tab hide and unmount
- **Keyboard shortcuts**: removed four shortcuts (Ctrl+B / I / K / Shift+P) that only swallowed the key press
- **Export**: file names are sanitized; HTML export links the KaTeX CSS of the installed version and includes token colours
- **Server**: `PORT` is honoured (default 5004); unknown paths return 404 instead of 200

### ⚡ Performance
- Entry chunk 4,779 kB → 375 kB (1,336 kB → 121 kB gzip); Monaco and the markdown pipeline load as separate chunks
- Preview rendering is debounced (150 ms)
- Hashed assets are served with `max-age=31536000, immutable`

### 🔒 Security
- The client builds into `dist/public` and only that directory is served; the server bundle and source maps are no longer downloadable
- `npm audit fix` without majors, Express 4.22.3: 20 findings (1 critical, 7 high) → 6 (none critical or high)

### 🔧 Changed
- Vite is imported only in development; dead code removed
- Added Vitest (44 tests), ESLint and a CI workflow
- `npm run build` removes `dist/` first

---

## [3.0.0] - 2026-03-15

### Visual & UX Overhaul

This release introduces a refined visual identity, startup stability improvements, and codebase hardening.

### ✨ Added
- **GitHub-Minimal Theme**: Complete visual overhaul with a clean, GitHub-inspired design language
- **Monaco Bundle Optimization**: Removed unused Monaco workers, reducing bundle size

### 🐛 Fixed
- **Startup Race Condition**: Fixed a bug where a spurious "Untitled Document" was created on every app load due to a race between IndexedDB loading and the auto-create logic. The editor now waits for the initial document load to complete before deciding whether to create a default document.

### 🔧 Changed
- **Codebase Hardening**: Removed dead code, fixed minor bugs, cleaned up dependencies
- **Version**: Bumped to 3.0.0 across package.json, About modal, and documentation

---

## [2.0.0] - 2025-11-02

### 🎉 Major Refactoring: Local-First Architecture

This release represents a complete architectural shift from a collaborative, server-dependent application to a fast, local-first markdown editor.

### ✨ Added
- **IndexedDB Storage**: All documents now stored locally in browser (via idb)
- **Local-First Architecture**: Zero server dependencies for document management
- **Split View**: Editor | Preview | Split modes with draggable resizer
- **Autosave**: Automatic saving with 500ms debounce
- **Status Bar**: Real-time word/character count, cursor position, last saved time
- **Export Options**: 
  - Export to Markdown (.md)
  - Export to self-contained HTML with inlined styles
  - Print to PDF with optimized print stylesheet
- **Keyboard Shortcuts**: Full keyboard navigation (Cmd/Ctrl+S, E, /, etc.)
- **Settings Panel**: Font size slider, word wrap toggle
- **Document Management**: Create, rename, duplicate, soft-delete with restore
- **Search**: Filter documents by title, content, or tags
- **Markdown Pipeline**: Enhanced processing with remark-gfm, rehype-katex, rehype-sanitize
- **Security Headers**: helmet.js integration with CSP

### 🔒 Security Improvements
- HTML sanitization with rehype-sanitize (XSS protection)
- Content Security Policy headers
- No eval() or dynamic code execution
- Image handling via data URLs (no external requests)
- helmet.js security headers

### 🗑️ Removed
- **Firebase Authentication**: Removed all auth dependencies
- **Firebase Admin SDK**: Server-side auth removed
- **PostgreSQL Database**: Removed Drizzle ORM and all DB code
- **WebSocket/Collaboration**: Removed real-time editing features
- **Multi-user features**: Teams, workspaces, document sharing
- **GitHub Pages deployment**: Now self-hosted only
- **Session management**: express-session, connect-pg-simple
- **Removed dependencies**: 
  - firebase, firebase-admin
  - drizzle-orm, drizzle-kit, @neondatabase/serverless, pg
  - ws (WebSocket)
  - passport, passport-local, openid-client
  - connect-pg-simple, express-session, memorystore
  - cors (no longer needed)
  - mammoth, turndown, @octokit/rest (old import/export)
  - Various unused Radix UI components

### 🔄 Changed
- **Server**: Minimal Express server for static file serving + /api/health endpoint
- **Port**: Standardized on PORT=5004
- **Build**: Simplified build process, removed gh-pages scripts
- **Documentation**: Complete rewrite for single-user, local-first usage
- **Package size**: Reduced from 538 to 536 packages

### 📝 Documentation
- New README with local-first focus
- Raspberry Pi deployment guide with Nginx configuration
- Keyboard shortcuts reference
- Privacy & security documentation
- Roadmap for future features

---

## [1.0.0] - 2024-12-06

### Added
- Initial release of MarkdownMate
- Core collaborative editing functionality
- Real-time document synchronization
- Professional startup landing page
- GitHub Pages deployment configuration
- Comprehensive documentation

### Features
- **Editor**: Monaco editor with syntax highlighting
- **Collaboration**: Real-time editing with live cursors (deprecated in 2.0)
- **Markdown**: Full GitHub Flavored Markdown support
- **UI**: Modern, responsive design with dark/light themes
- **Performance**: Optimized bundle with code splitting
- **Deployment**: Automated GitHub Pages deployment (deprecated in 2.0)
