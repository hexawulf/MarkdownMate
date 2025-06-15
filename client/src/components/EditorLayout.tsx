import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext"; // Changed import
import { useTheme } from "@/components/ThemeProvider";
import { Info, Upload, Download as ExportIcon } from "lucide-react"; // Changed Download to ExportIcon
import AboutModal from "@/components/AboutModal";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast"; // Import useToast
import { Button } from "@/components/ui/button";
import ImportDialog from "@/components/ImportDialog"; // Added import
import ExportDialog from "@/components/ExportDialog"; // Added import
import { ImportSource } from "@/types/importExport"; // Added import
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import DocumentSidebar from "@/components/DocumentSidebar";
import MonacoEditor from "@/components/MonacoEditor";
import MarkdownPreview from "@/components/MarkdownPreview";
import CollaborationPanel from "@/components/CollaborationPanel";
import { useEditorStore } from "@/stores/editorStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  FileText, 
  Menu, 
  Sun, 
  Moon, 
  // Download, // Replaced by ExportIcon or Upload
  Share, // Share icon is currently used for Export button, will be replaced
  Eye, 
  Edit, 
  Columns, 
  Users
} from "lucide-react";

type ViewMode = "split" | "editor" | "preview";

export default function EditorLayout() {
  const { currentUser, loading: authLoading, signInWithGoogle, signOut } = useAuth(); // Updated destructuring
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const { toast } = useToast(); // Initialize toast
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [collaborationPanelOpen, setCollaborationPanelOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false); // Added state
  const [showExportDialog, setShowExportDialog] = useState(false); // Added state

  const openAboutModal = () => setIsAboutModalOpen(true);
  const closeAboutModal = () => setIsAboutModalOpen(false);

  const { 
    currentDocument, 
    setCurrentDocument, 
    content, 
    setContent,
    autoSaveStatus,
    wordCount,
    charCount 
  } = useEditorStore();

  // Extract document ID from URL
  const documentId = location.startsWith("/document/") 
    ? parseInt(location.split("/")[2]) 
    : null;

  // Mutation for creating new document
  const createDocumentMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      return await apiRequest("POST", "/api/documents", data);
    },
    onSuccess: (newDocument) => {
      // Update the store with the new document
      setCurrentDocument(newDocument);
      
      // Navigate to the new document URL
      setLocation(`/document/${newDocument.id}`);
      
      // Invalidate documents query to refresh sidebar
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      
      toast({
        title: "Document Created",
        description: `Document "${newDocument.title}" created and imported successfully.`,
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Error creating document:", error);
      toast({
        title: "Failed to Create Document",
        description: "Could not create a new document. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handler for successful import
  const handleDocumentImport = async (importSource: ImportSource) => {
    // Set content in editor immediately
    setContent(importSource.content);
    
    // If no current document, create one
    if (!currentDocument) {
      const title = importSource.filename 
        ? importSource.filename.replace(/\.[^/.]+$/, "") // Remove file extension
        : "Imported Document";
      
      // Create new document with imported content
      createDocumentMutation.mutate({
        title,
        content: importSource.content,
      });
    } else {
      // If we have a current document, just show success toast
      // The auto-save will handle saving the new content
      toast({
        title: "Import Successful",
        description: `${importSource.filename || 'Content'} imported successfully.`,
        variant: "default",
      });
    }
  };

  // Fetch current document
  const { data: document, isLoading } = useQuery({
    queryKey: ["/api/documents", documentId],
    enabled: !!documentId,
  });

  useEffect(() => {
    if (document) {
      setCurrentDocument(document);
      setContent(document.content || "");
    }
  }, [document, setCurrentDocument, setContent]);

  const handleLogout = async () => { // Updated handleLogout
    try {
      await signOut();
      // Optional: Redirect or show a message after sign-out
      // e.g., setLocation('/'); // if you want to redirect to home
    } catch (error) {
      console.error("Error signing out:", error);
      toast({ // Add toast for sign-out error
        title: "Sign-Out Failed",
        description: "Could not sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewModeToggle = () => {
    const modes: ViewMode[] = ["split", "editor", "preview"];
    const currentIndex = modes.indexOf(viewMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setViewMode(modes[nextIndex]);
  };

  const getViewModeIcon = () => {
    switch (viewMode) {
      case "editor": return <Edit className="w-4 h-4" />;
      case "preview": return <Eye className="w-4 h-4" />;
      default: return <Columns className="w-4 h-4" />;
    }
  };

  const getViewModeLabel = () => {
    switch (viewMode) {
      case "editor": return "Editor Only";
      case "preview": return "Preview Only";
      default: return "Split View";
    }
  };

  if (isLoading && documentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
          <span className="text-foreground font-medium">Loading document...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-foreground hover:bg-muted"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">MarkdownMate</h1>
          </div>
          
          {currentDocument && (
            <div className="hidden md:flex items-center space-x-2 ml-8">
              <span className="text-sm text-muted-foreground">Document:</span>
              <span className="text-sm font-medium text-foreground">{currentDocument.title}</span>
              <span className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full">
                {autoSaveStatus}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Import Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowImportDialog(true)}
                disabled={createDocumentMutation.isPending}
              >
                <Upload className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Import Document</TooltipContent>
          </Tooltip>

          {/* Export Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (currentDocument) {
                    setShowExportDialog(true);
                  } else {
                    toast({
                      title: "No Active Document",
                      description: "Please open or create a document to export.",
                      variant: "destructive",
                    });
                  }
                }}
                // disabled={!currentDocument} // Alternative: disable button
              >
                <ExportIcon className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export Document</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle Theme</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={openAboutModal}>
                <Info className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>About MarkdownMate</TooltipContent>
          </Tooltip>
          
          {/* User Auth Section */}
          <div className="flex items-center space-x-3">
            {authLoading ? (
              <p className="text-sm text-foreground">Loading user...</p> // Or a spinner component
            ) : currentUser ? (
              <>
                {currentUser.photoURL && (
                  <img
                    src={currentUser.photoURL}
                    alt="Profile"
                    className="w-8 h-8 rounded-full border-2 border-border object-cover"
                  />
                )}
                {currentUser.displayName && (
                  <span className="text-sm text-foreground hidden md:block">{currentUser.displayName}</span>
                )}
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  Sign Out
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={async () => {
                try {
                  await signInWithGoogle();
                } catch (error) {
                  console.error("Error during Google sign-in:", error);
                  toast({ // Add toast for sign-in error
                    title: "Sign-In Failed",
                    description: "Could not sign in with Google. Please try again.",
                    variant: "destructive",
                  });
                }
              }}>
                Sign In with Google
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <DocumentSidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Editor Area */}
        <main className="flex-1 flex flex-col">
          {/* Editor Toolbar */}
          <div className="bg-card border-b border-border px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="sm" title="Bold">
                    <strong>B</strong>
                  </Button>
                  <Button variant="ghost" size="sm" title="Italic">
                    <em>I</em>
                  </Button>
                  <Button variant="ghost" size="sm" title="Code">
                    {"</>"}
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewModeToggle}
                  className="flex items-center space-x-2"
                >
                  {getViewModeIcon()}
                  <span>{getViewModeLabel()}</span>
                </Button>
                
                <div className="text-xs text-muted-foreground">
                  <span>Words: {wordCount}</span> • <span>Characters: {charCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Split Panel Editor/Preview */}
          <div className="flex-1 flex">
            {/* Editor Panel */}
            {(viewMode === "split" || viewMode === "editor") && (
              <div className={`${viewMode === "split" ? "flex-1 border-r border-border" : "flex-1"} flex flex-col`}>
                <div className="bg-muted px-4 py-2 border-b border-border">
                  <h3 className="text-sm font-medium text-foreground">Editor</h3>
                </div>
                <MonacoEditor documentId={documentId} />
              </div>
            )}

            {/* Preview Panel */}
            {(viewMode === "split" || viewMode === "preview") && (
              <div className="flex-1 flex flex-col">
                <div className="bg-muted px-4 py-2 border-b border-border">
                  <h3 className="text-sm font-medium text-foreground">Preview</h3>
                </div>
                <MarkdownPreview content={content} />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Collaboration Panel */}
      <CollaborationPanel 
        isOpen={collaborationPanelOpen}
        onClose={() => setCollaborationPanelOpen(false)}
        documentId={documentId}
      />

      <AboutModal isOpen={isAboutModalOpen} onClose={closeAboutModal} />

      {/* Import Dialog */}
      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleDocumentImport}
      />

      {/* Export Dialog */}
      {currentDocument && ( // Conditionally render ExportDialog to ensure documentMetadata is valid
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          documentContent={content}
          documentMetadata={{
            title: currentDocument.title || 'Untitled Document',
            author: currentUser?.displayName || undefined, // Example: use current user as author
            tags: currentDocument.tags || [], // Ensure tags is an array
            created: new Date(currentDocument.createdAt), // Convert string to Date
            modified: new Date(currentDocument.updatedAt), // Convert string to Date
            // description: currentDocument.description || undefined, // Add if available
          }}
          defaultFilename={currentDocument.title || 'Untitled'}
        />
      )}
    </div>
  );
}
