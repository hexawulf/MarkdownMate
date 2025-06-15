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
    },
  },
  optimizeDeps: {
    include: [
      'mammoth',
      'turndown', 
      'file-saver',
      'jspdf',
      'html2canvas',
      '@octokit/rest',
      'react',
      'react-dom',
      'wouter',
      'use-sync-external-store',
      'use-sync-external-store/shim'
    ],
    force: true,
  },
  root: path.resolve(path.dirname(new URL(import.meta.url).pathname), "client"),
  build: {
    outDir: path.resolve(path.dirname(new URL(import.meta.url).pathname), "dist"),
    emptyOutDir: true,
    sourcemap: true,
    minify: false, // Disabled for debugging - enable after fixing
    target: 'es2020',
    commonjsOptions: {
      include: [
        /mammoth/, 
        /turndown/, 
        /file-saver/, 
        /jspdf/, 
        /html2canvas/, 
        /@octokit/,
        /node_modules/
      ],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      onwarn(warning, warn) {
        // Ignore specific warnings that are causing issues
        if (warning.code === 'UNRESOLVED_IMPORT') {
          return;
        }
        if (warning.code === 'MISSING_EXPORT' && warning.exporter?.includes('react')) {
          return;
        }
        warn(warning);
      },
      output: {
        // Disable manual chunking temporarily to avoid bundling issues
        manualChunks: undefined,
        // Use more conservative output options
        format: 'es',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
