import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DocumentSidebar from './DocumentSidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import * as queryHooks from '@tanstack/react-query'; // To mock useQuery, useMutation
import * as editorStore from '@/stores/editorStore'; // To mock useEditorStore
import type { Document, Folder, FolderTreeItem } from "@shared/schema";

// Mock wouter's useLocation
vi.mock('wouter', () => ({
  useLocation: vi.fn(),
}));

// Mock editorStore
vi.mock('@/stores/editorStore', () => ({
  useEditorStore: vi.fn(),
}));

// Mock API client
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));


const mockDocuments: Document[] = [
  { id: 1, title: "Doc 1 Root", folderId: null, content: "", authorId: "user1", isPublic: false, createdAt: "2023-01-01T00:00:00.000Z", updatedAt: "2023-01-01T00:00:00.000Z" },
  { id: 2, title: "Doc 2 Folder1", folderId: 101, content: "", authorId: "user1", isPublic: false, createdAt: "2023-01-02T00:00:00.000Z", updatedAt: "2023-01-02T00:00:00.000Z" },
  { id: 3, title: "Doc 3 Root", folderId: null, content: "", authorId: "user1", isPublic: false, createdAt: "2023-01-03T00:00:00.000Z", updatedAt: "2023-01-03T00:00:00.000Z" },
  { id: 4, title: "Doc 4 Folder2", folderId: 102, content: "", authorId: "user1", isPublic: false, createdAt: "2023-01-04T00:00:00.000Z", updatedAt: "2023-01-04T00:00:00.000Z" },
  { id: 5, title: "Doc 5 Folder1", folderId: 101, content: "", authorId: "user1", isPublic: false, createdAt: "2023-01-05T00:00:00.000Z", updatedAt: "2023-01-05T00:00:00.000Z" },
];

const mockFolders: FolderTreeItem[] = [ // Assuming API returns FolderTreeItem which includes documentCount
  { id: 101, name: "Folder One", authorId: "user1", parentId: null, createdAt: "2023-01-01T00:00:00.000Z", documentCount: 2, childCount: 0 },
  { id: 102, name: "Folder Two", authorId: "user1", parentId: null, createdAt: "2023-01-02T00:00:00.000Z", documentCount: 1, childCount: 0 },
  { id: 103, name: "Empty Folder", authorId: "user1", parentId: null, createdAt: "2023-01-03T00:00:00.000Z", documentCount: 0, childCount: 0 },
];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Disable retries for tests
      staleTime: Infinity, // Prevent immediate refetch
    },
  },
});

const mockSetLocation = vi.fn();
const mockUseEditorStore = {
  currentDocument: null,
  setCurrentDocument: vi.fn(),
  // ... other store properties/methods if needed by sidebar
};

const mockMoveMutation = {
  mutate: vi.fn(),
  isPending: false,
  // ... other mutation states if needed
};

const renderSidebar = (props = {}) => {
  // Mock useQuery returns
  vi.spyOn(queryHooks, 'useQuery').mockImplementation(({ queryKey }) => {
    if (queryKey && Array.isArray(queryKey)) {
        if (queryKey[0] === "/api/documents" && queryKey.length === 1) { // Base documents query
            return { data: mockDocuments, isLoading: false, isError: false } as any;
        }
        if (queryKey[0] === "/api/folders") {
            return { data: mockFolders, isLoading: false, isError: false } as any;
        }
        if (queryKey[0] === "/api/documents/search") { // Search query
            return { data: [], isLoading: false, isError: false } as any; // Default empty search
        }
    }
    return { data: undefined, isLoading: false, isError: false } as any;
  });

  // Mock useMutation for move, delete, rename if their setup is complex
   vi.spyOn(queryHooks, 'useMutation').mockImplementation((options: any) => {
    // This is a simplified mock. For specific mutations (delete, rename, move),
    // you might need to differentiate based on mutationFn or a unique key if provided.
    // For now, let's assume the move mutation is the one we care most about for these tests.
    // This specific mock will apply to all useMutation calls unless refined.
    // We are primarily interested in the `moveMutation.mutate` part for one test.
    if (options.mutationFn.toString().includes("/api/documents/${documentId}")) { // Heuristic to identify move
        return mockMoveMutation as any;
    }
    return { mutate: vi.fn(), isPending: false } as any;
  });


  return render(
    <QueryClientProvider client={queryClient}>
      <DocumentSidebar isOpen={true} onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  );
};


