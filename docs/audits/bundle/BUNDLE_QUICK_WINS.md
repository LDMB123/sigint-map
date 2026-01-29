# Bundle Optimization - Quick Wins & Action Items

## Executive Quick Reference

| Metric | Current | Target | Gap | Priority |
|--------|---------|--------|-----|----------|
| **Total Bundle** | 282.7 KB | 270 KB | -12.7 KB | P1 |
| **Shared Chunks** | 215.0 KB | 190 KB | -25 KB | P1 |
| **Largest Chunk** | 31.6 KB | 25 KB | -6.6 KB | P2 |
| **Tree-Shaking** | Good | Perfect | Audit | P1 |

---

## Critical Findings

### The Big Three Optimization Opportunities

#### 1. Dead Code in faV0xiKa.js (15.8 KB gzip)
**Status**: Needs investigation

```bash
# Find all exports in faV0xiKa
grep -o "export\s\+\w\+" /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/build/client/_app/immutable/chunks/faV0xiKa.js

# Count total exports
grep -c "export\s\+\w\+" /path/to/faV0xiKa.js

# Find what imports it
grep -r "from.*faV0xiKa" /path/to/build/
```

**Action**: Run audit script to identify unused exports
**Potential Savings**: 2-4 KB
**Time Estimate**: 2 hours

---

#### 2. Dead Code in BPDkwtzm.js (15.5 KB gzip)
**Status**: Needs investigation

Same analysis as faV0xiKa above.

**Potential Savings**: 2-4 KB
**Time Estimate**: 2 hours

---

#### 3. Over-Bundling in Node 15 (7.0 KB) & Node 17 (6.7 KB)
**Status**: Candidates for dynamic imports

```javascript
// Optimization Strategy:
// Current: All component code loaded upfront
// Solution: Use dynamic imports for optional features

// Example - Show Details Page (Node 15):
// Before:
import ShowDetails from '$lib/components/ShowDetails';
import RelatedShows from '$lib/components/RelatedShows';
import AudioPlayer from '$lib/components/AudioPlayer';

// After:
import ShowDetails from '$lib/components/ShowDetails';
const RelatedShows = dynamic(() => import('$lib/components/RelatedShows'));
const AudioPlayer = dynamic(() => import('$lib/components/AudioPlayer'));
```

**Potential Savings**: 2-3 KB per route
**Time Estimate**: 3-4 hours per route

---

## Automated Audit Commands

### 1. Generate Dead Code Report

```bash
#!/bin/bash
# Create dead-code-analysis.sh

cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app

# Build with source maps
npm run build

# Run source-map-explorer on largest chunks
npx source-map-explorer build/client/_app/immutable/chunks/UIPw6bxK.js \
  --html output-UIPw6bxK.html
npx source-map-explorer build/client/_app/immutable/chunks/DP9_wQfI.js \
  --html output-DP9_wQfI.html
npx source-map-explorer build/client/_app/immutable/chunks/faV0xiKa.js \
  --html output-faV0xiKa.html
npx source-map-explorer build/client/_app/immutable/chunks/BPDkwtzm.js \
  --html output-BPDkwtzm.html

# Open in browser
open output-*.html
```

### 2. Identify Unused Imports

```bash
#!/bin/bash
# Find all imports in codebase

echo "=== Unused D3 Imports ==="
grep -r "d3-" src/lib/ --include="*.js" --include="*.svelte" | \
  grep -v "dynamic" | grep -v "lazy" | \
  wc -l

echo "=== All D3 Files ==="
ls src/lib/**/d3*.js 2>/dev/null | wc -l

echo "=== Unused Utilities in src/lib/utils ==="
for file in src/lib/utils/*.js; do
  filename=$(basename "$file")
  count=$(grep -r "from.*$filename" src/ --include="*.js" --include="*.svelte" | wc -l)
  if [ $count -eq 0 ]; then
    echo "  • $filename (NOT IMPORTED)"
  fi
done
```

### 3. Check Tree-Shaking Effectiveness

