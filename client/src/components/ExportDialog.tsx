import React, { useState, useEffect, useMemo } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertCircle } from 'lucide-react';
import ImportExportService from '@/lib/importExportService'; // Assuming path
import { ExportOptions, DocumentMetadata } from '@/types/importExport'; // Assuming path

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentContent: string;
  documentMetadata: DocumentMetadata; // Assuming metadata is always available for simplicity
  defaultFilename?: string;
}

type ExportFormat = 'md' | 'txt' | 'pdf' | 'json';
type ExportDestination = 'download' | 'clipboard' | 'gist';

// Helper to get default filename without extension
const getFilenameWithoutExtension = (name?: string) => {
  if (!name) return 'document';
  const lastDot = name.lastIndexOf('.');
  if (lastDot === -1) return name;
  return name.substring(0, lastDot);
};

const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  documentContent,
  documentMetadata,
  defaultFilename,
}) => {
  const { toast } = useToast(); // Added
  const [filename, setFilename] = useState(getFilenameWithoutExtension(defaultFilename));
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('md');
  const [selectedDestination, setSelectedDestination] = useState<ExportDestination>('download');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [githubToken, setGithubToken] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Instantiate service, potentially with token if destination is gist
  const importExportService = useMemo(() => {
    if (selectedDestination === 'gist' && githubToken) {
      return new ImportExportService(githubToken);
    }
    return new ImportExportService(); // No token for other cases or if token is not yet entered
  }, [selectedDestination, githubToken]);

  useEffect(() => {
    if (isOpen) {
      setFilename(getFilenameWithoutExtension(defaultFilename || documentMetadata.title));
      setSelectedFormat('md');
      setSelectedDestination('download');
      setIncludeMetadata(true);
      // setGithubToken(''); // Don't reset token if user might reuse it
      setIsLoading(false);
      setError(null);
    }
  }, [isOpen, defaultFilename, documentMetadata]);

  const handleExport = async () => {
    setIsLoading(true);
    setError(null);

    const finalFilename = `${filename}.${selectedFormat}`;
    const options: ExportOptions = {
      format: selectedFormat,
      filename: finalFilename,
      includeMetadata: selectedFormat === 'json' ? true : includeMetadata, // JSON always includes it in its structure
      destination: selectedDestination,
    };

    try {
      switch (selectedFormat) {
        case 'md':
          await importExportService.exportToMd(documentContent, options);
          break;
        case 'txt':
          // For TXT, we might want to explicitly exclude metadata or strip it
          // For now, documentContent is assumed to be plain or Markdown.
          // If metadata is included and content is Markdown, it might appear as is.
          await importExportService.exportToTxt(documentContent, options);
          break;
        case 'pdf':
          // Basic HTML wrapper for PDF export. For better results, a proper Markdown-to-HTML converter is needed.
          // This simple wrapper helps html2canvas capture the content.
          const htmlContent = `
            <div style="font-family: sans-serif; padding: 20px;">
              ${documentMetadata.title ? `<h1>${documentMetadata.title}</h1>` : ''}
              <pre style="white-space: pre-wrap; word-wrap: break-word;">${documentContent}</pre>
              ${options.includeMetadata && documentMetadata.author ? `<p>Author: ${documentMetadata.author}</p>` : ''}
              ${options.includeMetadata && documentMetadata.created ? `<p>Created: ${new Date(documentMetadata.created).toLocaleString()}</p>` : ''}
            </div>`;
          await importExportService.exportToPdf(htmlContent, options);
          break;
        case 'json':
          await importExportService.exportToJson(
            { content: documentContent, metadata: documentMetadata },
            options
          );
          break;
        default:
          throw new Error('Unsupported format selected.');
      }
      toast({ // Added success toast
        title: "Export Successful",
        description: `Document exported as ${options.filename} to ${options.destination}.`,
      });
      onClose(); // Close dialog on successful export
    } catch (err: any) {
      console.error("Export failed:", err);
      const errorMessage = err.message || 'An unknown error occurred during export.';
      setError(errorMessage); // Keep for in-dialog error display
      toast({ // Added error toast
        title: "Export Failed",
        description: `Error exporting document: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isGistDestination = selectedDestination === 'gist';
  // PDF export only supports download for now, as per ImportExportService implementation
  const isPdfAndNotDownload = selectedFormat === 'pdf' && selectedDestination !== 'download';


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Document</DialogTitle>
          <DialogDescription>
            Choose your desired format and destination for the export.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="my-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="filename">Filename (without extension)</Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="e.g., my-document"
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <Select
                value={selectedFormat}
                onValueChange={(value) => setSelectedFormat(value as ExportFormat)}
                disabled={isLoading}
              >
                <SelectTrigger id="format">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="md">Markdown (.md)</SelectItem>
                  <SelectItem value="txt">Plain Text (.txt)</SelectItem>
                  <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                  <SelectItem value="json">JSON (.json)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <Select
                value={selectedDestination}
                onValueChange={(value) => setSelectedDestination(value as ExportDestination)}
                disabled={isLoading}
              >
                <SelectTrigger id="destination">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="download">Download</SelectItem>
                  <SelectItem value="clipboard" disabled={isPdfAndNotDownload}>Clipboard</SelectItem>
                  <SelectItem value="gist" disabled={isPdfAndNotDownload}>GitHub Gist</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isPdfAndNotDownload && (
            <p className="text-xs text-yellow-600">PDF export currently only supports download.</p>
          )}

          {selectedFormat !== 'json' && ( // JSON structure inherently includes metadata
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="include-metadata"
                checked={includeMetadata}
                onCheckedChange={(checked) => setIncludeMetadata(checked as boolean)}
                disabled={isLoading}
              />
              <Label htmlFor="include-metadata" className="text-sm font-normal">
                Include metadata (if applicable for format)
              </Label>
            </div>
          )}

          {isGistDestination && (
            <div className="space-y-2 pt-2">
              <Label htmlFor="github-token">GitHub Token (for Gist)</Label>
              <Input
                id="github-token"
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="Enter your GitHub PAT"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">
                A GitHub Personal Access Token with 'gist' scope is required.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleExport} disabled={isLoading || (isGistDestination && !githubToken) || isPdfAndNotDownload}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
