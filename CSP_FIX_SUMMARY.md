# CSP and Prism CSS Fix Summary

## Issues Fixed

### 1. CSP Font Violation
**Original Error:**
```
Refused to load the font 'data:font/woff2;base64,...' because it violates the 
Content Security Policy directive: "font-src 'self' https://fonts.gstatic.com 
https://fonts.googleapis.com https://cdn.jsdelivr.net".
```

**Root Cause:** CSP `font-src` didn't include `data:` for data URI fonts (used by KaTeX)

**Fix:** Updated CSP to allow `data:` fonts while removing all external CDN domains

### 2. Prism CSS Module Resolution
**Original Error:**
```
Uncaught TypeError: failed to resolve module "prismjs/themes/prism-tomorrow.css". 
Relative references must start with "/", "./", or "../".
```

**Root Cause:** `prismjs` package was not installed as a dependency, so the CSS import failed at runtime

**Fix:** Installed `prismjs` as a dependency so Vite can properly bundle the CSS theme

## Changes Made

### A) Server CSP Configuration (`server/index.ts`)

**Before:**
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      workerSrc: ["'self'", "blob:"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net"]
    }
  }
}));
```

**After:**
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],                    // no remote scripts, no eval
      styleSrc: ["'self'", "'unsafe-inline'"],  // allow inline for Monaco/print CSS
      imgSrc: ["'self'", "data:", "blob:"],     // allow data URLs for images
      fontSrc: ["'self'", "data:"],             // allow data URLs for fonts ✅
      connectSrc: ["'self'"],                   // no external connections
      workerSrc: ["'self'", "blob:"],           // Monaco workers
      childSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,  // Monaco compatibility
  crossOriginResourcePolicy: { policy: "same-origin" }
}));
```

**Key Security Improvements:**
- ✅ Removed `'unsafe-eval'` from `scriptSrc` (more secure)
- ✅ Removed all external CDN domains (Google Fonts, jsDelivr)
- ✅ Added `data:` to `fontSrc` (fixes KaTeX fonts)
- ✅ Added strict `childSrc`, `objectSrc`, `baseUri`, `frameAncestors`
- ✅ Enabled `useDefaults: true` for additional helmet defaults
- ✅ Added CORS policies for better security

### B) Prism CSS Dependency (`package.json`)

**Added:**
```json
"prismjs": "^1.30.0"
```

This allows the import in `client/src/modules/editor/PreviewPane.tsx`:
```typescript
import 'prismjs/themes/prism-tomorrow.css';
```

To be properly resolved and bundled by Vite during build.

## Verification Results

### ✅ Build Output
- CSS bundle: 144.36 KB (includes Prism theme)
- No build errors
- Prism CSS properly bundled with other styles

### ✅ CSP Headers (Production)
```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self' data:;
  connect-src 'self';
  worker-src 'self' blob:;
  child-src 'none';
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'none';
  form-action 'self';
  script-src-attr 'none';
  upgrade-insecure-requests
```

### ✅ No External References
- No Google Fonts links in HTML
- No jsDelivr references
- No external CDN calls
- All assets bundled locally

### ✅ Server Startup
```bash
npm start
# Server starts on PORT=5004
# /api/health returns 200 OK
```

## Testing Checklist

### Manual Browser Tests (https://markdown.piapps.dev)

- [ ] Reload page → No CSP console errors
- [ ] DevTools → Network → First load shows only self-hosted assets (no external requests)
- [ ] Create markdown with code fence → Syntax highlighting works with Prism Tomorrow theme
- [ ] Create markdown with math ($E=mc^2$) → KaTeX fonts load without CSP violations
- [ ] Check CSP header in DevTools → Network → Headers → Response Headers
- [ ] Monaco editor loads → No worker-src violations
- [ ] Theme toggle works → Inline styles don't trigger CSP violations
- [ ] Print preview → Print styles work without CSP errors

### Production Environment
```bash
# On piapps server
cd /path/to/MarkdownMate
git pull
npm install
npm run build
pm2 restart markdownmate
pm2 logs markdownmate --lines 50
```

### Console Check
Open DevTools Console - should see:
- ✅ NO "Refused to load" CSP errors
- ✅ NO "failed to resolve module" errors
- ✅ NO external network requests to googleapis.com, jsdelivr.net, etc.

## Security Posture

### Strengths
✅ **Strict CSP** - Only local assets allowed
✅ **No eval** - `scriptSrc` doesn't include `'unsafe-eval'`
✅ **No external scripts** - All JavaScript bundled locally
✅ **No external fonts** - System font stack + bundled KaTeX fonts
✅ **Frame protection** - `frame-ancestors 'none'` prevents embedding
✅ **CORS policies** - Proper origin restrictions

### Allowed Exceptions (Necessary)
- `'unsafe-inline'` in `styleSrc` - Required for Monaco editor and print CSS
- `blob:` in `workerSrc` - Required for Monaco web workers
- `data:` in `fontSrc` - Required for KaTeX embedded fonts
- `data:` + `blob:` in `imgSrc` - Required for pasted images (future feature)

### Attack Surface Reduced
- ❌ No remote script injection possible
- ❌ No external data exfiltration via fonts/images
- ❌ No third-party tracking scripts
- ❌ No CDN supply chain attacks
- ❌ No XSS via eval()

## Files Changed

```
M  server/index.ts           # CSP configuration
M  package.json              # Added prismjs dependency
M  package-lock.json         # Lockfile update
```

## Rollback Instructions

If issues arise in production:

```bash
# Revert to previous version
git revert HEAD
npm install
npm run build
pm2 restart markdownmate
```

Or temporarily loosen CSP by adding back external domains:
```typescript
fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
```

## Related Documentation

- [Helmet.js CSP Docs](https://helmetjs.github.io/#content-security-policy)
- [MDN CSP Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Prism.js Themes](https://prismjs.com/)
- [KaTeX Fonts](https://katex.org/docs/font.html)
