import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import helmet from 'helmet';
import { setupVite, serveStatic, log } from "./vite";
import logger from './src/logger';

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Security headers with helmet - strict local-only CSP
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],                    // no remote scripts, no eval
      styleSrc: ["'self'", "'unsafe-inline'"],  // allow inline for Monaco/print CSS
      imgSrc: ["'self'", "data:", "blob:"],     // allow data URLs for images
      fontSrc: ["'self'", "data:"],             // allow data URLs for fonts
      connectSrc: ["'self'"],                   // no external connections
      workerSrc: ["'self'", "blob:"],           // Monaco workers
      childSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,  // Monaco compatibility
  crossOriginResourcePolicy: { policy: "same-origin" }
}));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'MarkdownMate'
  });
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  logger.error(`Server Error ${status}: ${message}`, err);
  res.status(status).json({ message });
});

(async () => {
  const server = app.listen(5004);
  
  // Setup static/vite based on environment
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    logger.info('Running in PRODUCTION mode - serving static files');
    serveStatic(app);
  }

  const port = 5004;

  // Graceful shutdown handlers
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed.');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed.');
      process.exit(0);
    });
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${port} is already in use.`, err);
      process.exit(1);
    } else {
      logger.error('Server error:', err);
      process.exit(1);
    }
  });

  server.on('listening', () => {
    log(`serving on port ${port}`);
    logger.info(`Server started on port ${port}`);
    logger.info(`Environment: ${app.get("env") || 'development'}`);
    logger.info(`Serving: ${app.get("env") === "development" ? 'Vite dev server' : 'Static files from /dist'}`);
  });
})();
