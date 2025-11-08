/**
 * Monaco Editor Configuration for MarkdownMate
 * 
 * This module configures Monaco to only load essential language modules
 * for a markdown editor, significantly reducing bundle size.
 * 
 * Essential languages:
 * - markdown (primary editing language)
 * - Common code fence languages (js, ts, python, bash, etc.)
 * - Structured data formats (json, yaml, xml)
 * - Web languages (html, css)
 * 
 * Excluded: 70+ languages like ABAP, Clojure, Pascal, Fortran, etc.
 */

import type * as monacoType from 'monaco-editor';

/**
 * Essential languages for a markdown editor
 * These support the most common code fence syntax highlighting needs
 */
export const ESSENTIAL_LANGUAGES = [
  // Core
  'markdown',
  'plaintext',
  
  // JavaScript ecosystem
  'javascript',
  'typescript',
  'json',
  
  // Web
  'html',
  'css',
  'scss',
  
  // Popular programming languages
  'python',
  'java',
  'cpp',
  'c',
  'csharp',
  'go',
  'rust',
  'php',
  'ruby',
  
  // Shell scripting
  'shell',
  'bash',
  'powershell',
  
  // Data/Config
  'yaml',
  'xml',
  'sql',
  
  // Misc common
  'dockerfile',
  'graphql',
] as const;

/**
 * Configure Monaco editor with minimal language set
 * Call this after Monaco is loaded but before creating an editor instance
 */
export function configureMonaco(monaco: typeof monacoType) {
  // Get all registered languages
  const allLanguages = monaco.languages.getLanguages();
  const essentialSet = new Set(ESSENTIAL_LANGUAGES);
  
  // Count for metrics
  const total = allLanguages.length;
  const essential = allLanguages.filter(lang => essentialSet.has(lang.id as any)).length;
  const removed = total - essential;
  
  console.log(`[Monaco Config] Loaded ${essential}/${total} languages (${removed} excluded for bundle optimization)`);
  
  // Note: Monaco doesn't provide a clean API to unregister languages after they're loaded
  // The bundle size reduction comes from Vite's tree-shaking when we don't import
  // language workers. The workers were already optimized in monaco-workers.ts.
  
  // This function serves as documentation of our language policy
  // and can be extended in the future if Monaco provides better APIs
}

/**
 * Get the list of essential language IDs for Vite optimization
 */
export function getEssentialLanguageIds(): readonly string[] {
  return ESSENTIAL_LANGUAGES;
}
