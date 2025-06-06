import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documents table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").default(""),
  authorId: varchar("author_id").notNull().references(() => users.id),
  folderId: integer("folder_id").references(() => folders.id),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Folders table
export const folders = pgTable("folders", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  authorId: varchar("author_id").notNull().references(() => users.id),
  parentId: integer("parent_id").references(() => folders.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Document collaborators table
export const documentCollaborators = pgTable("document_collaborators", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  permission: varchar("permission", { length: 50 }).notNull().default("read"), // read, write, admin
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  folders: many(folders),
  collaborations: many(documentCollaborators),
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
  }),
  children: many(folders),
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
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateDocumentSchema = insertDocumentSchema.partial().extend({
  id: z.number(),
});

export const insertFolderSchema = createInsertSchema(folders).omit({
  id: true,
  createdAt: true,
});

export const insertCollaboratorSchema = createInsertSchema(documentCollaborators).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type UpdateDocument = z.infer<typeof updateDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type Folder = typeof folders.$inferSelect;
export type InsertCollaborator = z.infer<typeof insertCollaboratorSchema>;
export type DocumentCollaborator = typeof documentCollaborators.$inferSelect;

// Extended types with relations
export type DocumentWithDetails = Document & {
  author: User;
  folder?: Folder;
  collaborators: (DocumentCollaborator & { user: User })[];
};

export type FolderWithChildren = Folder & {
  children: Folder[];
  documents: Document[];
};
