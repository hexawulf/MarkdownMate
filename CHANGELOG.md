# Changelog

All notable changes to MarkdownMate will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
