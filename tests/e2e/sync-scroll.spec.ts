/**
 * Sync-scroll e2e (#60). Drives the production build in a real browser, so it
 * exercises the actual Monaco <-> preview wiring, the source-line anchors, the
 * localStorage-backed toggle and the no-feedback-loop guarantee. These tests
 * write documents, so they are NOT tagged @live.
 */

import { expect, type Page, test } from '@playwright/test'

/** Fail the test on any uncaught page error or console error. */
function watchForProblems(page: Page): () => void {
  const problems: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console: ${m.text()}`)
  })
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  return () => expect(problems, 'no uncaught page or console errors').toEqual([])
}

async function waitForEditor(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'MarkdownMate', exact: true })).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.getByText('Loading...', { exact: true })).toBeHidden()
}

async function setEditorContent(page: Page, markdown: string): Promise<void> {
  const lines = page.locator('.monaco-editor .view-lines').first()
  await lines.click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Delete')
  await page.keyboard.insertText(markdown)
}

/** Ensure we are in Split view (it is the default, but be explicit). */
async function ensureSplit(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Split' }).click()
  await expect(page.locator('.monaco-editor').first()).toBeVisible()
  await expect(page.locator('.prose').first()).toBeAttached()
}

/** The preview's scroll container: the div wrapping .prose with overflow-y-auto. */
function previewContainer(page: Page) {
  return page.locator('div.overflow-y-auto', { has: page.locator('.prose') }).first()
}

async function previewScrollTop(page: Page): Promise<number> {
  return previewContainer(page).evaluate((el) => el.scrollTop)
}

async function editorScrollTop(page: Page): Promise<number> {
  return page.evaluate(() => {
    const node = document.querySelector('.monaco-editor .monaco-scrollable-element')
    return node ? node.scrollTop : -1
  })
}

/** Pixel offset of a preview anchor from the top of the scroll content. */
async function anchorTop(page: Page, line: number): Promise<number> {
  return page.evaluate((l) => {
    const el = document.querySelector(`.prose [data-source-line="${l}"]`) as HTMLElement | null
    const scroller = document.querySelector('div.overflow-y-auto') as HTMLElement | null
    if (!el || !scroller) return 0
    const base = scroller.getBoundingClientRect().top - scroller.scrollTop
    return el.getBoundingClientRect().top - base
  }, line)
}

/** The line number whose rendered row sits at the top edge of the editor. */
async function editorTopVisibleLine(page: Page): Promise<number> {
  return page.evaluate(() => {
    const ed = document.querySelector('.monaco-editor') as HTMLElement | null
    if (!ed) return -1
    const edTop = ed.getBoundingClientRect().top
    // Pair each gutter number with its row's vertical position, then take the
    // first row whose top is at or just below the editor's top edge. Monaco
    // renders a few buffer rows above the fold, so the plain minimum gutter
    // number would report a line that is scrolled out of view.
    const gutters = Array.from(
      document.querySelectorAll('.monaco-editor .margin-view-overlays > div'),
    ) as HTMLElement[]
    const rows: Array<{ line: number; top: number }> = []
    for (const g of gutters) {
      const num = Number(g.querySelector('.line-numbers')?.textContent ?? '')
      if (!Number.isFinite(num) || num <= 0) continue
      rows.push({ line: num, top: g.getBoundingClientRect().top })
    }
    rows.sort((a, b) => a.top - b.top)
    const visible = rows.find((r) => r.top >= edTop - 2)
    return visible ? visible.line : rows.length ? rows[0].line : -1
  })
}

/** Build a long, varied document with headings at known source lines. */
function longDoc(): { markdown: string; headingLines: Record<number, number> } {
  const lines: string[] = []
  const headingLines: Record<number, number> = {}
  const push = (s: string) => lines.push(s)

  push('# Top heading') // line 1
  push('')
  for (let h = 1; h <= 8; h += 1) {
    // Some filler before each heading.
    for (let i = 0; i < 6; i += 1) {
      push(`Filler paragraph ${h}.${i} with enough words to take vertical room.`)
      push('')
    }
    headingLines[h] = lines.length + 1 // 1-based line of the heading we push next
    push(`## Section ${h}`)
    push('')
    if (h === 2) {
      push('```js')
      for (let i = 0; i < 20; i += 1) push(`const value_${i} = ${i} * 2; // a tall code block`)
      push('```')
      push('')
    }
    if (h === 4) {
      push('| Col A | Col B | Col C |')
      push('| --- | --- | --- |')
      for (let i = 0; i < 10; i += 1) push(`| r${i}a | r${i}b | r${i}c |`)
      push('')
    }
    if (h === 6) {
      push('$$')
      push('\\int_0^1 x^2 \\, dx = \\frac{1}{3}')
      push('$$')
      push('')
    }
  }
  push('## Bottom section')
  push('')
  push('The very last paragraph of the document.')
  push('')
  return { markdown: lines.join('\n'), headingLines }
}

