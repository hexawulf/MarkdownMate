/**
 * MarkdownMate browser smoke test.
 *
 * It drives the real production build (`node dist/index.js`) through a browser,
 * so it covers the parts no unit test can: that the app renders under helmet's
 * CSP, that the unified + KaTeX + Prism pipeline produces real math and
 * highlighted code, that IndexedDB persistence and the trash survive a reload,
 * that the zip backup round-trips, that two tabs stay in sync over a
 * BroadcastChannel, and that the v3.2.0 "stuck upgrade" bug stays fixed.
 *
 * IndexedDB, BroadcastChannel and the CSP are never mocked — they are the
 * things these tests exist to prove.
 *
 * Tests 1 and 2 are tagged @live so `test:e2e:live` can run them (read-only)
 * against https://markdownmate.org. The header checks live in headers.spec.ts.
 */

import { expect, type Page, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Read the shipped version from package.json so the About-modal assertion
// tracks the real release without being hardcoded here.
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8'),
) as { version: string }
const APP_VERSION = pkg.version

const LIVE = process.env.MARKDOWNMATE_BASE_URL !== undefined

/**
 * Attach a collector that fails the test on any uncaught page error or console
 * error. Returns a function that asserts nothing slipped through; pass a list
 * of substrings for messages that are known and explained.
 */
function watchForProblems(page: Page, allow: RegExp[] = []): () => void {
  // On live (markdownmate.org, behind Cloudflare), Cloudflare injects its
  // analytics beacon (static.cloudflareinsights.com/beacon.min.js) at the edge.
  // The app's strict `script-src 'self'` CSP correctly blocks it, which logs a
  // CSP-violation console error on every live page. That is an edge artifact,
  // not an app defect — the CSP is doing its job — so it is allowed for the
  // @live run only. The local production server never serves it, so the local
  // run stays strict and would still catch a real CSP break.
  const allowList = LIVE
    ? [...allow, /cloudflareinsights\.com\/beacon(\.min)?\.js/i]
    : allow
  const problems: string[] = []
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (allowList.some((re) => re.test(text))) return
    problems.push(`console: ${text}`)
  })
  page.on('pageerror', (error) => {
    if (allowList.some((re) => re.test(error.message))) return
    problems.push(`pageerror: ${error.message}`)
  })
  return () => expect(problems, 'no uncaught page or console errors').toEqual([])
}

/** Wait for the editor shell, i.e. not the "Loading…" screen. */
async function waitForEditor(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'MarkdownMate', exact: true })).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.getByText('Loading...', { exact: true })).toBeHidden()
}

/**
 * Replace the whole editor buffer with `markdown`. `insertText` is used, not
 * key-by-key typing: Monaco auto-indents and auto-closes, so typed multi-line
 * Markdown (fenced code, `$$` blocks) would not come out as written.
 */
async function setEditorContent(page: Page, markdown: string): Promise<void> {
  const lines = page.locator('.monaco-editor .view-lines').first()
  await lines.click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Delete')
  await page.keyboard.insertText(markdown)
}

/**
 * Open the per-row "more actions" menu for the sidebar document whose row
 * matches `title`, and click the `item` menuitem. The trigger button is
 * `opacity-0` until the row is hovered, so hover first; the Radix menu renders
 * in a portal, so the menuitem is queried on the page, not inside the row. The
 * returned menuitem click auto-waits for the menu to be open and actionable.
 */
async function openRowMenu(page: Page, title: string, item: 'Rename' | 'Delete'): Promise<void> {
  const row = page.locator('.group', { hasText: title }).first()
  await row.scrollIntoViewIfNeeded()
  await row.hover()
  // The trigger is the row's only button (MoreVertical). Wait for it rather
  // than force-clicking, so a half-rendered row cannot swallow the click.
  const trigger = row.getByRole('button')
  await trigger.click()
  await page.getByRole('menuitem', { name: item, exact: true }).click()
  // The Radix menu closes on selection; wait for it to go so its portal overlay
  // cannot intercept the next pointer action (this was the cause of a hang).
  await expect(page.getByRole('menu')).toHaveCount(0)
}

/**
 * Rename the first visible sidebar document whose row matches `fromTitle` to
 * `toTitle`. The sidebar lists documents by title, so a unique title is how a
 * test tells one document from another. The rename input blurs-to-save, so the
 * value is set and committed with Enter in one keyboard flow to avoid the input
 * detaching mid-action.
 */
