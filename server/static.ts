import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/**
 * Serve the built client from `publicDir` (the Vite output, never the directory
 * that holds the server bundle).
 */
export function serveStatic(app: Express, publicDir: string) {
  if (!fs.existsSync(publicDir)) {
    throw new Error(`Could not find the build directory: ${publicDir}, make sure to build the client first`);
  }

  console.log(`📂 Serving static files from: ${publicDir}`);

  app.use(express.static(publicDir, { index: false }));

  app.use("*", (req, res, next) => {
    const url = req.originalUrl;

    if (url.startsWith("/api/") || url.startsWith("/user") || url.startsWith("/ws")) {
      console.log(`[STATIC] Skipping SPA for API route: ${url}`);
      return next();
    }

    console.log(`[STATIC] Serving SPA for route: ${url}`);

    const indexPath = path.resolve(publicDir, "index.html");

    if (!fs.existsSync(indexPath)) {
      console.error(`❌ index.html not found at: ${indexPath}`);
      return res.status(500).send("index.html not found - please build the client first");
    }

    res.sendFile(indexPath);
  });
}