```bash
#!/bin/bash
# Verify tree-shaking is working

echo "=== Checking for named exports ==="
grep -r "export\s\+{" src/lib/ --include="*.js" | wc -l
echo "Named exports found (good for tree-shaking)"

grep -r "export\s\+default" src/lib/ --include="*.js" | wc -l
echo "Default exports found (check if necessary)"
```

---

## Step-by-Step Fix Guide

### Fix #1: Remove Dead Code from faV0xiKa.js

**Objective**: Reduce from 15.8 KB to 12-14 KB (save 2-4 KB)

**Steps**:

1. Generate detailed analysis:
   ```bash
   npx source-map-explorer \
     /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/build/client/_app/immutable/chunks/faV0xiKa.js \
     --html faV0xiKa-analysis.html
   open faV0xiKa-analysis.html
   ```

2. Identify the source file:
   ```bash
   # Find what source files contribute to faV0xiKa.js
   grep -r "// * faV0xiKa" /path/to/source-maps
   ```

3. Audit imports across codebase:
   ```bash
   grep -r "faV0xiKa" build/ --include="*.js" | head -5
   ```

4. Extract and review exports:
   ```bash
   node -e "
   const content = require('fs').readFileSync('./build/client/_app/immutable/chunks/faV0xiKa.js', 'utf-8');
   const exports = content.match(/export\s+const\s+\w+/g) || [];
   console.log('Exports:', exports);
   "
   ```

5. Remove unused exports and rebuild

---

### Fix #2: Sub-Split Node 15 (Show Details)

**Objective**: Reduce from 7.0 KB to 4-5 KB (save 2-3 KB)

**Steps**:

1. Identify where Node 15 is built:
   ```bash
   find src/routes -name "*show*" -o -name "*detail*"
   ```

2. Identify heavy components:
   ```bash
   grep -r "import\s" src/routes/shows/\[showId\]/ | \
     wc -l
   ```

3. Convert heavy imports to dynamic:
   ```javascript
   // In +page.svelte for show details

   // Change this:
   // import SetlistDisplay from '$lib/components/SetlistDisplay';
   // import RelatedShows from '$lib/components/RelatedShows';

   // To this:
   import { browser } from '$app/environment';
   const SetlistDisplay = browser ?
     dynamic(() => import('$lib/components/SetlistDisplay')) :
     null;
   ```

4. Test and rebuild:
   ```bash
   npm run build
   # Check new Node 15 size
   du -h build/client/_app/immutable/nodes/15.*
   ```

---

### Fix #3: Enable Bundle Visualization

**Objective**: Ongoing monitoring and analysis

1. Add to package.json:
   ```json
   {
     "devDependencies": {
       "rollup-plugin-visualizer": "^5.12.0"
     }
   }
   ```

2. Update vite.config.js:
   ```javascript
   import { visualizer } from 'rollup-plugin-visualizer';

   export default defineConfig({
     plugins: [
       visualizer({
         open: true,
         gzipSize: true,
         brotliSize: true,
         filename: 'bundle-analysis.html'
       })
     ]
   });
   ```

3. Run analysis:
   ```bash
   npm run build
   # Opens bundle-analysis.html in browser
   ```

---

## Bundle Size Regression Prevention

### Add to CI/CD (.github/workflows/ci.yml)

```yaml
- name: Check bundle size
  run: |
    npm run build

    # Get sizes of key chunks
    UIPw6bxK=$(du -k build/client/_app/immutable/chunks/UIPw6bxK.js | cut -f1)
    DP9_wQfI=$(du -k build/client/_app/immutable/chunks/DP9_wQfI.js | cut -f1)

    # Warn if over limits
    if [ $UIPw6bxK -gt 33 ]; then
      echo "⚠️  Warning: UIPw6bxK.js is $((UIPw6bxK))KB (limit: 33KB)"
    fi

    if [ $DP9_wQfI -gt 33 ]; then
      echo "⚠️  Warning: DP9_wQfI.js is $((DP9_wQfI))KB (limit: 33KB)"
    fi

    # Check total bundle
    TOTAL=$(du -sh build/client | cut -f1 | sed 's/[^0-9]*//g')
    if [ $TOTAL -gt 300 ]; then
      echo "❌ Error: Total bundle is ${TOTAL}KB (limit: 300KB)"
      exit 1
    fi

- name: Report bundle metrics
  if: always()
  run: |
    echo "## Bundle Metrics" >> $GITHUB_STEP_SUMMARY
    du -sh build/client >> $GITHUB_STEP_SUMMARY
    ls -lh build/client/_app/immutable/chunks/* | awk '{print $9, $5}' >> $GITHUB_STEP_SUMMARY
```

