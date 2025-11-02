# MarkdownMate

**A fast, local-first markdown editor with live preview, autosave, and GitHub-flavored markdown support.**

<div align="center">
  <img src="https://img.shields.io/badge/React-18-blue?logo=react" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-7-purple?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-blue?logo=tailwindcss" alt="Tailwind CSS" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" /></a>
</div>

---

## 📚 Table of Contents

*   [Features](#features)
*   [Tech Stack](#tech-stack)
*   [Quick Start](#quick-start)
*   [Deployment](#deployment)
*   [Keyboard Shortcuts](#keyboard-shortcuts)
*   [Export Options](#export-options)
*   [Privacy & Security](#privacy--security)
*   [Contributing](#contributing)
*   [License](#license)

---

## ✨ Features

MarkdownMate is a single-user, local-first markdown editor designed for speed and simplicity:

*   **✍️ Live Preview**: Split view with real-time markdown rendering
*   **💻 Monaco Editor**: VSCode-like editing experience with syntax highlighting
*   **📄 GitHub Flavored Markdown**: Full GFM support (tables, task lists, strikethrough, code blocks)
*   **🔢 Math Support**: KaTeX integration for beautiful mathematical formulas ($...$, $$...$$)
*   **💾 Auto-save**: Automatic saving with 500ms debounce
*   **🗄️ Local Storage**: All documents stored in browser IndexedDB - no server, no sign-up
*   **📱 Responsive UI**: Clean, modern interface that works on desktop and mobile
*   **📤 Multiple Export Formats**: Export to .md, self-contained .html, or print to PDF
*   **🎨 Theme Support**: Light/dark mode toggle
*   **⚡ Fast**: No backend dependencies, instant startup
*   **🔒 Private**: All data stays on your device
*   **⌨️ Keyboard Shortcuts**: Full keyboard navigation for power users
*   **📊 Status Bar**: Word/character count, cursor position, last saved time

---

## 🛠️ Tech Stack

**Frontend:**
- React 18
- TypeScript 5
- Vite 7
- Tailwind CSS 3
- shadcn/ui components
- Monaco Editor
- IndexedDB (via idb)

**Markdown Processing:**
- unified
- remark-gfm (GitHub Flavored Markdown)
- remark-math (Math notation)
- rehype-katex (Math rendering)
- rehype-prism-plus (Syntax highlighting)
- rehype-sanitize (XSS protection)

**Server:**
- Express (minimal static file serving)
- helmet (security headers)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/hexawulf/MarkdownMate.git
   cd MarkdownMate
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5004`

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Start production server:**
   ```bash
   npm start
   ```

---

## ☁️ Deployment

### Self-hosted on Raspberry Pi (piapps)

MarkdownMate is designed to run on a self-hosted server. Here's how to deploy it on a Raspberry Pi or similar device:

#### 1. Build the application

```bash
npm run build
```

This creates a `dist/` folder with:
- Static client files (HTML, CSS, JS)
- Compiled server file (`index.js`)

#### 2. Configure PM2 (process manager)

The included `ecosystem.config.cjs` is set up for PM2:

```javascript
module.exports = {
  apps: [{
    name: 'markdownmate',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5004
    }
  }]
};
```

Start with PM2:
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

#### 3. Nginx Reverse Proxy

Create `/etc/nginx/sites-available/markdownmate`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name markdown.piapps.dev;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name markdown.piapps.dev;

    # SSL Configuration (use certbot for Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/markdown.piapps.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/markdown.piapps.dev/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy to Node.js app
    location / {
        proxy_pass http://127.0.0.1:5004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:5004;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/markdownmate /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 4. SSL Certificate (Let's Encrypt)

```bash
sudo certbot --nginx -d markdown.piapps.dev
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save document manually |
| `Ctrl/Cmd + E` | Open export dialog |
| `Ctrl/Cmd + /` | Show keyboard shortcuts help |
| `Ctrl/Cmd + B` | Bold formatting (planned) |
| `Ctrl/Cmd + I` | Italic formatting (planned) |
| `Ctrl/Cmd + K` | Inline code (planned) |
| `Ctrl/Cmd + Shift + P` | Command palette (planned) |

---

## 📤 Export Options

### 1. Markdown (.md)
Export raw markdown file with all formatting preserved.

### 2. Self-contained HTML
Export as a single HTML file with:
- Inlined CSS styles
- Rendered markdown
- KaTeX math rendering
- Syntax-highlighted code blocks
- Ready to share or archive

### 3. Print to PDF
Use your browser's print dialog (Ctrl/Cmd + P) to export as PDF. The included print stylesheet ensures:
- Clean layout
- Proper page breaks
- Link URLs displayed in footnotes
- Optimized typography

---

## 🔒 Privacy & Security

### Data Storage
- **100% client-side**: All documents stored in browser IndexedDB
- **No server uploads**: Your markdown never leaves your device
- **No authentication**: No accounts, no tracking, no cookies
- **Offline capable**: Works without internet connection

### Security Measures
- **HTML Sanitization**: All rendered HTML is sanitized with `rehype-sanitize`
- **CSP Headers**: Content Security Policy prevents XSS attacks
- **helmet.js**: Security headers configured on server
- **No eval()**: No dynamic code execution
- **Data URLs for images**: Paste/drop images are embedded as data URLs (no external requests)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and test thoroughly
4. Commit with clear messages: `git commit -m 'feat: add X feature'`
5. Push to your fork: `git push origin feature/your-feature-name`
6. Open a Pull Request

### Development Guidelines

- Run `npm run check` before committing (TypeScript validation)
- Run `npm run build` to ensure builds succeed
- Follow existing code patterns
- Update README if adding features
- No new external dependencies without discussion

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🗺️ Roadmap

Planned features:
- [ ] Image paste/drop handler (convert to data URLs)
- [ ] TOC panel (auto-generated from headings)
- [ ] Find in preview (/ hotkey)
- [ ] Document templates (blog post, meeting notes, README)
- [ ] PWA support (offline app-shell)
- [ ] Vim mode for editor
- [ ] Front-matter metadata editor
- [ ] Mermaid diagram support
- [ ] Tags and advanced search
- [ ] Export to Gist (optional, behind feature flag)

---

<div align="center">
  <p>Made with ❤️ for markdown lovers</p>
  <p>
    <a href="https://github.com/hexawulf/MarkdownMate">⭐ Star this Repo</a> |
    <a href="https://github.com/hexawulf/MarkdownMate/issues/new">🐛 Report a Bug</a> |
    <a href="https://github.com/hexawulf/MarkdownMate/issues/new">💡 Request a Feature</a>
  </p>
</div>
