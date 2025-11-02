import { useEffect, useRef, useCallback } from 'react';
import { useDocumentsStore } from '@/stores/useDocumentsStore';

interface UseAutosaveOptions {
  documentId: string | null;
  content: string;
  debounceMs?: number;
  onSave?: () => void;
}

export function useAutosave({
  documentId,
  content,
  debounceMs = 500,
  onSave,
}: UseAutosaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousContentRef = useRef<string>(content);
  const { updateDocument } = useDocumentsStore();

  const save = useCallback(async () => {
    if (!documentId) return;
    
    try {
      await updateDocument(documentId, { content });
      onSave?.();
      previousContentRef.current = content;
    } catch (error) {
      console.error('Failed to autosave:', error);
    }
  }, [documentId, content, updateDocument, onSave]);

  useEffect(() => {
    // Don't autosave if content hasn't changed
    if (content === previousContentRef.current) return;
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      save();
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, save, debounceMs]);

  // Manual save function
  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await save();
  }, [save]);

  return { saveNow };
}
