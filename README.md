# MarkdownMate

**A fast, local-first markdown editor with live preview, autosave, and GitHub-flavored markdown support.**

<div align="center">
  <img src="https://img.shields.io/badge/version-3.0.0-blue" alt="v3.0.0" />
  <img src="https://img.shields.io/badge/React-18-blue?logo=react" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-7-purple?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-blue?logo=tailwindcss" alt="Tailwind CSS" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" /></a>
</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [App Behavior](#app-behavior)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Export Options](#export-options)
- [Deployment](#deployment)
- [Privacy & Security](#privacy--security)
- [Contributing](#contributing)
- [Version History](#version-history)
- [License](#license)

---

## Overview

MarkdownMate is a single-user, local-first markdown editor designed for speed and simplicity. All documents are stored in browser IndexedDB — no accounts, no external APIs, no data leaves your device.

The editor provides a VSCode-like writing experience powered by Monaco Editor, with real-time GitHub-flavored markdown preview, KaTeX math rendering, and syntax-highlighted code blocks.

---

## Features

- **Live Preview** — Split view with real-time markdown rendering (editor-only, split, and preview-only modes)
- **Monaco Editor** — VSCode-like editing with syntax highlighting, configurable font size, and word wrap
- **GitHub Flavored Markdown** — Tables, task lists, strikethrough, and fenced code blocks via remark-gfm
- **Math Support** — KaTeX rendering for inline (`$...$`) and block (`$$...$$`) math expressions
- **Autosave** — Automatic saving to IndexedDB with 500ms debounce
- **Document Management** — Create, rename, duplicate, soft-delete, and search across documents
- **Multiple Export Formats** — Export to `.md`, self-contained `.html`, or print to PDF
- **Light/Dark Theme** — Toggle between light and dark modes
- **Status Bar** — Word count, character count, cursor position, and last-saved timestamp
- **Keyboard Shortcuts** — Save, export, and help accessible via keyboard
- **About Modal** — App info, version, resource links, and shortcuts reference
- **Resizable Panels** — Drag the split-view divider to adjust editor/preview proportions

---

## Tech Stack

**Frontend:**
- React 18 with TypeScript
- Vite 7 (dev server and production bundler)
- Tailwind CSS 3 with shadcn/ui components
- Monaco Editor (ESM bundle with local workers — no CDN)
- Zustand (state management)
- IndexedDB via `idb` (document persistence)
- wouter (client-side routing)

**Markdown Processing:**
- unified / remark-parse (markdown parsing)
- remark-gfm (GitHub Flavored Markdown)
- remark-math + rehype-katex (math rendering)
- rehype-prism-plus (syntax highlighting)
- rehype-sanitize (XSS protection)

**Server:**
- Express (static file serving in production, Vite proxy in development)
- helmet (strict Content Security Policy and security headers)
- winston (structured logging)

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
git clone https://github.com/hexawulf/MarkdownMate.git
cd MarkdownMate
npm install
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5004`. Vite handles hot module replacement.

### Production Build

```bash
npm run build
npm start
```

Builds the client with Vite and bundles the server with esbuild. The production server serves static files from `dist/`.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server (Vite + Express) |
| `npm run build` | Build client and server for production |
| `npm start` | Run production server (`dist/index.js`) |
| `npm run check` | TypeScript type-checking (`tsc`) |
| `npm run typecheck` | TypeScript type-checking (`tsc --noEmit`) |

---

## App Behavior

### Startup

On first load, MarkdownMate opens IndexedDB and loads existing documents. If no documents exist, a single "Untitled Document" is created automatically. The app waits for IndexedDB to finish loading before rendering the editor, preventing duplicate document creation on startup.

### Storage

All documents are stored in browser IndexedDB under the database `markdownmate-db`. There is no server-side storage — the Express server only serves static files and provides a `/api/health` endpoint.

Documents support:
- Title, content, tags, timestamps (created/updated)
- Soft-delete with restore capability
- Duplicate with "(Copy)" suffix

### Autosave

Content changes trigger an autosave after 500ms of inactivity. The status bar shows the last-saved timestamp and an "Unsaved" indicator when changes are pending. Manual save is available via `Ctrl+S`.

### Views

The editor supports three view modes, toggled via the toolbar:
- **Editor** — Full-width Monaco editor
- **Split** — Side-by-side editor and preview with a draggable divider
- **Preview** — Full-width rendered markdown

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save document |
| `Ctrl/Cmd + E` | Export as Markdown |
| `Ctrl/Cmd + /` | Open keyboard shortcuts dialog |

---

## Export Options

### Markdown (.md)
Exports raw markdown content as a downloadable `.md` file.

### Self-contained HTML
Exports a single HTML file with inlined CSS, rendered markdown, KaTeX math, and syntax-highlighted code blocks. Ready to share or archive.

### Print to PDF
Opens the browser print dialog. The app includes a print stylesheet optimized for clean page layout and proper breaks.

---

## Deployment

### Self-hosted with PM2

MarkdownMate is designed for self-hosting. Build and run with PM2:

```bash
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

The included `ecosystem.config.cjs` runs the production server on port 5004.

### Nginx Reverse Proxy

Example configuration for `nginx`:

```nginx
server {
    listen 443 ssl http2;
    server_name markdown.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/markdown.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/markdown.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5004;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:5004;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### SSL with Let's Encrypt

```bash
sudo certbot --nginx -d markdown.yourdomain.com
```

---

## Privacy & Security

### Data Storage
- **100% client-side** — All documents stored in browser IndexedDB
- **No server uploads** — Markdown content never leaves your device
- **No accounts** — No authentication, no tracking, no cookies
- **No analytics** — No external API calls or data collection

### Security Measures
- **HTML sanitization** via `rehype-sanitize` (XSS protection)
- **Strict CSP headers** — Content Security Policy via helmet.js blocks remote scripts, eval, and external connections
- **No CDN dependencies** — All code, fonts, and Monaco workers bundled locally
- **No `eval()`** — No dynamic code execution anywhere in the codebase
- **Data URL images** — Pasted/dropped images embedded as data URLs (no external requests)

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, code standards, and commit message conventions.

```bash
npm run check   # TypeScript validation
npm run build   # Build verification
```

---

## Version History

See [CHANGELOG.md](CHANGELOG.md) for the full release history.

| Version | Date | Highlights |
|---------|------|------------|
| **3.0.0** | 2026-03-15 | GitHub-minimal theme, startup race condition fix, Monaco bundle optimization, codebase hardening |
| **2.0.0** | 2025-11-02 | Local-first rewrite — IndexedDB storage, Monaco editor, split view, autosave, export |
| **1.0.0** | 2024-12-06 | Initial release — collaborative editing with Firebase |

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <p>Made with care for markdown lovers</p>
  <p>
    <a href="https://github.com/hexawulf/MarkdownMate">Star on GitHub</a> ·
    <a href="https://github.com/hexawulf/MarkdownMate/issues/new">Report a Bug</a> ·
    <a href="https://github.com/hexawulf/MarkdownMate/issues/new">Request a Feature</a>
  </p>
</div>
