import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// new URL(import.meta.url).pathname yields "/D:/..." on Windows, which breaks
// the build (unresolvable entry) and every dev request; fileURLToPath gives a
// real OS path. Behaviour is identical on Linux/macOS.
const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "client", "src"),
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
  root: path.resolve(rootDir, "client"),
  build: {
    outDir: path.resolve(rootDir, "dist", "public"),
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    target: "es2020",
    // The Monaco chunk is ~3.3 MB by nature; it is loaded lazily, so only warn
    // if something else grows past it.
    chunkSizeWarningLimit: 3500,
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
