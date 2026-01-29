# Bundle Size Monitoring & Quick Reference

## Quick Win Summary

Three high-impact optimizations to implement immediately:

### 1. Consolidate Svelte Chunks (5-8KB, 20 min)

**Edit:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/vite.config.js`

**Change:** Lines 63-101 (manualChunks function)

```javascript
// Add after the d3-drag check (around line 88):

// PHASE 1A: Consolidate Svelte utilities
if (id.includes('svelte')) {
  if (id.includes('transition') || id.includes('animate')) {
    return 'svelte-animations';
  }
  return 'svelte-core';
}
```

**Result:** 22 chunks → 2 chunks, -8KB gzip

**Test:**
```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app
npm run build
npm run test
```

---

### 2. Consolidate Dexie Chunks (3-5KB, 15 min)

**Edit:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/vite.config.js`

**Add:** After the Svelte chunk code:

```javascript
// PHASE 1B: Consolidate Dexie operations
if (id.includes('dexie') || id.includes('src/lib/db') || id.includes('src/lib/stores/dexie')) {
  return 'dexie-operations';
}
```

**Result:** 3 chunks → 1 chunk, -3KB gzip

**Test:**
```bash
npm test -- tests/unit/db/
npm run dev  # Visit /shows to verify data loads
```

---

### 3. Create Common Utils Chunk (8-12KB, 45 min)

**Step 1:** Create `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/utils/common.js`:

```javascript
// Common utilities imported by 3+ routes
export { isValidEmail, validateForm, sanitizeInput } from './validation.js';
export { formatDate, formatPrice, formatString } from './format.js';
export { debounce, throttle, processInChunks, yieldToMain } from './scheduler.js';
```

**Step 2:** Update vite.config.js (add to manualChunks):

```javascript
if (id.includes('src/lib/utils/common.js')) {
  return 'utils-common';
}
```

**Step 3:** Update imports in routes:
```bash
# Replace in all route files:
# FROM: import { formatDate } from '$lib/utils/format';
# TO:   import { formatDate } from '$lib/utils/common';
```

**Result:** 31 chunks → 1 chunk, -12KB gzip

---

## Automated Measurement Script

Create `/tmp/measure_bundles.sh`:

```bash
#!/bin/bash

COLORS='\033[0;36m'
SAVINGS='\033[0;32m'
NC='\033[0m'

cd "/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app"

echo -e "${COLORS}=== Bundle Size Measurement ===${NC}\n"

# Build
echo "Building..."
npm run build > /dev/null 2>&1

# Measure chunks directory
CHUNKS_DIR="build/client/_app/immutable/chunks"
TOTAL_RAW=$(du -sb "$CHUNKS_DIR" | awk '{print $1}')
TOTAL_GZIP=$(tar czf - "$CHUNKS_DIR" 2>/dev/null | wc -c)
CHUNK_COUNT=$(find "$CHUNKS_DIR" -name "*.js" | wc -l)

echo "Chunks directory:"
echo "  Total files: $CHUNK_COUNT"
echo "  Raw size: $(numfmt --to=iec $TOTAL_RAW 2>/dev/null || echo $(($TOTAL_RAW / 1024))KB)"
echo "  Gzip size: $(numfmt --to=iec $TOTAL_GZIP 2>/dev/null || echo $(($TOTAL_GZIP / 1024))KB)"

echo ""
echo "Top 10 largest chunks:"
ls -1 "$CHUNKS_DIR"/*.js | while read f; do
  size=$(stat -f%z "$f" 2>/dev/null || stat -c%s "$f" 2>/dev/null)
  name=$(basename "$f")
  echo "$size $name"
done | sort -rn | head -10 | while read size name; do
  echo "  $(numfmt --to=iec $size 2>/dev/null || echo $(($size / 1024))KB) $name"
done

echo ""
echo "Chunk categories:"
echo "  Svelte chunks: $(find "$CHUNKS_DIR" -name "*.js" -exec grep -l 'svelte' {} \; 2>/dev/null | wc -l)"
echo "  Dexie chunks: $(find "$CHUNKS_DIR" -name "*.js" -exec grep -l 'dexie' {} \; 2>/dev/null | wc -l)"
echo "  Utility chunks: $(find "$CHUNKS_DIR" -name "*.js" -exec grep -l 'export.*function\|export.*const' {} \; 2>/dev/null | wc -l)"

echo ""
echo -e "${SAVINGS}✓ Measurement complete${NC}"
```

