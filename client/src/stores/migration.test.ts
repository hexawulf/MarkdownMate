// @vitest-environment jsdom
// MM-05: upgrading a version-1 database (with the invalid by-isDeleted index and
// soft-deleted records) to version 2 must keep every document, drop the index,
// support restore, and purge documents deleted more than 30 days ago.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import {
  useDocumentsStore,
  __resetDbForTests,
  TRASH_RETENTION_MS,
  type Document,
} from "./useDocumentsStore";

function doc(partial: Partial<Document>): Document {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "Untitled",
    content: "",
    createdAt: now,
    updatedAt: now,
    tags: [],
    isDeleted: false,
    ...partial,
  };
}

// Create the exact v1 schema the released app shipped (with by-isDeleted),
// seeded with the given documents.
async function seedV1(docs: Document[]) {
  const db = await openDB("markdownmate-db", 1, {
    upgrade(d) {
      const store = d.createObjectStore("documents", { keyPath: "id" });
      store.createIndex("by-updatedAt", "updatedAt");
      store.createIndex("by-createdAt", "createdAt");
      store.createIndex("by-isDeleted", "isDeleted");
    },
  });
  const tx = db.transaction("documents", "readwrite");
  for (const dd of docs) await tx.store.put(dd);
  await tx.done;
  db.close();
}

async function resetFactory() {
  globalThis.indexedDB = new IDBFactory();
  __resetDbForTests();
  useDocumentsStore.setState({
    documents: [],
    trash: [],
    currentDocument: null,
    isLoading: false,
    hasLoadedInitialDocuments: false,
  });
}

beforeEach(resetFactory);
afterEach(resetFactory);

describe("MM-05: v1 -> v2 migration", () => {
  it("keeps every document, drops by-isDeleted, and separates active vs trash", async () => {
    const active = doc({ title: "Active", content: "keep me" });
    const recentlyDeleted = doc({
      title: "Recently deleted",
      isDeleted: true,
      deletedAt: Date.now() - 1000,
    });
    await seedV1([active, recentlyDeleted]);

    // The store opens at version 2 and upgrades the existing DB in place.
    await useDocumentsStore.getState().loadDocuments();

    const { documents, trash } = useDocumentsStore.getState();
    expect(documents.map((d) => d.id)).toContain(active.id);
    expect(trash.map((d) => d.id)).toContain(recentlyDeleted.id);

    // The invalid index is gone.
    const raw = await openDB("markdownmate-db", 2);
    const store = raw.transaction("documents").store;
    expect(Array.from(store.indexNames)).not.toContain("by-isDeleted");
    // No document was lost.
    expect(await raw.count("documents")).toBe(2);
    raw.close();
  });

  it("purges soft-deleted documents older than the retention window on load", async () => {
    const stale = doc({
      title: "Stale",
      isDeleted: true,
      deletedAt: Date.now() - TRASH_RETENTION_MS - 60_000,
    });
    const fresh = doc({ title: "Fresh", content: "x" });
    await seedV1([stale, fresh]);

    await useDocumentsStore.getState().loadDocuments();

    const raw = await openDB("markdownmate-db", 2);
    const remaining = await raw.getAll("documents");
    raw.close();
    expect(remaining.map((d) => d.id)).toContain(fresh.id);
    expect(remaining.map((d) => d.id)).not.toContain(stale.id);
  });

  it("restore moves a document out of the trash", async () => {
    const deleted = doc({ title: "Bring back", isDeleted: true, deletedAt: Date.now() - 1000 });
    await seedV1([deleted]);
    await useDocumentsStore.getState().loadDocuments();

    await useDocumentsStore.getState().restoreDocument(deleted.id);
    const { documents, trash } = useDocumentsStore.getState();
    expect(documents.map((d) => d.id)).toContain(deleted.id);
    expect(trash.map((d) => d.id)).not.toContain(deleted.id);
  });

  it("empty trash hard-deletes every trashed document", async () => {
    const d1 = doc({ title: "t1", isDeleted: true, deletedAt: Date.now() - 1000 });
    const d2 = doc({ title: "t2", isDeleted: true, deletedAt: Date.now() - 2000 });
    const keep = doc({ title: "keep" });
    await seedV1([d1, d2, keep]);
    await useDocumentsStore.getState().loadDocuments();

    await useDocumentsStore.getState().emptyTrash();
    const raw = await openDB("markdownmate-db", 2);
    const remaining = await raw.getAll("documents");
    raw.close();
    expect(remaining.map((d) => d.id)).toEqual([keep.id]);
  });
});
