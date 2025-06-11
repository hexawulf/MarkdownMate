import {
  pgTable,
  text,
  varchar,
  timestamp,
  index,
  serial,
  boolean,
  integer,
  check,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

// User storage table - optimized for Firebase Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(), // Firebase UID
  email: varchar("email").unique().notNull(), // Firebase email (required)
  displayName: varchar("display_name"), // Firebase displayName
  photoURL: varchar("photo_url"), // Firebase profile photo URL
  emailVerified: boolean("email_verified").default(false), // Firebase email verification status
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_users_email").on(table.email),
  index("idx_users_email_verified").on(table.emailVerified),
]);

// Folders table - with performance indexes
export const folders = pgTable("folders", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  authorId: varchar("author_id").notNull().references(() => users.id),
  parentId: integer("parent_id").references(() => folders.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_folders_author_id").on(table.authorId),
  index("idx_folders_parent_id").on(table.parentId),
]);

// Documents table - with performance indexes
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").default(""),
  authorId: varchar("author_id").notNull().references(() => users.id),
  folderId: integer("folder_id").references(() => folders.id),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_documents_author_id").on(table.authorId),
  index("idx_documents_folder_id").on(table.folderId),
  index("idx_documents_is_public").on(table.isPublic),
  index("idx_documents_updated_at").on(table.updatedAt), // For sorting by last modified
]);

// Document collaborators table - with constraints and indexes
export const documentCollaborators = pgTable("document_collaborators", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  permission: varchar("permission", { length: 20 }).notNull().default("read"),
  invitedBy: varchar("invited_by").references(() => users.id), // Track who invited the collaborator
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_collaborators_document_id").on(table.documentId),
  index("idx_collaborators_user_id").on(table.userId),
  index("idx_collaborators_permission").on(table.permission),
  // Unique constraint to prevent duplicate collaborations
  index("idx_unique_document_user").on(table.documentId, table.userId),
  // Check constraint for valid permission values
  check("valid_permission", sql`permission IN ('read', 'write', 'admin')`),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  folders: many(folders),
  collaborations: many(documentCollaborators, { relationName: "userCollaborations" }),
  invitedCollaborations: many(documentCollaborators, { relationName: "inviterCollaborations" }),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  author: one(users, {
    fields: [documents.authorId],
    references: [users.id],
  }),
  folder: one(folders, {
    fields: [documents.folderId],
    references: [folders.id],
  }),
  collaborators: many(documentCollaborators),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  author: one(users, {
    fields: [folders.authorId],
    references: [users.id],
  }),
  parent: one(folders, {
    fields: [folders.parentId],
    references: [folders.id],
    relationName: "folder_hierarchy",
  }),
  children: many(folders, {
    relationName: "folder_hierarchy",
  }),
  documents: many(documents),
}));

export const documentCollaboratorsRelations = relations(documentCollaborators, ({ one }) => ({
  document: one(documents, {
    fields: [documentCollaborators.documentId],
    references: [documents.id],
  }),
  user: one(users, {
    fields: [documentCollaborators.userId],
    references: [users.id],
    relationName: "userCollaborations",
  }),
  inviter: one(users, {
    fields: [documentCollaborators.invitedBy],
    references: [users.id],
    relationName: "inviterCollaborations",
  }),
}));

// Zod schemas with Firebase-compatible validation
export const insertUserSchema = createInsertSchema(users).extend({
  id: z.string().min(1), // Firebase UID
  email: z.string().email(),
  displayName: z.string().min(1).max(100).optional(),
  photoURL: z.string().url().optional(),
  emailVerified: z.boolean().optional(),
});

export const updateUserSchema = insertUserSchema.partial().extend({
  id: z.string().min(1), // ID required for updates
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1).max(255),
  content: z.string().optional(),
});

export const updateDocumentSchema = insertDocumentSchema.partial().extend({
  id: z.number().positive(),
});

export const insertFolderSchema = createInsertSchema(folders).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1).max(255),
});

export const insertCollaboratorSchema = createInsertSchema(documentCollaborators).omit({
  id: true,
  createdAt: true,
}).extend({
  permission: z.enum(["read", "write", "admin"]),
});

// Enhanced types for Firebase Auth
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type UpdateDocument = z.infer<typeof updateDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type Folder = typeof folders.$inferSelect;
export type InsertCollaborator = z.infer<typeof insertCollaboratorSchema>;
export type DocumentCollaborator = typeof documentCollaborators.$inferSelect;

// Permission type for type safety
export type Permission = "read" | "write" | "admin";

// Extended types with relations
export type DocumentWithDetails = Document & {
  author: User;
  folder?: Folder;
  collaborators: (DocumentCollaborator & { 
    user: User;
    inviter?: User;
  })[];
};

export type FolderWithChildren = Folder & {
  author: User;
  parent?: Folder;
  children: Folder[];
  documents: Document[];
};

export type UserWithDocuments = User & {
  documents: Document[];
  folders: Folder[];
  collaborations: (DocumentCollaborator & { document: Document })[];
};

// Utility types for common queries
export type DocumentListItem = Pick<Document, 'id' | 'title' | 'isPublic' | 'createdAt' | 'updatedAt'> & {
  author: Pick<User, 'id' | 'displayName' | 'email'>;
  folder?: Pick<Folder, 'id' | 'name'>;
  collaboratorCount: number;
};

export type FolderTreeItem = Pick<Folder, 'id' | 'name' | 'parentId'> & {
  documentCount: number;
  childCount: number;
};

// Firebase-specific helper types
export type FirebaseUser = {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
};

export type CreateUserFromFirebase = {
  id: string; // Firebase UID
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
};
