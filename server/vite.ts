import { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";

/**
 * Attach the Vite dev server (development only).
 *
 * Vite is imported dynamically and configured from the project's own
 * vite.config.ts, so the production server bundle has no dependency on it.
 */
export async function setupVite(app: Express, server: Server, projectRoot: string) {
  const { createServer: createViteServer } = await import("vite");
  const clientRoot = path.resolve(projectRoot, "client");

  const vite = await createViteServer({
    configFile: path.resolve(projectRoot, "vite.config.ts"),
    appType: "custom",
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true,
    },
  });

  app.use(vite.middlewares);

  app.use(async (req, res, next) => {
    const url = req.originalUrl;

    if (req.method !== "GET" || url.startsWith("/api/")) {
      return next();
    }

    try {
      const template = await fs.promises.readFile(path.resolve(clientRoot, "index.html"), "utf-8");
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