// ---------------------------------------------------------------------------

test('S1. editor->preview and preview->editor track by source line', async ({ page }) => {
  const assertClean = watchForProblems(page)
  await page.goto('/')
  await waitForEditor(page)
  await ensureSplit(page)

  const { markdown, headingLines } = longDoc()
  await setEditorContent(page, markdown)
  await expect(page.locator('.prose [data-source-line]').first()).toBeAttached({ timeout: 15_000 })
  await page.waitForTimeout(400)

  // Editor -> preview: scroll the editor down with the wheel, read the editor's
  // actual top visible line, and assert the matching preview anchor sits near
  // the top of the preview viewport.
  const editor = page.locator('.monaco-editor .view-lines').first()
  const ebox = await page.locator('.monaco-editor').first().boundingBox()
  if (!ebox) throw new Error('no editor box')
  await editor.click()
  await page.keyboard.press('ControlOrMeta+Home')
  await page.mouse.move(ebox.x + ebox.width / 2, ebox.y + ebox.height / 2)
  await page.mouse.wheel(0, 1400)
  await page.waitForTimeout(600)

  const container = previewContainer(page)
  const editorTop = await editorTopVisibleLine(page)
  // Find the anchor at or just below the editor's top visible line.
  const nearestAnchorLine = await page.evaluate((top) => {
    const nodes = Array.from(
      document.querySelectorAll('.prose [data-source-line]'),
    ) as HTMLElement[]
    const lines = nodes
      .map((n) => Number(n.getAttribute('data-source-line')))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b)
    return lines.find((l) => l >= top) ?? lines[lines.length - 1]
  }, editorTop)

  const anchor = page.locator(`.prose [data-source-line="${nearestAnchorLine}"]`)
  await expect(anchor).toHaveCount(1)
  const inView = await anchor.evaluate((el, c) => {
    const er = el.getBoundingClientRect()
    const cr = (c as HTMLElement).getBoundingClientRect()
    // The anchor for the editor's top visible line is within the preview
    // viewport (generous slack: block heights differ between the panes).
    return er.top >= cr.top - 160 && er.top <= cr.bottom
  }, await container.elementHandle())
  expect(
    inView,
    `anchor for editor top line ${editorTop} (anchor line ${nearestAnchorLine}) is in the preview viewport`,
  ).toBe(true)

  // Preview -> editor: scroll the preview with the mouse wheel to a mid-document
  // heading (Section 5, with enough content below it that the editor can also
  // bring that line to its top), then the editor's top visible line should be
  // within +/-2 of that heading's source line.
  const line5 = headingLines[5]
  const targetTop = await anchorTop(page, line5)
  const box = await container.boundingBox()
  if (!box) throw new Error('no preview box')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  // Wheel until the preview reaches (about) the target offset. Converge with
  // decreasing steps so we land within a few pixels, not a line or two off.
  for (let i = 0; i < 120; i += 1) {
    const cur = await previewScrollTop(page)
    const delta = targetTop - cur
    if (Math.abs(delta) <= 6) break
    const step = Math.max(40, Math.min(200, Math.abs(delta)))
    await page.mouse.wheel(0, delta > 0 ? step : -step)
    await page.waitForTimeout(35)
  }
  await page.waitForTimeout(500)

  const topLine = await editorTopVisibleLine(page)
  expect(Math.abs(topLine - line5), `editor top line ${topLine} within +/-2 of ${line5}`).toBeLessThanOrEqual(2)

  assertClean()
})

test('S2. bottom and top ends line up', async ({ page }) => {
  const assertClean = watchForProblems(page)
  await page.goto('/')
  await waitForEditor(page)
  await ensureSplit(page)

  const { markdown } = longDoc()
  await setEditorContent(page, markdown)
  await expect(page.locator('.prose [data-source-line]').first()).toBeAttached({ timeout: 15_000 })
  await page.waitForTimeout(400)

  // Move the caret to the end of the document; Monaco scrolls to the bottom.
  const editor = page.locator('.monaco-editor .view-lines').first()
  await editor.click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.waitForTimeout(600)

  const atBottom = await previewContainer(page).evaluate((el) => {
    return Math.abs(el.scrollTop - (el.scrollHeight - el.clientHeight)) <= 3
  })
  expect(atBottom, 'preview is at its max when the editor is at the bottom').toBe(true)

  // Back to the top.
  await page.keyboard.press('ControlOrMeta+Home')
  await page.waitForTimeout(600)
  expect(await previewScrollTop(page)).toBeLessThanOrEqual(3)

  assertClean()
})

