import express, { type Express } from "express";
import fs from "fs";
import path from "path";

/**
 * Routes the client-side router knows about (see client/src/App.tsx).
 * Every other path still gets the app shell, so the client can render its own
 * "not found" page, but with a 404 status instead of 200.
 */
export const CLIENT_ROUTES = ["/", "/editor"] as const;

function isClientRoute(requestPath: string): boolean {
  const normalized = requestPath.length > 1 ? requestPath.replace(/\/+$/, "") : requestPath;
  return (CLIENT_ROUTES as readonly string[]).includes(normalized);
}

/**
 * Serve the built client from `publicDir` (the Vite output, never the directory
 * that holds the server bundle).
 */
export function serveStatic(app: Express, publicDir: string) {
  const indexPath = path.join(publicDir, "index.html");

  if (!fs.existsSync(indexPath)) {
    throw new Error(
      `Could not find the client build at ${indexPath}, run "npm run build" first`,
    );
  }

  app.use("/assets", express.static(path.join(publicDir, "assets"), { index: false }));

  // A missing hashed file must be a real 404, not the HTML shell: a browser
  // asking for a chunk from a previous deploy cannot do anything with HTML.
  app.use("/assets", (_req, res) => {
    res.status(404).type("text/plain").send("Not found");
  });

  // Everything else in the build output (icons, robots.txt, ...).
  app.use(express.static(publicDir, { index: false }));

  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api/")) return next();

    res.status(isClientRoute(req.path) ? 200 : 404);
    res.sendFile(indexPath, (err) => {
      if (err) next(err);
    });
  });
}
