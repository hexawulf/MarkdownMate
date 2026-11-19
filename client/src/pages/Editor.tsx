import { useState, useEffect, useCallback, useRef } from 'react';
import { useDocumentsStore, type Document } from '@/stores/useDocumentsStore';
import { BROADCAST_NAME, type DocBroadcast } from '@/stores/useDocumentsStore';
import { DocumentsSidebar } from '@/components/DocumentsSidebar';
import { SplitView, type ViewMode } from '@/modules/editor/SplitView';
import { StatusBar } from '@/modules/editor/StatusBar';
import { Button } from '@/components/ui/button';
import { useAutosave } from '@/hooks/useAutosave';
import { useKeyboardShortcuts, createEditorShortcuts } from '@/hooks/useKeyboardShortcuts';
import { exportAsMarkdown, exportAsHtml, exportAsPdf } from '@/lib/export';
import { exportAllDocuments, readImportFiles, ensurePersistentStorage } from '@/lib/backup';
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
  const { documents, loadDocuments, createDocument, currentDocument, setCurrentDocument, hasLoadedInitialDocuments, getDocument, dbBlocked } = useDocumentsStore();
  const [content, setContent] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState(true);
  // MM-02: set when another tab changed the open document while this tab has an
  // unsaved edit. Autosave is paused until the user chooses.
  const [externalChange, setExternalChange] = useState(false);
  
  const { theme, toggleTheme } = useTheme();

  const handleSelectDocument = useCallback((doc: Document) => {
    // MM-07: selecting the document that is already open is a no-op, so a
    // pending (debounced) edit is not clobbered by resetting to stored text.
    if (currentDocument?.id === doc.id) return;
    setCurrentDocument(doc);
    setContent(doc.content);
    setLastSaved(doc.updatedAt);
    setHasUnsavedChanges(false);
  }, [setCurrentDocument, currentDocument]);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Auto-create a document whenever the list is empty after the initial load
  // (first visit, or the user deleted the last document). A ref guards against
  // firing twice while a creation is in flight, but it is cleared once a
  // document exists again so a later empty state still recovers (MM-01).
  const autoCreating = useRef(false);
  useEffect(() => {
    if (!hasLoadedInitialDocuments) return;
    if (documents.length > 0 || currentDocument) {
      autoCreating.current = false;
      return;
    }
    if (autoCreating.current) return;
    autoCreating.current = true;
    createDocument('Untitled Document', '# Welcome to MarkdownMate\n\nStart writing...')
      .then(handleSelectDocument)
      .catch((error) => {
        autoCreating.current = false;
        console.error('Failed to create the first document:', error);
      });
  }, [hasLoadedInitialDocuments, documents, currentDocument, createDocument, handleSelectDocument]);

  // Set initial document after load
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

  // Autosave. Paused while an external change is pending the user's decision.
  const { saveNow, hasPending } = useAutosave({
    documentId: currentDocument?.id || null,
    storedContent: currentDocument?.content ?? '',
    content: externalChange ? (currentDocument?.content ?? '') : content,
    paused: externalChange,
    onSave: () => {
      setLastSaved(Date.now());
      setHasUnsavedChanges(false);
    },
  });

  const handleCreateDocument = useCallback(async () => {
    const newDoc = await createDocument('Untitled Document');
    handleSelectDocument(newDoc);
  }, [createDocument, handleSelectDocument]);

  // MM-02: react to writes from other tabs on the document open here.
  //  - no pending edit  -> silently reload the newer content;
  //  - pending edit     -> show the "changed in another tab" banner and pause
  //                        autosave until the user picks Reload or Keep mine.
  // Any broadcast also refreshes the document list, so a document created,
  // renamed or deleted in another tab shows up in this tab's sidebar without a
  // reload (the "two tabs stay in sync" promise covers the list, not just the
  // open document).
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(BROADCAST_NAME);
    const onMessage = async (event: MessageEvent<DocBroadcast>) => {
      const msg = event.data;
      if (!msg) return;

      // Keep the sidebar list current for changes from other tabs. loadDocuments
      // reads from IndexedDB, the single source of truth both tabs share.
      void loadDocuments();

      const openId = currentDocument?.id;
      if (!openId || msg.id !== openId) return;
      if (msg.type === 'deleted') return; // handled by the empty-state flow
      if (msg.updatedAt <= (currentDocument?.updatedAt ?? 0)) return;

      if (hasPending()) {
        setExternalChange(true);
        return;
      }
      // No local edit pending: adopt the other tab's version.
      const fresh = await getDocument(openId);
      if (fresh) {
        setCurrentDocument(fresh);
        setContent(fresh.content);
        setLastSaved(fresh.updatedAt);
        setHasUnsavedChanges(false);
      }
    };
    ch.addEventListener('message', onMessage);
    return () => {
      ch.removeEventListener('message', onMessage);
      ch.close();
    };
  }, [currentDocument, getDocument, hasPending, setCurrentDocument, loadDocuments]);

  const handleReloadExternal = useCallback(async () => {
    if (!currentDocument) return;
    const fresh = await getDocument(currentDocument.id);
    if (fresh) {
      setCurrentDocument(fresh);
      setContent(fresh.content);
      setLastSaved(fresh.updatedAt);
      setHasUnsavedChanges(false);
    }
    setExternalChange(false);
  }, [currentDocument, getDocument, setCurrentDocument]);

  const handleKeepMine = useCallback(() => {
    // Resume autosave; the next change writes this tab's content over the other.
    setExternalChange(false);
  }, []);

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

  // MM-04: request persistent storage once the first save happens, so the
  // browser is less likely to evict the IndexedDB documents.
  const requestedPersistRef = useRef(false);
  useEffect(() => {
    if (requestedPersistRef.current) return;
    if (documents.length === 0) return;
    requestedPersistRef.current = true;
    void ensurePersistentStorage();
  }, [documents.length]);

  const handleExportAll = useCallback(async () => {
    try {
      await exportAllDocuments(documents);
    } catch (error) {
      console.error('Export all failed:', error);
    }
  }, [documents]);

  const importInputRef = useRef<HTMLInputElement>(null);
  const handleImportClick = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFiles = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    try {
      const imported = await readImportFiles(files);
      let last: Document | null = null;
      for (const doc of imported) {
        // Imported documents are always new; they never overwrite existing ones.
        last = await createDocument(doc.title || 'Untitled Document', doc.content);
      }
      if (last) handleSelectDocument(last);
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      event.target.value = '';
    }
  }, [createDocument, handleSelectDocument]);

  // Keyboard shortcuts
  const shortcuts = createEditorShortcuts({
    onSave: saveNow,
    onExport: handleExportMarkdown,
    onHelp: () => setHelpDialogOpen(true),
  });

  useKeyboardShortcuts({ shortcuts });

  // Before the first IndexedDB load finishes, show a brief loading state.
  if (!hasLoadedInitialDocuments) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          {dbBlocked ? (
            <div className="max-w-md space-y-2 px-4">
              <p className="font-medium">MarkdownMate was updated.</p>
              <p className="text-muted-foreground text-sm">
                Close every other MarkdownMate tab or window to finish the update. This page
                continues by itself. Your documents are safe.
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">Loading...</p>
          )}
        </div>
      </div>
    );
  }

  // Load finished but there is no open document (e.g. the user deleted the last
  // one and auto-creation is in flight or failed). Offer a working way out
  // instead of a dead "Loading…" screen (MM-01).
  if (!currentDocument) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">No document open.</p>
          <Button onClick={handleCreateDocument}>New document</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <h1 className="text-xl font-bold tracking-tight">MarkdownMate</h1>
        
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
              <DropdownMenuItem onClick={handleExportAll}>
                Export all (.zip backup)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImportClick}>
                Import (.md or .zip)
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

      {/* Hidden input for Import (MM-04) */}
      <input
        ref={importInputRef}
        type="file"
        accept=".md,.zip,text/markdown,application/zip"
        multiple
        className="hidden"
        onChange={handleImportFiles}
      />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 flex-shrink-0">
          <DocumentsSidebar
            currentDocumentId={currentDocument.id}
            onSelectDocument={handleSelectDocument}
            onCreateDocument={handleCreateDocument}
            onBeforeMutate={saveNow}
          />
        </div>
        
        <div className="flex-1 flex flex-col">
          {externalChange && (
            <div className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100 text-sm">
              <span>Changed in another tab.</span>
              <span className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleReloadExternal}>
                  Reload
                </Button>
                <Button size="sm" variant="ghost" onClick={handleKeepMine}>
                  Keep mine
                </Button>
              </span>
            </div>
          )}
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
