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
      'by-isDeleted': number;
    };
  };
}

// Database instance
let dbPromise: Promise<IDBPDatabase<DocumentsDB>> | null = null;

const getDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB<DocumentsDB>('markdownmate-db', 1, {
      upgrade(db) {
        const store = db.createObjectStore('documents', { keyPath: 'id' });
        store.createIndex('by-updatedAt', 'updatedAt');
        store.createIndex('by-createdAt', 'createdAt');
        store.createIndex('by-isDeleted', 'isDeleted');
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
  currentDocument: Document | null;
  isLoading: boolean;
  hasLoadedInitialDocuments: boolean;
  
  // CRUD operations
  loadDocuments: () => Promise<void>;
  getDocument: (id: string) => Promise<Document | undefined>;
  createDocument: (title: string, content?: string) => Promise<Document>;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  softDeleteDocument: (id: string) => Promise<void>;
  restoreDocument: (id: string) => Promise<void>;
  duplicateDocument: (id: string) => Promise<Document>;
  
  // Current document operations
  setCurrentDocument: (document: Document | null) => void;
  
  // Search operations
  searchDocuments: (query: string) => Document[];
}

export const useDocumentsStore = create<DocumentsState>((set, get) => ({
  documents: [],
  currentDocument: null,
  isLoading: false,
  hasLoadedInitialDocuments: false,

  loadDocuments: async () => {
    set({ isLoading: true });
    try {
      const db = await getDB();
      const allDocs = await db.getAllFromIndex('documents', 'by-updatedAt');
      const activeDocs = allDocs.filter(doc => !doc.isDeleted).reverse();
      set({ documents: activeDocs, isLoading: false, hasLoadedInitialDocuments: true });
    } catch (error) {
      console.error('Failed to load documents:', error);
      set({ isLoading: false, hasLoadedInitialDocuments: true });
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

      set(state => ({
        documents: state.documents.map(d => d.id === id ? updatedDoc : d),
        currentDocument: state.currentDocument?.id === id ? updatedDoc : state.currentDocument,
      }));
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
      }));
      broadcast({ type: 'updated', id, updatedAt: updatedDoc.updatedAt });
    } catch (error) {
      console.error('Failed to restore document:', error);
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
