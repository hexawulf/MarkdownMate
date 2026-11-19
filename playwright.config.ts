import { defineConfig, devices } from '@playwright/test'

/**
 * One headless-Chromium smoke test, run against the **production build** —
 * `node dist/index.js` with `NODE_ENV=production`, not the Vite dev server.
 * That matters: helmet's CSP and the security/cache headers only exist on the
 * production server, so a CSP mistake (for example dropping `https:` from
 * `img-src`, which would stop every remote image rendering) must fail this
 * suite rather than pass silently against a permissive dev server.
 *
 * `MARKDOWNMATE_BASE_URL` points the same suite at an already-running server
 * (for the `@live` tests against https://markdownmate.org) and turns off the
 * local `webServer`, the same pattern py-scratchpad uses.
 */
const PORT = 5098

const BASE_URL = process.env.MARKDOWNMATE_BASE_URL ?? `http://127.0.0.1:${String(PORT)}`
const OWN_SERVER = process.env.MARKDOWNMATE_BASE_URL === undefined

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: process.env.CI !== undefined,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI === undefined ? 'list' : [['github'], ['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  ...(OWN_SERVER
    ? {
        webServer: {
          // Build is a CI step of its own; here we only (re)build if dist is
          // missing, then start the real production server on the spare port.
          command: `npm run build --silent 2>/dev/null; NODE_ENV=production PORT=${String(PORT)} node dist/index.js`,
          url: `${BASE_URL}/api/health`,
          reuseExistingServer: process.env.CI === undefined,
          timeout: 180_000,
          // The server's Winston logger defaults LOG_FILE to /home/zk/logs,
          // which is this homelab host's path and is not writable on a CI
          // runner (EACCES on mkdir). Point it at a writable, gitignored path so
          // the production server starts the same way everywhere. This only
          // moves the log file; it does not change server behaviour.
          env: { LOG_FILE: 'test-results/markdownmate-e2e.log' },
        },
      }
    : {}),
})
