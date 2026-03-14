import type { Express } from "express";

export async function registerRoutes(_app: Express) {
  // No API routes needed for local-first architecture
  // All data is stored in IndexedDB on the client
}
