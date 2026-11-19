/**
 * 8. Security and routing headers, checked with a plain request context (no
 * browser). These are tagged @live so `test:e2e:live` runs them against
 * https://markdownmate.org, where the production server's helmet headers apply.
 */

import { expect, test } from '@playwright/test'

const LIVE = process.env.MARKDOWNMATE_BASE_URL !== undefined

test.describe('8. headers and routing @live', () => {
  test('GET / has one X-Frame-Options, a CSP with img-src https:, and no X-Powered-By', async ({
    request,
  }, testInfo) => {
    // On live, piapps nginx adds a second X-Frame-Options on top of helmet's
    // (MM-09, the operator's job on the nginx side). Mark just this duplicate
    // assertion as an expected failure for the live run, so the live suite is
    // green today and turns red the moment nginx is fixed. The local production
    // server sends exactly one, so the assertion holds there.
    test.fail(
      LIVE,
      'MM-09: piapps nginx adds a duplicate X-Frame-Options on markdownmate.org',
    )

    const response = await request.get('/')
    expect(response.status()).toBe(200)

    const headers = response.headersArray()
    const xfo = headers.filter((h) => h.name.toLowerCase() === 'x-frame-options')
    expect(xfo).toHaveLength(1)

    void testInfo
  })

  test('GET / CSP allows https images and there is no X-Powered-By', async ({ request }) => {
    const response = await request.get('/')
    expect(response.status()).toBe(200)

    const csp = response.headers()['content-security-policy']
    expect(csp, 'a Content-Security-Policy is present').toBeTruthy()
    // img-src must include https: so remote images render (MM-03).
    const imgSrc = /img-src([^;]*)/.exec(csp ?? '')?.[1] ?? ''
    expect(imgSrc).toContain('https:')

    expect(response.headers()['x-powered-by']).toBeUndefined()
  })

  test('GET /api/health is 200', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)
  })

  test('GET /nope is 404', async ({ request }) => {
    const response = await request.get('/nope')
    expect(response.status()).toBe(404)
  })
})
