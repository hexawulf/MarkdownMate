import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { URL } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import react from "@vitejs/plugin-react";

const viteLogger = createLogger();
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const projectRoot = path.resolve(__dirname, "..");

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
  const rootPath = path.resolve(projectRoot, "client");

  const vite = await createViteServer({
    root: rootPath,
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(rootPath, "src"),
        "@shared": path.resolve(projectRoot, "shared"),
        "@assets": path.resolve(projectRoot, "attached_assets"),
      },
    },
    optimizeDeps: {
      include: [
        "file-saver",
        "react",
        "react-dom",
        "wouter",
      ],
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
      minify: true,
      target: "es2020",
      emptyOutDir: true,
      outDir: path.resolve(projectRoot, "dist"),
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
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${Date.now()}"`);
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(projectRoot, "dist");

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
