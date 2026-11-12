/**
 * Debounced autosave that knows which document it is saving.
 *
 * The controller tracks, for the document that is currently open, the content
 * that is known to be stored and the latest content that still has to be
 * written. That gives three guarantees the previous hook-only version lacked:
 *
 *  - opening a document never writes it (no bumped "last modified" time),
 *  - switching documents writes the pending edit to the document it belongs to
 *    instead of dropping it,
 *  - a pending edit can be flushed on demand (Ctrl+S, tab hidden, unmount).
 */

export interface AutosaverOptions {
  /** Persist `content` for `documentId`. Must reject when the write fails. */
  save: (documentId: string, content: string) => Promise<void>;
  /** Quiet period after the last change before the write happens. */
  debounceMs?: number;
  onSaved?: (documentId: string) => void;
  onError?: (error: unknown, documentId: string) => void;
}

export interface Autosaver {
  /** Start tracking a document. Flushes any pending edit of the previous one. */
  open: (documentId: string | null, storedContent: string) => void;
  /** Report the current editor content of the open document. */
  change: (content: string) => void;
  /** Write the pending edit now, if there is one. */
  flush: () => Promise<void>;
  /** True while an edit is waiting for the debounce timer. */
  hasPending: () => boolean;
}

export function createAutosaver({
  save,
  debounceMs = 500,
  onSaved,
  onError,
}: AutosaverOptions): Autosaver {
  let documentId: string | null = null;
  let storedContent = '';
  let pendingContent: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const flush = async (): Promise<void> => {
    clearTimer();
    if (documentId === null || pendingContent === null) return;

    const id = documentId;
    const content = pendingContent;
    pendingContent = null;

    try {
      await save(id, content);
    } catch (error) {
      // Keep the edit so the next change or flush retries it, unless the user
      // has typed something newer or moved to another document in the meantime.
      if (documentId === id && pendingContent === null) {
        pendingContent = content;
      }
      onError?.(error, id);
      return;
    }

    if (documentId === id) {
      storedContent = content;
    }
    onSaved?.(id);
  };

  const open = (nextDocumentId: string | null, nextStoredContent: string) => {
    if (nextDocumentId === documentId) return;

    // Hand the previous document's pending edit to `save` before letting go of it.
    void flush();

    documentId = nextDocumentId;
    storedContent = nextStoredContent;
    pendingContent = null;
  };

  const change = (content: string) => {
    if (documentId === null) return;

    clearTimer();

    if (content === storedContent) {
      pendingContent = null;
      return;
    }

    pendingContent = content;
    timer = setTimeout(() => {
      void flush();
    }, debounceMs);
  };

  return {
    open,
    change,
    flush,
    hasPending: () => pendingContent !== null,
  };
}
