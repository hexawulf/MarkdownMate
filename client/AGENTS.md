# AGENTS.md - Client (React Frontend)

## Package Identity

**Purpose**: React 18 SPA for MarkdownMate's collaborative markdown editor interface  
**Tech**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui + Monaco Editor + Zustand + React Query

## Setup & Run

```bash
# From project root (runs Vite dev + Express backend together)
npm run dev
# Frontend will be at http://localhost:5004

# TypeScript check (client + shared)
npm run check

# Build client only (outputs to dist/)
npm run build

# Preview production build
npx vite preview
```

## Patterns & Conventions

### File Organization

```
client/src/
├── components/
│   ├── ui/                    # shadcn/ui primitives (Button, Dialog, etc.)
│   ├── MonacoEditor.tsx       # Monaco editor wrapper
│   ├── MarkdownPreview.tsx    # Markdown rendering component
│   ├── DocumentSidebar.tsx    # Folder/document tree
│   └── ThemeProvider.tsx      # Dark/light theme context
├── pages/
│   ├── Landing.tsx            # Marketing landing page
│   ├── Home.tsx               # Main editor page
│   └── not-found.tsx          # 404 page
├── hooks/
│   ├── useWebSocket.ts        # WebSocket connection hook
│   └── use-toast.ts           # Toast notification hook
├── stores/
│   └── editorStore.ts         # Zustand store for editor state
├── lib/
│   ├── utils.ts               # cn() helper, utility functions
│   ├── queryClient.ts         # React Query setup
│   └── markdownProcessor.ts   # Markdown parsing/rendering
├── contexts/
│   └── AuthContext.tsx        # Firebase Auth context
└── types/
    └── index.ts               # Frontend-specific TypeScript types
```

### Component Patterns

**✅ DO: Use shadcn/ui components from `components/ui/`**
```tsx
// Good: Reuse button.tsx from shadcn/ui
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";

<Button variant="default" size="lg" onClick={handleSave}>Save</Button>
```

**✅ DO: Functional components with TypeScript**
```tsx
// Example: client/src/components/MonacoEditor.tsx
interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  theme?: "vs-dark" | "vs-light";
}

export function MonacoEditor({ value, onChange, theme = "vs-dark" }: MonacoEditorProps) {
  // ... implementation
}
```

**✅ DO: Use `@/` imports for absolute paths**
```tsx
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/stores/editorStore";
import { cn } from "@/lib/utils";
import type { DocumentWithDetails } from "@shared/schema";
```

**❌ DON'T: Use class components**
```tsx
// Bad - this codebase uses functional components only
class MyComponent extends React.Component { ... }
```

**❌ DON'T: Hardcode colors - use Tailwind/CSS variables**
```tsx
// Bad
<div style={{ color: '#333' }}>Text</div>

// Good
<div className="text-foreground">Text</div>
```

### State Management

**✅ Zustand for client-side state**
```tsx
// Example: client/src/stores/editorStore.ts
import { create } from "zustand";

interface EditorState {
  currentDocument: DocumentWithDetails | null;
  content: string;
  setContent: (content: string) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentDocument: null,
  content: "",
  setContent: (content) => set({ content }),
}));

// Usage in components
import { useEditorStore } from "@/stores/editorStore";

function Editor() {
  const { content, setContent } = useEditorStore();
  return <textarea value={content} onChange={e => setContent(e.target.value)} />;
}
```

**✅ React Query for server state**
```tsx
// Example pattern (similar to existing usage)
import { useQuery, useMutation } from "@tanstack/react-query";

const { data: documents } = useQuery({
  queryKey: ["documents"],
  queryFn: async () => {
    const res = await fetch("/api/documents");
    return res.json();
  },
});

const saveMutation = useMutation({
  mutationFn: async (doc) => {
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc),
    });
    return res.json();
  },
});
```

### Custom Hooks

**✅ WebSocket pattern** (see `hooks/useWebSocket.ts`)
```tsx
import { useWebSocket } from "@/hooks/useWebSocket";

function CollaborativeEditor({ documentId }: { documentId: number }) {
  const { isConnected, messages, sendMessage } = useWebSocket(documentId);
  
  useEffect(() => {
    if (isConnected) {
      sendMessage({ type: "join", documentId });
    }
  }, [isConnected, documentId]);
  
  return <div>Status: {isConnected ? "Connected" : "Disconnected"}</div>;
}
```

