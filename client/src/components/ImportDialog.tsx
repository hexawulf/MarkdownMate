import React, { useState, useCallback, DragEvent, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast'; // Added
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, FileText, ClipboardPaste } from 'lucide-react';
import ImportExportService from '@/lib/importExportService'; // Assuming path
import { ImportSource } from '@/types/importExport'; // Assuming path

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (importSource: ImportSource) => void;
}

const importExportService = new ImportExportService(); // Instantiate the service

const ImportDialog: React.FC<ImportDialogProps> = ({ isOpen, onClose, onImport }) => {
  const { toast } = useToast(); // Added
  const [activeTab, setActiveTab] = useState<'file' | 'github' | 'url' | 'clipboard'>('file');

  // File Upload Tab State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // GitHub Tab State
  const [githubUrl, setGithubUrl] = useState('');

  // URL Tab State
  const [webUrl, setWebUrl] = useState('');

  // General State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetStates = useCallback(() => {
    setSelectedFile(null);
    setGithubUrl('');
    setWebUrl('');
    setIsLoading(false);
    setError(null);
    // Keep activeTab as is, or reset if desired: setActiveTab('file');
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetStates();
    }
  }, [isOpen, resetStates]);

  const handleImport = async (importPromise: Promise<ImportSource>) => {
    setIsLoading(true);
    setError(null);
    try {
      const source = await importPromise;
      onImport(source);
      onClose(); // Close dialog on successful import
    } catch (err: any) {
      console.error("Import failed:", err);
      const errorMessage = err.message || 'An unknown error occurred during import.';
      setError(errorMessage); // Keep for in-dialog error display
      toast({ // Added toast for error
        title: "Import Failed",
        description: `Error importing from ${activeTab}: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- File Upload Tab Handlers ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setError(null);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      setSelectedFile(event.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const triggerFileInput = () => {
    document.getElementById('file-input')?.click();
  };

  const handleImportFile = () => {
    if (selectedFile) {
      handleImport(importExportService.importFromFile(selectedFile));
    } else {
      setError('Please select a file to import.');
    }
  };

  // --- GitHub Tab Handlers ---
  const handleImportGithub = () => {
    if (githubUrl.trim()) {
      handleImport(importExportService.importFromGithub(githubUrl.trim()));
    } else {
      setError('Please enter a GitHub URL.');
    }
  };

  // --- URL Tab Handlers ---
  const handleImportUrl = () => {
    if (webUrl.trim()) {
      handleImport(importExportService.importFromUrl(webUrl.trim()));
    } else {
      setError('Please enter a web page URL.');
    }
  };

  // --- Clipboard Tab Handlers ---
  const handlePasteFromClipboard = async () => {
    handleImport(importExportService.importFromClipboard());
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Import Document</DialogTitle>
          <DialogDescription>
            Import documents from various sources. Choose your preferred method below.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="my-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="file">File</TabsTrigger>
            <TabsTrigger value="github">GitHub</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="clipboard">Clipboard</TabsTrigger>
          </TabsList>

          {/* File Upload Tab */}
          <TabsContent value="file" className="py-4">
            <div className="space-y-4">
              <Label htmlFor="file-input-dropzone">Upload a file (.md, .html, .docx, .txt)</Label>
              <div
                id="file-input-dropzone"
                onClick={triggerFileInput}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer
                  ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  } transition-colors`}
              >
                <FileText className="w-12 h-12 text-gray-400 mb-2" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">MD, MARKDOWN, HTML, DOCX, TXT</p>
                <input id="file-input" type="file" className="hidden" onChange={handleFileChange} accept=".md,.markdown,.txt,.html,.htm,.docx" />
              </div>
              {selectedFile && (
                <div className="text-sm text-gray-700">
                  Selected file: <span className="font-medium">{selectedFile.name}</span>
                </div>
              )}
              <Button onClick={handleImportFile} disabled={isLoading || !selectedFile} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import from File
              </Button>
            </div>
          </TabsContent>

          {/* GitHub Tab */}
          <TabsContent value="github" className="py-4">
            <div className="space-y-4">
              <Label htmlFor="github-url">GitHub URL</Label>
              <Input
                id="github-url"
                placeholder="Enter GitHub raw file or Gist URL"
                value={githubUrl}
                onChange={(e) => { setGithubUrl(e.target.value); setError(null); }}
                disabled={isLoading}
              />
              <Button onClick={handleImportGithub} disabled={isLoading || !githubUrl.trim()} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import from GitHub
              </Button>
            </div>
          </TabsContent>

          {/* URL Tab */}
          <TabsContent value="url" className="py-4">
            <div className="space-y-4">
              <Label htmlFor="web-url">Web Page URL</Label>
              <Input
                id="web-url"
                placeholder="Enter URL of a web page"
                value={webUrl}
                onChange={(e) => { setWebUrl(e.target.value); setError(null); }}
                disabled={isLoading}
              />
              <Button onClick={handleImportUrl} disabled={isLoading || !webUrl.trim()} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import from URL
              </Button>
            </div>
          </TabsContent>

          {/* Clipboard Tab */}
          <TabsContent value="clipboard" className="py-4">
            <div className="space-y-4 flex flex-col items-center">
              <ClipboardPaste className="w-16 h-16 text-gray-400 my-4" />
              <p className="text-sm text-gray-600 text-center">
                Copy content from your source, then click the button below to paste and import.
              </p>
              <Button onClick={handlePasteFromClipboard} disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Paste and Import from Clipboard
              </Button>
            </div>
          </TabsContent>

        </Tabs>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportDialog;
