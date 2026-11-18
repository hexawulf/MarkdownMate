import { useState, useMemo } from 'react';
import { useDocumentsStore, type Document } from '@/stores/useDocumentsStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { FileText, Plus, Search, MoreVertical, Trash2, Copy, Edit2, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface DocumentsSidebarProps {
  currentDocumentId: string | null;
  onSelectDocument: (doc: Document) => void;
  onCreateDocument: () => void;
  /** Flush any pending editor edit before a mutation reads from storage (MM-08). */
  onBeforeMutate?: () => Promise<void> | void;
}

export function DocumentsSidebar({
  currentDocumentId,
  onSelectDocument,
  onCreateDocument,
  onBeforeMutate,
}: DocumentsSidebarProps) {
  const { documents, trash, searchDocuments, duplicateDocument, softDeleteDocument, restoreDocument, deleteDocument, emptyTrash, loadTrash } = useDocumentsStore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [trashOpen, setTrashOpen] = useState(false);

  const openTrash = async () => {
    await loadTrash();
    setTrashOpen(true);
  };

  const handleRestore = async (doc: Document) => {
    try {
      await restoreDocument(doc.id);
    } catch {
      toast({ title: 'Could not restore document', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const handleDeleteForever = async (doc: Document) => {
    try {
      await deleteDocument(doc.id);
    } catch {
      toast({ title: 'Could not delete document', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await emptyTrash();
    } catch {
      toast({ title: 'Could not empty trash', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const filteredDocuments = useMemo(() => {
    return searchQuery ? searchDocuments(searchQuery) : documents;
  }, [searchQuery, searchDocuments, documents]);

  const handleDelete = async () => {
    if (!documentToDelete) return;
    try {
      await softDeleteDocument(documentToDelete.id);
    } catch {
      toast({
        title: 'Could not delete document',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const handleDuplicate = async (doc: Document) => {
    try {
      // MM-08: flush the pending edit first so the copy includes it, not the
      // stale stored text.
      await onBeforeMutate?.();
      const duplicated = await duplicateDocument(doc.id);
      onSelectDocument(duplicated);
    } catch {
      toast({
        title: 'Could not duplicate document',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const startRename = (doc: Document) => {
    setRenameId(doc.id);
    setRenameValue(doc.title);
  };

  const { updateDocument } = useDocumentsStore();

  const handleRename = async (id: string) => {
    if (renameValue.trim()) {
      try {
        await updateDocument(id, { title: renameValue.trim() });
      } catch {
        toast({
          title: 'Could not rename document',
          description: 'Please try again.',
          variant: 'destructive',
        });
      }
    }
    setRenameId(null);
  };

  return (
    <div className="flex flex-col h-full border-r bg-background">
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Documents</h2>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={openTrash} aria-label="Open trash">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={onCreateDocument}>
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Documents list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery ? 'No documents found' : 'No documents yet'}
            </div>
          ) : (
            filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`group relative flex items-center gap-2 p-3 rounded-md hover:bg-accent cursor-pointer transition-colors ${
                  currentDocumentId === doc.id ? 'bg-accent' : ''
                }`}
                onClick={() => onSelectDocument(doc)}
              >
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                
                {renameId === doc.id ? (
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => handleRename(doc.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(doc.id);
                      if (e.key === 'Escape') setRenameId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="h-6 text-sm"
                  />
                ) : (
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(doc.updatedAt, { addSuffix: true })}
                    </p>
                  </div>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => startRename(doc)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(doc)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setDocumentToDelete(doc);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.title}"? This action can be undone from the trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Trash view (MM-05) */}
      <Dialog open={trashOpen} onOpenChange={setTrashOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Trash</DialogTitle>
            <DialogDescription>
              Deleted documents are kept here for 30 days, then removed automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto space-y-1">
            {trash.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Trash is empty</p>
            ) : (
              trash.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-accent">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Deleted {doc.deletedAt ? formatDistanceToNow(doc.deletedAt, { addSuffix: true }) : ''}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleRestore(doc)} aria-label="Restore">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteForever(doc)} aria-label="Delete forever">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleEmptyTrash} disabled={trash.length === 0}>
              Empty trash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
