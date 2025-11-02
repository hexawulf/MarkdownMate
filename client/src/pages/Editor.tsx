import { useState, useEffect, useCallback } from 'react';
import { useDocumentsStore, type Document } from '@/stores/useDocumentsStore';
import { DocumentsSidebar } from '@/components/DocumentsSidebar';
import { SplitView, type ViewMode } from '@/modules/editor/SplitView';
import { StatusBar } from '@/modules/editor/StatusBar';
import { Button } from '@/components/ui/button';
import { useAutosave } from '@/hooks/useAutosave';
import { useKeyboardShortcuts, createEditorShortcuts } from '@/hooks/useKeyboardShortcuts';
import { exportAsMarkdown, exportAsHtml, exportAsPdf } from '@/lib/export';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, Settings, Moon, Sun, HelpCircle, Info } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { formatShortcut } from '@/hooks/useKeyboardShortcuts';
import { AboutModal } from '@/modules/about';

export default function Editor() {
  const { documents, loadDocuments, createDocument, currentDocument, setCurrentDocument } = useDocumentsStore();
  const [content, setContent] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState(true);
  
  const { theme, toggleTheme } = useTheme();

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Auto-create first document if none exist
  useEffect(() => {
    if (documents.length === 0 && !currentDocument) {
      createDocument('Untitled Document', '# Welcome to MarkdownMate\n\nStart writing...');
    }
  }, [documents, currentDocument, createDocument]);

  // Set initial document
  useEffect(() => {
    if (!currentDocument && documents.length > 0) {
      setCurrentDocument(documents[0]);
      setContent(documents[0].content);
      setLastSaved(documents[0].updatedAt);
    }
  }, [currentDocument, documents, setCurrentDocument]);

  // Track unsaved changes
  useEffect(() => {
    if (currentDocument) {
      setHasUnsavedChanges(content !== currentDocument.content);
    }
  }, [content, currentDocument]);

  // Autosave
  const { saveNow } = useAutosave({
    documentId: currentDocument?.id || null,
    content,
    onSave: () => {
      setLastSaved(Date.now());
      setHasUnsavedChanges(false);
    },
  });

  const handleSelectDocument = useCallback((doc: Document) => {
    setCurrentDocument(doc);
    setContent(doc.content);
    setLastSaved(doc.updatedAt);
    setHasUnsavedChanges(false);
  }, [setCurrentDocument]);

  const handleCreateDocument = useCallback(async () => {
    const newDoc = await createDocument('Untitled Document');
    handleSelectDocument(newDoc);
  }, [createDocument, handleSelectDocument]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  const handleExportMarkdown = useCallback(() => {
    if (currentDocument) {
      exportAsMarkdown(currentDocument.title, content);
    }
  }, [currentDocument, content]);

  const handleExportHtml = useCallback(async () => {
    if (currentDocument) {
      await exportAsHtml(currentDocument.title, content);
    }
  }, [currentDocument, content]);

  const handleExportPdf = useCallback(() => {
    exportAsPdf();
  }, []);

  // Keyboard shortcuts
  const shortcuts = createEditorShortcuts({
    onSave: saveNow,
    onExport: () => setExportDialogOpen(true),
    onHelp: () => setHelpDialogOpen(true),
    onBold: () => console.log('Bold formatting'),
    onItalic: () => console.log('Italic formatting'),
    onCode: () => console.log('Code formatting'),
    onCommandPalette: () => console.log('Command palette'),
  });

  useKeyboardShortcuts({ shortcuts });

  if (!currentDocument) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <h1 className="text-xl font-bold">MarkdownMate</h1>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAboutDialogOpen(true)}
            aria-label="About"
          >
            <Info className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-2">
                <label className="text-sm font-medium">Font Size: {fontSize}px</label>
                <input
                  type="range"
                  min="10"
                  max="24"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setWordWrap(!wordWrap)}>
                {wordWrap ? '✓' : '  '} Word Wrap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportMarkdown}>
                Export as Markdown (.md)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportHtml}>
                Export as HTML
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportPdf}>
                Print to PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="sm" onClick={() => setHelpDialogOpen(true)}>
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 flex-shrink-0">
          <DocumentsSidebar
            currentDocumentId={currentDocument.id}
            onSelectDocument={handleSelectDocument}
            onCreateDocument={handleCreateDocument}
          />
        </div>
        
        <div className="flex-1 flex flex-col">
          <SplitView
            content={content}
            onChange={handleContentChange}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onCursorChange={(line, column) => setCursorPosition({ line, column })}
            fontSize={fontSize}
            wordWrap={wordWrap}
          />
          
          <StatusBar
            documentTitle={currentDocument.title}
            content={content}
            cursorPosition={cursorPosition}
            lastSaved={lastSaved}
            hasUnsavedChanges={hasUnsavedChanges}
          />
        </div>
      </div>

      {/* Help dialog */}
      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>Available keyboard shortcuts for MarkdownMate</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {shortcuts.map((shortcut, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b">
                <span>{shortcut.description}</span>
                <kbd className="px-2 py-1 bg-muted rounded text-sm font-mono">
                  {formatShortcut(shortcut)}
                </kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* About modal */}
      <AboutModal open={aboutDialogOpen} onClose={() => setAboutDialogOpen(false)} />
    </div>
  );
}
