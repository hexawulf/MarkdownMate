import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { X } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const releaseDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">About MarkdownMate</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="absolute top-4 right-4">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        </DialogHeader>
        <div className="py-4 space-y-6 text-sm">
          <DialogDescription className="text-center text-muted-foreground">
            A collaborative real-time markdown editor
          </DialogDescription>

          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>MarkdownMate v1.0.0</p>
            <p>Released {releaseDate}</p>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2 text-foreground">Overview</h3>
            <p className="text-muted-foreground">
              MarkdownMate is a powerful collaborative markdown editor that enables real-time editing with live preview, syntax highlighting, and seamless team collaboration features.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2 text-foreground">Key Features</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Real-time collaborative editing with live cursors</li>
              <li>GitHub Flavored Markdown support with math rendering</li>
              <li>Monaco Editor (VSCode's editor) integration</li>
              <li>Live preview with syntax highlighting</li>
              <li>WebSocket-powered instant synchronization</li>
              <li>Presence indicators and conflict resolution</li>
              <li>Light/dark theme support</li>
              <li>GitHub Pages and Vercel deployment ready</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2 text-foreground">Tech Stack</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-muted-foreground">
              <div>
                <h4 className="font-semibold text-foreground">Frontend:</h4>
                <p>React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Editor:</h4>
                <p>Monaco Editor · GitHub Flavored Markdown · Syntax Highlighting</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Real-time:</h4>
                <p>WebSocket Integration · Live Cursors · Presence Indicators</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Deployment:</h4>
                <p>Vite Bundler · GitHub Pages · Vercel Compatible</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2 text-foreground">Prerequisites</h3>
            <p className="text-muted-foreground">
              Node.js 18.0.0+ · npm 8.0.0+ (or yarn 1.22.0+)
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2 text-foreground">Contact</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li>Author: 0xWulf</li>
              <li>Email: <a href="mailto:dev@0xwulf.dev" className="text-primary hover:underline">dev@0xwulf.dev</a></li>
              <li>GitHub Repo: <a href="https://github.com/hexawulf/MarkdownMate" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://github.com/hexawulf/MarkdownMate</a></li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AboutModal;
