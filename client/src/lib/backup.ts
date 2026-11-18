// Export-all / import and storage-persistence helpers (MM-04).
//
// Documents live only in this browser's IndexedDB, so a backup path matters.
// Export writes one .zip of `<title>.md` files plus a manifest.json. Import
// accepts that zip or loose .md files; every imported document is created fresh
// and never overwrites an existing one. JSZip is loaded with a dynamic import
// so it stays out of the main bundle.
import { saveAs } from 'file-saver';
import { safeFileName } from './export';
import type { Document } from '@/stores/useDocumentsStore';

export interface ManifestEntry {
  id: string;
  title: string;
  file: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

export interface BackupManifest {
  app: 'MarkdownMate';
  version: 1;
  exportedAt: number;
  documents: ManifestEntry[];
}

// Give each document a unique `.md` file name within the zip.
function uniqueFileNames(docs: Document[]): Map<string, string> {
  const used = new Set<string>();
  const result = new Map<string, string>();
  for (const doc of docs) {
    const base = safeFileName(doc.title);
    let name = `${base}.md`;
    let n = 2;
    while (used.has(name.toLowerCase())) {
      name = `${base} (${n}).md`;
      n += 1;
    }
    used.add(name.toLowerCase());
    result.set(doc.id, name);
  }
  return result;
}

// Build a .zip Blob from the given documents (exported for testing).
export async function buildBackupZip(docs: Document[]): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const names = uniqueFileNames(docs);

  const manifest: BackupManifest = {
    app: 'MarkdownMate',
    version: 1,
    exportedAt: Date.now(),
    documents: docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      file: names.get(doc.id)!,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      tags: doc.tags ?? [],
    })),
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  for (const doc of docs) {
    zip.file(names.get(doc.id)!, doc.content);
  }
  return zip.generateAsync({ type: 'blob' });
}

export async function exportAllDocuments(docs: Document[]): Promise<void> {
  const blob = await buildBackupZip(docs);
  const stamp = new Date().toISOString().slice(0, 10);
  saveAs(blob, `markdownmate-backup-${stamp}.zip`);
}

export interface ImportedDoc {
  title: string;
  content: string;
}

// Parse a backup zip into title/content pairs (exported for testing).
export async function parseBackupZip(blob: Blob | ArrayBuffer): Promise<ImportedDoc[]> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(blob);

  let manifest: BackupManifest | null = null;
  const manifestFile = zip.file('manifest.json');
  if (manifestFile) {
    try {
      manifest = JSON.parse(await manifestFile.async('string')) as BackupManifest;
    } catch {
      manifest = null;
    }
  }

  const docs: ImportedDoc[] = [];
  if (manifest) {
    for (const entry of manifest.documents) {
      const f = zip.file(entry.file);
      if (f) docs.push({ title: entry.title, content: await f.async('string') });
    }
    return docs;
  }

  // No manifest: fall back to every .md file in the zip, titled by file name.
  const mdFiles = zip.file(/\.md$/i);
  for (const f of mdFiles) {
    const content = await f.async('string');
    const title = f.name.replace(/\.md$/i, '').split('/').pop() || 'Untitled';
    docs.push({ title, content });
  }
  return docs;
}

// Turn a list of picked files (a .zip or loose .md files) into import payloads.
export async function readImportFiles(files: FileList | File[]): Promise<ImportedDoc[]> {
  const list = Array.from(files);
  const docs: ImportedDoc[] = [];
  for (const file of list) {
    if (file.name.toLowerCase().endsWith('.zip')) {
      const buf = await file.arrayBuffer();
      docs.push(...(await parseBackupZip(buf)));
    } else if (file.name.toLowerCase().endsWith('.md') || file.type === 'text/markdown') {
      const content = await file.text();
      const title = file.name.replace(/\.md$/i, '') || 'Untitled';
      docs.push({ title, content });
    }
  }
  return docs;
}

// Storage persistence (MM-04). Returns the current persisted state, requesting
// persistence once if it is not already granted.
export async function ensurePersistentStorage(): Promise<boolean | null> {
  if (typeof navigator === 'undefined' || !navigator.storage) return null;
  try {
    if (navigator.storage.persisted) {
      const already = await navigator.storage.persisted();
      if (already) return true;
    }
    if (navigator.storage.persist) {
      return await navigator.storage.persist();
    }
    return null;
  } catch {
    return null;
  }
}

export async function getPersistenceState(): Promise<boolean | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) return null;
  try {
    return await navigator.storage.persisted();
  } catch {
    return null;
  }
}