async function renameFirstDoc(page: Page, fromTitle: string, toTitle: string): Promise<void> {
  await openRowMenu(page, fromTitle, 'Rename')
  const input = page.locator('.group input').first()
  // fill sets the value atomically; key-by-key typing drops characters because
  // the rename input blurs-to-save and re-renders on each keystroke. Commit with
  // the keyboard (not input.press) because fill may already blur-commit and
  // detach the input before a locator-based press resolves.
  await input.fill(toTitle)
  await page.keyboard.press('Enter')
  await expect(page.locator('.group', { hasText: toTitle }).first()).toBeVisible()
}

/** Soft-delete the first sidebar document whose row matches `title`. */
async function deleteFirstDoc(page: Page, title: string): Promise<void> {
  await openRowMenu(page, title, 'Delete')
  // The confirm dialog (Radix AlertDialog) then asks to confirm.
  const confirm = page.getByRole('alertdialog')
  await expect(confirm).toBeVisible()
  await confirm.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(confirm).toBeHidden()
}

// ---------------------------------------------------------------------------
// 1. Loads (@live)
// ---------------------------------------------------------------------------

test('1. loads the editor, not "Loading…", and About shows the version @live', async ({ page }) => {
  const assertClean = watchForProblems(page)

  await page.goto('/')
  await waitForEditor(page)

  // One Monaco instance and one preview are present on a clean load.
  await expect(page.locator('.monaco-editor').first()).toBeVisible()
  await expect(page.locator('.prose').first()).toBeAttached()

  // The About modal shows the version from package.json.
  await page.getByRole('button', { name: 'About' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(`v${APP_VERSION}`).first()).toBeVisible()

  assertClean()
})

// ---------------------------------------------------------------------------
// 2. Render (@live)
// ---------------------------------------------------------------------------

test('2. renders heading, table, task list, highlighted code, math and a remote https image @live', async ({
  page,
}) => {
  const assertClean = watchForProblems(page)

  // Deterministic https image: intercept a fixed https URL and fulfil it with a
  // 1x1 PNG locally. That exercises the CSP's `img-src https:` rule without
  // depending on a flaky third-party host. Against live (no routing) use the
  // project's own screenshot on raw.githubusercontent.com, which is stable.
  const PIXEL = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )
  const imageUrl = LIVE
    ? 'https://raw.githubusercontent.com/hexawulf/MarkdownMate/main/docs/screenshots/editor-interface.png'
    : 'https://example.invalid/pixel.png'
  if (!LIVE) {
    await page.route(imageUrl, (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
    )
  }

  await page.goto('/')
  await waitForEditor(page)

  const markdown = [
    '# Heading One',
    '',
    '| A | B |',
    '| --- | --- |',
    '| 1 | 2 |',
    '',
    '- [ ] a todo',
    '- [x] a done item',
    '',
    '```js',
    'const answer = 42;',
    '```',
    '',
    'Inline math $a^2 + b^2 = c^2$ in a sentence.',
    '',
    '$$',
    '\\int_0^1 x\\,dx',
    '$$',
    '',
    `![an image](${imageUrl})`,
    '',
  ].join('\n')
  await setEditorContent(page, markdown)

  const preview = page.locator('.prose').first()
  await expect(preview.locator('h1', { hasText: 'Heading One' })).toBeVisible()
  await expect(preview.locator('table')).toBeVisible()
  await expect(preview.locator('input[type="checkbox"]')).toHaveCount(2)

  // Prism wraps tokens in spans with a `token` class inside the code block.
  await expect(preview.locator('pre code .token').first()).toBeVisible()

  // Inline and block KaTeX, with no missing-font console error (checked at the end).
  await expect(preview.locator('.katex')).toHaveCount(2)
  await expect(preview.locator('.katex-display')).toHaveCount(1)

  // The remote https image is allowed by the CSP and actually loads.
  const img = preview.locator('img')
  await expect(img).toHaveCount(1)
  await expect
    .poll(async () => img.first().evaluate((el: HTMLImageElement) => el.naturalWidth), {
      timeout: 15_000,
    })
    .toBeGreaterThan(0)

  assertClean()
})

// ---------------------------------------------------------------------------
// Local-only behaviour tests (not @live: they write documents).
// ---------------------------------------------------------------------------

test('3. a document survives autosave and a reload', async ({ page }) => {
  const assertClean = watchForProblems(page)
  await page.goto('/')
  await waitForEditor(page)

  const marker = `persist ${Date.now()}`
  await setEditorContent(page, `# ${marker}\n\nbody text\n`)

  // Wait past the 500 ms autosave debounce and let the write land.
  await page.waitForTimeout(1200)
  await page.reload()
  await waitForEditor(page)

  await expect(page.locator('.prose').first().locator('h1', { hasText: marker })).toBeVisible()
  assertClean()
})

test('4. delete to trash, restore, delete again, empty trash', async ({ page }) => {
  const assertClean = watchForProblems(page)
  await page.goto('/')
  await waitForEditor(page)

  // Give the current document a recognisable title (the sidebar lists by title).
  const title = `trash ${Date.now()}`
  await renameFirstDoc(page, 'Untitled Document', title)

  // Delete it (soft delete -> trash).
  await deleteFirstDoc(page, title)

  // Open the trash: it is there.
  await page.getByRole('button', { name: 'Open trash' }).click()
  const trashDialog = page.getByRole('dialog', { name: 'Trash' })
  await expect(trashDialog).toBeVisible()
  await expect(trashDialog.getByText(title)).toBeVisible()

  // Restore it.
  await trashDialog.getByRole('button', { name: 'Restore' }).first().click()
  await expect(trashDialog.getByText(title)).toBeHidden()
  await page.keyboard.press('Escape')
  // Wait for the dialog's portal overlay to be gone before touching the sidebar
  // again, otherwise the overlay intercepts the next hover/click.
  await expect(trashDialog).toBeHidden()
  await expect(page.locator('.group', { hasText: title }).first()).toBeVisible()

  // Delete again, then empty the trash.
  await deleteFirstDoc(page, title)
  await page.getByRole('button', { name: 'Open trash' }).click()
  await expect(trashDialog.getByText(title)).toBeVisible()
  await trashDialog.getByRole('button', { name: 'Empty trash' }).click()
  await expect(trashDialog.getByText('Trash is empty')).toBeVisible()

  assertClean()
})

test('5. export a zip backup, import it into a fresh context, the document comes back', async ({
  page,
  browser,
}) => {
  const assertClean = watchForProblems(page)
  await page.goto('/')
  await waitForEditor(page)

  // A unique title is how the document is recognised after import (the sidebar
  // and the backup manifest both key on the title).
  const marker = `backup ${Date.now()}`
  await renameFirstDoc(page, 'Untitled Document', marker)
  await setEditorContent(page, `# ${marker}\n\nbackup body\n`)
  await page.waitForTimeout(1200)

  // Export all -> a .zip download.
  await page.getByRole('button', { name: 'Export' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Export all (.zip backup)' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.zip$/)
  const path = await download.path()
  expect(path).toBeTruthy()
  const bytes = readFileSync(path)
  expect(bytes.byteLength).toBeGreaterThan(0)
  // A zip starts with the local-file-header magic "PK\x03\x04".
  expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK')

  // Fresh context = a different IndexedDB. The document is not there yet.
  const fresh = await browser.newContext()
  const freshPage = await fresh.newPage()
  const assertFreshClean = watchForProblems(freshPage)
  await freshPage.goto('/')
  await waitForEditor(freshPage)
  await expect(freshPage.locator('.group', { hasText: marker })).toHaveCount(0)

  // Import the zip. The browser's import reads the file name's extension, so
  // give the picked file a real .zip name (the download's temp path has none).
  await freshPage.getByRole('button', { name: 'Export' }).click()
  const fileChooserPromise = freshPage.waitForEvent('filechooser')
  await freshPage.getByRole('menuitem', { name: 'Import (.md or .zip)' }).click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles({
    name: 'markdownmate-backup.zip',
    mimeType: 'application/zip',
    buffer: bytes,
  })

  // The imported document comes back in the list, by its title.
  await expect(freshPage.locator('.group', { hasText: marker }).first()).toBeVisible({
    timeout: 15_000,
  })

  assertFreshClean()
  await fresh.close()
  assertClean()
})

test('6. a document created in tab A appears in tab B without a reload', async ({
  page,
  context,
}) => {
  const assertClean = watchForProblems(page)
  await page.goto('/')
  await waitForEditor(page)

  const tabB = await context.newPage()
  await tabB.goto('/')
  await waitForEditor(tabB)

  // Create a uniquely titled document in tab A. Creating and titling it both
  // broadcast an update other tabs pick up.
  const title = `sync ${Date.now()}`
  await page.getByRole('button', { name: 'New', exact: true }).click()
  await renameFirstDoc(page, 'Untitled Document', title)

  // Tab B sees it without reloading (BroadcastChannel -> store refresh).
  await expect(tabB.locator('.group', { hasText: title }).first()).toBeVisible({ timeout: 15_000 })

  assertClean()
  await tabB.close()
})

// ---------------------------------------------------------------------------
// 7. Stuck-upgrade regression (the v3.2.0 bug)
// ---------------------------------------------------------------------------

test('7. an old v1 tab blocks the upgrade with a message, not an endless Loading…', async ({
  context,
  baseURL,
}) => {
  // Tab A must hold a v1 connection WITHOUT the app running (the app would open
  // a v2 connection and, on a version change, reload itself and destroy the
  // seeding context). So serve tab A a bare HTML page on the same origin with
  // no app scripts: it can use IndexedDB but runs none of the app code.
  const tabA = await context.newPage()
  await tabA.route(`${baseURL}/`, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>seed</title>' }),
  )
  await tabA.goto('/')

  // Open markdownmate-db at version 1 with the exact v1 schema (including the
  // by-isDeleted index v3.1.0 shipped) and one document, then keep the
  // connection open with no onversionchange handler, like v3.1.0 did.
  const seededVersion = await tabA.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const del = indexedDB.deleteDatabase('markdownmate-db')
      del.onsuccess = () => resolve()
      del.onerror = () => resolve()
      del.onblocked = () => resolve()
    })
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('markdownmate-db', 1)
      req.onupgradeneeded = () => {
        const store = req.result.createObjectStore('documents', { keyPath: 'id' })
        store.createIndex('by-updatedAt', 'updatedAt')
        store.createIndex('by-createdAt', 'createdAt')
        store.createIndex('by-isDeleted', 'isDeleted')
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const now = Date.now()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('documents', 'readwrite')
      tx.objectStore('documents').put({
        id: 'v1-doc',
        title: 'From v1',
        content: 'precious v1 content',
        createdAt: now,
        updatedAt: now,
        tags: [],
        isDeleted: false,
      })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    // Keep the connection open with no onversionchange handler — the exact
    // v3.1.0 behaviour that blocks the v2 upgrade.
    ;(window as unknown as { __oldDb: IDBDatabase }).__oldDb = db
    return db.version
  })
  expect(seededVersion).toBe(1)

  // Tab B: open the real app. The v2 upgrade is blocked by tab A's open v1
  // connection, so the app must show the "close every other tab" message, not
  // hang on "Loading…".
  const tabB = await context.newPage()
  await tabB.goto('/')
  await expect(tabB.getByText('MarkdownMate was updated.', { exact: false })).toBeVisible({
    timeout: 20_000,
  })
  await expect(tabB.getByText('Loading...', { exact: true })).toBeHidden()

  // Close tab A's connection (the user closes the old tab).
  await tabA.evaluate(() => {
    ;(window as unknown as { __oldDb: IDBDatabase }).__oldDb.close()
  })
  await tabA.close()

  // Tab B finishes the upgrade by itself and shows the app with the v1 document.
  await waitForEditor(tabB)
  await expect(tabB.locator('.group', { hasText: 'From v1' }).first()).toBeVisible({
    timeout: 20_000,
  })
  await expect(tabB.locator('.prose').first().getByText('precious v1 content')).toBeVisible()

  // The database ended up at version 2.
  const finalVersion = await tabB.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const req = indexedDB.open('markdownmate-db')
        req.onsuccess = () => {
          const v = req.result.version
          req.result.close()
          resolve(v)
        }
        req.onerror = () => reject(req.error)
      }),
  )
  expect(finalVersion).toBe(2)

  await tabB.close()
})

// ---------------------------------------------------------------------------
// 9. Mobile width
// ---------------------------------------------------------------------------

test('9. the editor and view toggle are usable at 390x844', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  const assertClean = watchForProblems(page)

  await page.goto('/')
  await waitForEditor(page)

  // The editor and the view toggle are present and usable at mobile width.
  await expect(page.locator('.monaco-editor').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Split' })).toBeVisible()
  await page.getByRole('button', { name: 'Editor', exact: true }).click()
  await page.getByRole('button', { name: 'Preview', exact: true }).click()

  assertClean()
  await ctx.close()
})

test('9b. no horizontal scroll at 390x844', async ({ browser }) => {
  // MM-12 (new this round): the sidebar is a fixed 256px (`w-64 flex-shrink-0`)
  // and does not collapse, so at 390px the layout is ~161px wider than the
  // viewport. Marked as an expected failure so the suite stays green today and
  // turns red the moment the layout is made responsive — the same pattern the
  // X-Frame-Options check uses for MM-09.
  test.fail(true, 'MM-12: fixed 256px sidebar overflows at 390px width')

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await page.goto('/')
  await waitForEditor(page)

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)

  await ctx.close()
})
