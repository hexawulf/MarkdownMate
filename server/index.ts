import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cors from 'cors';
import { registerRoutes } from "./routes";
import authRoutes from './routes/auth.js';
import { setupVite, serveStatic, log } from "./vite";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5004',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ====== UPDATED CSP HEADERS FOR ALL REQUIRED RESOURCES ======
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://replit.com; " +
    "worker-src 'self' blob:; " +
    "img-src 'self' data: blob: https://lh3.googleusercontent.com https://googleusercontent.com; " +
    "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://cdn.jsdelivr.net wss: ws:;"
  );
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api") || path.startsWith("/user")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Debug middleware for API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/user')) {
    console.log(`🔍 API Route Hit: ${req.method} ${req.path}`);
  }
  next();
});

// IMPORTANT: Register auth routes FIRST
app.use('/api/auth', authRoutes);

// ====== REDIRECT FOR OLD /api/login ENDPOINT ======
app.use('/api/login', (req, res) => {
  console.log(`🔀 Redirecting /api/login ${req.method} to /api/auth/login`);
  if (req.method === 'GET') {
    res.redirect(301, '/api/auth/login');
  } else {
    res.status(404).json({ 
      message: 'Use /api/auth/login instead',
      redirect: '/api/auth/login'
    });
  }
});

(async () => {
  // IMPORTANT: Register API routes BEFORE static/vite middleware
  const server = await registerRoutes(app);

  // Test route for debugging
  app.get('/api/direct-test', (req, res) => {
    console.log('🎯 Direct test route hit!');
    res.json({ message: "Direct route works!", timestamp: new Date() });
  });

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    console.error(`❌ Server Error ${status}:`, message);
    console.error(`❌ Error stack:`, err.stack);
    res.status(status).json({ message });
    throw err;
  });

  // IMPORTANT: Setup static/vite AFTER API routes
  // This ensures API routes are registered and handled first
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // In production, serve static files
    console.log('🚀 Running in PRODUCTION mode - serving static files');
    serveStatic(app);
  }

  // MarkdownMate runs on port 5004
  const port = 5004;

  // Graceful shutdown handlers
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
      process.exit(0);
    });
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Attempting to retry...`);
      setTimeout(() => {
        server.close();
        server.listen({
          port,
          host: "0.0.0.0",
        }, () => {
          log(`serving on port ${port}`);
        });
      }, 1000);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
    console.log(`🌍 Environment: ${app.get("env") || 'development'}`);
    console.log(`📂 Serving: ${app.get("env") === "development" ? 'Vite dev server' : 'Static files from /dist'}`);
  });
})();