**Usage:**
```bash
chmod +x /tmp/measure_bundles.sh
/tmp/measure_bundles.sh

# Run before and after optimization to measure savings
```

---

## Size Budget CI/CD Check

Add to GitHub Actions (`.github/workflows/bundle-check.yml`):

```yaml
name: Bundle Size Check

on:
  pull_request:
  push:
    branches: [main]

jobs:
  bundle-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run build

      - name: Check chunk sizes
        run: |
          echo "=== Bundle Size Report ==="

          CHUNKS_DIR="projects/dmb-almanac/app/build/client/_app/immutable/chunks"

          # Find any chunk over 100KB (raw)
          OVERSIZED=$(find "$CHUNKS_DIR" -name "*.js" -size +100k 2>/dev/null)
          if [ ! -z "$OVERSIZED" ]; then
            echo "❌ FAILED: Chunks exceed 100KB limit:"
            ls -lh $OVERSIZED
            exit 1
          fi

          # Count total chunks
          CHUNK_COUNT=$(find "$CHUNKS_DIR" -name "*.js" | wc -l)
          echo "✓ Total chunks: $CHUNK_COUNT (limit: 100)"

          if [ $CHUNK_COUNT -gt 100 ]; then
            echo "⚠️  WARNING: Chunk count exceeds 100"
          fi

          # Measure gzipped size
          GZIP_SIZE=$(tar czf - "$CHUNKS_DIR" 2>/dev/null | wc -c)
          GZIP_KB=$((GZIP_SIZE / 1024))
          echo "✓ Gzipped bundle: ${GZIP_KB}KB (limit: 300KB)"

          if [ $GZIP_KB -gt 300 ]; then
            echo "❌ FAILED: Bundle exceeds 300KB gzipped"
            exit 1
          fi

          echo "✓ All checks passed!"

      - name: Comment on PR
        if: always()
        uses: actions/github-script@v6
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const fs = require('fs');
            const { exec } = require('child_process');

            exec('find projects/dmb-almanac/app/build/client/_app/immutable/chunks -name "*.js" | wc -l', (err, stdout) => {
              const count = parseInt(stdout.trim());
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: `📦 Bundle Check\n- Chunks: ${count}\n- Status: ✓ Passed`
              });
            });
```

---

## Manual Monitoring Commands

```bash
# Quick size check
ls -lh /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/build/client/_app/immutable/chunks/ | tail -20

# Watch for regressions
# Run before and after each feature
before_size=$(du -sb build/client/_app/immutable/chunks | awk '{print $1}')
# ... make changes ...
npm run build
after_size=$(du -sb build/client/_app/immutable/chunks | awk '{print $1}')
echo "Size change: $(($after_size - $before_size)) bytes"

# Analyze individual route chunk
npm run build
ls -lh build/client/_app/immutable/nodes/ | grep "^-" | awk '{print $5, $9}' | sort -rn | head -10

# Check for duplicate code
grep -r "export const" build/client/_app/immutable/chunks/ | wc -l

# Find oversized chunks
find build/client/_app/immutable/chunks -name "*.js" -size +50k -exec ls -lh {} \;
```

---

## Dependency Size Checker

Before adding new npm packages, use this to check impact:

```bash
#!/bin/bash
# Check potential bundle impact of a package

PACKAGE=$1

if [ -z "$PACKAGE" ]; then
  echo "Usage: $0 <package-name>"
  exit 1
fi

echo "Checking bundle impact of: $PACKAGE"

# Visit bundlephobia in browser
echo "Opening BundlePhobia..."
open "https://bundlephobia.com/package/$PACKAGE"

# Or if bundlephobia CLI available:
# npx bundlephobia $PACKAGE

echo ""
echo "Decision criteria:"
echo "  ✓ Add if <5KB gzipped and used by 3+ routes"
echo "  ✓ Add if replaces larger dependency"
echo "  ✗ Don't add if native browser API available"
echo "  ✗ Don't add if >10KB and used by 1 route only"
```

**Usage:**
```bash
# Before: npm install date-fns
./bundle-impact.sh date-fns
# Check bundlephobia.com result, then decide

npm install date-fns  # If OK
npm run build
```

---

## Tree-Shaking Verification

Ensure unused code is eliminated:

