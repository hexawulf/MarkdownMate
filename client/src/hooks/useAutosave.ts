import { useCallback, useEffect, useRef } from 'react';
import { createAutosaver, type Autosaver } from '@/lib/autosave';
import { useDocumentsStore } from '@/stores/useDocumentsStore';

interface UseAutosaveOptions {
  /** The document being edited, or null while none is open. */
  documentId: string | null;
  /** The content of that document as it is currently stored. */
  storedContent: string;
  /** The content currently in the editor. */
  content: string;
  debounceMs?: number;
  /** Called after a successful write of the document that is still open. */
  onSave?: () => void;
}

export function useAutosave({
  documentId,
  storedContent,
  content,
  debounceMs = 500,
  onSave,
}: UseAutosaveOptions) {
  const updateDocument = useDocumentsStore((state) => state.updateDocument);

  // Latest values for the callbacks the long-lived autosaver holds on to.
  const latest = useRef({ documentId, onSave, updateDocument });
  latest.current = { documentId, onSave, updateDocument };

  const autosaverRef = useRef<Autosaver | null>(null);
  if (autosaverRef.current === null) {
    autosaverRef.current = createAutosaver({
      debounceMs,
      save: (id, text) => latest.current.updateDocument(id, { content: text }),
      onSaved: (id) => {
        if (id === latest.current.documentId) latest.current.onSave?.();
      },
      onError: (error) => {
        console.error('Failed to autosave:', error);
      },
    });
  }
  const autosaver = autosaverRef.current;

  useEffect(() => {
    autosaver.open(documentId, storedContent);
    autosaver.change(content);
    // `storedContent` only matters at the moment a document is opened; later
    // updates of it are the autosaver's own writes coming back from the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosaver, documentId, content]);

  // Write the pending edit when the tab is hidden or closed, and on unmount.
  useEffect(() => {
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') void autosaver.flush();
    };
    const flushNow = () => {
      void autosaver.flush();
    };

    document.addEventListener('visibilitychange', flushWhenHidden);
    window.addEventListener('pagehide', flushNow);
    return () => {
      document.removeEventListener('visibilitychange', flushWhenHidden);
      window.removeEventListener('pagehide', flushNow);
      void autosaver.flush();
    };
  }, [autosaver]);

  const saveNow = useCallback(() => autosaver.flush(), [autosaver]);

  return { saveNow };
}
