#!/bin/bash
# Collect all baseline metrics before optimizations

echo "🔍 Collecting baseline metrics..."
echo "=================================="

# Create metrics directory
mkdir -p metrics-baseline
cd "$(dirname "$0")/.."

# 1. Build metrics
echo "📦 Running build metrics..."
npm run metrics:build 2>&1 | tee metrics-baseline/build.txt

# 2. Monaco analysis
echo "🎨 Analyzing Monaco bundle..."
npm run metrics:monaco 2>&1 | tee metrics-baseline/monaco.txt

# 3. Preview performance
echo "⚡ Testing preview rendering..."
npm run metrics:preview 2>&1 | tee metrics-baseline/preview.txt

# 4. IndexedDB simulation
echo "💾 Simulating IndexedDB operations..."
npm run metrics:idb 2>&1 | tee metrics-baseline/idb.txt

# 5. Save JSON metrics
cp metrics-*.json metrics-baseline/ 2>/dev/null || true

# 6. Document current bundle
echo "📊 Documenting current bundle..."
ls -lh dist/assets/*.js 2>/dev/null > metrics-baseline/bundle-files.txt || echo "No dist/ found"
du -sh dist/ 2>/dev/null > metrics-baseline/dist-size.txt || echo "No dist/ found"

# 7. Lighthouse (if available)
echo "🔦 Checking for Lighthouse..."
if command -v lighthouse &> /dev/null; then
  echo "Running Lighthouse..."
  lighthouse http://localhost:5004 --output=json --output-path=metrics-baseline/lighthouse.json --only-categories=performance 2>&1 || echo "Lighthouse failed (server may not be running)"
else
  echo "Lighthouse not installed - skipping"
fi

echo ""
echo "✅ Baseline metrics collected in metrics-baseline/"
echo "=================================="
echo ""
echo "To review:"
echo "  cat metrics-baseline/*.txt"
echo "  cat metrics-*.json | jq ."
echo ""
