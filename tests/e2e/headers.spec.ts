/**
 * 8. Security and routing headers, checked with a plain request context (no
 * browser). These are tagged @live so `test:e2e:live` runs them against
 * https://markdownmate.org, where the production server's helmet headers apply.
 */

import { expect, test } from '@playwright/test'

test.describe('8. headers and routing @live', () => {
  test('GET / sends each security header exactly once, a CSP with img-src https:, and no X-Powered-By', async ({
    request,
  }) => {
    // The app (helmet) owns these headers. Until 3.3.1 the piapps nginx vhost
    // added its own copies (MM-09), so live responses carried two of each and
    // a conflicting X-XSS-Protection. This guards against that coming back.
    const response = await request.get('/')
    expect(response.status()).toBe(200)

    const headers = response.headersArray()
    for (const name of ['x-frame-options', 'x-content-type-options', 'x-xss-protection']) {
      const values = headers.filter((h) => h.name.toLowerCase() === name)
      expect(values, `exactly one ${name}`).toHaveLength(1)
    }
    expect(response.headers()['x-xss-protection']).toBe('0')
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
