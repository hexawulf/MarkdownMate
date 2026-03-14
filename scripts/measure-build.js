#!/usr/bin/env node

/**
 * Measure build performance and bundle sizes
 * Usage: node scripts/measure-build.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

console.log('🔨 MarkdownMate Build Performance Metrics\n');
console.log('='.repeat(60));

// Clean dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
  console.log('✓ Cleaned dist directory');
}

// Measure build time
console.log('\n📊 Running production build...\n');
const startTime = Date.now();

try {
  execSync('npm run build', { 
    cwd: rootDir, 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
} catch (error) {
  console.error('❌ Build failed');
  process.exit(1);
}

const buildTime = Date.now() - startTime;
console.log('\n' + '='.repeat(60));
console.log(`⏱️  Total build time: ${(buildTime / 1000).toFixed(2)}s`);

// Analyze bundle sizes
if (!fs.existsSync(distDir)) {
  console.error('❌ Dist directory not found');
  process.exit(1);
}

const assetsDir = path.join(distDir, 'assets');
const stats = {
  totalSize: 0,
  mainBundle: 0,
  workers: {},
  languageModules: 0,
  languageCount: 0,
  css: 0,
  fonts: 0,
  images: 0,
  largest: [],
};

function getFileSize(filePath) {
  return fs.statSync(filePath).size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Scan assets
if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  
  files.forEach(file => {
    const filePath = path.join(assetsDir, file);
    const size = getFileSize(filePath);
    stats.totalSize += size;
    
    // Track by type
    if (file.includes('index-') && file.endsWith('.js')) {
      stats.mainBundle = size;
      stats.largest.push({ file, size, type: 'Main Bundle' });
    } else if (file.includes('.worker-') && file.endsWith('.js')) {
      const workerType = file.split('.worker-')[0];
      stats.workers[workerType] = size;
      stats.largest.push({ file, size, type: 'Worker' });
    } else if (file.endsWith('.js') && !file.includes('Mode-')) {
      stats.languageModules += size;
      stats.languageCount++;
    } else if (file.endsWith('.css')) {
      stats.css += size;
    } else if (file.match(/\.(woff2?|ttf|eot)$/)) {
      stats.fonts += size;
    } else if (file.match(/\.(png|jpg|jpeg|svg|gif|webp)$/)) {
      stats.images += size;
    }
  });
}

// Sort largest files
stats.largest.sort((a, b) => b.size - a.size);

console.log('\n📦 Bundle Size Analysis:');
console.log('='.repeat(60));
console.log(`Total Assets:        ${formatBytes(stats.totalSize)}`);
console.log(`Main Bundle:         ${formatBytes(stats.mainBundle)}`);
console.log(`CSS:                 ${formatBytes(stats.css)}`);
console.log(`Fonts:               ${formatBytes(stats.fonts)}`);
console.log(`Images:              ${formatBytes(stats.images)}`);
console.log(`\nMonaco Workers:`);
Object.entries(stats.workers).forEach(([name, size]) => {
  console.log(`  ${name.padEnd(15)} ${formatBytes(size)}`);
});
console.log(`\nLanguage Modules:    ${stats.languageCount} files, ${formatBytes(stats.languageModules)}`);

console.log('\n🔝 Top 10 Largest Assets:');
console.log('='.repeat(60));
stats.largest.slice(0, 10).forEach((item, i) => {
  const fileName = item.file.length > 40 ? item.file.substring(0, 37) + '...' : item.file;
  console.log(`${(i + 1).toString().padStart(2)}. ${fileName.padEnd(40)} ${formatBytes(item.size).padStart(10)} [${item.type}]`);
});

// Performance recommendations
console.log('\n💡 Performance Insights:');
console.log('='.repeat(60));

const mainBundleMB = stats.mainBundle / (1024 * 1024);
if (mainBundleMB > 5) {
  console.log(`⚠️  Main bundle is ${mainBundleMB.toFixed(2)}MB - consider code splitting`);
}

const tsWorkerMB = (stats.workers.ts || 0) / (1024 * 1024);
if (tsWorkerMB > 10) {
  console.log(`⚠️  TypeScript worker is ${tsWorkerMB.toFixed(2)}MB - only needed for Markdown`);
}

if (stats.languageCount > 50) {
  console.log(`⚠️  ${stats.languageCount} language modules loaded - many unnecessary for Markdown editor`);
}

console.log('\n✅ Build metrics collection complete!');
console.log('='.repeat(60));

// Save metrics to JSON
const metricsPath = path.join(rootDir, 'metrics-build.json');
const metrics = {
  timestamp: new Date().toISOString(),
  buildTimeMs: buildTime,
  buildTimeSec: (buildTime / 1000).toFixed(2),
  sizes: {
    totalBytes: stats.totalSize,
    totalFormatted: formatBytes(stats.totalSize),
    mainBundleBytes: stats.mainBundle,
    mainBundleFormatted: formatBytes(stats.mainBundle),
    cssBytes: stats.css,
    workersBytes: Object.values(stats.workers).reduce((a, b) => a + b, 0),
    workers: stats.workers,
    languageModulesBytes: stats.languageModules,
    languageModulesCount: stats.languageCount,
  },
  largest: stats.largest.slice(0, 10).map(item => ({
    file: item.file,
    size: item.size,
    formatted: formatBytes(item.size),
    type: item.type
  }))
};

fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
console.log(`\n💾 Detailed metrics saved to: ${metricsPath}`);
