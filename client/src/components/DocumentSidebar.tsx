import { useState, useEffect } from "react"; // Ensure useEffect is imported
import { useMemo } from "react"; // Added useMemo here, useState removed as it's covered above
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Search, FileText, Folder, X, Trash2, Edit3 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuTrigger,
  // ContextMenuSeparator, // Not used in this pass, but available
} from "@/components/ui/context-menu";
import type { Document, Folder as FolderType, DocumentWithDetails } from "@shared/schema";
import { useEditorStore } from "@/stores/editorStore";
import MoveToFolderDialog from "./MoveToFolderDialog";

interface DocumentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const createDocumentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  folderId: z.number().optional(),
});

const createFolderSchema = z.object({
  name: z.string().min(1, "Name is required"),
  parentId: z.number().optional(),
});

// Custom hook for deleting a document
const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation(); // Get setLocation for redirect

  return useMutation({
    mutationFn: async (documentId: number) => {
      await apiRequest("DELETE", `/api/documents/${documentId}`);
      return documentId; // Pass documentId to onSuccess and onMutate context
    },
    onMutate: async (deletedDocumentId) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["/api/documents"] });

      // Snapshot the previous value
      const previousDocuments = queryClient.getQueryData<Document[]>(["/api/documents"]);

      // Optimistically update to the new value
      queryClient.setQueryData(["/api/documents"], (oldData?: Document[]) =>
        oldData ? oldData.filter(doc => doc.id !== deletedDocumentId) : []
      );

      // Return a context object with the snapshotted value
      return { previousDocuments, deletedDocumentId };
    },
    onError: (err, _deletedDocumentId, context) => {
      if (context?.previousDocuments) {
        queryClient.setQueryData(["/api/documents"], context.previousDocuments);
      }
      toast({
        title: "Error",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: (deletedDocumentId) => {
      toast({
        title: "Success",
        description: "Document deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });

      // Handle deleting current document
      const currentPath = window.location.pathname; // Using window.location.pathname for current path
      const currentDocIdStr = currentPath.startsWith('/document/') ? currentPath.split('/')[2] : null;
      if (currentDocIdStr) {
        const currentDocId = parseInt(currentDocIdStr, 10);
        if (deletedDocumentId === currentDocId) {
          setLocation('/');
        }
      }
    },
  });
};

// Custom hook for moving a document
const useMoveDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ documentId, folderId }: { documentId: number; folderId: number | null }) => {
      await apiRequest("PATCH", `/api/documents/${documentId}`, { folderId });
      return { documentId, folderId };
    },
    onMutate: async ({ documentId, folderId }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/documents"] });
      const previousDocuments = queryClient.getQueryData<Document[]>(["/api/documents"]);

      queryClient.setQueryData(["/api/documents"], (oldData?: Document[]) =>
        oldData?.map(doc =>
          doc.id === documentId ? { ...doc, folderId: folderId ?? undefined } : doc
        ) || []
      );
      // Also update individual document queries if they exist
      await queryClient.cancelQueries({ queryKey: ["/api/documents", documentId] });
      const previousDocument = queryClient.getQueryData<DocumentWithDetails>(["/api/documents", documentId]);
       if (previousDocument) {
        queryClient.setQueryData<DocumentWithDetails>(["/api/documents", documentId], {
          ...previousDocument,
          folderId: folderId ?? undefined,
          // If you have folder details embedded, you might need to update that too or refetch
        });
      }

      return { previousDocuments, previousDocument, documentId };
    },
    onError: (err, variables, context) => {
      if (context?.previousDocuments) {
        queryClient.setQueryData(["/api/documents"], context.previousDocuments);
      }
      if (context?.previousDocument && context.documentId) {
        queryClient.setQueryData(["/api/documents", context.documentId], context.previousDocument);
      }
      toast({
        title: "Error",
        description: "Failed to move document. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: ({ documentId, folderId }) => { // Corrected: removed underscore from folderId
      toast({
        title: "Success",
        description: "Document moved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] }); // Invalidate folders if they show document counts
      queryClient.invalidateQueries({ queryKey: ["/api/documents", documentId] });

      // If you have a specific view for folders, you might need to invalidate that too
      // e.g., queryClient.invalidateQueries({ queryKey: ["/api/folders", folderId] });
    },
  });
};

// Custom hook for renaming a document
const useRenameDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location] = useLocation();
  const { currentDocument, setCurrentDocument } = useEditorStore();

  return useMutation({
    mutationFn: async ({ documentId, title }: { documentId: number; title: string }) => {
      await apiRequest("PATCH", `/api/documents/${documentId}`, { title });
      return { documentId, title };
    },
    onMutate: async ({ documentId, title }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/documents"] });
      const previousDocuments = queryClient.getQueryData<Document[]>(["/api/documents"]);
      const oldDocument = previousDocuments?.find(doc => doc.id === documentId);
      const oldTitle = oldDocument?.title;

      queryClient.setQueryData(["/api/documents"], (oldData?: Document[]) =>
        oldData?.map(doc =>
          doc.id === documentId ? { ...doc, title } : doc
        ) || []
      );
      return { previousDocuments, documentId, oldTitle };
    },
    onError: (err, variables, context) => {
      if (context?.previousDocuments) {
        queryClient.setQueryData(["/api/documents"], context.previousDocuments);
      }
      toast({
        title: "Error",
        description: "Failed to rename document. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: ({ documentId, title }) => {
      toast({
        title: "Success",
        description: "Document renamed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });

      // Update editor store if the renamed document is the current one
      const currentDocIdPath = location.startsWith('/document/') ? location.split('/')[2] : null;
      if (currentDocIdPath) {
        const currentDocId = parseInt(currentDocIdPath, 10);
        if (documentId === currentDocId && currentDocument) {
          setCurrentDocument({ ...currentDocument, title });
        }
      }
    },
  });
};

export default function DocumentSidebar({ isOpen, onClose }: DocumentSidebarProps) {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [createDocumentOpen, setCreateDocumentOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [editingDocumentId, setEditingDocumentId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>(""); // This is the live title being edited
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [documentToMove, setDocumentToMove] = useState<Document | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);
  // viewMode can be 'all' (root, showing unfiled documents), 'folder' (showing documents in selectedFolder)
  const [viewMode, setViewMode] = useState<'all' | 'folder'>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteDocument();
  const renameMutation = useRenameDocument();
  const moveMutation = useMoveDocument();

  // Fetch documents
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ["/api/documents"],
  });

  // Fetch folders
  const { data: folders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ["/api/folders"],
  });

  // Search documents
  const { data: searchResults = [] } = useQuery({
    queryKey: ["/api/documents/search", searchQuery],
    enabled: searchQuery.length > 0,
  });

  // Create document mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createDocumentSchema>) => {
      await apiRequest("POST", "/api/documents", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setCreateDocumentOpen(false);
      toast({
        title: "Success",
        description: "Document created successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        setCreateDocumentOpen(false);
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create document",
        variant: "destructive",
      });
    },
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createFolderSchema>) => {
      await apiRequest("POST", "/api/folders", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      setCreateFolderOpen(false);
      toast({
        title: "Success",
        description: "Folder created successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        setCreateFolderOpen(false);
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive",
      });
    },
  });

  const documentForm = useForm<z.infer<typeof createDocumentSchema>>({
    resolver: zodResolver(createDocumentSchema),
    defaultValues: {
      title: "",
    },
  });

  const folderForm = useForm<z.infer<typeof createFolderSchema>>({
    resolver: zodResolver(createFolderSchema),
    defaultValues: {
      name: "",
    },
  });

  const onCreateDocument = (data: z.infer<typeof createDocumentSchema>) => {
    createDocumentMutation.mutate(data);
  };

  const onCreateFolder = (data: z.infer<typeof createFolderSchema>) => {
    createFolderMutation.mutate(data);
  };

  const handleDocumentClick = (document: Document) => {
    // If already editing another document, submit before navigating
    if (editingDocumentId && editingDocumentId !== document.id) {
      handleRenameSubmit();
    }
    // If clicking the document that is currently being edited, do nothing
    if (editingDocumentId === document.id) {
        return;
    }
    setLocation(`/document/${document.id}`);
    onClose();
  };

  // Unified rename submission logic
  const handleRenameSubmitLogic = (docId: number, currentTitle: string) => {
    const originalDocument = documents.find(doc => doc.id === docId);
    if (!originalDocument) {
      setEditingDocumentId(null); // Should not happen if docId is valid
      return;
    }

    const trimmedTitle = currentTitle.trim();
    if (!trimmedTitle) {
      toast({
        title: "Invalid Title",
        description: "Document title cannot be empty.",
        variant: "destructive",
      });
      setEditingTitle(originalDocument.title); // Revert input to original
      // Do not close editing here, let user correct or escape
      return false; // Indicate failure
    }

    if (trimmedTitle !== originalDocument.title) {
      renameMutation.mutate({ documentId: docId, title: trimmedTitle });
    }
    setEditingDocumentId(null);
    return true; // Indicate success or no change needed
  };

  // Called on blur or Enter
  const handleRenameFinalize = () => {
    if (!editingDocumentId) return;
    handleRenameSubmitLogic(editingDocumentId, editingTitle);
  };

  const handleRenameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleRenameFinalize();
    } else if (event.key === "Escape") {
      setEditingDocumentId(null);
      // editingTitle will be reset when a new edit starts or if not needed
    }
  };

  const handleRenameInitiate = (doc: Document) => {
    if (editingDocumentId !== null && editingDocumentId !== doc.id) {
      // Finalize any ongoing edit for a *different* document
      // For the currently active editingTitle, which belongs to editingDocumentId
      handleRenameSubmitLogic(editingDocumentId, editingTitle);
    }
    // Start editing the selected document
    setEditingDocumentId(doc.id);
    setEditingTitle(doc.title);
  };

  const handleFolderClick = (folder: FolderType) => {
    setSelectedFolder(folder);
    setViewMode('folder');
    setSearchQuery(""); // Clear search when navigating folders
  };

  const handleMoveToFolderInitiate = (doc: Document) => {
    setDocumentToMove(doc);
    setMoveDialogOpen(true);
  };

  const handleDeleteInitiate = (doc: Document) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleAllDocumentsClick = () => {
    setSelectedFolder(null);
    setViewMode('all');
    setSearchQuery(''); // Clear search query
    // searchResults will automatically update via its useQuery hook when searchQuery changes.
    // No direct setSearchResults([]) is needed if searchResults is managed by useQuery.
    // console.log('🔍 All Documents clicked - showing all documents. State after reset:', { selectedFolder: null, searchQuery: '', viewMode: 'all' });
  };

  const displayedDocuments = useMemo(() => {
    // SEARCH MODE: Show search results
    if (searchQuery && searchResults.length >= 0) { // Ensure searchResults is defined, even if empty
      // console.log('🔍 Filtering logic: Search mode active');
      return searchResults;
    }

    // FOLDER MODE: Show documents in specific folder
    if (viewMode === 'folder' && selectedFolder) {
      // console.log(`🔍 Filtering logic: Folder mode active for folder "${selectedFolder.name}" (ID: ${selectedFolder.id})`);
      return documents.filter(doc => doc.folderId === selectedFolder.id);
    }

    // ALL DOCUMENTS MODE: Show everything (no filters)
    // This condition is met when searchQuery is empty, and either viewMode is 'all'
    // or selectedFolder is null (which handleAllDocumentsClick ensures).
    if (viewMode === 'all' && !selectedFolder) {
      // console.log('🔍 Filtering logic: All Documents mode active, showing all documents:', documents.length);
      return documents;
    }

    // Fallback: This case should ideally not be reached if logic is correct.
    // It implies a state where searchQuery is empty, but viewMode is not 'all'
    // AND selectedFolder is also null. Or, viewMode is 'folder' but selectedFolder is null.
    // This might happen during initial load or if state is inconsistent.
    // For safety, returning all documents, but it's worth reviewing if this occurs.
    // console.log('🔍 Filtering logic: Fallback - returning all documents. Review if this state is expected.', { viewMode, selectedFolder, searchQuery });
    return documents; // Default to all documents if no other condition met.
  }, [documents, searchResults, searchQuery, selectedFolder, viewMode]);

  useEffect(() => {
    // console.log('🔍 DocumentSidebar State Update:', {
    //   totalDocuments: documents.length,
    //   displayedDocumentsCount: displayedDocuments.length,
    //   selectedFolder: selectedFolder ? { id: selectedFolder.id, name: selectedFolder.name } : null,
    //   searchQuery,
    //   viewMode, // Added viewMode for better context
    //   // Optionally, list some document titles for quick check, but be mindful of log size
    //   // documentsSample: documents.slice(0, 3).map(d => ({ id: d.id, title: d.title, folderId: d.folderId })),
    //   // displayedDocumentsSample: displayedDocuments.slice(0, 3).map(d => ({ id: d.id, title: d.title, folderId: d.folderId }))
    // });
  }, [documents, displayedDocuments, selectedFolder, searchQuery, viewMode]); // Added viewMode to dependency array

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile overlay */}
      <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      
      {/* Sidebar */}
      <aside className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col fixed lg:relative z-50 h-full lg:h-auto">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-sidebar-foreground">Documents</h2>
            <div className="flex items-center space-x-2">
              <Dialog open={createDocumentOpen} onOpenChange={setCreateDocumentOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" className="h-8 w-8">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Document</DialogTitle>
                    <DialogDescription>
                      Enter a title for your new document. Click "Create Document" when you're done.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...documentForm}>
                    <form onSubmit={documentForm.handleSubmit(onCreateDocument)} className="space-y-4">
                      <FormField
                        control={documentForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter document title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={createDocumentMutation.isPending}>
                        {createDocumentMutation.isPending ? "Creating..." : "Create Document"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              
              <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            {/* Recent Documents */}
            <div>
              <div className="text-xs text-muted-foreground mb-2 px-1"> {/* Added px-1 for slight padding if needed */}
                Showing {displayedDocuments.length} of {documents.length} documents
              </div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                {(() => {
                  let listTitle = "Documents"; // Default title
                  if (searchQuery) {
                    listTitle = "Search Results";
                  } else if (viewMode === 'folder' && selectedFolder) {
                    listTitle = selectedFolder.name; // Show folder name
                  } else if (viewMode === 'all' && !selectedFolder) {
                    listTitle = "All Documents"; // Or just "Documents" if preferred for root
                  }
                  return listTitle;
                })()}
              </h3>
              <div className="space-y-1">
                {documentsLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : displayedDocuments.length > 0 ? (
                  displayedDocuments.map((document) => ( // Ensure this 'document' is of type Document from schema
                    <ContextMenu key={document.id}>
                      <ContextMenuTrigger asChild>
                        {/* Main clickable div for navigation and inline editing display */}
                        <div
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-sidebar-accent group cursor-pointer transition-colors"
                          onClick={() => handleDocumentClick(document)}
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            {editingDocumentId === document.id ? (
                              <Input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onBlur={handleRenameFinalize} // Use the unified finalize handler
                                onKeyDown={handleRenameKeyDown}
                                autoFocus
                                className="h-7 text-sm p-1 bg-transparent border-blue-500 focus:ring-0" // Style for inline edit
                                onClick={(e) => e.stopPropagation()} // Prevent navigation
                              />
                            ) : (
                              <>
                                <div className="text-sm font-medium text-sidebar-foreground truncate">
                                  {document.title}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(document.updatedAt!).toLocaleDateString()}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        {/* Icons container - shown on group hover */}
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {editingDocumentId !== document.id && ( // Show edit icon only if not currently editing this item
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRenameInitiate(document); // Use the new handler
                              }}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteInitiate(document); // Use the new handler
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onSelect={() => handleRenameInitiate(document)}>
                          Rename
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={() => handleMoveToFolderInitiate(document)}>
                          Move to Folder
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={() => handleDeleteInitiate(document)}>
                          Delete
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {searchQuery ? "No documents found" :
                      (viewMode === 'folder' && selectedFolder) ? `No documents in ${selectedFolder.name}` :
                      (viewMode === 'all' && !selectedFolder) ? "No documents in root" :
                      "No documents yet"
                    }
                  </div>
                )}
              </div>
            </div>

            {/* Folders */}
            {!searchQuery && (
              <>
                {/* All Documents / Root View Item */}
                <div
                  className={`flex items-center space-x-3 p-3 rounded-lg hover:bg-sidebar-accent cursor-pointer transition-colors mb-3 ${
                    viewMode === 'all' && !selectedFolder && !searchQuery ? 'bg-sidebar-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  }`}
                  onClick={handleAllDocumentsClick} // Use the new handler
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-sidebar-foreground">All Documents</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Folders
                    </h3>
                  <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Folder</DialogTitle>
                        <DialogDescription>
                          Enter a name for your new folder. Click "Create Folder" when you're done.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...folderForm}>
                        <form onSubmit={folderForm.handleSubmit(onCreateFolder)} className="space-y-4">
                          <FormField
                            control={folderForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter folder name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="submit" disabled={createFolderMutation.isPending}>
                            {createFolderMutation.isPending ? "Creating..." : "Create Folder"}
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-1">
                  {foldersLoading ? (
                    <div className="space-y-2">
                      {[...Array(2)].map((_, i) => (
                        <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : folders.length > 0 ? (
                    folders.map((folder) => (
                      <div
                        key={folder.id}
                        className={`flex items-center justify-between p-3 rounded-lg hover:bg-sidebar-accent cursor-pointer transition-colors ${ // Ensure justify-between
                          viewMode === 'folder' && selectedFolder?.id === folder.id ? 'bg-sidebar-accent' : ''
                        }`}
                        onClick={() => handleFolderClick(folder)}
                      >
                        <div className="flex items-center space-x-3"> {/* Group icon and name */}
                          <Folder className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-sidebar-foreground">{folder.name}</span>
                        </div>
                        {typeof folder.documentCount === 'number' && ( // Check if documentCount is available
                          <span className="text-xs text-muted-foreground">
                            ({folder.documentCount})
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No folders yet</div>
                  )}
                </div>
              </div>
            </>
            )}
          </div>
        </div>
      </aside>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the document
              "{documentToDelete?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDocumentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (documentToDelete) {
                  deleteMutation.mutate(documentToDelete.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MoveToFolderDialog
        isOpen={moveDialogOpen}
        onClose={() => {
          setMoveDialogOpen(false);
          setDocumentToMove(null); // Reset the document to move
        }}
        document={documentToMove}
        folders={folders} // Assuming 'folders' is the fetched list of folders
        onMove={(documentId, folderId) => {
          moveMutation.mutate({ documentId, folderId });
        }}
      />
    </>
  );
}