---

## Measurement & Validation

### Before & After Comparison

**Track these metrics**:

```bash
# Before optimization
echo "=== Before Optimization ==="
du -sh /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/build/client
du -h /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/build/client/_app/immutable/chunks/* | sort -h | tail -10

# After each optimization
echo "=== After Optimization ==="
npm run build
du -sh /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/build/client
du -h /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/build/client/_app/immutable/chunks/* | sort -h | tail -10

# Calculate savings
echo "=== Savings ==="
echo "Old: X KB, New: Y KB, Saved: Z KB"
```

---

## Testing Checklist

After each optimization, verify:

- [ ] App builds without errors
- [ ] No console warnings about tree-shaking
- [ ] All routes load correctly
- [ ] Visualizations render (if modified Node 16)
- [ ] Search works (if modified Node 17)
- [ ] Show details load (if modified Node 15)
- [ ] Offline mode still works (Dexie loaded on demand)
- [ ] Bundle size decreased as expected
- [ ] No runtime errors in Chrome DevTools

---

## Priority Execution Plan

### Phase 1: Audit (2-3 days)
- [ ] Analyze faV0xiKa.js - identify unused exports
- [ ] Analyze BPDkwtzm.js - identify unused exports
- [ ] Document findings

### Phase 2: Implementation (3-4 days)
- [ ] Remove dead code from faV0xiKa.js
- [ ] Remove dead code from BPDkwtzm.js
- [ ] Add dynamic imports to Node 15 (Show Details)
- [ ] Add dynamic imports to Node 17 (Search Results)

### Phase 3: Validation (1-2 days)
- [ ] Full regression testing
- [ ] Bundle size comparison
- [ ] Performance metrics validation
- [ ] CI/CD integration

### Phase 4: Monitoring (Ongoing)
- [ ] Add bundle size checks to CI/CD
- [ ] Weekly size reviews
- [ ] New dependency audit before adding packages

---

## Resources & Tools

### Analysis Tools
- **source-map-explorer**: `npm install source-map-explorer`
- **webpack-bundle-analyzer**: `npm install webpack-bundle-analyzer`
- **bundlephobia.com**: Browser-based package size lookup
- **Vite built-in analyzer**: `npm run build -- --analyze`

### Related Files
- Vite config: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/vite.config.js`
- Package.json: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/package.json`
- Build output: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/build/`

### Documentation
- Full Analysis: `BUNDLE_OPTIMIZATION_ANALYSIS_2026.md`
- This Quick Reference: `BUNDLE_QUICK_WINS.md`

---

## Key Contacts & Next Steps

**What to do now**:

1. ✅ Review this document
2. 📊 Run dead code analysis (see Automated Audit Commands)
3. 📈 Generate bundle visualization
4. 📝 Document findings
5. ⚙️ Implement fixes in priority order
6. 🧪 Test thoroughly
7. 📌 Set up monitoring

**Success Criteria**:
- [ ] Bundle reduced to <275 KB gzip
- [ ] All tests passing
- [ ] No runtime errors
- [ ] CI/CD checks in place
- [ ] Team aware of bundle budget

---

**Last Updated**: January 29, 2026
**Next Review**: February 15, 2026
**Estimated Savings**: 10-18 KB gzip (4-6%)
**Expected TTI Improvement**: 200-400ms
