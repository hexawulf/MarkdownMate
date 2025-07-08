import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { URL } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import react from "@vitejs/plugin-react";
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
  const rootPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "client");

  const vite = await createViteServer({
    root: rootPath,
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(rootPath, "src"),
        "@shared": path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "shared"),
        "@assets": path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "attached_assets"),
      },
    },
    optimizeDeps: {
      include: [
        "mammoth",
        "turndown",
        "file-saver",
        "jspdf",
        "html2canvas",
        "@octokit/rest",
        "react",
        "react-dom",
        "wouter",
        "use-sync-external-store",
        "use-sync-external-store/shim"
      ],
      force: true,
    },
    appType: "custom",
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        // Prevent hard exit
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true,
    },
    build: {
      sourcemap: true,
      minify: false,
      target: "es2020",
      emptyOutDir: true,
      outDir: path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "dist"),
      rollupOptions: {
        output: {
          format: "es",
          manualChunks: undefined,
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
        onwarn(warning, warn) {
          if (warning.code === "UNRESOLVED_IMPORT") return;
          if (warning.code === "MISSING_EXPORT" && warning.exporter?.includes("react")) return;
          warn(warning);
        },
      },
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
      },
    },
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    if (url.startsWith("/api/") || url.startsWith("/user") || url.startsWith("/ws")) {
      console.log(`[VITE] Skipping SPA for API route: ${url}`);
      return next();
    }

    console.log(`[VITE] Serving SPA for route: ${url}`);

    try {
      const clientTemplate = path.resolve(rootPath, "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`);
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
    throw new Error(`Could not find the build directory: ${distPath}, make sure to build the client first`);
  }

  console.log(`📂 Serving static files from: ${distPath}`);

  app.use(express.static(distPath, { index: false }));

  app.use("*", (req, res, next) => {
    const url = req.originalUrl;

    if (url.startsWith("/api/") || url.startsWith("/user") || url.startsWith("/ws")) {
      console.log(`[STATIC] Skipping SPA for API route: ${url}`);
      return next();
    }

    console.log(`[STATIC] Serving SPA for route: ${url}`);

    const indexPath = path.resolve(distPath, "index.html");

    if (!fs.existsSync(indexPath)) {
      console.error(`❌ index.html not found at: ${indexPath}`);
      return res.status(500).send("index.html not found - please build the client first");
    }

    res.sendFile(indexPath);
  });
}
