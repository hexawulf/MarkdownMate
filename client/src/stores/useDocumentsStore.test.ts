// @vitest-environment jsdom
// Store tests (MM step 0 harness check + MM-02/MM-05 coverage added later).
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { useDocumentsStore, __resetDbForTests } from "./useDocumentsStore";

// Reset the in-memory IndexedDB and the zustand store between tests so each
// test starts from an empty database.
async function resetDbAndStore() {
  globalThis.indexedDB = new IDBFactory();
  __resetDbForTests();
  useDocumentsStore.setState({
    documents: [],
    currentDocument: null,
    isLoading: false,
    hasLoadedInitialDocuments: false,
  });
}

beforeEach(async () => {
  await resetDbAndStore();
});

afterEach(async () => {
  await resetDbAndStore();
});

describe("useDocumentsStore basics", () => {
  it("creates and loads a document", async () => {
    const store = useDocumentsStore.getState();
    const doc = await store.createDocument("Test", "# Hi");
    expect(doc.title).toBe("Test");

    await useDocumentsStore.getState().loadDocuments();
    const docs = useDocumentsStore.getState().documents;
    expect(docs.some((d) => d.id === doc.id)).toBe(true);
  });
});

describe("MM-02: single-transaction writes + broadcast", () => {
  it("a rename then a content update keeps both (each write reads the latest)", async () => {
    const store = useDocumentsStore.getState();
    const doc = await store.createDocument("Original", "original content");

    // Sequential, as a rename followed by an autosave of the editor content.
    // Because updateDocument reads-merges-writes in one transaction, the
    // content write sees the renamed title and preserves it.
    await store.updateDocument(doc.id, { title: "Renamed" });
    await store.updateDocument(doc.id, { content: "new content" });

    const fresh = await useDocumentsStore.getState().getDocument(doc.id);
    expect(fresh?.title).toBe("Renamed");
    expect(fresh?.content).toBe("new content");
  });

  it("broadcasts an update that another listener can observe", async () => {
    const received: unknown[] = [];
    const ch = new BroadcastChannel("markdownmate");
    ch.onmessage = (e) => received.push(e.data);

    const store = useDocumentsStore.getState();
    const doc = await store.createDocument("Doc", "x");
    await store.updateDocument(doc.id, { content: "y" });

    // Let the channel deliver.
    await new Promise((r) => setTimeout(r, 10));
    ch.close();
    expect(received.some((m) => (m as { id: string }).id === doc.id)).toBe(true);
  });
});
