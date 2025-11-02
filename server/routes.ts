import type { Express } from "express";
import { createServer as createViteServer } from "vite";

export async function registerRoutes(app: Express) {
  // No API routes needed for local-first architecture
  // All data is stored in IndexedDB on the client
  
  // Return the HTTP server for WebSocket support (if needed in future)
  const { createServer } = await import("http");
  return createServer(app);
}
