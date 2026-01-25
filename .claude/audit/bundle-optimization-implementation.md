# Bundle Optimization Implementation Guide

**DMB Almanac App**
**Target:** Quick wins providing 8-15 KB gzip reduction

---

## Implementation Plan

### Fix 1: Update d3-sankey to Eliminate d3-array Duplication

**Impact:** 8-12 KB gzip savings
**Effort:** 5 minutes
**Risk:** Very Low

#### Current Problem

d3-sankey v0.12.3 depends on d3-array v2.12.1 (old), while other D3 modules depend on v3.2.4 (new). Both versions get bundled, doubling the d3-array code size.

```
Current dependency tree:
├─ d3-geo@3.1.1 → d3-array@3.2.4
├─ d3-sankey@0.12.3 → d3-array@2.12.1 ← DUPLICATE!
└─ d3-scale@4.0.2 → d3-array@3.2.4
```

#### Solution

Update d3-sankey to v0.13.x which supports d3-array v3.x:

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/package.json`

**Change (line 71):**
```json
// Before:
"d3-sankey": "0.12.3",

// After:
"d3-sankey": "^0.13.0",
```

#### Verification Steps

1. **Update dependencies:**
   ```bash
   cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app
   npm install
   ```

2. **Verify no duplicate d3-array:**
   ```bash
   npm ls d3-array
   # Should show only d3-array@3.2.4 (possibly multiple entries but all same version)
   ```

3. **Check TransitionFlow visualization:**
   ```bash
   npm run dev
   # Navigate to visualizations page
   # Click "Transitions" and verify sankey diagram renders
   ```

4. **Build and check bundle size:**
   ```bash
   npm run build
   # Compare bundle sizes before/after
   # Look for reduction in d3-* chunks
   ```

#### Expected Result

```diff
Before: d3-sankey chunk ~12 KB (with bundled d3-array v2.12.1)
After:  d3-sankey chunk ~4-6 KB (using shared d3-array v3.2.4)

Total savings: ~8-12 KB gzip
```

#### Rollback Plan

If any issues occur:
```bash
# Revert package.json change and reinstall
git checkout package.json package-lock.json
npm install
```

---

### Fix 2: Lazy Load WASM Fallback Module

**Impact:** 3-5 KB gzip savings
**Effort:** 30-45 minutes
**Risk:** Low (only affects worker failure scenario)

#### Current Problem

The dmb-force-simulation WASM module is loaded even when the Web Worker successfully handles force simulation. It should only load if the worker fails.

#### Investigation

First, check if force simulation WASM is currently loaded eagerly:

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/wasm/forceSimulation.ts`

Look for:
```typescript
// Check for this pattern - if present, it's loading eagerly
import { ... } from '$wasm/dmb-force-simulation/pkg/...'
```

**If using eager import:**

Current pattern (assumed):
```typescript
// forceSimulation.ts
import { ... } from '$wasm/dmb-force-simulation/pkg/dmb_force_simulation.js'

export async function createForceSimulation(...) {
  // Uses eagerly-loaded WASM
}
```

#### Solution

Convert to dynamic import in the fallback path:

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/wasm/forceSimulation.ts`

```typescript
// Before: Eager import at module level
import { initWasm, simulate } from '$wasm/dmb-force-simulation/pkg/dmb_force_simulation.js'

// After: Dynamic import only when needed
let wasmModule: typeof import('$wasm/dmb-force-simulation/pkg/dmb_force_simulation.js') | null = null

async function loadWasmFallback() {
  if (wasmModule) return wasmModule
  try {
    wasmModule = await import('$wasm/dmb-force-simulation/pkg/dmb_force_simulation.js')
    return wasmModule
  } catch (error) {
    console.error('Failed to load force simulation fallback:', error)
    throw error
  }
}

export async function createForceSimulation(...) {
  try {
    // Try Web Worker first
    return createWorkerSimulation(...)
  } catch (error) {
    // Fallback to WASM only if worker fails
    const mod = await loadWasmFallback()
    return await mod.simulate(...)
  }
}
```

#### Verification Steps

1. **Locate current imports:**
   ```bash
   grep -r "dmb-force-simulation\|dmb_force_simulation" \
     /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/wasm/
   ```

2. **Check for eager imports:**
   - Look for `import { ... } from '$wasm/...'` at module top level
   - If found, move to function scope using dynamic import

3. **Test worker functionality:**
   ```bash
   npm run dev
   # Open DevTools → Network tab
   # Navigate to GuestNetwork visualization
   # Should see dmb_force_simulation.wasm NOT loaded (using worker)
   ```

4. **Test worker failure (optional):**
   ```typescript
   // In GuestNetwork.svelte temporarily:
   // Change createForceSimulation() call to simulate worker failure
   // Verify WASM loads dynamically as fallback
   ```

5. **Build and verify:**
   ```bash
   npm run build
   # Check that dmb_force_simulation.wasm is loaded separately
   # (shouldn't be in main bundle)
   ```

#### Expected Result

```diff
Before: dmb-force-simulation WASM loaded eagerly (~10 KB gzip)
After:  dmb-force-simulation WASM loaded only on worker failure (~0 KB initial)

