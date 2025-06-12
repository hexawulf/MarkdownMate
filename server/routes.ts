import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
// import { db } from "../lib/db"; // No longer directly used
// import { users, documents, folders, documentCollaborators } from "../shared/schema"; // Encapsulated by storage
// import { eq, desc, ilike, or, and, count, isNull } from "drizzle-orm"; // Encapsulated by storage
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
    await setupAuth(app);
  } catch (error) {
    console.error("[Auth] CRITICAL: Firebase Auth setup failed!", error);
    console.warn("[Auth] Server is continuing with development mode auth behavior due to Firebase setup failure.");
  }

  // Server-side fallback redirect for authenticated users.
  // This handler checks if a user accessing the root path ('/') is already authenticated.
  // If authenticated, it redirects them to the external editor.
  // This acts as a fallback for client-side redirection and ensures users with valid sessions
  // are taken directly to the editor experience.
  // This route must be registered *before* any static file serving middleware for the root path
  // or catch-all SPA handlers, to ensure it's processed first for the '/' route.
  app.get('/', async (req, res, next) => {
    // Note: In development, you might want to see the landing page even if authenticated.
    // To disable this redirect during development, you could uncomment the next line:
    // if (process.env.NODE_ENV === 'development') { return next(); }

    // Attempt to retrieve the authentication token from the request.
    const token = getTokenFromRequest(req);

    if (token) {
      try {
        // Verify the token using Firebase Admin SDK.
        // This confirms the token is valid and not expired.
        await getAuth().verifyIdToken(token);
        // If token verification is successful, the user is authenticated.
        // Redirect them to the external editor.
        console.log('[Auth] User with valid token accessed root path. Redirecting to external editor.');
        res.redirect(302, 'https://markdown.piapps.dev/editor');
      } catch (error) {
        // If token verification fails (e.g., invalid, expired),
        // treat the user as unauthenticated for this request.
        console.log('[Auth] Token verification failed for root path access. Proceeding to landing page.', error.message);
        // Call next() to pass control to the next middleware,
        // which should serve the landing page for unauthenticated users.
        next();
      }
    } else {
      // If no token is found in the request, the user is unauthenticated.
      // Call next() to pass control to the next middleware (e.g., serve landing page).
      next();
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
      // Try to get existing user first
      let user = await storage.getUser(devUser.id);

      if (user) {
        return user;
      }

      // Insert new user if doesn't exist
      user = await storage.upsertUser(devUser);
      return user;
    } catch (error) {
      console.error("Failed to create dev user:", error);
      // Return basic info if storage fails, consistent with previous behavior
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
      console.error("Failed to upsert Firebase user:", error);
      throw error;
    }
  };

  // Auth routes
  // IMPORTANT: The root '/' handler above must be registered before any static file serving for '/' or catch-all for SPA.
  app.get('/api/auth/user', devAuth, async (req: any, res: Response) => {
    console.log('[/api/auth/user] Handler invoked. req.user:', JSON.stringify(req.user, null, 2));
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
      
      const user = await upsertFirebaseUser(req.user.claims);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
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

      // storage.getDocuments expects number | undefined. null means root for some DB queries but not for storage.ts
      let folderId: number | undefined = undefined;
      if (folderIdQuery && folderIdQuery !== 'null') {
        folderId = parseInt(folderIdQuery);
      } else if (folderIdQuery === 'null') {
        // This case implies documents at the root (folderId is null in DB)
        // storage.getDocuments with folderId=undefined should fetch these if it also fetches non-folderId docs.
        // Based on storage.ts, if folderId is undefined, it fetches all docs for the user.
        // If folderId is a number, it filters by that folderId.
        // We need to clarify if `storage.getDocuments(userId, undefined)` includes those with folderId IS NULL.
        // Assuming storage.getDocuments(userId, undefined) gets ALL documents, and
        // storage.getDocuments(userId, specificFolderId) gets documents for that folder.
        // The old logic had a specific case for folderId === null (isNull(documents.folderId)).
        // The current storage.getDocuments does not directly support querying for IS NULL folderId explicitly.
        // It seems storage.getDocuments(userId, undefined) fetches all, then we might need to filter locally if only root items are needed.
        // However, the prompt says "Adjust filtering for folderId as the storage.getDocuments method already handles it."
        // storage.getDocuments(userId, folderId) -> where(and(eq(documents.authorId, userId), folderId ? eq(documents.folderId, folderId) : undefined))
        // This means if folderId is undefined, it only filters by userId. This is not what we want for the 'null' case.
        // For now, I will call storage.getDocuments and if folderIdQuery === 'null', I'll filter results.
        // This is a deviation but necessary with current storage.ts.
        // Alternative: if folderIdQuery === 'null', pass a special value if storage supported it, or fetch all and filter.
      }

      const userDocuments = await storage.getDocuments(userId, folderId);

      if (folderIdQuery === 'null') {
        res.json(userDocuments.filter(doc => doc.folderId === null));
      } else {
        res.json(userDocuments);
      }
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
      
      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }

      // If folderId provided, verify it exists and user owns it
      if (folderId) {
        // storage.getFolders(userId, parentId) but we need to find a specific folder by ID.
        // We can fetch all folders for the user and then filter, or rely on a more specific (not available) storage method.
        // For now, let's fetch folders and check. This is not ideal for performance if there are many folders.
        const userFolders = await storage.getFolders(userId);
        const folderExists = userFolders.some(f => f.id === folderId);
        if (!folderExists) {
          return res.status(404).json({ message: "Folder not found or access denied" });
        }
      }
      
      const newDocumentPayload = {
        title,
        content: content || '',
        authorId: userId,
        folderId: folderId || null,
        isPublic: false // Default value
      };

      const createdDocument = await storage.createDocument(newDocumentPayload);

      // Return the created document with author info by calling getDocument
      const documentWithDetails = await storage.getDocument(createdDocument.id, userId);

      if (!documentWithDetails) {
        // This should ideally not happen if createDocument succeeded
        return res.status(500).json({ message: "Failed to retrieve created document details" });
      }

      res.status(201).json(documentWithDetails);
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
      
      // Remove fields that shouldn't be updated directly
      delete updates.id;
      delete updates.authorId;
      delete updates.createdAt;
      
      // Add updated timestamp
      updates.updatedAt = new Date(); // storage.updateDocument handles this

      const updatedDocument = await storage.updateDocument(documentId, userId, updates);

      if (!updatedDocument) {
        return res.status(404).json({ message: "Document not found or update failed" });
      }
      
      // Return the updated document with author info
      const documentWithDetails = await storage.getDocument(documentId, userId);

      if (!documentWithDetails) {
        // This should ideally not happen if updateDocument succeeded and returned a document
        return res.status(500).json({ message: "Failed to retrieve updated document details" });
      }

      res.json(documentWithDetails);
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
        return res.status(404).json({ message: "Document not found or delete failed" });
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
      
      // storage.searchDocuments returns Document[], which might not have author/folder details.
      // The previous query joined to get these. storage.ts searchDocuments only returns Document columns.
      // This is a change in response if DocumentWithDetails was expected.
      // The prompt for this route was: Replace `db.select()...` with `storage.searchDocuments()`.
      // The return type of storage.searchDocuments is Document[], not DocumentWithDetails[].
      // This means author and folder details will be missing if we directly use it.
      // For now, I will follow the direct replacement instruction.
      // If full details are needed, this would require a change in storage.ts or post-processing here.
      const searchResults = await storage.searchDocuments(userId, query);
      
      res.json(searchResults);
    } catch (error) {
      console.error("Error searching documents:", error);
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
      } else if (parentIdQuery === 'null') {
        // storage.getFolders(userId, undefined) is for root folders if it filters parentId = null.
        // storage.getFolders(userId, parentId) in storage.ts:
        // .where(and(eq(folders.authorId, userId), parentId ? eq(folders.parentId, parentId) : undefined))
        // This means parentId = undefined in the call will NOT filter for parentId IS NULL. It will return all folders.
        // This is similar to the /api/documents issue.
        // For now, if parentIdQuery === 'null', I'll fetch all and filter.
        // This is not ideal. The alternative would be for storage.getFolders to explicitly handle null for parentId.
      }
      
      const userFolders = await storage.getFolders(userId, parentId);

      // The old query returned FolderWithDetails (including author) and documentCount.
      // storage.getFolders returns Folder[].
      // This is a change in API response: author details and documentCount will be missing.
      // The prompt mentioned documentCount would be lost. Author details are also not in Folder type.
      // For now, this is a direct replacement.
      if (parentIdQuery === 'null') {
        res.json(userFolders.filter(folder => folder.parentId === null));
      } else {
        res.json(userFolders);
      }
    } catch (error) {
      console.error("Error fetching folders:", error);
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

      // If parentId provided, verify parent folder exists and user owns it
      if (parentId) {
        const userFolders = await storage.getFolders(userId); // Fetches all folders for user
        const parentFolderExists = userFolders.some(f => f.id === parentId);
        if (!parentFolderExists) {
          return res.status(404).json({ message: "Parent folder not found or access denied" });
        }
      }

      // Check for duplicate folder names in same parent
      // storage.getFolders(userId, parentId) can list folders in the target parent location.
      // If parentId is null/undefined, it means root.
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

      // storage.createFolder returns Folder.
      // The old response included author and documentCount. These will be missing.
      res.status(201).json(createdFolder);
    } catch (error) {
      console.error("Error creating folder:", error);
      res.status(500).json({ message: "Failed to create folder" });
    }
  });

  app.delete('/api/folders/:id', devAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const folderId = parseInt(req.params.id);
      
      // Check if folder has any documents or subfolders
      // storage.getDocuments(userId, folderId) to check for documents in this folder by this user
      const documentsInFolder = await storage.getDocuments(userId, folderId);
      if (documentsInFolder.length > 0) {
        return res.status(400).json({
          message: "Cannot delete folder that contains documents. Please move or delete them first."
        });
      }

      // storage.getFolders(userId, folderId) to check for subfolders in this folder by this user
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
      displayName: 'Demo User'
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
