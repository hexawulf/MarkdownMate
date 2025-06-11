import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "../lib/db";
import { users, documents, folders, documentCollaborators } from "../shared/schema";
import { eq, desc, ilike, or, and, count, isNull } from "drizzle-orm";
import { setupAuth, isAuthenticated } from "./firebaseAuth";

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
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, devUser.id))
        .limit(1);

      if (existingUser.length > 0) {
        return existingUser[0];
      }

      // Insert new user if doesn't exist
      await db.insert(users).values(devUser);
      
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, devUser.id))
        .limit(1);
      
      return user[0];
    } catch (error) {
      console.error("Failed to create dev user:", error);
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
      // Try to get existing user first
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, userData.id))
        .limit(1);

      if (existingUser.length > 0) {
        // Update existing user
        await db
          .update(users)
          .set({
            email: userData.email,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
            emailVerified: userData.emailVerified,
            updatedAt: new Date()
          })
          .where(eq(users.id, userData.id));
      } else {
        // Insert new user
        await db.insert(users).values(userData);
      }

      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userData.id))
        .limit(1);

      return user[0];
    } catch (error) {
      console.error("Failed to upsert Firebase user:", error);
      throw error;
    }
  };

  // Auth routes
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

  // Document routes
  app.get('/api/documents', devAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const folderId = req.query.folderId ? parseInt(req.query.folderId as string) : undefined;
      
      let whereConditions = [eq(documents.authorId, userId)];

      if (folderId !== undefined) {
        if (folderId === null) {
          whereConditions.push(isNull(documents.folderId));
        } else {
          whereConditions.push(eq(documents.folderId, folderId));
        }
      }

      const result = await db
        .select({
          id: documents.id,
          title: documents.title,
          content: documents.content,
          isPublic: documents.isPublic,
          createdAt: documents.createdAt,
          updatedAt: documents.updatedAt,
          author: {
            id: users.id,
            displayName: users.displayName,
            email: users.email,
          },
          folder: {
            id: folders.id,
            name: folders.name,
          }
        })
        .from(documents)
        .leftJoin(users, eq(documents.authorId, users.id))
        .leftJoin(folders, eq(documents.folderId, folders.id))
        .where(and(...whereConditions))
        .orderBy(desc(documents.updatedAt));

      res.json(result);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get('/api/documents/:id', devAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const documentId = parseInt(req.params.id);
      
      const document = await db
        .select({
          id: documents.id,
          title: documents.title,
          content: documents.content,
          isPublic: documents.isPublic,
          createdAt: documents.createdAt,
          updatedAt: documents.updatedAt,
          author: {
            id: users.id,
            displayName: users.displayName,
            email: users.email,
          },
          folder: {
            id: folders.id,
            name: folders.name,
          }
        })
        .from(documents)
        .leftJoin(users, eq(documents.authorId, users.id))
        .leftJoin(folders, eq(documents.folderId, folders.id))
        .where(
          and(
            eq(documents.id, documentId),
            or(
              eq(documents.authorId, userId),
              eq(documents.isPublic, true)
              // TODO: Add collaborator access check
            )
          )
        )
        .limit(1);
      
      if (document.length === 0) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json(document[0]);
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
        const folder = await db
          .select()
          .from(folders)
          .where(
            and(
              eq(folders.id, folderId),
              eq(folders.authorId, userId)
            )
          )
          .limit(1);

        if (folder.length === 0) {
          return res.status(404).json({ message: "Folder not found" });
        }
      }
      
      const newDocument = await db
        .insert(documents)
        .values({
          title,
          content: content || '',
          authorId: userId,
          folderId: folderId || null,
          isPublic: false
        })
        .returning();
      
      // Return the created document with author info
      const documentWithDetails = await db
        .select({
          id: documents.id,
          title: documents.title,
          content: documents.content,
          isPublic: documents.isPublic,
          createdAt: documents.createdAt,
          updatedAt: documents.updatedAt,
          author: {
            id: users.id,
            displayName: users.displayName,
            email: users.email,
          },
          folder: {
            id: folders.id,
            name: folders.name,
          }
        })
        .from(documents)
        .leftJoin(users, eq(documents.authorId, users.id))
        .leftJoin(folders, eq(documents.folderId, folders.id))
        .where(eq(documents.id, newDocument[0].id))
        .limit(1);
      
      res.status(201).json(documentWithDetails[0]);
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
      updates.updatedAt = new Date();
      
      const updatedDocument = await db
        .update(documents)
        .set(updates)
        .where(
          and(
            eq(documents.id, documentId),
            eq(documents.authorId, userId)
          )
        )
        .returning();
      
      if (updatedDocument.length === 0) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Return the updated document with author info
      const documentWithDetails = await db
        .select({
          id: documents.id,
          title: documents.title,
          content: documents.content,
          isPublic: documents.isPublic,
          createdAt: documents.createdAt,
          updatedAt: documents.updatedAt,
          author: {
            id: users.id,
            displayName: users.displayName,
            email: users.email,
          },
          folder: {
            id: folders.id,
            name: folders.name,
          }
        })
        .from(documents)
        .leftJoin(users, eq(documents.authorId, users.id))
        .leftJoin(folders, eq(documents.folderId, folders.id))
        .where(eq(documents.id, documentId))
        .limit(1);
      
      res.json(documentWithDetails[0]);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.delete('/api/documents/:id', devAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const documentId = parseInt(req.params.id);
      
      const deletedDocument = await db
        .delete(documents)
        .where(
          and(
            eq(documents.id, documentId),
            eq(documents.authorId, userId)
          )
        )
        .returning();
      
      if (deletedDocument.length === 0) {
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
      
      const searchResults = await db
        .select({
          id: documents.id,
          title: documents.title,
          content: documents.content,
          isPublic: documents.isPublic,
          createdAt: documents.createdAt,
          updatedAt: documents.updatedAt,
          author: {
            id: users.id,
            displayName: users.displayName,
            email: users.email,
          },
          folder: {
            id: folders.id,
            name: folders.name,
          }
        })
        .from(documents)
        .leftJoin(users, eq(documents.authorId, users.id))
        .leftJoin(folders, eq(documents.folderId, folders.id))
        .where(
          and(
            eq(documents.authorId, userId),
            or(
              ilike(documents.title, `%${query}%`),
              ilike(documents.content, `%${query}%`)
            )
          )
        )
        .orderBy(desc(documents.updatedAt));
      
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
      const parentId = req.query.parentId ? parseInt(req.query.parentId as string) : undefined;
      
      let whereConditions = [eq(folders.authorId, userId)];

      if (parentId !== undefined) {
        if (parentId === null) {
          whereConditions.push(isNull(folders.parentId));
        } else {
          whereConditions.push(eq(folders.parentId, parentId));
        }
      }

      const result = await db
        .select({
          id: folders.id,
          name: folders.name,
          parentId: folders.parentId,
          createdAt: folders.createdAt,
          author: {
            id: users.id,
            displayName: users.displayName,
            email: users.email,
          },
          documentCount: count(documents.id),
        })
        .from(folders)
        .leftJoin(users, eq(folders.authorId, users.id))
        .leftJoin(documents, eq(folders.id, documents.folderId))
        .where(and(...whereConditions))
        .groupBy(folders.id, users.id, users.displayName, users.email)
        .orderBy(folders.name);
      
      res.json(result);
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
        const parentFolder = await db
          .select()
          .from(folders)
          .where(
            and(
              eq(folders.id, parentId),
              eq(folders.authorId, userId)
            )
          )
          .limit(1);

        if (parentFolder.length === 0) {
          return res.status(404).json({ message: "Parent folder not found" });
        }
      }

      // Check for duplicate folder names in same parent
      const whereConditions = [
        eq(folders.name, name),
        eq(folders.authorId, userId)
      ];

      if (parentId) {
        whereConditions.push(eq(folders.parentId, parentId));
      } else {
        whereConditions.push(isNull(folders.parentId));
      }

      const existingFolder = await db
        .select()
        .from(folders)
        .where(and(...whereConditions))
        .limit(1);

      if (existingFolder.length > 0) {
        return res.status(409).json({ 
          message: "Folder with this name already exists in this location" 
        });
      }
      
      const newFolder = await db
        .insert(folders)
        .values({
          name,
          authorId: userId,
          parentId: parentId || null
        })
        .returning();
      
      // Return the created folder with author info
      const folderWithDetails = await db
        .select({
          id: folders.id,
          name: folders.name,
          parentId: folders.parentId,
          createdAt: folders.createdAt,
          author: {
            id: users.id,
            displayName: users.displayName,
            email: users.email,
          },
          documentCount: count(documents.id),
        })
        .from(folders)
        .leftJoin(users, eq(folders.authorId, users.id))
        .leftJoin(documents, eq(folders.id, documents.folderId))
        .where(eq(folders.id, newFolder[0].id))
        .groupBy(folders.id, users.id, users.displayName, users.email)
        .limit(1);
      
      res.status(201).json(folderWithDetails[0]);
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
      const hasDocuments = await db
        .select({ count: count() })
        .from(documents)
        .where(eq(documents.folderId, folderId));

      const hasSubfolders = await db
        .select({ count: count() })
        .from(folders)
        .where(eq(folders.parentId, folderId));

      if (hasDocuments[0].count > 0 || hasSubfolders[0].count > 0) {
        return res.status(400).json({ 
          message: "Cannot delete folder that contains documents or subfolders" 
        });
      }
      
      const deletedFolder = await db
        .delete(folders)
        .where(
          and(
            eq(folders.id, folderId),
            eq(folders.authorId, userId)
          )
        )
        .returning();
      
      if (deletedFolder.length === 0) {
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