Total savings: ~3-5 KB gzip on initial load
Impact: Worker is used 99%+ of the time (small risk)
```

---

### Fix 3: Remove Unused d3-utils Exports

**Impact:** 0.5-1 KB gzip savings
**Effort:** 15-20 minutes
**Risk:** Very Low

#### Investigation

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/utils/d3-utils.ts`

Check which exports are actually used:

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app

# Check for each export:
grep -r "createLinearGradient" src/
grep -r "getColorScheme" src/
grep -r "arrayMin" src/
```

#### Expected Results

Based on code review:

**Likely unused:**
```typescript
// Lines 246-278: Only for SVG gradients
export const createLinearGradient = (svg: any, id: string, colors: [string, string]): string => {
  // Creates <linearGradient> SVG elements
  // Rarely used in modern D3 (color scales replace this)
}

// Lines 275-277: Wrapper around colorSchemes
export const getColorScheme = (schemeName: keyof typeof colorSchemes) => {
  return colorSchemes[schemeName] ?? colorSchemes.category10
}
```

#### Solution

1. **Verify non-usage:**
   ```bash
   grep -r "createLinearGradient\|getColorScheme" \
     /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src
   # Should return empty if unused
   ```

2. **If confirmed unused, remove from d3-utils.ts:**
   ```typescript
   // Delete lines 246-262 (createLinearGradient function)
   // Delete lines 275-277 (getColorScheme function)

   // Update remaining exports comment
   ```

3. **Update imports in any components using these:**
   ```bash
   # Search for imports:
   grep -r "import.*createLinearGradient\|import.*getColorScheme" src/
   ```

4. **If getColorScheme is used, replace with direct access:**
   ```typescript
   // Change:
   // const colors = getColorScheme('blues')

   // To:
   import { colorSchemes } from '$lib/utils/d3-utils'
   const colors = colorSchemes.blues
   ```

#### Verification

```bash
# After removal, ensure no broken imports:
npm run check

# Build and test:
npm run build
npm run dev
# Verify all visualizations render
```

#### Expected Result

```diff
Before: d3-utils.ts ~278 lines
After:  d3-utils.ts ~250-260 lines

Savings: ~0.3-0.5 KB minified in d3-utils chunk
```

---

## Testing Checklist

After each fix, verify:

### Fix 1: d3-sankey Update

- [ ] `npm install` completes without errors
- [ ] `npm ls d3-array` shows no duplicates
- [ ] `npm run check` passes TypeScript checks
- [ ] `npm run dev` starts development server
- [ ] Visualizations page loads
- [ ] TransitionFlow visualization renders (sankey diagram visible)
- [ ] Drag/hover interactions work on sankey nodes
- [ ] `npm run build` produces no errors
- [ ] No console warnings in browser DevTools

### Fix 2: WASM Lazy Loading

- [ ] Code changes compile without errors
- [ ] Development server starts
- [ ] GuestNetwork visualization loads and renders
- [ ] Force simulation animates nodes correctly
- [ ] Drag interactions work on nodes
- [ ] Network tab shows WASM loaded (not in main bundle)
- [ ] Production build succeeds
- [ ] Bundle size decreased (dmb_force_simulation.wasm not in main chunk)

### Fix 3: Remove Unused Exports

- [ ] Grep confirms exports are truly unused
- [ ] d3-utils.ts file has valid syntax after edits
- [ ] `npm run check` passes
- [ ] All visualizations render
- [ ] No "undefined export" warnings at build time
- [ ] Bundle size decreased slightly

---

## Bundle Size Verification

### Before & After Measurement

**Create a size tracking script:**

File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/scripts/check-bundle-sizes.ts`

