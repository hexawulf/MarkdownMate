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