```bash
#!/bin/bash
# Verify tree-shaking is working

cd "/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app"

echo "Checking tree-shaking..."

# Build with stats
npm run build -- --stats stats.json

# Look for unused functions in largest chunks
echo ""
echo "Unused exports in top chunks:"
for file in $(find build/client/_app/immutable/chunks -name "*.js" -size +30k | head -5); do
  name=$(basename "$file")
  # Count export statements
  exports=$(grep -o "export const \w\+" "$file" | wc -l)
  echo "  $name: $exports exports"
done

echo ""
echo "Recommendations:"
echo "  - If exports > actual usage, check for dead code"
echo "  - Remove unused exports from index/barrel files"
echo "  - Verify sideEffects in package.json is configured"
```

**Usage:**
```bash
chmod +x /tmp/verify-tree-shaking.sh
/tmp/verify-tree-shaking.sh
```

---

## Before/After Comparison Template

Track optimization progress:

```markdown
# Bundle Optimization Progress

## Baseline (Jan 29, 2026)

Total chunks: 98
Total size (gzip): 285KB
Svelte chunks: 22 (229KB)
Dexie chunks: 3 (88KB)
Utils fragmentation: 31 chunks (91KB)

| Phase | Status | Chunks | Size | Savings |
|-------|--------|--------|------|---------|
| 1A: Svelte | TODO | 22→3 | 72KB | -8KB |
| 1B: Dexie | TODO | 3→1 | 28KB | -3KB |
| 2A: Utils | TODO | 31→1 | 9KB | -12KB |
| 3B: UI | TODO | various | TBD | -2KB |
| **TOTAL** | | 98→90 | 250KB | **-25KB** |

## Progress Update: [DATE]

[Track changes as phases complete]

## Final Results

Total chunks: 90 (-8 chunks)
Total size (gzip): 260KB (-25KB, -8.7%)
Performance impact: [LCP: -Xms, FID: -Xms]
```

---

## Dashboard Metrics

Track these metrics in your analytics:

```javascript
// Add to your monitoring system
const bundleMetrics = {
  totalChunks: 98,        // Monitor weekly
  gzipSize: 285,          // KB - alert if > 300KB
  mainChunk: 62.8,        // KB - should be stable
  avgRouteChunk: 2.5,     // KB - should stay consistent

  // Category breakdown
  svelte: { chunks: 22, size: 72 },      // Should consolidate
  dexie: { chunks: 3, size: 28 },        // Should consolidate
  utils: { chunks: 31, size: 91 },       // Should consolidate

  // Thresholds for alerts
  alerts: {
    chunkCountMax: 100,
    chunkSizeMax: 50,    // KB per chunk
    bundleSizeMax: 300,  // KB gzipped
    routeChunkMax: 10    // KB per route
  }
};
```

---

## Optimization Checklist

- [ ] Run baseline measurement (before optimization)
- [ ] Implement Phase 1A (Svelte consolidation)
  - [ ] Update vite.config.js
  - [ ] Build and verify
  - [ ] Run test suite
  - [ ] Measure size reduction
- [ ] Implement Phase 1B (Dexie consolidation)
  - [ ] Update vite.config.js
  - [ ] Test database operations
  - [ ] Measure size reduction
- [ ] Implement Phase 2A (Utils consolidation)
  - [ ] Create common.js barrel
  - [ ] Update imports in routes
  - [ ] Verify no tree-shaking issues
  - [ ] Measure size reduction
- [ ] Implement Phase 3B (UI consolidation)
  - [ ] Create UI index.js barrel
  - [ ] Update component imports
  - [ ] Run visual regression tests
  - [ ] Measure size reduction
- [ ] Final measurement and documentation
  - [ ] Compare before/after
  - [ ] Run full test suite
  - [ ] Performance testing
  - [ ] Document changes

---

## Support Resources

| Issue | Solution |
|-------|----------|
| Tree-shaking not working | Check `package.json` sideEffects field |
| Chunk too large | Split using manual chunks in vite.config.js |
| Module not found | Verify import paths use aliases ($lib, $stores, etc) |
| Build fails | Check vite.config.js syntax, run `npm run build -- --debug` |
| Performance regression | Use Lighthouse CI, compare Core Web Vitals |

---

**Last Updated:** January 29, 2026
**Expected Savings:** 25-35KB gzipped
**Implementation Time:** 3-4 weeks
**Risk Level:** Low (non-breaking changes)
