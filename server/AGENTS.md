# AGENTS.md - Server

A tiny Express server. It **only** serves the built client and a health check.
There is no REST API for documents, no database, no auth and no WebSockets —
all documents live in the browser's IndexedDB.

## Run

```bash
npm run dev     # tsx server/index.ts (Vite middleware in dev)
npm run build   # esbuild bundles server/index.ts -> dist/index.js
npm start       # NODE_ENV=production node dist/index.js  (port 5004)
npm run check   # tsc
```

## Files

```
server/
  app.ts            # createApp(): helmet CSP, optional /api request log, GET /api/health;
                    # attachErrorHandler()
  static.ts         # serveStatic(): production static files + SPA fallback + 404s
  vite.ts           # setupVite(): dev-only Vite middleware; log()
  index.ts          # wires dev vs prod, then listens (PORT, default 5004)
  src/logger/       # Winston logger; path from LOG_FILE (default /home/zk/logs/markdownmate.log)
```

## Conventions

- `createApp()` builds the app without listening, so it is unit-testable; see
  `server/static.test.ts` (fetches the built server, checks routes, CSP and
  cache headers).
- The CSP (in `app.ts`) is strict and local-first. `img-src` allows `https:` so
  remote images render; `http:` stays blocked. A dev-only `script-src` sha256
  hash (the vite react-refresh preamble) is added **only** when
  `NODE_ENV === 'development'` and fails closed to strict `script-src 'self'`
  otherwise (`server/app.test.ts` guards this). Change it only with a reason.
- Routes: `GET /api/health` returns `{ status: "ok" }`. Unknown non-asset paths
  fall back to the SPA; unknown API paths return a JSON 404.
- Production is started by pm2 from `ecosystem.config.cjs`, which runs
  `dist/index.js` directly (not `npm start`) with `PORT=5004` and `LOG_FILE`.

## Pre-PR checks

```bash
npm run check && npm run build && npm test
```

The Playwright e2e suite (`npm run test:e2e`, in `tests/e2e/`) starts this
server's production build and asserts the headers it sends (one
`X-Frame-Options`, a CSP whose `img-src` includes `https:`, no `X-Powered-By`),
so a CSP or header change here must keep that suite green.
