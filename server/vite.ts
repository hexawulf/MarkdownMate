import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { URL } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        // process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  
  // IMPORTANT: More specific API route exclusion with debug logging
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    
    // Skip all API routes, user route, and WebSocket routes
    if (url.startsWith('/api/') || url.startsWith('/user') || url.startsWith('/ws')) {
      console.log(`[VITE] Skipping SPA for API route: ${url}`);
      return next();
    }

    console.log(`[VITE] Serving SPA for route: ${url}`);
    
    try {
      const clientTemplate = path.resolve(
        path.dirname(new URL(import.meta.url).pathname),
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "dist");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  console.log(`📂 Serving static files from: ${distPath}`);
  
  // Serve static files (CSS, JS, images, etc.) but NOT HTML files
  app.use(express.static(distPath, {
    // Don't serve index.html automatically - we'll handle that in the catch-all
    index: false
  }));

  // IMPORTANT: This catch-all must be registered LAST and handle route exclusions properly
  app.use("*", (req, res, next) => {
    const url = req.originalUrl;
    
    // Skip all API routes, user route, and WebSocket routes
    if (url.startsWith('/api/') || url.startsWith('/user') || url.startsWith('/ws')) {
      console.log(`[STATIC] Skipping SPA for API route: ${url}`);
      return next(); // Let Express handle the API route
    }
    
    console.log(`[STATIC] Serving SPA for route: ${url}`);
    
    // For all other routes, serve the React SPA
    const indexPath = path.resolve(distPath, "index.html");
    
    if (!fs.existsSync(indexPath)) {
      console.error(`❌ index.html not found at: ${indexPath}`);
      return res.status(500).send('index.html not found - please build the client first');
    }
    
    res.sendFile(indexPath);
  });
}
