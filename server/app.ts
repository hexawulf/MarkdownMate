import express, { type Express, type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";

export interface CreateAppOptions {
  /** Called for `/api` requests once the response has been sent. */
  onApiRequest?: (line: string) => void;
}

/**
 * Build the Express app without starting it: security headers and the API.
 * Static files (production) or the Vite dev server (development) are attached
 * by the caller, followed by `attachErrorHandler`.
 */
export function createApp({ onApiRequest }: CreateAppOptions = {}): Express {
  const app = express();

  app.disable("x-powered-by");

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

  if (onApiRequest) {
    app.use("/api", (req, res, next) => {
      const start = Date.now();
      res.on("finish", () => {
        onApiRequest(`${req.method} ${req.originalUrl} ${res.statusCode} in ${Date.now() - start}ms`);
      });
      next();
    });
  }

  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "MarkdownMate",
    });
  });

  return app;
}

/** Must be registered after all routes and middleware. */
export function attachErrorHandler(
  app: Express,
  onError?: (status: number, message: string, err: unknown) => void,
) {
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    onError?.(status, message, err);
    if (res.headersSent) return;
    res.status(status).json({ message });
  });
}
