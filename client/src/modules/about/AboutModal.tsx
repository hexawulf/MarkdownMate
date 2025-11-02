import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

const APP_VERSION = '2.0.0'; // Read from package.json

export function AboutModal({ open, onClose }: AboutModalProps) {
  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            MarkdownMate
            <span className="text-sm font-normal text-muted-foreground">v{APP_VERSION}</span>
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            A fast, single-user, local-first online Markdown editor with real-time preview.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Overview */}
          <section>
            <h3 className="font-semibold mb-2">About</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              MarkdownMate is designed for personal note-taking and writing without the complexity 
              of collaboration features. All documents are stored locally in your browser using IndexedDB. 
              No external CDNs, no analytics, no tracking.
            </p>
          </section>

          {/* Links */}
          <section>
            <h3 className="font-semibold mb-3">Resources</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => openLink('https://github.com/hexawulf/MarkdownMate#readme')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                README
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => openLink('https://github.com/hexawulf/MarkdownMate/blob/main/CHANGELOG.md')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Changelog
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => openLink('https://github.com/hexawulf/MarkdownMate#keyboard-shortcuts')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Keyboard Shortcuts
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => openLink('https://github.com/hexawulf/MarkdownMate/security')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Security
              </Button>
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section>
            <h3 className="font-semibold mb-3">Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Save</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">Ctrl+S</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Export</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">Ctrl+E</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Help</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">Ctrl+/</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New Document</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">Ctrl+N</kbd>
              </div>
            </div>
          </section>

          {/* Privacy */}
          <section>
            <h3 className="font-semibold mb-2">Hosting & Privacy</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Self-hosted on Raspberry Pi (piapps). All document processing happens locally in your browser. 
              No analytics, no external API calls, no data collection.
            </p>
          </section>

          {/* Credits */}
          <section>
            <h3 className="font-semibold mb-2">Built With</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Monaco Editor</strong> — Code editor from VS Code</li>
              <li>• <strong>Remark/Rehype</strong> — Markdown processing pipeline</li>
              <li>• <strong>Prism.js</strong> — Syntax highlighting</li>
              <li>• <strong>React & Vite</strong> — UI framework and build tool</li>
              <li>• <strong>Tailwind CSS</strong> — Styling</li>
            </ul>
          </section>

          {/* Footer */}
          <section className="pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">
              © 0xWulf — MarkdownMate v{APP_VERSION}
            </p>
            <Button
              variant="link"
              size="sm"
              className="text-xs"
              onClick={() => openLink('https://github.com/hexawulf/MarkdownMate')}
            >
              View on GitHub
            </Button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
