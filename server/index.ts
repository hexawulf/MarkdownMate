import 'dotenv/config';
import path from "path";
import { fileURLToPath } from "url";
import { attachErrorHandler, createApp } from "./app";
import { serveStatic } from "./static";
import logger from './src/logger';

const DEFAULT_PORT = 5004;

// server/ in development, dist/ in the production bundle: the parent is the project root either way.
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.resolve(projectRoot, "dist", "public");

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

function resolvePort(): number {
  const raw = process.env.PORT;
  if (!raw) return DEFAULT_PORT;

  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    logger.warn(`Ignoring invalid PORT "${raw}", using ${DEFAULT_PORT}`);
    return DEFAULT_PORT;
  }
  return port;
}

(async () => {
  const app = createApp({ onApiRequest: log });
  const isDevelopment = app.get("env") === "development";
  const port = resolvePort();
  const server = app.listen(port);

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${port} is already in use.`, err);
    } else {
      logger.error('Server error:', err);
    }
    process.exit(1);
  });

  server.on('listening', () => {
    log(`serving on port ${port}`);
    logger.info(`Server started on port ${port}`);
    logger.info(`Environment: ${app.get("env") || 'development'}`);
    logger.info(`Serving: ${isDevelopment ? 'Vite dev server' : `Static files from ${publicDir}`}`);
  });

  // Setup static/vite based on environment
  if (isDevelopment) {
    // Loaded on demand so the production bundle never imports Vite.
    const { setupVite } = await import("./vite");
    await setupVite(app, server, projectRoot);
  } else {
    logger.info('Running in PRODUCTION mode - serving static files');
    serveStatic(app, publicDir);
  }

  // Error handler must be registered AFTER all routes/middleware
  attachErrorHandler(app, (status, message, err) => {
    logger.error(`Server Error ${status}: ${message}`, err);
  });

  // Graceful shutdown handlers
  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(() => {
      logger.info('Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
})();
