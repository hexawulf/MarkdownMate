# Changelog

All notable changes to MarkdownMate will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
