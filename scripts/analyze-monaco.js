#!/usr/bin/env node

/**
 * Analyze Monaco Editor bundle and identify optimization opportunities
 * Usage: node scripts/analyze-monaco.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist', 'assets');

console.log('🔍 Monaco Editor Bundle Analysis\n');
console.log('='.repeat(60));

if (!fs.existsSync(distDir)) {
  console.error('❌ Build directory not found. Run `npm run build` first.');
  process.exit(1);
}

const files = fs.readdirSync(distDir);

// Categorize Monaco-related files
const monacoAssets = {
  workers: [],
  languages: [],
  modes: [],
  core: [],
  total: 0
};

const languageStats = {};

files.forEach(file => {
  const filePath = path.join(distDir, file);
  const stats = fs.statSync(filePath);
  const size = stats.size;
  
  if (file.includes('.worker-')) {
    const workerType = file.split('.worker-')[0];
    monacoAssets.workers.push({ file, size, type: workerType });
    monacoAssets.total += size;
  } else if (file.includes('Mode-')) {
    monacoAssets.modes.push({ file, size });
    monacoAssets.total += size;
  } else if (file.endsWith('.js')) {
    // Check if it's a language module
    const langMatch = file.match(/^([a-z0-9]+)-[A-Z]/);
    if (langMatch) {
      const lang = langMatch[1];
      if (!languageStats[lang]) {
        languageStats[lang] = { files: [], size: 0 };
      }
      languageStats[lang].files.push(file);
      languageStats[lang].size += size;
      monacoAssets.languages.push({ file, size, lang });
      monacoAssets.total += size;
    }
  }
});

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

console.log('📊 Workers (Essential for Monaco):');
console.log('-'.repeat(60));
monacoAssets.workers.sort((a, b) => b.size - a.size).forEach(worker => {
  const needed = worker.type === 'editor' || worker.type === 'ts' ? '✓ NEEDED' : '? CHECK';
  console.log(`${worker.type.padEnd(15)} ${formatBytes(worker.size).padStart(10)}  ${needed}`);
});

const totalWorkerSize = monacoAssets.workers.reduce((sum, w) => sum + w.size, 0);
console.log('-'.repeat(60));
console.log(`Total Workers:      ${formatBytes(totalWorkerSize)}`);

console.log('\n📝 Language Modules (Syntax Highlighting):');
console.log('-'.repeat(60));

// Sort languages by size
const sortedLangs = Object.entries(languageStats).sort((a, b) => b[1].size - a[1].size);

// Essential languages for markdown editor
const essentialLanguages = new Set([
  'markdown', 'mdx', 'html', 'css', 'scss', 'less',
  'javascript', 'typescript', 'json', 'yaml', 'xml',
  'shell', 'bash', 'python', 'java', 'cpp', 'go', 'rust'
]);

let essentialSize = 0;
let nonEssentialSize = 0;
let nonEssentialCount = 0;

sortedLangs.forEach(([lang, data]) => {
  const isEssential = essentialLanguages.has(lang);
  const marker = isEssential ? '✓' : '✗';
  const status = isEssential ? 'Essential' : 'Can Remove';
  
  if (isEssential) {
    essentialSize += data.size;
  } else {
    nonEssentialSize += data.size;
    nonEssentialCount++;
  }
  
  console.log(`${marker} ${lang.padEnd(20)} ${formatBytes(data.size).padStart(10)}  [${status}]`);
});

console.log('-'.repeat(60));
console.log(`Essential Languages:     ${formatBytes(essentialSize)}`);
console.log(`Non-Essential Languages: ${formatBytes(nonEssentialSize)} (${nonEssentialCount} languages)`);

console.log('\n💡 Optimization Recommendations:');
console.log('='.repeat(60));

const potentialSavings = nonEssentialSize;
const potentialSavingsPct = ((potentialSavings / monacoAssets.total) * 100).toFixed(1);

console.log(`\n1. REMOVE UNNECESSARY LANGUAGE MODULES`);
console.log(`   Potential savings: ${formatBytes(potentialSavings)} (${potentialSavingsPct}% of Monaco assets)`);
console.log(`   Languages to remove: ${nonEssentialCount}`);

const unnecessaryWorkers = monacoAssets.workers.filter(w => 
  !['editor', 'ts'].includes(w.type)
);

if (unnecessaryWorkers.length > 0) {
  const workerSavings = unnecessaryWorkers.reduce((sum, w) => sum + w.size, 0);
  console.log(`\n2. REMOVE UNNECESSARY WORKERS`);
  console.log(`   Potential savings: ${formatBytes(workerSavings)}`);
  console.log(`   Workers to remove: ${unnecessaryWorkers.map(w => w.type).join(', ')}`);
}

console.log(`\n3. LAZY LOAD MONACO`);
console.log(`   Strategy: Dynamic import Monaco only when editor pane is visible`);
console.log(`   Impact: Faster initial page load, delayed editor initialization`);

console.log(`\n4. USE MARKDOWN-ONLY MONACO BUILD`);
console.log(`   Strategy: Configure Monaco to load only markdown language`);
console.log(`   Impact: Major bundle size reduction`);

// Save analysis
const analysisPath = path.join(rootDir, 'metrics-monaco.json');
const analysis = {
  timestamp: new Date().toISOString(),
  workers: monacoAssets.workers,
  languages: sortedLangs.map(([lang, data]) => ({
    language: lang,
    size: data.size,
    formatted: formatBytes(data.size),
    essential: essentialLanguages.has(lang),
    files: data.files.length
  })),
  totals: {
    totalMonacoSize: monacoAssets.total,
    workersSize: totalWorkerSize,
    languagesSize: essentialSize + nonEssentialSize,
    essentialLanguagesSize: essentialSize,
    nonEssentialLanguagesSize: nonEssentialSize,
    nonEssentialCount: nonEssentialCount
  },
  potentialSavings: {
    bytes: potentialSavings,
    formatted: formatBytes(potentialSavings),
    percentage: potentialSavingsPct
  }
};

fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
console.log(`\n💾 Analysis saved to: ${analysisPath}`);
console.log('='.repeat(60));
