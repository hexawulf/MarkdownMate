import {
  users,
  documents,
  folders,
  documentCollaborators,
  type User,
  type UpsertUser,
  type Document,
  type InsertDocument,
  type UpdateDocument,
  type DocumentWithDetails,
  type Folder,
  type InsertFolder,
  type FolderWithChildren,
  type InsertCollaborator,
  type DocumentCollaborator,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ilike, or } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Document operations
  getDocument(id: number, userId: string): Promise<DocumentWithDetails | undefined>;
  getDocuments(userId: string, folderId?: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, userId: string, updates: Partial<UpdateDocument>): Promise<Document | undefined>;
  deleteDocument(id: number, userId: string): Promise<boolean>;
  searchDocuments(userId: string, query: string): Promise<Document[]>;
  
  // Folder operations
  getFolders(userId: string, parentId?: number): Promise<Folder[]>;
  createFolder(folder: InsertFolder): Promise<Folder>;
  deleteFolder(id: number, userId: string): Promise<boolean>;
  
  // Collaboration operations
  addCollaborator(collaboration: InsertCollaborator): Promise<DocumentCollaborator>;
  removeCollaborator(documentId: number, userId: string): Promise<boolean>;
  getDocumentCollaborators(documentId: number): Promise<(DocumentCollaborator & { user: User })[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Document operations
  async getDocument(id: number, userId: string): Promise<DocumentWithDetails | undefined> {
    const [document] = await db
      .select({
        id: documents.id,
        title: documents.title,
        content: documents.content,
        authorId: documents.authorId,
        folderId: documents.folderId,
        isPublic: documents.isPublic,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        author: users,
        folder: folders,
      })
      .from(documents)
      .leftJoin(users, eq(documents.authorId, users.id))
      .leftJoin(folders, eq(documents.folderId, folders.id))
      .where(
        and(
          eq(documents.id, id),
          or(
            eq(documents.authorId, userId),
            eq(documents.isPublic, true),
            // TODO: Add collaborator check
          )
        )
      );

    if (!document) return undefined;

    const collaborators = await this.getDocumentCollaborators(id);

    return {
      ...document,
      collaborators,
    } as DocumentWithDetails;
  }

  async getDocuments(userId: string, folderId?: number): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.authorId, userId),
          folderId ? eq(documents.folderId, folderId) : undefined
        )
      )
      .orderBy(desc(documents.updatedAt));
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db
      .insert(documents)
      .values(document)
      .returning();
    return newDocument;
  }

  async updateDocument(id: number, userId: string, updates: Partial<UpdateDocument>): Promise<Document | undefined> {
    const [updatedDocument] = await db
      .update(documents)
      .set({ ...updates, updatedAt: new Date() })
      .where(
        and(
          eq(documents.id, id),
          eq(documents.authorId, userId)
        )
      )
      .returning();
    return updatedDocument;
  }

  async deleteDocument(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(documents)
      .where(
        and(
          eq(documents.id, id),
          eq(documents.authorId, userId)
        )
      );
    return (result.rowCount ?? 0) > 0;
  }

  async searchDocuments(userId: string, query: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.authorId, userId),
          or(
            ilike(documents.title, `%${query}%`),
            ilike(documents.content, `%${query}%`)
          )
        )
      )
      .orderBy(desc(documents.updatedAt))
      .limit(20);
  }

  // Folder operations
  async getFolders(userId: string, parentId?: number): Promise<Folder[]> {
    return await db
      .select()
      .from(folders)
      .where(
        and(
          eq(folders.authorId, userId),
          parentId ? eq(folders.parentId, parentId) : undefined
        )
      )
      .orderBy(folders.name);
  }

  async createFolder(folder: InsertFolder): Promise<Folder> {
    const result = await db
      .insert(folders)
      .values(folder)
      .returning();
    return result[0];
  }

  async deleteFolder(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(folders)
      .where(
        and(
          eq(folders.id, id),
          eq(folders.authorId, userId)
        )
      );
    return (result.rowCount ?? 0) > 0;
  }

  // Collaboration operations
  async addCollaborator(collaboration: InsertCollaborator): Promise<DocumentCollaborator> {
    const [collaborator] = await db
      .insert(documentCollaborators)
      .values(collaboration)
      .returning();
    return collaborator;
  }

  async removeCollaborator(documentId: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(documentCollaborators)
      .where(
        and(
          eq(documentCollaborators.documentId, documentId),
          eq(documentCollaborators.userId, userId)
        )
      );
    return (result.rowCount ?? 0) > 0;
  }

  async getDocumentCollaborators(documentId: number): Promise<(DocumentCollaborator & { user: User })[]> {
    return await db
      .select({
        id: documentCollaborators.id,
        documentId: documentCollaborators.documentId,
        userId: documentCollaborators.userId,
        permission: documentCollaborators.permission,
        createdAt: documentCollaborators.createdAt,
        user: users,
      })
      .from(documentCollaborators)
      .leftJoin(users, eq(documentCollaborators.userId, users.id))
      .where(eq(documentCollaborators.documentId, documentId));
  }
}

export const storage = new DatabaseStorage();
