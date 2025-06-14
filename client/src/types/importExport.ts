export interface ImportSource {
  type: 'file' | 'github' | 'gist' | 'url' | 'clipboard';
  content: string;
  filename?: string;
  metadata?: DocumentMetadata;
}

export interface ExportOptions {
  format: 'md' | 'pdf' | 'txt' | 'json';
  filename: string;
  includeMetadata: boolean;
  customCss?: string;
  destination: 'download' | 'github' | 'gist' | 'clipboard';
}

export interface DocumentMetadata {
  title: string;
  description?: string;
  author?: string;
  tags: string[];
  created: Date;
  modified: Date;
}