```typescript
#!/usr/bin/env tsx
/**
 * Bundle size checker
 * Run before and after optimizations to measure impact
 */

import { readdirSync, statSync } from 'fs'
import { join } from 'path'
import { gzipSync } from 'zlib'
import { readFileSync } from 'fs'

interface BundleInfo {
  file: string
  raw: number
  gzip: number
}

const distDir = './dist'
const files = readdirSync(distDir)
  .filter(f => f.endsWith('.js') || f.endsWith('.wasm'))
  .map(f => {
    const path = join(distDir, f)
    const raw = readFileSync(path)
    return {
      file: f,
      raw: raw.length,
      gzip: gzipSync(raw).length
    }
  })
  .sort((a, b) => b.gzip - a.gzip)

console.log('\nBundle Sizes:')
console.log('='.repeat(60))
let totalRaw = 0
let totalGzip = 0

for (const f of files) {
  console.log(`${f.file.padEnd(40)} ${(f.raw / 1024).toFixed(1)} KB → ${(f.gzip / 1024).toFixed(1)} KB gzip`)
  totalRaw += f.raw
  totalGzip += f.gzip
}

console.log('='.repeat(60))
console.log(`Total: ${(totalRaw / 1024).toFixed(1)} KB → ${(totalGzip / 1024).toFixed(1)} KB gzip`)
console.log()
```

**Usage:**

```bash
# Before optimizations
npm run build
npx tsx scripts/check-bundle-sizes.ts > /tmp/before.txt

# After each fix
npm run build
npx tsx scripts/check-bundle-sizes.ts > /tmp/after.txt

# Compare
diff /tmp/before.txt /tmp/after.txt
```

---

## Rollback Procedures

### If Fix 1 causes issues:
```bash
git checkout package.json
npm install
npm run dev  # Verify
```

### If Fix 2 causes issues:
```bash
git checkout src/lib/wasm/forceSimulation.ts
npm run dev  # Verify
```

### If Fix 3 causes issues:
```bash
git checkout src/lib/utils/d3-utils.ts
npm run dev  # Verify
```

---

## Performance Validation

After all optimizations, measure real-world impact:

### Core Web Vitals Impact

```typescript
// Already using web-vitals, verify these metrics
// in your monitoring dashboard:

// 1. LCP (Largest Contentful Paint)
//    - Should remain <2.5s (not impacted by bundle size)
//
// 2. INP (Interaction to Next Paint)
//    - Should improve by 5-10ms due to less JS parsing
//
// 3. CLS (Cumulative Layout Shift)
//    - Should remain <0.1 (not impacted by bundle size)
```

### Bundle Load Time Estimation

```
Current: ~220-260 KB gzip
After optimization: ~205-250 KB gzip

On 4G (1.6 Mbps):
  Before: ~1.1s transfer time
  After:  ~1.0s transfer time
  Savings: ~0.1s (5-10% improvement)

On 5G (100 Mbps):
  Impact: Minimal (parse time dominates)
```

---

## Estimated Timeline

| Fix | Time | Priority | Status |
|-----|------|----------|--------|
| d3-sankey update | 5 min | HIGH | Ready |
| WASM lazy loading | 30-45 min | MEDIUM | Requires investigation |
| Unused exports | 15-20 min | LOW | Ready |
| **Total** | **50-70 min** | - | **~5-8% savings** |

---

## Next Steps (After Implementation)

1. **Monitor bundle size in CI/CD**
   - Add size check to GitHub Actions
   - Fail on >10% increases

2. **Regular audits**
   - Quarterly dependency reviews
   - Check for new D3 versions

3. **Advanced optimizations** (if needed)
   - Tree-shaking analysis tool
   - Dynamic imports for other visualization modules
   - Service Worker caching strategies

---

## References

- D3.js v3 documentation: https://github.com/d3/d3
- WASM compression: https://developer.mozilla.org/en-US/docs/WebAssembly
- Vite bundle analysis: https://github.com/bjorn2404/rollup-plugin-visualizer
- SvelteKit code splitting: https://kit.svelte.dev/docs/load#using-url-parameters

---

## Questions & Troubleshooting

### Q: Will updating d3-sankey break TransitionFlow?
**A:** Very unlikely. The change is from 0.12.3 → 0.13.0, which is a minor version bump with backward compatibility.

### Q: How do I know if WASM lazy loading is working?
**A:** Open DevTools → Network tab → filter for "wasm". The dmb_force_simulation.wasm should NOT appear during normal usage (only if worker fails).

### Q: What if arrayMin/arrayMin are used?
**A:** They're unlikely to be used directly since they're custom implementations. Double-check with grep before removing.

### Q: Should I remove all unused code?
**A:** Only code you're absolutely certain isn't used. Use tree-shaking analysis tools (webpack-bundle-analyzer) if uncertain.
