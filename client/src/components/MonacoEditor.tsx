import { useEffect, useRef } from "react";
import { Editor } from "@monaco-editor/react";
import { useTheme } from "@/components/ThemeProvider";
import { useEditorStore } from "@/stores/editorStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { debounce } from "lodash-es";

interface MonacoEditorProps {
  documentId: number | null;
}

export default function MonacoEditor({ documentId }: MonacoEditorProps) {
  const { theme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const editorRef = useRef<any>(null);
  const lastSavedContent = useRef<string>("");
  
  const { 
    content, 
    setContent, 
    setAutoSaveStatus, 
    updateWordCount, 
    updateCharCount 
  } = useEditorStore();

  // WebSocket for real-time collaboration
  const { sendMessage, isConnected } = useWebSocket(documentId);

  // Auto-save mutation
  const autoSaveMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!documentId) return;
      await apiRequest("PATCH", `/api/documents/${documentId}`, { content });
    },
    onSuccess: () => {
      setAutoSaveStatus("Auto-saved");
      lastSavedContent.current = content;
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      setAutoSaveStatus("Save failed");
      toast({
        title: "Auto-save failed",
        description: "Your changes could not be saved automatically",
        variant: "destructive",
      });
    },
  });

  // Debounced auto-save function
  const debouncedAutoSave = useRef(
    debounce((content: string) => {
      if (content !== lastSavedContent.current && documentId) {
        setAutoSaveStatus("Saving...");
        autoSaveMutation.mutate(content);
      }
    }, 2000)
  ).current;

  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined) return;
    
    setContent(value);
    updateWordCount(value);
    updateCharCount(value);
    
    // Send real-time update
    if (isConnected && documentId) {
      sendMessage({
        type: 'text-change',
        documentId,
        change: {
          content: value,
          timestamp: Date.now(),
        },
      });
    }
    
    // Auto-save
    debouncedAutoSave(value);
  };

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Configure markdown language
    monaco.languages.setLanguageConfiguration('markdown', {
      wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
    });

    // Track cursor position for collaboration
    editor.onDidChangeCursorPosition((e: any) => {
      if (isConnected && documentId) {
        sendMessage({
          type: 'cursor-update',
          documentId,
          cursor: {
            lineNumber: e.position.lineNumber,
            column: e.position.column,
          },
        });
      }
    });
  };

  // Join document collaboration when component mounts
  useEffect(() => {
    if (isConnected && documentId) {
      sendMessage({
        type: 'join-document',
        documentId,
        userId: 'current-user', // This should come from auth context
      });
      
      return () => {
        sendMessage({
          type: 'leave-document',
          documentId,
        });
      };
    }
  }, [isConnected, documentId, sendMessage]);

  return (
    <div className="flex-1 relative">
      <Editor
        height="100%"
        language="markdown"
        theme={theme === "dark" ? "vs-dark" : "vs-light"}
        value={content}
        onChange={handleEditorChange}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: false },
          wordWrap: "on",
          lineNumbers: "on",
          fontSize: 14,
          fontFamily: "JetBrains Mono, Menlo, Monaco, monospace",
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          multiCursorModifier: "ctrlCmd",
          tabSize: 2,
          insertSpaces: true,
          renderWhitespace: "none",
          renderLineHighlight: "line",
          selectionHighlight: false,
          occurrencesHighlight: false,
          bracketPairColorization: {
            enabled: true,
          },
          suggest: {
            showWords: false,
            showSnippets: true,
          },
        }}
        loading={
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
              <span className="text-sm text-muted-foreground">Loading editor...</span>
            </div>
          </div>
        }
      />
      
      {/* Connection status indicator */}
      {documentId && (
        <div className="absolute top-4 right-4">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-accent' : 'bg-destructive'}`} />
        </div>
      )}
    </div>
  );
}
