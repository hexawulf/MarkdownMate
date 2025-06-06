import { create } from "zustand";
import type { DocumentWithDetails } from "@shared/schema";

interface EditorState {
  currentDocument: DocumentWithDetails | null;
  content: string;
  autoSaveStatus: "Saved" | "Saving..." | "Auto-saved" | "Save failed";
  wordCount: number;
  charCount: number;
  
  // Actions
  setCurrentDocument: (document: DocumentWithDetails | null) => void;
  setContent: (content: string) => void;
  setAutoSaveStatus: (status: EditorState["autoSaveStatus"]) => void;
  updateWordCount: (content: string) => void;
  updateCharCount: (content: string) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentDocument: null,
  content: "",
  autoSaveStatus: "Saved",
  wordCount: 0,
  charCount: 0,
  
  setCurrentDocument: (document) => set({ currentDocument: document }),
  setContent: (content) => set({ content }),
  setAutoSaveStatus: (autoSaveStatus) => set({ autoSaveStatus }),
  
  updateWordCount: (content) => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    set({ wordCount: words });
  },
  
  updateCharCount: (content) => {
    set({ charCount: content.length });
  },
}));
