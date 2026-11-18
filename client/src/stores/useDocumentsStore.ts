import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { create } from 'zustand';

// Document interface for IndexedDB
export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  isDeleted?: boolean;
  deletedAt?: number;
}

interface DocumentsDB extends DBSchema {
  documents: {
    key: string;
    value: Document;
    indexes: {
      'by-updatedAt': number;
      'by-createdAt': number;
    };
  };
}

// Database instance
let dbPromise: Promise<IDBPDatabase<DocumentsDB>> | null = null;

export const DB_VERSION = 2;

// Soft-deleted documents older than this are purged on load (MM-05).
export const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const getDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB<DocumentsDB>('markdownmate-db', DB_VERSION, {
      // MM-05: v2 drops the invalid boolean `by-isDeleted` index. Records are
      // kept untouched; only the index is removed. An existing v1 database
      // upgrades in place without losing a single document.
      upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('documents', { keyPath: 'id' });
          store.createIndex('by-updatedAt', 'updatedAt');
          store.createIndex('by-createdAt', 'createdAt');
        }
        if (oldVersion >= 1 && oldVersion < 2) {
          const store = tx.objectStore('documents');
          // The v1 schema had a `by-isDeleted` index that the v2 types no longer
          // declare, so reach it through a loosely-typed handle to drop it.
          const indexNames = store.indexNames as unknown as DOMStringList;
          if (indexNames.contains('by-isDeleted')) {
            (store as unknown as { deleteIndex: (name: string) => void }).deleteIndex('by-isDeleted');
          }
        }
      },
      // Another tab still holds an older connection (for example a v3.1.0 tab
      // opened before the deploy, which never closes on versionchange). The
      // browser waits until it closes; tell the user instead of "Loading..."
      // forever. The open resolves by itself once the other tab is closed.
      blocked() {
        useDocumentsStore.setState({ dbBlocked: true });
      },
      // A newer version in another tab needs to upgrade: release this
      // connection and reload, so that tab is never stuck behind this one.
      blocking() {
        void dbPromise?.then((db) => db.close());
        dbPromise = null;
        if (typeof window !== 'undefined') window.location.reload();
      },
      // The browser closed the connection unexpectedly: reopen on next use.
      terminated() {
        dbPromise = null;
      },
    });
  }
  return dbPromise;
};

// Test-only: drop the memoized connection so a fresh fake-indexeddb is used.
export const __resetDbForTests = () => {
  dbPromise = null;
  closeBroadcast();
};

// Cross-tab notification (MM-02). After any write we post {id, updatedAt} so
// other tabs can reload or warn. BroadcastChannel may be missing in old
// browsers / some test envs, so guard its use.
export const BROADCAST_NAME = 'markdownmate';
export interface DocBroadcast {
  type: 'updated' | 'deleted';
  id: string;
  updatedAt: number;
}

let channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) channel = new BroadcastChannel(BROADCAST_NAME);
  return channel;
}
function closeBroadcast() {
  if (channel) {
    channel.close();
    channel = null;
  }
}
function broadcast(message: DocBroadcast) {
  try {
    getChannel()?.postMessage(message);
  } catch {
    // ignore: a closed/unavailable channel must never break a write
  }
}

interface DocumentsState {
  documents: Document[];
  trash: Document[];
  currentDocument: Document | null;
  isLoading: boolean;
  hasLoadedInitialDocuments: boolean;
  // True while the IndexedDB upgrade waits for another (older) tab to close.
  dbBlocked: boolean;
  
  // CRUD operations
  loadDocuments: () => Promise<void>;
  loadTrash: () => Promise<void>;
  getDocument: (id: string) => Promise<Document | undefined>;
  createDocument: (title: string, content?: string) => Promise<Document>;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  softDeleteDocument: (id: string) => Promise<void>;
  restoreDocument: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  duplicateDocument: (id: string) => Promise<Document>;
  
  // Current document operations
  setCurrentDocument: (document: Document | null) => void;
  
  // Search operations
  searchDocuments: (query: string) => Document[];
}

