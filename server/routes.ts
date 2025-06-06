import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertDocumentSchema, updateDocumentSchema, insertFolderSchema } from "@shared/schema";
import { z } from "zod";

interface AuthenticatedRequest extends Request {
  user?: {
    claims: {
      sub: string;
      email?: string;
      first_name?: string;
      last_name?: string;
      profile_image_url?: string;
    };
  };
}

// WebSocket clients storage
const wsClients = new Map<string, Set<WebSocket>>();
const documentSessions = new Map<number, Set<{ ws: WebSocket; userId: string; cursor?: any }>>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Document routes
  app.get('/api/documents', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const folderId = req.query.folderId ? parseInt(req.query.folderId as string) : undefined;
      const documents = await storage.getDocuments(userId, folderId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get('/api/documents/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId, userId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.post('/api/documents', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const documentData = insertDocumentSchema.parse({
        ...req.body,
        authorId: userId,
      });
      
      const document = await storage.createDocument(documentData);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid document data", errors: error.errors });
      }
      console.error("Error creating document:", error);
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.patch('/api/documents/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const documentId = parseInt(req.params.id);
      const updates = updateDocumentSchema.partial().parse(req.body);
      
      const document = await storage.updateDocument(documentId, userId, updates);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found or unauthorized" });
      }

      // Broadcast update to WebSocket clients
      broadcastToDocument(documentId, {
        type: 'document-update',
        documentId,
        updates,
        userId,
      });
      
      res.json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      console.error("Error updating document:", error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.delete('/api/documents/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const documentId = parseInt(req.params.id);
      
      const success = await storage.deleteDocument(documentId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Document not found or unauthorized" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  app.get('/api/documents/search', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const documents = await storage.searchDocuments(userId, query);
      res.json(documents);
    } catch (error) {
      console.error("Error searching documents:", error);
      res.status(500).json({ message: "Failed to search documents" });
    }
  });

  // Folder routes
  app.get('/api/folders', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const parentId = req.query.parentId ? parseInt(req.query.parentId as string) : undefined;
      const folders = await storage.getFolders(userId, parentId);
      res.json(folders);
    } catch (error) {
      console.error("Error fetching folders:", error);
      res.status(500).json({ message: "Failed to fetch folders" });
    }
  });

  app.post('/api/folders', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const folderData = insertFolderSchema.parse({
        ...req.body,
        authorId: userId,
      });
      
      const folder = await storage.createFolder(folderData);
      res.status(201).json(folder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid folder data", errors: error.errors });
      }
      console.error("Error creating folder:", error);
      res.status(500).json({ message: "Failed to create folder" });
    }
  });

  app.delete('/api/folders/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const folderId = parseInt(req.params.id);
      
      const success = await storage.deleteFolder(folderId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Folder not found or unauthorized" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting folder:", error);
      res.status(500).json({ message: "Failed to delete folder" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time collaboration
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket connection established');

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleWebSocketMessage(ws, message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      // Remove client from all sessions
      for (const [documentId, clients] of documentSessions.entries()) {
        for (const client of clients) {
          if (client.ws === ws) {
            clients.delete(client);
            broadcastToDocument(documentId, {
              type: 'user-left',
              userId: client.userId,
            });
            break;
          }
        }
        if (clients.size === 0) {
          documentSessions.delete(documentId);
        }
      }
    });
  });

  function handleWebSocketMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case 'join-document':
        joinDocument(ws, message.documentId, message.userId);
        break;
      case 'leave-document':
        leaveDocument(ws, message.documentId);
        break;
      case 'cursor-update':
        broadcastCursorUpdate(message.documentId, message.userId, message.cursor);
        break;
      case 'text-change':
        broadcastTextChange(message.documentId, message.userId, message.change);
        break;
    }
  }

  function joinDocument(ws: WebSocket, documentId: number, userId: string) {
    if (!documentSessions.has(documentId)) {
      documentSessions.set(documentId, new Set());
    }
    
    const clients = documentSessions.get(documentId)!;
    clients.add({ ws, userId });

    // Notify other clients about new user
    broadcastToDocument(documentId, {
      type: 'user-joined',
      userId,
    }, ws);
  }

  function leaveDocument(ws: WebSocket, documentId: number) {
    const clients = documentSessions.get(documentId);
    if (clients) {
      for (const client of clients) {
        if (client.ws === ws) {
          clients.delete(client);
          broadcastToDocument(documentId, {
            type: 'user-left',
            userId: client.userId,
          });
          break;
        }
      }
      if (clients.size === 0) {
        documentSessions.delete(documentId);
      }
    }
  }

  function broadcastCursorUpdate(documentId: number, userId: string, cursor: any) {
    broadcastToDocument(documentId, {
      type: 'cursor-update',
      userId,
      cursor,
    });
  }

  function broadcastTextChange(documentId: number, userId: string, change: any) {
    broadcastToDocument(documentId, {
      type: 'text-change',
      userId,
      change,
    });
  }

  function broadcastToDocument(documentId: number, message: any, excludeWs?: WebSocket) {
    const clients = documentSessions.get(documentId);
    if (clients) {
      const messageStr = JSON.stringify(message);
      clients.forEach(({ ws }) => {
        if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      });
    }
  }

  return httpServer;
}