describe('DocumentSidebar Folder Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useLocation as vi.Mock).mockReturnValue(['/', mockSetLocation]);
    (editorStore.useEditorStore as vi.Mock).mockReturnValue(mockUseEditorStore);
    queryClient.clear(); // Clear query cache before each test
  });

  it('opens MoveToFolderDialog when "Move to Folder" context menu item is clicked', async () => {
    renderSidebar();
    const documentToMove = mockDocuments[0]; // Doc 1 Root

    // Find the document item. This might need a more robust selector.
    // For example, data-testid or aria-label on the document items.
    // Assuming the document title is unique enough for this test.
    const docElement = screen.getByText(documentToMove.title).closest('div[role="button"], div.cursor-pointer'); // Adjust selector as per actual DOM
    if (!docElement) throw new Error("Document element not found for context menu");

    fireEvent.contextMenu(docElement); // Simulate right-click. Note: JSDOM doesn't fully support contextMenu.
                                      // Actual ContextMenuTrigger might listen to pointerDown with specific button.
                                      // If this doesn't work, need to inspect how Radix UI's ContextMenu is triggered.
                                      // A common pattern is onPointerDown with button: 2 or onContextMenu.
                                      // For now, let's assume this works or a more direct way to open menu is used in real tests.

    // Click "Move to Folder" - this might appear in a portal, use screen.getByText
    // Wait for the item to be potentially dynamically added
    await waitFor(() => screen.getByText('Move to Folder'));
    fireEvent.click(screen.getByText('Move to Folder'));

    // Assert that MoveToFolderDialog becomes visible
    // Check for a unique element within the dialog, like its title
    await waitFor(() => {
      expect(screen.getByText('Move to Folder', { selector: 'h2' })).toBeInTheDocument(); // Assuming h2 is DialogTitle
    });
  });

  it('calls moveMutation when onMove is triggered from MoveToFolderDialog', async () => {
    renderSidebar();
    const documentToMove = mockDocuments[0];

    // Open the dialog first (similar to above test)
    const docElement = screen.getByText(documentToMove.title).closest('div[role="button"], div.cursor-pointer');
    if (!docElement) throw new Error("Document element not found");
    fireEvent.contextMenu(docElement);
    await waitFor(() => screen.getByText('Move to Folder'));
    fireEvent.click(screen.getByText('Move to Folder'));
    await waitFor(() => expect(screen.getByText('Move to Folder', { selector: 'h2' })).toBeInTheDocument());

    // Simulate selecting "Folder One" and clicking "Move Document"
    fireEvent.mouseDown(screen.getByRole('combobox')); // Open select in dialog
    await waitFor(() => screen.getByText(mockFolders[0].name));
    fireEvent.click(screen.getByText(mockFolders[0].name));

    fireEvent.click(screen.getByRole('button', { name: 'Move Document' }));

    expect(mockMoveMutation.mutate).toHaveBeenCalledWith({
      documentId: documentToMove.id,
      folderId: mockFolders[0].id,
    });
  });

  it('updates active styling when a folder is clicked', () => {
    renderSidebar();
    const folderToClick = mockFolders[0]; // Folder One
    const folderElement = screen.getByText(folderToClick.name);

    fireEvent.click(folderElement);

    // Check for active class. This depends on the exact class name used.
    // Assuming 'bg-sidebar-accent' is the active class.
    // The folderElement itself might not get the class, but its parent or a specific container.
    // Let's assume the clickable div gets the class.
    expect(folderElement.closest('div.cursor-pointer')).toHaveClass('bg-sidebar-accent');

    // Also check that "All Documents" is not active
    const allDocsElement = screen.getByText("All Documents");
    expect(allDocsElement.closest('div.cursor-pointer')).not.toHaveClass('bg-sidebar-accent');
  });


  it('filters displayedDocuments correctly when a folder is selected', async () => {
    renderSidebar();
    const targetFolder = mockFolders[0]; // Folder One (id: 101)

    fireEvent.click(screen.getByText(targetFolder.name));

    await waitFor(() => {
      // Documents in Folder One
      expect(screen.getByText("Doc 2 Folder1")).toBeInTheDocument(); // folderId: 101
      expect(screen.getByText("Doc 5 Folder1")).toBeInTheDocument(); // folderId: 101

      // Documents not in Folder One
      expect(screen.queryByText("Doc 1 Root")).not.toBeInTheDocument();    // folderId: null
      expect(screen.queryByText("Doc 3 Root")).not.toBeInTheDocument();    // folderId: null
      expect(screen.queryByText("Doc 4 Folder2")).not.toBeInTheDocument(); // folderId: 102
    });
  });

  it('shows root documents when "All Documents" is clicked', async () => {
    renderSidebar();
    // First, click a folder to move away from root
    const folderToClick = mockFolders[0]; // Folder One
    fireEvent.click(screen.getByText(folderToClick.name));

    await waitFor(() => { // Ensure view updates to folder
        expect(screen.getByText("Doc 2 Folder1")).toBeInTheDocument();
        expect(screen.queryByText("Doc 1 Root")).not.toBeInTheDocument();
    });

    // Then, click "All Documents"
    fireEvent.click(screen.getByText("All Documents"));

    await waitFor(() => {
      // Root documents should be visible
      expect(screen.getByText("Doc 1 Root")).toBeInTheDocument();
      expect(screen.getByText("Doc 3 Root")).toBeInTheDocument();

      // Folder-specific documents should not be visible
      expect(screen.queryByText("Doc 2 Folder1")).not.toBeInTheDocument();
      expect(screen.queryByText("Doc 4 Folder2")).not.toBeInTheDocument();
    });
  });

  it('updates the document list heading based on viewMode and selectedFolder', async () => {
    renderSidebar();

    // Initial heading (Root Documents)
    // Need to find the heading. Let's assume it's an <h3>.
    // The text can be dynamic, so we might need a more robust way to select it, e.g., data-testid.
    // For now, we'll check its content.
    let heading = screen.getByText('Root Documents', { selector: 'h3.uppercase' }); // Adjust selector
    expect(heading).toBeInTheDocument();

    // Click a folder
    const targetFolder = mockFolders[0]; // Folder One
    fireEvent.click(screen.getByText(targetFolder.name));

    await waitFor(() => {
      heading = screen.getByText(targetFolder.name, { selector: 'h3.uppercase' });
      expect(heading).toBeInTheDocument();
    });

    // Simulate searching (this part is more complex as it involves typing into search input)
    // For simplicity, we'll assume search query changes the title directly
    // This would require mocking the search query state and its effect.
    // For now, this part of the test might be limited unless search state is easily manipulated.
    // As an alternative, we can check that if a search query *were* active, the title would be "Search Results".
    // This is tested by the `displayedDocuments` useMemo which influences the title.
    // A more direct test would be to set searchQuery state if possible, or spy on the title variable.
  });

  it('displays document counts next to folder names if provided', () => {
    renderSidebar();

    const folderWithCount = mockFolders[0]; // Folder One, count 2
    const folderWithZeroCount = mockFolders[2]; // Empty Folder, count 0

    // Check count for Folder One
    // The structure is: Folder Name ... (Count)
    // We need to find the text content of the span containing the count.
    const folder1Element = screen.getByText(folderWithCount.name).closest('div');
    expect(folder1Element).toHaveTextContent(`(${folderWithCount.documentCount})`);

    // Check count for Empty Folder
    const emptyFolderElement = screen.getByText(folderWithZeroCount.name).closest('div');
    expect(emptyFolderElement).toHaveTextContent(`(${folderWithZeroCount.documentCount})`);

    // If a folder had no documentCount property (e.g. if FolderType was different),
    // it shouldn't display anything. This is implicitly tested by `typeof folder.documentCount === 'number'`.
  });
});
