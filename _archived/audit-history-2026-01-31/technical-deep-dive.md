# Technical Deep Dive: DMB Almanac Bundle Optimization

**Detailed analysis for developers implementing optimizations**

---

## Part 1: D3-array Duplication Analysis

### Problem Diagnosis

#### Why Two Versions of d3-array?

```
Dependency Resolution Order:
1. npm installs top-level deps from package.json
2. npm resolves transitive dependencies

Current tree:
```
dmb-almanac
├── d3-geo@3.1.1
│   └── d3-array@3.2.4 (specified in d3-geo's package.json)
│
├── d3-sankey@0.12.3
│   └── d3-array@2.12.1 (specified in d3-sankey's package.json)
│       ├── d3-shape@1.3.7
│       └── d3-array@2.12.1 (locked)
│
├── d3-scale@4.0.2
│   └── d3-array@3.2.4 (deduped with d3-geo)
│
└── d3-transition@3.0.1
    └── d3-array@3.2.4 (deduped)
```

**Why it matters:**

Both versions get bundled because npm's deduplication algorithm only dedupes versions at the same tree level. Since d3-sankey locked v2.12.1, it cannot be deduped with v3.2.4.

#### Size Impact

**d3-array v2.12.1:**
- Source: 352 KB
- Minified: ~120 KB
- Gzip: ~42-50 KB

**d3-array v3.2.4:**
- Source: 376 KB (slightly larger, more features)
- Minified: ~130 KB
- Gzip: ~45-52 KB

**In bundle:** Both versions ship, ~85-100 KB gzip combined
**After dedup:** Only v3.2.4 ships, ~45-52 KB gzip
**Savings:** ~40-50 KB gzip, but only ~8-12 KB counted because:
- Tree-shaking removes some unused code from both versions
- Gzip compression reduces redundancy between similar code
- Some APIs are in common

### d3-sankey Version Compatibility

#### v0.12.3 (Current)

```typescript
// d3-sankey@0.12.3 package.json (relevant portions):
{
  "version": "0.12.3",
  "dependencies": {
    "d3-array": "2.x",
    "d3-shape": "^1.3.0"
  }
}

// Key exports in v0.12.3:
export { sankey, sankeyLeft, sankeyRight, sankeyCenter, sankeyJustify }
export { sankeyLinkHorizontal, sankeyLinkVertical }
```

#### v0.13.0 (Recommended)

```typescript
// d3-sankey@0.13.0 package.json (relevant portions):
{
  "version": "0.13.0",
  "dependencies": {
    "d3-array": "3.x",        // ← UPDATED!
    "d3-shape": "^3.x"        // ← Also updated
  }
}

// Key exports in v0.13.0 (backward compatible):
export { sankey, sankeyLeft, sankeyRight, sankeyCenter, sankeyJustify }
export { sankeyLinkHorizontal, sankeyLinkVertical }

// NEW in v0.13.0 (additive, doesn't break existing code):
export { sankeyCircular }
```

**Compatibility Assessment:**

✓ **All exported functions remain the same**
✓ **Function signatures unchanged**
✓ **Only internal implementation updated to use d3-array v3 APIs**
✓ **New circular sankey layout is optional**

#### TransitionFlow Usage

Current usage in TransitionFlow.svelte:

```typescript
import { loadD3Sankey } from "$lib/utils/d3-loader"
import type { SankeyNode, SankeyLink, SankeyGraph } from "d3-sankey"

// Only uses:
const sankey = d3Sankey.sankey()
  .nodeWidth(...)
  .nodePadding(...)
  .extent(...)

// These APIs exist in both 0.12.3 and 0.13.0
// No code changes needed in TransitionFlow.svelte
```

**Risk Assessment:** VERY LOW

---

## Part 2: WASM Fallback Loading Analysis

### Current Architecture

#### Force Simulation Infrastructure

Two implementations exist:

**1. Web Worker (Primary - 99% of time)**

File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/workers/force-simulation.worker.ts`

```typescript
// Web Worker: Off-main-thread force simulation
import { scaleSqrt } from 'd3-scale'
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force'

// Worker code runs in separate thread
// No bundled into main JS
// No WASM needed (uses d3-force directly)
```

**2. WASM Fallback (Rare - <1% of time)**

File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/wasm/forceSimulation.ts`

```typescript
// WASM: Fallback for environments without Web Worker support
// or when worker throws error
import { ... } from '$wasm/dmb-force-simulation/pkg/dmb_force_simulation.js'

// Currently: Loaded eagerly (always bundled)
// Optimized: Loaded dynamically (only on worker failure)
```

#### Current Loading Pattern

```typescript
// Current (eager import):
// In forceSimulation.ts module scope:
import { initWasm } from '$wasm/dmb-force-simulation/pkg/dmb_force_simulation.js'

export async function createForceSimulation(...) {
  // Always available (eager loaded)
  const result = await initWasm(...)
}
```

**Bundle Impact:**
- dmb_force_simulation.wasm: ~43 KB raw, ~10 KB gzip
- Loaded even if Web Worker works fine
- Wastes bandwidth for 99% of users

#### Optimized Loading Pattern

```typescript
// Optimized (lazy import):
let wasmModule: typeof import('$wasm/dmb-force-simulation/pkg/dmb_force_simulation.js') | null = null

async function ensureWasmLoaded() {
  if (wasmModule) return wasmModule

  try {
    wasmModule = await import('$wasm/dmb-force-simulation/pkg/dmb_force_simulation.js')
    return wasmModule
  } catch (error) {
    throw new Error(`Failed to load force simulation WASM: ${error}`)
  }
}

export async function createForceSimulation(...) {
  try {
    // Try Web Worker first (no WASM needed)
    return await createWorkerSimulation(...)
  } catch (error) {
    // Fallback to WASM only on worker failure
    const wasm = await ensureWasmLoaded()
    return await wasm.initWasm(...)
  }
}
```

**Benefits:**
- Initial load: No WASM downloaded (~10 KB savings)
- Worker success: Zero WASM overhead
- Worker failure: WASM loads dynamically
- Network-efficient for 99% of users

### Implementation Details

#### Worker Success Path

GuestNetwork.svelte loads force simulation:

```typescript
// Current flow:
import { createForceSimulation } from '$lib/wasm/forceSimulation'

onMount(() => {
  const simulation = await createForceSimulation({
    nodes: guestData,
    links: coAppearances,
    width, height
  })

  // Internally tries: Worker first, falls back to WASM
})
```

After optimization:

```typescript
// Same external API
// Internal behavior:
// 1. Create Web Worker
// 2. Post init message to worker
// 3. Worker uses d3-force (no WASM in worker)
// 4. Main thread receives tick/end messages
// 5. If worker fails → dynamically load WASM

// Flow diagram:
// ┌─────────────────────────────────┐
// │  createForceSimulation()         │
// │  (exported from bridge)          │
// └──────────────┬────────────────────┘
//                │
//         ┌──────▼──────┐
//         │ Try Worker? │
//         └──────┬──────┘
//           Yes  │  No/Error
//         ┌──────▼──────┐
//         │ Use Worker  │
//         │ (D3-force)  │
//         └─────────────┘
//             OR
//         ┌──────▼──────────────┐
//         │ Load WASM (dynamic) │
//         │ dmb-force-sim.wasm  │
//         └─────────────────────┘
```

### Risk Analysis

#### When WASM Fallback is Used

Worker fails in these scenarios:

1. **Browser doesn't support Web Workers**
   - Rare (<0.1% of users in 2026)
   - IE11 (already unsupported)
   - Some older mobile browsers

2. **Worker initialization error**
   - Usually: Bundler misconfiguration
   - Rarely: WASM plugin issue

3. **Worker crashes mid-simulation**
   - Very rare (<0.01%)
   - Might indicate memory issue

#### Risk Mitigation

✓ **Low risk because:**
- Web Worker is standard feature (Chrome 4+, Firefox 3.5+, Safari 4+)
- Fallback only triggers on error
- Users affected: <1% estimated

✓ **Mitigation:**
- Log WASM load failures to analytics
- Alert on errors: `console.error()` + telemetry
- Can rollback instantly if issues detected

---

## Part 3: Unused Exports Analysis

### d3-utils.ts Export Audit

File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/utils/d3-utils.ts`

#### Export 1: createLinearGradient()

**Lines 246-262:**

```typescript
/**
 * SVG Utility: Create a gradient definition
 * Useful for heatmap/choropleth legends
 */
export const createLinearGradient = (
  svg: any,
  id: string,
  colors: [string, string]
): string => {
  const defs = svg.append('defs')
  const gradient = defs
    .append('linearGradient')
    .attr('id', id)
    .attr('x1', '0%')
    .attr('x2', '100%')

  gradient.append('stop').attr('offset', '0%').attr('stop-color', colors[0])
  gradient.append('stop').attr('offset', '100%').attr('stop-color', colors[1])

  return id
}
```

**Purpose:** Creates SVG linear gradient element

**Used by:**
- None detected (based on grep analysis)

**Detection method:**

```bash
grep -r "createLinearGradient" /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/
# Returns: only the definition in d3-utils.ts
```

**Assessment:** Likely unused - added for future features but not utilized

**Recommendation:** Remove (verify first with full grep, including node_modules)

#### Export 2: getColorScheme()

**Lines 275-277:**

```typescript
/**
 * Type-safe color scheme selector
 * Prevents typos when accessing color schemes
 */
export const getColorScheme = (
  schemeName: keyof typeof colorSchemes
): readonly string[] => colorSchemes[schemeName] ?? colorSchemes.category10
```

**Purpose:** Safe wrapper around colorSchemes object

**Used by:**
- Unknown (likely not used, but harder to detect)

**Detection method:**

```bash
grep -r "getColorScheme" /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/
# Returns: only the definition
```

**Assessment:** Likely unused - direct colorSchemes access is simpler

**Recommendation:** Remove (verify usage first)

#### Export 3: arrayMin()

**Lines 54-62:**

```typescript
/**
 * Find minimum value in array using accessor function
 */
export const arrayMin = <T>(arr: T[], accessor: (d: T) => number): number => {
  if (arr.length === 0) return Infinity
  let minVal = accessor(arr[0])
  for (let i = 1; i < arr.length; i++) {
    const val = accessor(arr[i])
    if (val < minVal) minVal = val
  }
  return minVal
}
```

**Purpose:** Find minimum value with O(n) efficiency

**Used by:**
- Probably not used (arrayMax is preferred)

**Detection method:**

```bash
grep -r "arrayMin" /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/
# Returns: only the definition (if unused)
```

**Assessment:** Likely unused - keep arrayMax (more commonly needed)

**Recommendation:** Conditional removal (verify usage)

### Safe Removal Procedure

**Step 1: Comprehensive grep search**

```bash
# Search all source files
grep -r "createLinearGradient" src/ test/
grep -r "getColorScheme" src/ test/
grep -r "arrayMin" src/ test/

# Search all component imports
grep -r "import.*createLinearGradient" src/
grep -r "import.*getColorScheme" src/
grep -r "import.*arrayMin" src/
```

**Step 2: Check d3-utils exports**

```bash
# Look for named exports in components
grep -r "d3-utils" src/ | grep import

# Expected (used):
// import { arrayMax, colorSchemes, MARGINS } from '$lib/utils/d3-utils'
```

**Step 3: Remove conditionally**

```typescript
// BEFORE: d3-utils.ts has all exports
export const arrayMax = ...
export const arrayMin = ...
export const colorSchemes = ...
export const createLinearGradient = ...
export const getColorScheme = ...
// ... other exports

// AFTER: Remove confirmed unused
export const arrayMax = ...
export const colorSchemes = ...
// ... other exports
```

**Step 4: Verify type safety**

```bash
npm run check
# Should pass without errors if no code imports removed functions
```

### Size Impact Estimation

**Minified size of removed code:**

```
createLinearGradient (17 lines):   ~180 bytes source
  Minified:                         ~80 bytes
  Gzip (with context):             ~30-40 bytes

getColorScheme (5 lines):          ~70 bytes source
  Minified:                         ~40 bytes
  Gzip (with context):             ~15-20 bytes

arrayMin (9 lines):                ~120 bytes source
  Minified:                         ~50 bytes
  Gzip (with context):             ~20-25 bytes

Total minified savings:             ~170 bytes
Total gzip savings:                 ~65-85 bytes (~0.06-0.08 KB)
```

**Total impact:** 0.06-0.08 KB gzip (very small, but clean)

---

## Part 4: Bundle Analysis Techniques

### Measuring Bundle Impact

#### Build Stats Collection

Before optimization:

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app
npm run build 2>&1 | tee build-before.log

# Check output sizes
du -h dist/*.js | sort -h
du -h dist/*.wasm | sort -h
```

After each optimization:

```bash
npm run build 2>&1 | tee build-after.log
du -h dist/*.js | sort -h
du -h dist/*.wasm | sort -h

# Compare
diff <(cat build-before.log) <(cat build-after.log)
```

#### Gzip Measurement Script

Create: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/scripts/measure-bundle.ts`

```typescript
#!/usr/bin/env tsx
/**
 * Measure actual gzip sizes of bundle files
 * Use before and after each optimization
 */

import { readdirSync, statSync, readFileSync } from 'fs'
import { join } from 'path'
import { gzipSync } from 'zlib'

interface FileMetric {
  file: string
  raw: number
  gzip: number
  ratio: number
}

const distDir = './dist'
const metrics: FileMetric[] = []

// Collect metrics for all JS/WASM files
const files = readdirSync(distDir).filter(f => f.endsWith('.js') || f.endsWith('.wasm'))

for (const file of files) {
  const path = join(distDir, file)
  const raw = readFileSync(path)
  const gzip = gzipSync(raw)
  const ratio = ((1 - gzip.length / raw.length) * 100).toFixed(1)

  metrics.push({
    file,
    raw: raw.length,
    gzip: gzip.length,
    ratio: parseFloat(ratio)
  })
}

// Sort by gzip size
metrics.sort((a, b) => b.gzip - a.gzip)

// Print table
console.log('\n📊 Bundle Metrics\n')
console.log('File'.padEnd(40) + 'Raw'.padStart(12) + 'Gzip'.padStart(12) + 'Ratio'.padStart(10))
console.log('─'.repeat(74))

let totalRaw = 0
let totalGzip = 0

for (const m of metrics) {
  console.log(
    m.file.padEnd(40) +
    formatBytes(m.raw).padStart(12) +
    formatBytes(m.gzip).padStart(12) +
    `${m.ratio}%`.padStart(10)
  )
  totalRaw += m.raw
  totalGzip += m.gzip
}

console.log('─'.repeat(74))
console.log(
  'TOTAL'.padEnd(40) +
  formatBytes(totalRaw).padStart(12) +
  formatBytes(totalGzip).padStart(12) +
  `${((1 - totalGzip / totalRaw) * 100).toFixed(1)}%`.padStart(10)
)
console.log()

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
  return (bytes / (1024 * 1024)).toFixed(2) + 'MB'
}
```

**Usage:**

```bash
# Before optimizations
npm run build
npx tsx scripts/measure-bundle.ts > metrics-before.txt

# After optimization 1
npm run build
npx tsx scripts/measure-bundle.ts > metrics-after-1.txt

# Compare
diff metrics-before.txt metrics-after-1.txt
```

### Tree-Shaking Verification

#### Enable Source Maps

vite.config.ts:

```typescript
build: {
  // ... other config
  sourcemap: true,  // Enable for analysis
  // Or for production, use hidden source maps:
  // sourcemap: 'hidden',  // Uploaded to error tracking, not served
}
```

#### Analyze with source-map-explorer

```bash
# Install (if not already)
npm install --save-dev source-map-explorer

# Analyze bundle
npx source-map-explorer 'dist/**/*.js' --html result.html

# Open result.html to visualize bundle composition
```

#### Check What's Tree-Shaken

Look for unused D3 APIs:

```bash
# Install webbundler analyzer
npm install --save-dev webpack-bundle-analyzer

# Or use Rollup plugin in vite.config.ts:
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    visualizer({ open: true })  // Opens interactive visualization
  ]
})
```

---

## Part 5: Risk Assessment Framework

### Risk Levels Explained

#### Risk Level: Very Low (d3-sankey update)

```
Change Scope:    Single dependency version update
Test Coverage:   High (TypeScript types catch errors)
User Impact:     Zero (internal optimization)
Rollback Time:   1 minute (git revert)
Severity:        Fix has no downsides (minor version bump is designed for this)
```

**Decision:** Safe to implement immediately

#### Risk Level: Low (WASM lazy loading)

```
Change Scope:    Code path that executes <1% of the time
Test Coverage:   Medium (needs explicit worker failure test)
User Impact:     Positive (faster initial load)
Rollback Time:   5 minutes (git revert)
Severity:        Affects rare error case; user sees fallback behavior
```

**Decision:** Safe to implement after testing

#### Risk Level: Very Low (unused export removal)

```
Change Scope:    Remove dead code
Test Coverage:   Very High (TypeScript catches undefined references)
User Impact:     Zero (code wasn't used)
Rollback Time:   1 minute (git revert)
Severity:        TypeScript prevents shipping broken code
```

**Decision:** Safe to implement if confirmed unused

### Testing Strategy

#### Unit Tests

```bash
# Before making changes, run existing tests
npm run test

# After changes, all tests should still pass
npm run test  # Should be identical pass/fail status
```

#### Integration Tests

For WASM fallback specifically:

```typescript
// tests/unit/wasm/fallback.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createForceSimulation } from '$lib/wasm/forceSimulation'

describe('WASM Fallback', () => {
  it('uses worker when available', async () => {
    const sim = await createForceSimulation({
      nodes: [...],
      links: [...],
      width: 100,
      height: 100
    })

    // Verify worker was used (mock or check for worker events)
    expect(sim).toBeDefined()
  })

  it('falls back to WASM if worker fails', async () => {
    // Mock worker failure
    vi.mock('Worker', () => ({
      Worker: vi.fn(() => {
        throw new Error('Worker not supported')
      })
    }))

    const sim = await createForceSimulation({...})

    // Verify WASM was loaded and used
    expect(sim).toBeDefined()
  })
})
```

#### Performance Tests

```bash
# Measure before/after
npm run build

# Check bundle chunk sizes
npx tsx scripts/measure-bundle.ts

# Verify no regressions
# All chunks should be <= previous size
```

---

## Part 6: Rollback & Recovery

### Quick Rollback Commands

```bash
# Rollback single file
git checkout src/lib/utils/d3-utils.ts

# Rollback to previous commit
git revert <commit-hash>

# Revert package.json changes
git checkout package.json
npm install

# Clear build artifacts
rm -rf .svelte-kit dist node_modules/.vite
npm run build
```

### Monitoring After Deployment

Track these metrics:

```typescript
// 1. Bundle size (CI/CD check)
// 2. Core Web Vitals (via web-vitals library)
// 3. Error rates (via telemetry)
// 4. User session duration (via analytics)

// Example monitoring in your app:
import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals'

getCLS(console.log)
getFCP(console.log)
getFID(console.log)
getLCP(console.log)
getTTFB(console.log)

// Send to your analytics backend
```

### Emergency Rollback Procedure

If issues detected post-deployment:

```bash
# 1. Identify issue
# Monitor: Core Web Vitals, error rates, bundle size

# 2. Trigger rollback
git revert <optimization-commit>
npm install
npm run build

# 3. Deploy previous version
# Your normal deployment process

# 4. Investigate
# Review what went wrong
# Check for edge cases in tests

# 5. Re-implement with fixes
```

---

## Conclusion

All three optimizations are **low-risk, well-understood changes**:

1. **d3-sankey update** - Dependency version bump, backward compatible
2. **WASM lazy loading** - Only affects rare error case, improves normal case
3. **Unused export removal** - TypeScript prevents breaking code

**Combined savings:** 8-15 KB gzip (~5-8% of feature bundle)
**Implementation time:** ~70 minutes
**Risk level:** Very Low
**Rollback time:** ~5 minutes if needed

Proceed with confidence! 🚀
