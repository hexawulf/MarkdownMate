import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import DocumentSidebar from "@/components/DocumentSidebar";
import MonacoEditor from "@/components/MonacoEditor";
import MarkdownPreview from "@/components/MarkdownPreview";
import CollaborationPanel from "@/components/CollaborationPanel";
import { useEditorStore } from "@/stores/editorStore";
import { useQuery } from "@tanstack/react-query";
import { 
  FileText, 
  Menu, 
  Sun, 
  Moon, 
  Download, 
  Share, 
  Eye, 
  Edit, 
  Columns, 
  Users
} from "lucide-react";

type ViewMode = "split" | "editor" | "preview";

export default function EditorLayout() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [collaborationPanelOpen, setCollaborationPanelOpen] = useState(false);

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

  const handleLogout = () => {
    window.location.href = "/api/logout";
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
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
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
          {/* Collaboration indicators */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollaborationPanelOpen(!collaborationPanelOpen)}
          >
            <Users className="w-5 h-5" />
          </Button>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Download className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Share className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle Theme</TooltipContent>
          </Tooltip>
          
          <div className="flex items-center space-x-2">
            {user?.profileImageUrl && (
              <img
                src={user.profileImageUrl}
                alt="Profile"
                className="w-8 h-8 rounded-full border-2 border-border object-cover"
              />
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
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
    </div>
  );
}
