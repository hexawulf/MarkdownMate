export interface CursorPosition {
  lineNumber: number;
  column: number;
}

export interface TextChange {
  content: string;
  timestamp: number;
}

export interface CollaborationMessage {
  type: 'join-document' | 'leave-document' | 'cursor-update' | 'text-change' | 'user-joined' | 'user-left' | 'document-update';
  documentId: number;
  userId?: string;
  cursor?: CursorPosition;
  change?: TextChange;
  updates?: any;
  userEmail?: string;
  userFirstName?: string;
  userLastName?: string;
  userProfileImage?: string;
}

export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
}
