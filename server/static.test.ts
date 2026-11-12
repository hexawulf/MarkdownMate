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
  fs.writeFileSync(path.join(publicDir, "robots.txt"), "User-agent: *\n");

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

  it("sends the security headers and hides the framework", async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-powered-by")).toBeNull();
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