export const useDocumentsStore = create<DocumentsState>((set, get) => ({
  documents: [],
  trash: [],
  currentDocument: null,
  isLoading: false,
  hasLoadedInitialDocuments: false,
  dbBlocked: false,

  loadDocuments: async () => {
    set({ isLoading: true });
    try {
      const db = await getDB();
      if (get().dbBlocked) set({ dbBlocked: false });
      // MM-05: purge soft-deleted documents older than the retention window
      // before listing. Done in one readwrite transaction.
      const cutoff = Date.now() - TRASH_RETENTION_MS;
      const tx = db.transaction('documents', 'readwrite');
      const all = await tx.store.getAll();
      for (const doc of all) {
        if (doc.isDeleted && typeof doc.deletedAt === 'number' && doc.deletedAt < cutoff) {
          await tx.store.delete(doc.id);
        }
      }
      await tx.done;

      const remaining = all.filter(
        (doc) => !(doc.isDeleted && typeof doc.deletedAt === 'number' && doc.deletedAt < cutoff),
      );
      const activeDocs = remaining
        .filter((doc) => !doc.isDeleted)
        .sort((a, b) => a.updatedAt - b.updatedAt)
        .reverse();
      const trash = remaining
        .filter((doc) => doc.isDeleted)
        .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
      set({ documents: activeDocs, trash, isLoading: false, hasLoadedInitialDocuments: true });
    } catch (error) {
      console.error('Failed to load documents:', error);
      set({ isLoading: false, hasLoadedInitialDocuments: true });
    }
  },

  loadTrash: async () => {
    try {
      const db = await getDB();
      const all = await db.getAll('documents');
      const trash = all
        .filter((doc) => doc.isDeleted)
        .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
      set({ trash });
    } catch (error) {
      console.error('Failed to load trash:', error);
    }
  },

  getDocument: async (id: string) => {
    try {
      const db = await getDB();
      return await db.get('documents', id);
    } catch (error) {
      console.error('Failed to get document:', error);
      return undefined;
    }
  },

  createDocument: async (title: string, content = '') => {
    const newDoc: Document = {
      id: crypto.randomUUID(),
      title,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      isDeleted: false,
    };

    try {
      const db = await getDB();
      await db.add('documents', newDoc);
      set(state => ({
        documents: [newDoc, ...state.documents],
        currentDocument: newDoc,
      }));
      broadcast({ type: 'updated', id: newDoc.id, updatedAt: newDoc.updatedAt });
      return newDoc;
    } catch (error) {
      console.error('Failed to create document:', error);
      throw error;
    }
  },

  updateDocument: async (id: string, updates: Partial<Document>) => {
    try {
      const db = await getDB();
      // MM-02: read, merge and write in one readwrite transaction so a
      // concurrent write cannot interleave between the read and the put.
      const tx = db.transaction('documents', 'readwrite');
      const doc = await tx.store.get(id);
      if (!doc) {
        await tx.done;
        throw new Error('Document not found');
      }
      const updatedDoc = {
        ...doc,
        ...updates,
        updatedAt: Date.now(),
      };
      await tx.store.put(updatedDoc);
      await tx.done;

      set(state => {
        // MM-08: a just-updated document moves to the top of the list, matching
        // the by-updatedAt order the sidebar is meant to show.
        const others = state.documents.filter(d => d.id !== id);
        return {
          documents: [updatedDoc, ...others],
          currentDocument: state.currentDocument?.id === id ? updatedDoc : state.currentDocument,
        };
      });
      broadcast({ type: 'updated', id, updatedAt: updatedDoc.updatedAt });
    } catch (error) {
      console.error('Failed to update document:', error);
      throw error;
    }
  },

  deleteDocument: async (id: string) => {
    try {
      const db = await getDB();
      await db.delete('documents', id);
      set(state => ({
        documents: state.documents.filter(d => d.id !== id),
        trash: state.trash.filter(d => d.id !== id),
        currentDocument: state.currentDocument?.id === id ? null : state.currentDocument,
      }));
      broadcast({ type: 'deleted', id, updatedAt: Date.now() });
    } catch (error) {
      console.error('Failed to delete document:', error);
      throw error;
    }
  },

  softDeleteDocument: async (id: string) => {
    try {
      const db = await getDB();
      const tx = db.transaction('documents', 'readwrite');
      const doc = await tx.store.get(id);
      if (!doc) {
        await tx.done;
        throw new Error('Document not found');
      }
      const updatedDoc = {
        ...doc,
        isDeleted: true,
        deletedAt: Date.now(),
        updatedAt: Date.now(),
      };
      await tx.store.put(updatedDoc);
      await tx.done;

      set(state => ({
        documents: state.documents.filter(d => d.id !== id),
        trash: [updatedDoc, ...state.trash.filter(d => d.id !== id)],
        currentDocument: state.currentDocument?.id === id ? null : state.currentDocument,
      }));
      broadcast({ type: 'updated', id, updatedAt: updatedDoc.updatedAt });
    } catch (error) {
      console.error('Failed to soft delete document:', error);
      throw error;
    }
  },

  restoreDocument: async (id: string) => {
    try {
      const db = await getDB();
      const tx = db.transaction('documents', 'readwrite');
      const doc = await tx.store.get(id);
      if (!doc) {
        await tx.done;
        throw new Error('Document not found');
      }
      const updatedDoc = {
        ...doc,
        isDeleted: false,
        deletedAt: undefined,
        updatedAt: Date.now(),
      };
      await tx.store.put(updatedDoc);
      await tx.done;

      set(state => ({
        documents: [updatedDoc, ...state.documents],
        trash: state.trash.filter(d => d.id !== id),
      }));
      broadcast({ type: 'updated', id, updatedAt: updatedDoc.updatedAt });
    } catch (error) {
      console.error('Failed to restore document:', error);
      throw error;
    }
  },

  emptyTrash: async () => {
    try {
      const db = await getDB();
      const trashed = get().trash;
      const tx = db.transaction('documents', 'readwrite');
      for (const doc of trashed) {
        await tx.store.delete(doc.id);
      }
      await tx.done;
      set({ trash: [] });
      for (const doc of trashed) {
        broadcast({ type: 'deleted', id: doc.id, updatedAt: Date.now() });
      }
    } catch (error) {
      console.error('Failed to empty trash:', error);
      throw error;
    }
  },

  duplicateDocument: async (id: string) => {
    try {
      const db = await getDB();
      const doc = await db.get('documents', id);
      if (!doc) throw new Error('Document not found');

      const duplicatedDoc: Document = {
        ...doc,
        id: crypto.randomUUID(),
        title: `${doc.title} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.add('documents', duplicatedDoc);
      set(state => ({
        documents: [duplicatedDoc, ...state.documents],
      }));
      broadcast({ type: 'updated', id: duplicatedDoc.id, updatedAt: duplicatedDoc.updatedAt });
      return duplicatedDoc;
    } catch (error) {
      console.error('Failed to duplicate document:', error);
      throw error;
    }
  },

  setCurrentDocument: (document: Document | null) => {
    set({ currentDocument: document });
  },

  searchDocuments: (query: string) => {
    const { documents } = get();
    if (!query.trim()) return documents;

    const lowerQuery = query.toLowerCase();
    return documents.filter(doc => 
      doc.title.toLowerCase().includes(lowerQuery) ||
      doc.content.toLowerCase().includes(lowerQuery) ||
      doc.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  },
}));
