import { create } from "zustand";
import type { DocumentWithDetails } from "@shared/schema";

interface EditorState {
  currentDocument: DocumentWithDetails | null;
  content: string;
  autoSaveStatus: "Saved" | "Saving..." | "Auto-saved" | "Save failed";
  wordCount: number;
  charCount: number;
  isCreatingNewDocument: boolean; // Added flag
  
  // Actions
  setCurrentDocument: (document: DocumentWithDetails | null) => void;
  setContent: (content: string) => void;
  setAutoSaveStatus: (status: EditorState["autoSaveStatus"]) => void;
  setIsCreatingNewDocument: (isCreating: boolean) => void; // Added action
  // updateWordCount and updateCharCount methods will be removed
}

export const useEditorStore = create<EditorState>((set) => ({
  currentDocument: null,
  content: "",
  autoSaveStatus: "Saved",
  wordCount: 0,
  charCount: 0,
  isCreatingNewDocument: false, // Initialized flag
  
  setCurrentDocument: (document) => set({ currentDocument: document }),
  setContent: (content) => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const chars = content.length;
    set({ content, wordCount: words, charCount: chars });
  },
  setAutoSaveStatus: (autoSaveStatus) => set({ autoSaveStatus }),
  setIsCreatingNewDocument: (isCreating) => set({ isCreatingNewDocument: isCreating }), // Implemented action
  
  // updateWordCount and updateCharCount implementations are removed
  // updateWordCount: (content) => {
  //   const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  //   set({ wordCount: words });
  // },
  // updateCharCount: (content) => {
  //   set({ charCount: content.length });
  // },
}));
