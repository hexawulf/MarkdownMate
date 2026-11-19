import { type AddressInfo } from "net";
import { type Server } from "http";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app";

/**
 * The dev-mode CSP relaxation must FAIL CLOSED: only an exact
 * NODE_ENV === "development" may add the react-refresh preamble hash to
 * script-src; production and an unset/other value keep the strict
 * `script-src 'self'` the e2e header tests assert.
 */
async function scriptSrcFor(nodeEnv: string | undefined): Promise<string> {
  const prev = process.env.NODE_ENV;
  if (nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = nodeEnv;

  const app = createApp();
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  try {
    const port = (server.address() as AddressInfo).port;
    // Hit a route the app actually answers (200) so helmet's CSP is on the
    // response; `/` would 404 here (no static files) and carry finalhandler's
    // own CSP, not ours.
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    const csp = res.headers.get("content-security-policy") ?? "";
    // Match the script-src directive only (not script-src-attr/-elem).
    return /(?:^|;)\s*script-src\s+([^;]*)/.exec(csp)?.[1].trim() ?? "";
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (prev === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prev;
  }
}

describe("CSP script-src (dev relaxation fails closed)", () => {
  afterEach(() => {
    // Keep the test env clean regardless of the branch exercised above.
    delete process.env.NODE_ENV;
  });

  it("is strict 'self' in production", async () => {
    expect(await scriptSrcFor("production")).toBe("'self'");
  });

  it("is strict 'self' when NODE_ENV is unset (fail closed)", async () => {
    expect(await scriptSrcFor(undefined)).toBe("'self'");
  });

  it("is strict 'self' for any other NODE_ENV value", async () => {
    expect(await scriptSrcFor("staging")).toBe("'self'");
  });

  it("adds exactly the react-refresh preamble hash in development, keeping 'self'", async () => {
    const scriptSrc = await scriptSrcFor("development");
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).toContain("'sha256-");
    // No 'unsafe-inline' and no eval: the relaxation is a single pinned hash.
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });
});