test('S3. no feedback loop: positions settle after a scroll', async ({ page }) => {
  const assertClean = watchForProblems(page)
  await page.goto('/')
  await waitForEditor(page)
  await ensureSplit(page)

  const { markdown } = longDoc()
  await setEditorContent(page, markdown)
  await expect(page.locator('.prose [data-source-line]').first()).toBeAttached({ timeout: 15_000 })
  await page.waitForTimeout(400)

  const editor = page.locator('.monaco-editor .view-lines').first()
  const ebox = await page.locator('.monaco-editor').first().boundingBox()
  if (!ebox) throw new Error('no editor box')
  await editor.click()
  await page.mouse.move(ebox.x + ebox.width / 2, ebox.y + ebox.height / 2)
  await page.mouse.wheel(0, 800)
  await page.waitForTimeout(600)

  const e1 = await editorScrollTop(page)
  const p1 = await previewScrollTop(page)
  await page.waitForTimeout(600)
  const e2 = await editorScrollTop(page)
  const p2 = await previewScrollTop(page)

  expect(Math.abs(e2 - e1), 'editor scrollTop settled').toBeLessThanOrEqual(1)
  expect(Math.abs(p2 - p1), 'preview scrollTop settled').toBeLessThanOrEqual(1)

  assertClean()
})

test('S4. toggle off decouples the panes and survives a reload', async ({ page }) => {
  const assertClean = watchForProblems(page)
  await page.goto('/')
  await waitForEditor(page)
  await ensureSplit(page)

  const { markdown } = longDoc()
  await setEditorContent(page, markdown)
  await expect(page.locator('.prose [data-source-line]').first()).toBeAttached({ timeout: 15_000 })
  await page.waitForTimeout(400)

  // Turn sync scroll off via Settings.
  await page.getByRole('button', { name: 'Settings' }).click()
  const toggle = page.getByRole('menuitemcheckbox', { name: 'Sync Scroll' })
  await expect(toggle).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await toggle.click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)

  // Scroll the editor; the preview must not move.
  await previewContainer(page).evaluate((el) => {
    el.scrollTop = 0
  })
  const before = await previewScrollTop(page)
  const editor = page.locator('.monaco-editor .view-lines').first()
  const ebox = await page.locator('.monaco-editor').first().boundingBox()
  if (!ebox) throw new Error('no editor box')
  await editor.click()
  await page.mouse.move(ebox.x + ebox.width / 2, ebox.y + ebox.height / 2)
  await page.mouse.wheel(0, 1000)
  await page.waitForTimeout(500)
  expect(Math.abs((await previewScrollTop(page)) - before), 'preview unchanged while off').toBeLessThanOrEqual(2)

  // The setting persists across a reload.
  await page.reload()
  await waitForEditor(page)
  await ensureSplit(page)
  await page.getByRole('button', { name: 'Settings' }).click()
  const toggle2 = page.getByRole('menuitemcheckbox', { name: 'Sync Scroll' })
  await expect(toggle2).toHaveAttribute('aria-checked', 'false')

  // Toggle back on: the hook re-attaches (no error); close the menu.
  await toggle2.click()
  await expect(toggle2).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)

  assertClean()
})

test('S5. Monaco is not remounted: undo survives Editor->Split->Preview->Split', async ({ page }) => {
  const assertClean = watchForProblems(page)
  await page.goto('/')
  await waitForEditor(page)
  await ensureSplit(page)

  const marker = `undo ${Date.now()}`
  await setEditorContent(page, `# ${marker}\n\nfirst line\n`)
  await page.waitForTimeout(200)
  // Type an extra word that a single undo should remove.
  const lines = page.locator('.monaco-editor .view-lines').first()
  await lines.click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.insertText('EXTRA_TOKEN')
  await expect(page.locator('.monaco-editor').first()).toContainText('EXTRA_TOKEN')

  // Switch across all three views and back.
  await page.getByRole('button', { name: 'Editor', exact: true }).click()
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await page.getByRole('button', { name: 'Split' }).click()

  // Undo should still know about EXTRA_TOKEN (same Monaco instance / history).
  await lines.click()
  await page.keyboard.press('ControlOrMeta+Z')
  await expect(page.locator('.monaco-editor').first()).not.toContainText('EXTRA_TOKEN')
  await expect(page.locator('.monaco-editor').first()).toContainText(marker)

  assertClean()
})
