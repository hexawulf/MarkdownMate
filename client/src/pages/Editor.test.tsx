// @vitest-environment jsdom
// MM-01: after the initial load, an empty document list must never leave the
// page stuck on "Loading…". MM-07 is covered in a sibling store/hook test.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { useDocumentsStore, __resetDbForTests } from "@/stores/useDocumentsStore";

// Monaco and the markdown pipeline are far too heavy (and DOM-API hungry) for
// jsdom, so stub the view layer. The test only cares about the Editor page's
// loading/empty-state logic.
vi.mock("@/modules/editor/SplitView", () => ({
  SplitView: () => <div data-testid="split-view" />,
}));
vi.mock("@/modules/editor/StatusBar", () => ({
  StatusBar: () => <div data-testid="status-bar" />,
}));
vi.mock("@/modules/about", () => ({
  AboutModal: () => null,
}));
vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: () => {} }),
}));

import Editor from "./Editor";

async function reset() {
  globalThis.indexedDB = new IDBFactory();
  __resetDbForTests();
  useDocumentsStore.setState({
    documents: [],
    currentDocument: null,
    isLoading: false,
    hasLoadedInitialDocuments: false,
  });
}

beforeEach(reset);
afterEach(() => {
  cleanup();
});

describe("MM-01: empty document list recovers", () => {
  it("auto-creates a welcome document on first load, not stuck on Loading", async () => {
    render(<Editor />);
    // The editor view appears once a document exists.
    await waitFor(() => expect(screen.getByTestId("split-view")).toBeInTheDocument());
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    expect(useDocumentsStore.getState().documents.length).toBe(1);
  });

  it("after deleting the only document, shows an empty state (New document), not Loading", async () => {
    render(<Editor />);
    await waitFor(() => expect(screen.getByTestId("split-view")).toBeInTheDocument());

    // Hard-delete the only document and clear the current selection, as a
    // delete-the-last-doc flow ends up.
    const { documents, deleteDocument, setCurrentDocument } = useDocumentsStore.getState();
    await deleteDocument(documents[0].id);
    setCurrentDocument(null);

    // The page must offer a way forward (auto-create fires, or the empty-state
    // button is shown) — never a permanent "Loading…".
    await waitFor(() => {
      const recovered =
        screen.queryByTestId("split-view") || screen.queryByText("New document");
      expect(recovered).toBeTruthy();
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });
  });
});
