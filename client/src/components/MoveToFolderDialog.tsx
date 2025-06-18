import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Document, Folder } from "@shared/schema";
import { useState } from "react";

interface MoveToFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null; // Allow null for initial state
  folders: Folder[];
  onMove: (documentId: number, folderId: number | null) => void;
}

export default function MoveToFolderDialog({
  isOpen,
  onClose,
  document,
  folders,
  onMove,
}: MoveToFolderDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  if (!document) {
    return null; // Don't render if no document is selected
  }

  const handleMove = () => {
    if (document) {
      onMove(document.id, selectedFolderId ? parseInt(selectedFolderId, 10) : null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to Folder</DialogTitle>
          <DialogDescription>
            Select a folder to move the document "{document.title}" to, or choose "None" to move it to the root.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select
            value={selectedFolderId || ""}
            onValueChange={(value) => setSelectedFolderId(value === "none" ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (Root)</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id.toString()}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleMove}>Move Document</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
