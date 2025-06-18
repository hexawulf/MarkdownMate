import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MoveToFolderDialog from './MoveToFolderDialog';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Document, Folder } from "@shared/schema"; // Ensure types are imported

// Mock data
const mockDocument: Document = { id: 1, title: "Test Document", folderId: null, content: "", authorId: "user1", isPublic: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
const mockFolders: Folder[] = [
  { id: 10, name: "Folder A", authorId: "user1", parentId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 20, name: "Folder B", authorId: "user1", parentId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const queryClient = new QueryClient();

// Helper to provide a consistent rendering environment
const renderDialog = (props: Partial<React.ComponentProps<typeof MoveToFolderDialog>> = {}) => {
  const defaultProps: React.ComponentProps<typeof MoveToFolderDialog> = {
    isOpen: true,
    onClose: vi.fn(),
    document: mockDocument,
    folders: mockFolders,
    onMove: vi.fn(),
  };
  return render(
    <QueryClientProvider client={queryClient}>
      <MoveToFolderDialog {...defaultProps} {...props} />
    </QueryClientProvider>
  );
};

describe('MoveToFolderDialog', () => {
  it('renders correctly when open with a document', () => {
    renderDialog();
    expect(screen.getByText('Move to Folder')).toBeInTheDocument();
    expect(screen.getByText(`Select a folder to move the document "${mockDocument.title}" to, or choose "None" to move it to the root.`)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    // Check for "None (Root)" specifically within the items that appear after interaction
    // For items within a SelectContent, they might not be immediately in the document until the select is interacted with.
    // We'll test selection specifically in other tests.

    // Check buttons
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move Document' })).toBeInTheDocument();
  });

  it('does not render if document is null', () => {
    const { container } = renderDialog({ document: null });
    // Check if the dialog content, which is the first child of Dialog (if open), is not present.
    // Or, more simply, check if a known element from the dialog isn't there.
    expect(screen.queryByText('Move to Folder')).not.toBeInTheDocument();
    // Or check if the container is essentially empty (specifics depend on Dialog implementation when !isOpen)
    // For this component, it returns null, so container.firstChild should be null.
    expect(container.firstChild).toBeNull();
  });

  it('calls onClose when Cancel button is clicked', () => {
    const handleClose = vi.fn();
    renderDialog({ onClose: handleClose });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onMove with null folderId when "None (Root)" is selected and Move is clicked', async () => {
    const handleMove = vi.fn();
    renderDialog({ onMove: handleMove });

    // Click the SelectTrigger
    fireEvent.mouseDown(screen.getByRole('combobox'));
    // Wait for the "None (Root)" option to be available and click it
    await waitFor(() => screen.getByText('None (Root)'));
    fireEvent.click(screen.getByText('None (Root)'));

    fireEvent.click(screen.getByRole('button', { name: 'Move Document' }));
    expect(handleMove).toHaveBeenCalledWith(mockDocument.id, null);
  });

  it('calls onMove with selected folderId when a folder is selected and Move is clicked', async () => {
    const handleMove = vi.fn();
    renderDialog({ onMove: handleMove });
    const targetFolder = mockFolders[0];

    // Click the SelectTrigger
    fireEvent.mouseDown(screen.getByRole('combobox'));
    // Wait for the target folder name to be available and click it
    await waitFor(() => screen.getByText(targetFolder.name));
    fireEvent.click(screen.getByText(targetFolder.name));

    fireEvent.click(screen.getByRole('button', { name: 'Move Document' }));
    expect(handleMove).toHaveBeenCalledWith(mockDocument.id, targetFolder.id);
  });

  // Test to ensure folder options are present in the dropdown
  it('displays all folder names and "None (Root)" in the select dropdown', async () => {
    renderDialog();
    fireEvent.mouseDown(screen.getByRole('combobox')); // Open select

    await waitFor(() => {
      expect(screen.getByText('None (Root)')).toBeInTheDocument();
      mockFolders.forEach(folder => {
        expect(screen.getByText(folder.name)).toBeInTheDocument();
      });
    });
  });
});
