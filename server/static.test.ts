import fs from "fs";
import os from "os";
import path from "path";
import { type AddressInfo } from "net";
import { type Server } from "http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { attachErrorHandler, createApp } from "./app";
import { CLIENT_ROUTES, serveStatic } from "./static";

const SHELL = "<!DOCTYPE html><html><body><div id=\"root\"></div></body></html>";

let tmpDir: string;
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  // Same layout as a real build: dist/index.js (server) next to dist/public (client).
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "markdownmate-static-"));
  const publicDir = path.join(tmpDir, "public");
  fs.mkdirSync(path.join(publicDir, "assets"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, "index.js"), "// server bundle, must never be served");
  fs.writeFileSync(path.join(publicDir, "index.html"), SHELL);
  fs.writeFileSync(path.join(publicDir, "assets", "index-abc123.js"), "console.log('app')");
  fs.writeFileSync(path.join(publicDir, "robots.txt"), "User-agent: *\nAllow: /\n\nSitemap: https://markdownmate.org/sitemap.xml\n");
  fs.writeFileSync(
    path.join(publicDir, "sitemap.xml"),
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://markdownmate.org/</loc>\n  </url>\n</urlset>\n',
  );

  const app = createApp();
  serveStatic(app, publicDir);
  attachErrorHandler(app);

  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("production static server", () => {
  it("answers the health check", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok", service: "MarkdownMate" });
  });

  it("serves the app shell with 200 on every client route", async () => {
    for (const route of [...CLIENT_ROUTES, "/editor/", "/?utm=x"]) {
      const res = await fetch(`${baseUrl}${route}`);
      expect(res.status, route).toBe(200);
      expect(res.headers.get("content-type"), route).toContain("text/html");
      expect(await res.text(), route).toBe(SHELL);
    }
  });

  it("serves the app shell with 404 on unknown paths", async () => {
    for (const route of ["/nonexistent-page", "/.ssh/id_rsa", "/wp-admin/setup-config.php"]) {
      const res = await fetch(`${baseUrl}${route}`);
      expect(res.status, route).toBe(404);
      expect(await res.text(), route).toBe(SHELL);
    }
  });

  it("serves built assets and other public files", async () => {
    const asset = await fetch(`${baseUrl}/assets/index-abc123.js`);
    expect(asset.status).toBe(200);
    expect(await asset.text()).toBe("console.log('app')");

    const robots = await fetch(`${baseUrl}/robots.txt`);
    expect(robots.status).toBe(200);
    expect(robots.headers.get("content-type")).toContain("text/plain");

    // A missing sitemap used to fall through to the SPA shell (404 HTML).
    const sitemap = await fetch(`${baseUrl}/sitemap.xml`);
    expect(sitemap.status).toBe(200);
    expect(sitemap.headers.get("content-type")).toMatch(/xml/);
    expect(sitemap.headers.get("content-type")).not.toContain("html");
    const sitemapBody = await sitemap.text();
    expect(sitemapBody).toContain("<loc>https://markdownmate.org/</loc>");
    expect(sitemapBody).not.toContain('id="root"');
  });

  it("answers a missing asset with a plain 404 instead of the HTML shell", async () => {
    const res = await fetch(`${baseUrl}/assets/index-oldhash.js`);
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("text/plain");
  });

  it("never serves the server bundle that sits next to the public directory", async () => {
    for (const route of ["/index.js", "/../index.js", "/assets/../../index.js"]) {
      const res = await fetch(`${baseUrl}${route}`);
      expect(await res.text(), route).not.toContain("server bundle");
    }
  });

  it("does not answer unknown API paths or non-GET requests with the shell", async () => {
    const api = await fetch(`${baseUrl}/api/unknown`);
    expect(api.status).toBe(404);
    expect(await api.text()).not.toBe(SHELL);

    const post = await fetch(`${baseUrl}/`, { method: "POST" });
    expect(post.status).toBe(404);
  });

  it("lets browsers cache hashed assets forever and never caches the shell", async () => {
    const asset = await fetch(`${baseUrl}/assets/index-abc123.js`);
    expect(asset.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");

    for (const route of ["/", "/editor", "/nonexistent-page", "/index.html"]) {
      const res = await fetch(`${baseUrl}${route}`);
      expect(res.headers.get("cache-control"), route).toBe("no-cache");
    }

    const robots = await fetch(`${baseUrl}/robots.txt`);
    expect(robots.headers.get("cache-control")).toBe("public, max-age=3600");

    const missing = await fetch(`${baseUrl}/assets/index-oldhash.js`);
    expect(missing.headers.get("cache-control")).toBeNull();
  });

  it("sends the security headers and hides the framework", async () => {
    const res = await fetch(`${baseUrl}/`);
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("default-src 'self'");
    // MM-03: remote images over https are allowed; http stays blocked.
    expect(csp).toMatch(/img-src[^;]*\bhttps:/);
    expect(csp).not.toMatch(/img-src[^;]*\bhttp:(?!\/)/); // no bare http: token
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-powered-by")).toBeNull();
  });
});

describe("crawl files shipped with the client", () => {
  const publicDir = path.resolve(__dirname, "..", "client", "public");

  it("ships an XML sitemap for the homepage", () => {
    const xml = fs.readFileSync(path.join(publicDir, "sitemap.xml"), "utf-8");
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain("<loc>https://markdownmate.org/</loc>");
  });

  it("points robots.txt at that sitemap", () => {
    const robots = fs.readFileSync(path.join(publicDir, "robots.txt"), "utf-8");
    expect(robots).toContain("Sitemap: https://markdownmate.org/sitemap.xml");
  });

  it("keeps the homepage description and adds a canonical link", () => {
    const html = fs.readFileSync(path.resolve(__dirname, "..", "client", "index.html"), "utf-8");
    expect(html).toContain('<link rel="canonical" href="https://markdownmate.org/" />');
    expect(html).toContain(
      'content="A local-first Markdown editor with live preview, math and code highlighting. Your documents stay in your browser."',
    );
  });
});

describe("client routes", () => {
  it("match the routes declared in client/src/App.tsx", () => {
    const appSource = fs.readFileSync(
      path.resolve(__dirname, "..", "client", "src", "App.tsx"),
      "utf-8",
    );
    const declared = [...appSource.matchAll(/<Route path="([^"]+)"/g)].map((m) => m[1]);
    expect(declared.sort()).toEqual([...CLIENT_ROUTES].sort());
  });
});
