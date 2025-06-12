import { useState } from "react";
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
import { Plus, Search, FileText, Folder, X } from "lucide-react";
import type { Document, Folder as FolderType } from "@shared/schema";

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

export default function DocumentSidebar({ isOpen, onClose }: DocumentSidebarProps) {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [createDocumentOpen, setCreateDocumentOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    setLocation(`/document/${document.id}`);
    onClose();
  };

  const recentDocuments = documents.slice(0, 5);
  const displayedDocuments = searchQuery ? searchResults : recentDocuments;

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
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                {searchQuery ? "Search Results" : "Recent"}
              </h3>
              <div className="space-y-1">
                {documentsLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : displayedDocuments.length > 0 ? (
                  displayedDocuments.map((document) => (
                    <div
                      key={document.id}
                      onClick={() => handleDocumentClick(document)}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-sidebar-accent cursor-pointer transition-colors"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-sidebar-foreground truncate">
                          {document.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(document.updatedAt!).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {searchQuery ? "No documents found" : "No documents yet"}
                  </div>
                )}
              </div>
            </div>
            
            {/* Folders */}
            {!searchQuery && (
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
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-sidebar-accent cursor-pointer transition-colors"
                      >
                        <Folder className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-sidebar-foreground">{folder.name}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No folders yet</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
