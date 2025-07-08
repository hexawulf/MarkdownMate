import { useEffect, useRef, useMemo } from "react"; // Added useMemo
import { Editor } from "@monaco-editor/react";
import { useTheme } from "@/components/ThemeProvider";
import { useEditorStore } from "@/stores/editorStore";
import { useWebSocket } from "@/hooks/useWebSocket";
// import { useToast } from "@/hooks/use-toast"; // useToast seems unused with fetch-based save
// import { useMutation, useQueryClient } from "@tanstack/react-query"; // No longer needed for auto-save
// import { apiRequest } from "@/lib/queryClient"; // No longer needed for auto-save
// import { isUnauthorizedError } from "@/lib/authUtils"; // No longer needed for auto-save, direct fetch handles errors
import { debounce } from "lodash-es";

interface MonacoEditorProps {
  documentId: number | null;
}

export default function MonacoEditor({ documentId }: MonacoEditorProps) {
  const { theme } = useTheme();
  // const { toast } = useToast(); // toast is not used in the new fetch-based save logic directly
  const editorRef = useRef<any>(null);
  const lastSavedContent = useRef<string | undefined>(undefined);
  // Track if we've synced the loaded document content yet
  const hasInitializedRef = useRef<number | null>(null); // Add this line

  const {
    content, 
    setContent, 
    setAutoSaveStatus
    // updateWordCount, // No longer needed as setContent handles it
    // updateCharCount  // No longer needed as setContent handles it
  } = useEditorStore();

  // Initialize lastSavedContent when document loads
  // Track if we've synced the loaded document content yet
  // const hasInitializedRef = useRef<number | null>(null); // This line is defined above

  useEffect(() => {
    // Only sync lastSavedContent once when document first loads
    if (documentId && content !== undefined && hasInitializedRef.current !== documentId) {
      // This is a newly loaded document - sync it regardless of content
      lastSavedContent.current = content;
      hasInitializedRef.current = documentId;
      // console.log('[MonacoEditor Sync] Initial document sync - lastSavedContent set to length:', content.length);
    }
  }, [documentId, content]);

  // WebSocket for real-time collaboration
  const { sendMessage, isConnected } = useWebSocket(documentId);

  const debouncedSave = useMemo(() => {
    return debounce((currentContentValue: string) => {
      const currentDocumentId = documentId;
      const isCurrentlyCreating = useEditorStore.getState().isCreatingNewDocument;

      // console.log('[Debounce Check] isCreatingNewDocument:', isCurrentlyCreating);
      if (isCurrentlyCreating) {
        // console.log("Auto-save skipped: new document not yet created");
        return;
      }

      // console.log('[Debounce Check] documentId:', currentDocumentId);
      if (currentDocumentId === null || currentDocumentId === undefined) {
        // console.log("Auto-save skipped: documentId is null or undefined.");
        return;
      }

      // console.log('[Debounce Check] currentContentValue (length):', currentContentValue?.length);
      // console.log('[Debounce Check] lastSavedContent.current (length):', lastSavedContent.current?.length);

      if (currentContentValue === lastSavedContent.current) {
        // console.log("Auto-save skipped: content unchanged."); // This one can be noisy, but useful. Optional to keep.
        return;
      }

      // console.log('Autosave triggered for document:', currentDocumentId);
      useEditorStore.getState().setAutoSaveStatus('Saving...');

      fetch(`/api/documents/${currentDocumentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: currentContentValue })
      })
      .then(response => {
        if (response.ok) {
          // console.log('Autosave successful. Status:', response.status);
          useEditorStore.getState().setAutoSaveStatus('Auto-saved');
          lastSavedContent.current = currentContentValue; // Update lastSavedContent on successful save
          return response.json();
        } else {
          console.error('Autosave failed. Status:', response.status);
          useEditorStore.getState().setAutoSaveStatus('Save failed');
          // Attempt to log error response body
          response.json().then(data => {
            console.error('Autosave error response data:', data);
          }).catch(() => {
            response.text().then(textData => {
              console.error('Autosave error response text:', textData);
            });
          });
          throw new Error(`Autosave failed with status: ${response.status}`);
        }
      })
      .then(data => {
        if (data) {
          // console.log('Autosave response data:', data);
          // Potentially update other state based on response if needed
        }
      })
      .catch(error => {
        console.error('Autosave error:', error);
        // Ensure status is set to failed if not already by a non-ok response
        if (useEditorStore.getState().autoSaveStatus !== 'Save failed') {
           useEditorStore.getState().setAutoSaveStatus('Save failed');
        }
      });
    }, 2000);
  }, [documentId]); // documentId is a dependency for debouncedSave if it's used directly from props inside

  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined) return;
    
    setContent(value);
    // console.log('Content changed:', value); // Removed as per subtask requirement
    
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
    debouncedSave(value);
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
          scrollBeyondLastLine: true,
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
