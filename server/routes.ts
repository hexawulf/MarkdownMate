import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "./db";
import { users, documents, folders, documentCollaborators } from "../shared/schema";
import { eq, desc, ilike, or, and, count, isNull } from "drizzle-orm";
import { getAuth } from "firebase-admin/auth";
import { setupAuth, isAuthenticated, getTokenFromRequest } from "./firebaseAuth";
import { storage } from "./storage";

// Development authentication middleware
const devAuth = (req: any, res: any, next: any) => {
  if (process.env.NODE_ENV === 'development') {
    req.user = {
      claims: {
        sub: 'dev-user-1',
        email: 'developer@markdownmate.dev',
        displayName: 'Demo User'
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
    await setupAuth(app); // Assuming setupAuth in firebaseAuth.ts handles its own logging or is updated
  } catch (error) {
    logger.error("[Auth] CRITICAL: Firebase Auth setup failed in routes.ts!", { error });
    logger.warn("[Auth] Server is continuing with development mode auth behavior due to Firebase setup failure.");
  }

  // Server-side fallback redirect for authenticated users.
  app.get('/', async (req, res, next) => {
    const token = getTokenFromRequest(req);

    if (token) {
      try {
        await getAuth().verifyIdToken(token);
        logger.info('[Auth] User with valid token accessed root path. Redirecting to external editor.', { ip: req.ip });
        res.redirect(302, 'https://markdown.piapps.dev/editor');
      } catch (error: any) {
        logger.info(`[Auth] Token verification failed for root path access. Proceeding to landing page. Error: ${error.message}`, { error, ip: req.ip });
        next();
      }
    } else {
      next();
    }
  });

  // Database test route - ADD THIS FOR DEBUGGING
  app.get('/api/db-test', async (req, res) => {
    try {
      logger.info('[DB Test] Testing database connection...');
      logger.info(`[DB Test] DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);
      
      // Test basic connection
      const result = await db.select().from(users).limit(1);
      logger.info(`[DB Test] Users query successful, count: ${result.length}`);
      
      // Test if tables exist by trying to select from documents table
      const docCount = await db.select().from(documents).limit(1);
      logger.info(`[DB Test] Documents table accessible, count: ${docCount.length}`);
      
      res.json({ 
        message: "Database connection successful", 
        userCount: result.length,
        documentCount: docCount.length,
        driver: "PostgreSQL",
        tablesAccessible: true
      });
    } catch (error: any) {
      logger.error("[DB Test] Database connection failed", {
        error,
        name: error.name,
        message: error.message,
        code: error.code
      });
      res.status(500).json({ 
        message: "Database connection failed", 
        error: error.message, // Keep client-facing error concise
        code: error.code
      });
    }
  });

  // Create development user helper
  const createDevUser = async () => {
    const devUser = {
      id: 'dev-user-1',
      email: 'developer@markdownmate.dev',
      displayName: 'Demo User',
      photoURL: null,
      emailVerified: true
    };
    
    try {
      let user = await storage.getUser(devUser.id);
      if (user) {
        return user;
      }
      user = await storage.upsertUser(devUser);
      return user;
    } catch (error) {
      logger.error("Failed to create dev user in routes.ts", { error });
      return devUser;
    }
  };

  // Helper function to upsert Firebase user
  const upsertFirebaseUser = async (claims: any) => {
    const userData = {
      id: claims.sub,
      email: claims.email,
      displayName: claims.name || claims.displayName || claims.email.split('@')[0],
      photoURL: claims.picture || null,
      emailVerified: claims.email_verified || false
    };

    try {
      const user = await storage.upsertUser(userData);
      return user;
    } catch (error) {
      logger.error("Failed to upsert Firebase user in routes.ts", { error, userId: claims.sub });
      throw error;
    }
  };

  // Auth routes
  app.get('/user', devAuth, async (req: any, res: Response) => {
    logger.debug('[/user] Handler invoked.', { user: req.user, ip: req.ip }); // Avoid logging full user object at info level
    try {
      if (process.env.NODE_ENV === 'development') {
        const user = await createDevUser();
        res.json(user);
        return;
      }
      
      if (!req.user?.claims?.sub) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await upsertFirebaseUser(req.user.claims);
      res.json(user);
    } catch (error) {
      logger.error("Error fetching or upserting user in /user route (routes.ts)", { error, userId: req.user?.claims?.sub, ip: req.ip });
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/test', (req, res) => {
    res.json({ message: "NEW ROUTES WORKING!", timestamp: new Date() });
  });

  // Document routes
  app.get('/api/documents', devAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const folderIdQuery = req.query.folderId as string | undefined;

      let folderId: number | undefined = undefined;
      if (folderIdQuery && folderIdQuery !== 'null') {
        folderId = parseInt(folderIdQuery);
      }

      const userDocuments = await storage.getDocuments(userId, folderId);

      if (folderIdQuery === 'null') {
        res.json(userDocuments.filter(doc => doc.folderId === null));
      } else {
        res.json(userDocuments);
      }
    } catch (error) {
      logger.error("Error fetching documents in /api/documents (GET, routes.ts)", { error, userId: req.user?.claims?.sub, folderIdQuery, ip: req.ip });
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
      logger.error(`Error fetching document ${documentId} in /api/documents/:id (GET, routes.ts)`, { error, userId: req.user?.claims?.sub, documentId, ip: req.ip });
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  // UPDATED DOCUMENT CREATION WITH USER EXISTENCE CHECK
  app.post('/api/documents', devAuth, async (req: any, res: Response) => {
    try {
      // console.log('[Documents] ===== DOCUMENT CREATION DEBUG =====');
      const userId = req.user.claims.sub;
      const { title, content, folderId } = req.body;
      
      // console.log('[Documents] User ID:', userId);
      // console.log('[Documents] Request body:', { title, content, folderId });
      
      if (!title) {
        // console.log('[Documents] Missing title, returning 400'); // Optional: keep for important validation
        return res.status(400).json({ message: "Title is required" });
      }

      // CRITICAL: Ensure user exists in database before creating document
      // console.log('[Documents] Checking if user exists in database...');
      let user = await storage.getUser(userId);
      
      if (!user) {
        // console.log('[Documents] User not found in database, creating user...');
        const userData = {
          id: userId,
          email: req.user.claims.email || `${userId}@unknown.com`,
          displayName: req.user.claims.name || req.user.claims.displayName || 'Unknown User',
          photoURL: req.user.claims.picture || null,
          emailVerified: req.user.claims.email_verified || false
        };
        
        user = await storage.upsertUser(userData);
        // console.log('[Documents] User created successfully:', user.id);
      }
      // else {
        // console.log('[Documents] User exists in database:', user.id);
      // }

      // If folderId provided, verify it exists and user owns it
      if (folderId) {
        // console.log('[Documents] Checking folder access for folderId:', folderId);
        try {
          const userFolders = await storage.getFolders(userId);
          // console.log('[Documents] User folders:', userFolders.length);
          const folderExists = userFolders.some(f => f.id === folderId);
          if (!folderExists) {
            // console.log('[Documents] Folder not found, returning 404'); // Optional: keep this log
            return res.status(404).json({ message: "Folder not found or access denied" });
          }
          // console.log('[Documents] Folder access verified');
        } catch (folderError) {
           logger.error('[Documents] Error checking folder access during document creation', { error: folderError, userId, folderId, ip: req.ip });
           throw folderError; // Re-throw to be caught by the main catch block
        }
      }
      
      const newDocumentPayload = {
        title,
        content: content || '',
        authorId: userId,
        folderId: folderId || null,
        isPublic: false
      };

      // console.log('[Documents] Document payload:', newDocumentPayload);
      // console.log('[Documents] About to call storage.createDocument...');
      
      const createdDocument = await storage.createDocument(newDocumentPayload);
      
      // console.log('[Documents] Document created successfully:', createdDocument.id); // Simplified log
      // console.log('[Documents] Fetching document details...');

      // Return the created document with author info by calling getDocument
      const documentWithDetails = await storage.getDocument(createdDocument.id, userId);

      if (!documentWithDetails) {
         logger.error('[Documents] Failed to retrieve created document details after creation', { documentId: createdDocument.id, userId, ip: req.ip });
        return res.status(500).json({ message: "Failed to retrieve created document details" });
      }

      // console.log('[Documents] Returning document with details:', documentWithDetails.id); // Simplified log
      res.status(201).json(documentWithDetails);
    } catch (error: any) {
      logger.error('[Documents] Error creating document in /api/documents (POST, routes.ts)', { error, userId: req.user?.claims?.sub, body: req.body, ip: req.ip });
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.patch('/api/documents/:id', devAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const documentId = parseInt(req.params.id);
      const updates = req.body;

      // The following logs were already removed/commented in a previous step, ensuring they stay that way.
      // console.log(`[API PATCH /api/documents/:id] Document ID: ${documentId}, User ID: ${userId}`);
      // console.log('[API PATCH /api/documents/:id] Incoming updates:', JSON.stringify(updates, (key, value) => key === 'content' ? `String with length ${value?.length}` : value));
      // if (updates.content !== undefined) {
      //   console.log('[API PATCH /api/documents/:id] Updates content length:', updates.content?.length);
      // }
      
      delete updates.id;
      delete updates.authorId;
      delete updates.createdAt;
      
      updates.updatedAt = new Date();

      const updatedDocument = await storage.updateDocument(documentId, userId, updates);
      // console.log('[API PATCH /api/documents/:id] Raw result from storage.updateDocument:', updatedDocument);


      if (!updatedDocument) {
        return res.status(404).json({ message: "Document not found or update failed" });
      }
      
      const documentWithDetails = await storage.getDocument(documentId, userId);

      if (!documentWithDetails) {
        logger.error(`[API PATCH /api/documents/:id] Failed to retrieve document details after update for ID: ${documentId}`, { userId, documentId, ip: req.ip });
        return res.status(500).json({ message: "Failed to retrieve updated document details" });
      }

      // console.log(`[API PATCH /api/documents/:id] Successfully updated and retrieved document: ID ${documentWithDetails.id}, UpdatedAt ${documentWithDetails.updatedAt}`);
      res.json(documentWithDetails);
    } catch (error: any) {
      logger.error(`[API PATCH /api/documents/:id] Error updating document ${documentId}`, { error, userId: req.user?.claims?.sub, documentId, body: req.body, ip: req.ip });
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.delete('/api/documents/:id', devAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const documentId = parseInt(req.params.id);
      
      const success = await storage.deleteDocument(documentId, userId);

      if (!success) {
        return res.status(404).json({ message: "Document not found or delete failed" });
      }
      
      res.status(204).send();
    } catch (error) {
      logger.error(`Error deleting document ${documentId} in /api/documents/:id (DELETE, routes.ts)`, { error, userId: req.user?.claims?.sub, documentId, ip: req.ip });
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
      
      const searchResults = await storage.searchDocuments(userId, query);
      res.json(searchResults);
    } catch (error) {
      logger.error("Error searching documents in /api/documents/search (routes.ts)", { error, userId: req.user?.claims?.sub, query, ip: req.ip });
      res.status(500).json({ message: "Failed to search documents" });
    }
  });

  // Folder routes
  app.get('/api/folders', devAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const parentIdQuery = req.query.parentId as string | undefined;

      let parentId: number | undefined = undefined;
      if (parentIdQuery && parentIdQuery !== 'null') {
        parentId = parseInt(parentIdQuery);
      }
      
      const userFolders = await storage.getFolders(userId, parentId);

      if (parentIdQuery === 'null') {
        res.json(userFolders.filter(folder => folder.parentId === null));
      } else {
        res.json(userFolders);
      }
    } catch (error) {
      logger.error("Error fetching folders in /api/folders (GET, routes.ts)", { error, userId: req.user?.claims?.sub, parentIdQuery, ip: req.ip });
      res.status(500).json({ message: "Failed to fetch folders" });
    }
  });

  app.post('/api/folders', devAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { name, parentId } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }

      if (parentId) {
        const userFolders = await storage.getFolders(userId);
        const parentFolderExists = userFolders.some(f => f.id === parentId);
        if (!parentFolderExists) {
          return res.status(404).json({ message: "Parent folder not found or access denied" });
        }
      }

      const foldersInParent = await storage.getFolders(userId, parentId || undefined);
      const duplicateNameExists = foldersInParent.some(
        (folder) => folder.name === name && folder.authorId === userId
      );

      if (duplicateNameExists) {
        return res.status(409).json({ 
          message: "Folder with this name already exists in this location" 
        });
      }
      
      const newFolderPayload = {
        name,
        authorId: userId,
        parentId: parentId || null
      };

      const createdFolder = await storage.createFolder(newFolderPayload);
      res.status(201).json(createdFolder);
    } catch (error) {
      logger.error("Error creating folder in /api/folders (POST, routes.ts)", { error, userId: req.user?.claims?.sub, body: req.body, ip: req.ip });
      res.status(500).json({ message: "Failed to create folder" });
    }
  });

  app.delete('/api/folders/:id', devAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const folderId = parseInt(req.params.id);
      
      const documentsInFolder = await storage.getDocuments(userId, folderId);
      if (documentsInFolder.length > 0) {
        return res.status(400).json({
          message: "Cannot delete folder that contains documents. Please move or delete them first."
        });
      }

      const subFolders = await storage.getFolders(userId, folderId);
      if (subFolders.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete folder that contains subfolders. Please move or delete them first."
        });
      }
      
      const success = await storage.deleteFolder(folderId, userId);

      if (!success) {
        return res.status(404).json({ message: "Folder not found or delete failed" });
      }
      
      res.status(204).send();
    } catch (error) {
      logger.error(`Error deleting folder ${folderId} in /api/folders/:id (DELETE, routes.ts)`, { error, userId: req.user?.claims?.sub, folderId, ip: req.ip });
      res.status(500).json({ message: "Failed to delete folder" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress;
    logger.info('WebSocket connection established', { clientIp });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleWebSocketMessage(ws, message, clientIp);
      } catch (error) {
        logger.error('Invalid WebSocket message', { error, rawData: data.toString(), clientIp });
      }
    }); 

    ws.on('close', () => {
      logger.info('WebSocket connection closed', { clientIp });
      Array.from(documentSessions.entries()).forEach(([documentId]) => {
        leaveDocument(ws, documentId);
      });
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error', { error, clientIp });
    });
  });

  function handleWebSocketMessage(ws: WebSocket, message: any, clientIp?: string) {
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
        logger.warn('Unknown WebSocket message type received', { messageType: message.type, clientIp });
    }
  }

  function joinDocument(ws: WebSocket, documentId: number, userId: string) {
    if (!documentSessions.has(documentId)) {
      documentSessions.set(documentId, new Set());
    }
    
    const session = { ws, userId };
    documentSessions.get(documentId)!.add(session);
    
    broadcastToDocument(documentId, {
      type: 'user-joined',
      userId,
      userEmail: 'developer@markdownmate.dev',
      displayName: 'Demo User'
    }, ws);
  }

  function leaveDocument(ws: WebSocket, documentId: number) {
    const sessions = documentSessions.get(documentId);
    if (sessions) {
      const sessionToRemove = Array.from(sessions).find(session => session.ws === ws);
      if (sessionToRemove) {
        sessions.delete(sessionToRemove);
        
        broadcastToDocument(documentId, {
          type: 'user-left',
          userId: sessionToRemove.userId
        }, ws);
        
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
            logger.error('Failed to send WebSocket message', { error, documentId, messageType: message.type });
          }
        }
      });
    }
  }

  return httpServer;
}