**✅ Toast notifications** (shadcn/ui pattern)
```tsx
import { useToast } from "@/hooks/use-toast";

function MyComponent() {
  const { toast } = useToast();
  
  const handleSave = () => {
    toast({
      title: "Saved",
      description: "Document saved successfully",
    });
  };
}
```

### Styling

**✅ Tailwind utility classes**
```tsx
<div className="flex items-center justify-between p-4 border-b border-border">
  <h2 className="text-lg font-semibold">Title</h2>
</div>
```

**✅ Use `cn()` helper for conditional classes**
```tsx
import { cn } from "@/lib/utils";

<Button 
  className={cn(
    "px-4 py-2",
    isActive && "bg-primary",
    isDisabled && "opacity-50 pointer-events-none"
  )}
/>
```

**✅ Theme-aware with CSS variables**
```tsx
// Tailwind uses CSS variables from index.css
<div className="bg-background text-foreground border border-border">
  Respects dark/light theme automatically
</div>
```

### Routing

**✅ Use wouter for navigation**
```tsx
import { useLocation, Link } from "wouter";

function Navigation() {
  const [location, setLocation] = useLocation();
  
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/editor">Editor</Link>
    </nav>
  );
}
```

## Touch Points / Key Files

### Core Application
- **Entry point**: `client/src/main.tsx` - React root setup
- **App shell**: `client/src/App.tsx` - Route definitions
- **Theme**: `client/src/components/ThemeProvider.tsx` - Dark/light mode
- **Auth**: `client/src/contexts/AuthContext.tsx` - Firebase Auth context

### Editor Features
- **Monaco integration**: `client/src/components/MonacoEditor.tsx`
- **Markdown preview**: `client/src/components/MarkdownPreview.tsx`
- **Editor state**: `client/src/stores/editorStore.ts` (Zustand)
- **Real-time**: `client/src/hooks/useWebSocket.ts`

### UI Components
- **shadcn/ui library**: `client/src/components/ui/` - All Radix-based primitives
- **Utilities**: `client/src/lib/utils.ts` - `cn()` helper, misc functions

### Data Fetching
- **Query client**: `client/src/lib/queryClient.ts` - React Query setup
- **Types**: `@shared/schema` - Use Drizzle-generated types from shared/

## JIT Index Hints

```bash
# Find a React component by name
rg -n "export (function|const) ComponentName" client/src/components

# Find a hook
rg -n "export (function )?use" client/src/hooks

# Find Zustand stores
ls client/src/stores/

# Find all shadcn/ui components
ls client/src/components/ui/

# Find page components
ls client/src/pages/

# Search for API calls
rg -n "fetch\(" client/src

# Find React Query usage
rg -n "use(Query|Mutation)" client/src

# Find imports from shared types
rg -n "from [\"']@shared" client/src
```

## Common Gotchas

### Import Aliases
- **Always use `@/` for client imports**, not relative paths:
  ```tsx
  // Good
  import { Button } from "@/components/ui/button";
  
  // Bad
  import { Button } from "../components/ui/button";
  ```

### Firebase Auth
- Auth context wraps the app in `AuthContext.tsx`
- Check `currentUser` before accessing protected features
- Firebase config in `client/src/firebaseConfig.ts` (uses env vars)

### Monaco Editor
- Monaco is heavy - lazy load if possible
- Theme must match app theme (pass `theme` prop)
- See `MonacoEditor.tsx` for working implementation

### Shared Types
- Import from `@shared/schema` for type safety:
  ```tsx
  import type { DocumentWithDetails, Folder } from "@shared/schema";
  ```

### Tailwind CSS Variables
- Use semantic tokens: `bg-background`, `text-foreground`, `border-border`
- Never hardcode hex colors - breaks theme switching
- Custom colors defined in `client/src/index.css`

## Pre-PR Checks

```bash
# Run from project root
npm run check    # TypeScript validation
npm run build    # Ensure client builds successfully
```

**Manual testing checklist**:
- [ ] Test in light and dark mode
- [ ] Verify responsive design (mobile, tablet, desktop)
- [ ] Check browser console for errors
- [ ] Test keyboard navigation/accessibility
- [ ] Verify real-time features work (if applicable)
