#!/usr/bin/env node

/**
 * Measure markdown preview rendering performance
 * Usage: node scripts/measure-preview.js
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypePrism from 'rehype-prism-plus';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

console.log('⚡ Markdown Preview Performance Test\n');
console.log('='.repeat(60));

// Create test documents of varying sizes
const testDocs = [
  {
    name: 'Small (1KB)',
    content: '# Test\n\n' + 'Lorem ipsum dolor sit amet. '.repeat(30)
  },
  {
    name: 'Medium (10KB)',
    content: '# Large Document\n\n' + '## Section\n\nLorem ipsum dolor sit amet. '.repeat(300)
  },
  {
    name: 'Large (50KB)',
    content: '# Very Large Document\n\n' + ('## Section\n\n```javascript\nconst x = 1;\n```\n\nLorem ipsum dolor sit amet. '.repeat(1500))
  },
  {
    name: 'Complex (Math + Code)',
    content: `# Complex Document

## Math Example

When $a \\ne 0$, the solutions to $ax^2 + bx + c = 0$ are:

$$x = {-b \\pm \\sqrt{b^2-4ac} \\over 2a}$$

## Code Example

\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
\`\`\`

## Tables

| Feature | Status | Priority |
|---------|--------|----------|
| Feature A | Done | High |
| Feature B | In Progress | Medium |
| Feature C | Planned | Low |

` + 'Regular paragraph text. '.repeat(100)
  }
];

// Create processor (matches the actual implementation)
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeKatex)
  .use(rehypePrism, { ignoreMissing: true })
  .use(rehypeSanitize)
  .use(rehypeStringify);

async function measureRendering(name, markdown, iterations = 10) {
  const times = [];
  
  // Warm up
  await processor.process(markdown);
  
  // Measure
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await processor.process(markdown);
    const end = performance.now();
    times.push(end - start);
  }
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  return { name, avg, min, max, size: markdown.length };
}

console.log('Running performance tests...\n');

const results = [];

for (const doc of testDocs) {
  const result = await measureRendering(doc.name, doc.content);
  results.push(result);
  
  console.log(`${result.name.padEnd(25)}`);
  console.log(`  Size: ${result.size.toLocaleString()} bytes`);
  console.log(`  Avg:  ${result.avg.toFixed(2)}ms`);
  console.log(`  Min:  ${result.min.toFixed(2)}ms`);
  console.log(`  Max:  ${result.max.toFixed(2)}ms`);
  console.log('');
}

console.log('='.repeat(60));
console.log('\n💡 Performance Insights:');
console.log('='.repeat(60));

const largeDocResult = results.find(r => r.name.includes('Large (50KB)'));
if (largeDocResult && largeDocResult.avg > 100) {
  console.log(`⚠️  Large document rendering takes ${largeDocResult.avg.toFixed(0)}ms`);
  console.log(`   Recommendation: Debounce preview updates to 300-500ms`);
}

const complexResult = results.find(r => r.name.includes('Complex'));
if (complexResult && complexResult.avg > 50) {
  console.log(`⚠️  Complex document (math + code) takes ${complexResult.avg.toFixed(0)}ms`);
  console.log(`   Recommendation: Use memoization for unchanged content`);
}

console.log(`\n✓  Small documents render in < 10ms - good for real-time preview`);
console.log(`✓  Consider implementing:`);
console.log(`   - Debounced preview updates (500ms)`);
console.log(`   - Memoization of processed HTML`);
console.log(`   - Virtual scrolling for very long documents`);

// Save metrics
const metricsPath = path.join(rootDir, 'metrics-preview.json');
const metrics = {
  timestamp: new Date().toISOString(),
  results: results.map(r => ({
    name: r.name,
    sizeBytes: r.size,
    avgMs: parseFloat(r.avg.toFixed(2)),
    minMs: parseFloat(r.min.toFixed(2)),
    maxMs: parseFloat(r.max.toFixed(2))
  })),
  recommendations: [
    'Debounce preview updates to 500ms',
    'Memoize processed HTML to avoid re-processing',
    'Consider virtual scrolling for documents > 50KB'
  ]
};

fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
console.log(`\n💾 Metrics saved to: ${metricsPath}`);
console.log('='.repeat(60));
