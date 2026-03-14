import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { URL } from "url";

export default defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(path.dirname(new URL(import.meta.url).pathname), "client", "src"),
      "@shared": path.resolve(path.dirname(new URL(import.meta.url).pathname), "shared"),
      "@assets": path.resolve(path.dirname(new URL(import.meta.url).pathname), "attached_assets"),
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
  root: path.resolve(path.dirname(new URL(import.meta.url).pathname), "client"),
  build: {
    outDir: path.resolve(path.dirname(new URL(import.meta.url).pathname), "dist"),
    emptyOutDir: true,
    sourcemap: true,
    minify: true,
    target: "es2020",
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "UNRESOLVED_IMPORT") return;
        if (warning.code === "MISSING_EXPORT" && warning.exporter?.includes("react")) return;
        warn(warning);
      },
      output: {
        manualChunks: undefined,
        format: "es",
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
  server: {
    port: 5004,
    host: "0.0.0.0",
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    middlewareMode: false,
  },
});
