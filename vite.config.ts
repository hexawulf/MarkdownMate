import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { URL } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
    "@": path.resolve(path.dirname(new URL(import.meta.url).pathname), "client", "src"),
    "@shared": path.resolve(path.dirname(new URL(import.meta.url).pathname), "shared"),
    "@assets": path.resolve(path.dirname(new URL(import.meta.url).pathname), "attached_assets"),
    // 'mammoth': 'mammoth/dist/mammoth.browser.js', // Removed incorrect alias
    },
  },
  optimizeDeps: { // Kept for mammoth
    include: ['mammoth'],
  },
root: path.resolve(path.dirname(new URL(import.meta.url).pathname), "client"),
  build: {
  outDir: path.resolve(path.dirname(new URL(import.meta.url).pathname), "dist"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
