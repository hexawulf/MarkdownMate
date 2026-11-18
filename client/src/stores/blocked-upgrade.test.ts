// @vitest-environment jsdom
// Hotfix 3.2.1: a tab still running v3.1.0 holds a version-1 connection and
// never closes it, which blocks the v2 upgrade. The app must report that
// (dbBlocked) instead of hanging on "Loading...", and continue on its own once
// the old connection closes, with every document kept.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import { useDocumentsStore, __resetDbForTests } from "./useDocumentsStore";

async function resetFactory() {
  globalThis.indexedDB = new IDBFactory();
  __resetDbForTests();
  useDocumentsStore.setState({
    documents: [],
    trash: [],
    currentDocument: null,
    isLoading: false,
    hasLoadedInitialDocuments: false,
    dbBlocked: false,
  });
}

beforeEach(resetFactory);
afterEach(resetFactory);

const waitFor = async (cond: () => boolean, ms = 2000) => {
  const end = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > end) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 10));
  }
};

describe("blocked IndexedDB upgrade", () => {
  it("sets dbBlocked while an old v1 tab is open, then loads once it closes", async () => {
    // An "old tab": v1 schema, one document, connection kept open and with no
    // versionchange handler, exactly like v3.1.0.
    const old = await openDB("markdownmate-db", 1, {
      upgrade(d) {
        const s = d.createObjectStore("documents", { keyPath: "id" });
        s.createIndex("by-updatedAt", "updatedAt");
        s.createIndex("by-createdAt", "createdAt");
        s.createIndex("by-isDeleted", "isDeleted");
      },
    });
    const now = Date.now();
    await old.put("documents", {
      id: "keep-me",
      title: "Keep me",
      content: "precious",
      createdAt: now,
      updatedAt: now,
      tags: [],
      isDeleted: false,
    });

    const load = useDocumentsStore.getState().loadDocuments();
    await waitFor(() => useDocumentsStore.getState().dbBlocked);
    expect(useDocumentsStore.getState().hasLoadedInitialDocuments).toBe(false);

    old.close(); // the user closes the old tab
    await load;

    const s = useDocumentsStore.getState();
    expect(s.dbBlocked).toBe(false);
    expect(s.hasLoadedInitialDocuments).toBe(true);
    expect(s.documents.map((d) => d.id)).toEqual(["keep-me"]);
  });
});
