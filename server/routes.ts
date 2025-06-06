import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";

// Development authentication middleware
const devAuth = (req: any, res: any, next: any) => {
  if (process.env.NODE_ENV === 'development') {
    req.user = {
      claims: {
        sub: 'dev-user-1',
        email: 'developer@markdownmate.dev',
        first_name: 'Demo',
        last_name: 'User'
      }
    };
    return next();
  }
  return isAuthenticated(req, res, next);
};

// WebSocket clients storage
const wsClients = new Map<string, Set<WebSocket>>();
const documentSessions = new Map<number, Set<{ ws: WebSocket; userId: string; cursor?: any }>>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  try {
    await setupAuth(app);
  } catch (error) {
    console.log("Auth setup failed, continuing in development mode");
  }

  // Create development user helper
  const createDevUser = async () => {
    const devUser = {
      id: 'dev-user-1',
      email: 'developer@markdownmate.dev',
      firstName: 'Demo',
      lastName: 'User',
      profileImageUrl: null
    };
    
    try {
      await storage.upsertUser(devUser);
      return await storage.getUser(devUser.id);
    } catch (error) {
      console.error("Failed to create dev user:", error);
      return devUser;
    }
  };

  // Auth routes
  app.get('/api/auth/user', async (req: any, res: Response) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        const user = await createDevUser();
        res.json(user);
        return;
      }
      
      // Production authentication check
      if (!req.user?.claims?.sub) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Document routes
  app.get('/api/documents', devAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const folderId = req.query.folderId ? parseInt(req.query.folderId as string) : undefined;
      const documents = await storage.getDocuments(userId, folderId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get('/api/documents/:id', devAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post('/api/documents', devAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { title, content, folderId } = req.body;
      
      const document = await storage.createDocument({
        title,
        content: content || '',
        authorId: userId,
        folderId: folderId || null,
        isPublic: false
      });
      
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.patch('/api/documents/:id', devAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const documentId = parseInt(req.params.id);
      const updates = req.body;
      
      const document = await storage.updateDocument(documentId, userId, updates);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json(document);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.delete('/api/documents/:id', devAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const documentId = parseInt(req.params.id);
      
      const success = await storage.deleteDocument(documentId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  app.get('/api/documents/search', devAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get('/api/folders', devAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const parentId = req.query.parentId ? parseInt(req.query.parentId as string) : undefined;
      const folders = await storage.getFolders(userId, parentId);
      res.json(folders);
    } catch (error) {
      console.error("Error fetching folders:", error);
      res.status(500).json({ message: "Failed to fetch folders" });
    }
  });

  app.post('/api/folders', devAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { name, parentId } = req.body;
      
      const folder = await storage.createFolder({
        name,
        ownerId: userId,
        parentId: parentId || null
      });
      
      res.status(201).json(folder);
    } catch (error) {
      console.error("Error creating folder:", error);
      res.status(500).json({ message: "Failed to create folder" });
    }
  });

  app.delete('/api/folders/:id', devAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const folderId = parseInt(req.params.id);
      
      const success = await storage.deleteFolder(folderId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Folder not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting folder:", error);
      res.status(500).json({ message: "Failed to delete folder" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket connection established');

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleWebSocketMessage(ws, message);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      // Clean up user from all document sessions
      Array.from(documentSessions.entries()).forEach(([documentId]) => {
        leaveDocument(ws, documentId);
      });
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
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
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  function joinDocument(ws: WebSocket, documentId: number, userId: string) {
    if (!documentSessions.has(documentId)) {
      documentSessions.set(documentId, new Set());
    }
    
    const session = { ws, userId };
    documentSessions.get(documentId)!.add(session);
    
    // Notify other users in the document
    broadcastToDocument(documentId, {
      type: 'user-joined',
      userId,
      userEmail: 'developer@markdownmate.dev',
      userFirstName: 'Demo',
      userLastName: 'User'
    }, ws);
  }

  function leaveDocument(ws: WebSocket, documentId: number) {
    const sessions = documentSessions.get(documentId);
    if (sessions) {
      const sessionToRemove = Array.from(sessions).find(session => session.ws === ws);
      if (sessionToRemove) {
        sessions.delete(sessionToRemove);
        
        // Notify other users
        broadcastToDocument(documentId, {
          type: 'user-left',
          userId: sessionToRemove.userId
        }, ws);
        
        // Clean up empty sessions
        if (sessions.size === 0) {
          documentSessions.delete(documentId);
        }
      }
    }
  }

  function broadcastCursorUpdate(documentId: number, userId: string, cursor: any) {
    broadcastToDocument(documentId, {
      type: 'cursor-update',
      userId,
      cursor
    });
  }

  function broadcastTextChange(documentId: number, userId: string, change: any) {
    broadcastToDocument(documentId, {
      type: 'text-change',
      userId,
      change
    });
  }

  function broadcastToDocument(documentId: number, message: any, excludeWs?: WebSocket) {
    const sessions = documentSessions.get(documentId);
    if (sessions) {
      Array.from(sessions).forEach(session => {
        if (session.ws !== excludeWs && session.ws.readyState === WebSocket.OPEN) {
          try {
            session.ws.send(JSON.stringify(message));
          } catch (error) {
            console.error('Failed to send WebSocket message:', error);
          }
        }
      });
    }
  }

  return httpServer;
}