/**
 * Crawl files from the production build. Vite copies client/public into
 * dist/public, and serveStatic must return those files instead of the SPA
 * shell (which is what made /sitemap.xml a 404 HTML page).
 */

import { expect, test } from '@playwright/test'

test.describe('SEO crawl files', () => {
  test('GET /sitemap.xml is XML for the homepage, not the HTML shell', async ({ request }) => {
    const response = await request.get('/sitemap.xml')
    expect(response.status()).toBe(200)

    const type = response.headers()['content-type'] ?? ''
    expect(type).toMatch(/xml/)
    expect(type).not.toContain('text/html')

    const body = await response.text()
    expect(body).toContain('<loc>https://markdownmate.org/</loc>')
    expect(body).not.toContain('<div id="root">')
  })

  test('GET /robots.txt advertises the sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type'] ?? '').toContain('text/plain')
    expect(await response.text()).toContain('Sitemap: https://markdownmate.org/sitemap.xml')
  })

  test('GET / includes the canonical link and the existing description', async ({ request }) => {
    const response = await request.get('/')
    expect(response.status()).toBe(200)

    const html = await response.text()
    expect(html).toContain('<link rel="canonical" href="https://markdownmate.org/" />')
    expect(html).toContain(
      'A local-first Markdown editor with live preview, math and code highlighting. Your documents stay in your browser.',
    )
  })
})
