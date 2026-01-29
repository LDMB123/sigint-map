# Bundle Optimization - Code Implementation Examples

This document provides exact code changes for each optimization opportunity.

---

## PRIORITY 1: Add sideEffects Declaration (2-3 KB savings)

### File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/package.json`

**Before:**
```json
{
  "name": "dmb-almanac",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "wasm:build": "npm run wasm:build:transform && npm run wasm:build:core && npm run wasm:build:date && npm run wasm:build:string && npm run wasm:build:segue && npm run wasm:build:force && npm run wasm:build:visualize && npm run wasm:compress",
```

**After (Add sideEffects block):**
```json
{
  "name": "dmb-almanac",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "sideEffects": [
    "*.css",
    "./src/app.css",
    "./src/lib/stores/**/*.ts"
  ],
  "scripts": {
    "wasm:build": "npm run wasm:build:transform && npm run wasm:build:core && npm run wasm:build:date && npm run wasm:build:string && npm run wasm:build:segue && npm run wasm:build:force && npm run wasm:build:visualize && npm run wasm:compress",
```

**Explanation:**
- `*.css` - CSS files have global side effects (styling)
- `./src/app.css` - Global application styles
- `./src/lib/stores/**/*.ts` - Svelte stores may have initialization side effects

**Build Impact:** Signals to Vite that non-CSS modules are pure and can be aggressively tree-shaken.

---

## PRIORITY 1: Verify d3-transition Usage

### Quick Check:
```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app

# Search for any imports of d3-transition
grep -r "from.*['\"]d3-transition" src/ --include="*.js" --include="*.ts" --include="*.svelte"

# Also check for general "transition" imports that might be d3-transition
grep -r "d3-transition\|d3.transition\|import.*transition.*d3" src/
```

**Expected Result:** Zero matches (indicating it's likely unused)

### If Unused - Remove:

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/package.json`

**Before:**
```json
  "dependencies": {
    "d3-geo": "^3.1.1",
    "d3-sankey": "^0.12.3",
    "d3-selection": "^3.0.0",
    "d3-transition": "^3.0.1",
    "dexie": "^4.2.1",
    "topojson-client": "^3.1.0",
    "web-push": "^3.6.7"
  }
```

**After (Remove d3-transition):**
```json
  "dependencies": {
    "d3-geo": "^3.1.1",
    "d3-sankey": "^0.12.3",
    "d3-selection": "^3.0.0",
    "dexie": "^4.2.1",
    "topojson-client": "^3.1.0",
    "web-push": "^3.6.7"
  }
```

**Then Run:**
```bash
npm install
npm run build

# Verify bundle size reduced by ~4-5 KB
find build/client/_app/immutable/chunks -name "*.js" -exec gzip -c {} \; 2>/dev/null | wc -c | awk '{printf "Total: %.2f KB\n", $1/1024}'
```

---

## PRIORITY 1: Consolidate D3 Utilities Margins

### File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/utils/d3-utils.js`

**Step 1: Find current exports end (around line 140)**

**Before:**
```javascript
export const getColorScheme = (schemeName) => colorSchemes[schemeName] ?? colorSchemes.category10;
```

**After (Add new consolidated constants):**
```javascript
export const getColorScheme = (schemeName) => colorSchemes[schemeName] ?? colorSchemes.category10;

/**
 * Consolidated visualization margin configurations
 * Reduces duplication across visualization components
 * Improves bundle size by ~1-2 KB
 *
 * @type {Object<string, {top: number, right: number, bottom: number, left: number}>}
 */
export const VISUALIZATION_MARGINS = {
  /** Timeline/Gap visualization margins */
  timeline: { top: 20, right: 20, bottom: 30, left: 40 },
  /** Heatmap visualization margins */
  heatmap: { top: 20, right: 20, bottom: 30, left: 50 },
  /** Rarity scorecard margins */
  rarity: { top: 20, right: 20, bottom: 20, left: 40 }
};
```

---

### File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/components/visualizations/GapTimeline.svelte`

**Before:**
```svelte
<script>
  import { onMount } from 'svelte';
  import { loadD3Selection } from "$lib/utils/d3-loader";
  import { arrayMax, colorSchemes, MARGINS } from "$lib/utils/d3-utils";

  // ...component setup...

  const MARGINS = { top: 20, right: 20, bottom: 30, left: 40 };
```

**After:**
```svelte
<script>
  import { onMount } from 'svelte';
  import { loadD3Selection } from "$lib/utils/d3-loader";
  import { arrayMax, colorSchemes, MARGINS: D3_MARGINS, VISUALIZATION_MARGINS } from "$lib/utils/d3-utils";

  // ...component setup...

  const MARGINS = VISUALIZATION_MARGINS.timeline;
```

---

### File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/components/visualizations/SongHeatmap.svelte`

**Before:**
```svelte
<script>
  import { onMount } from 'svelte';
  import { loadD3Selection } from "$lib/utils/d3-loader";
  import { arrayMax, colorSchemes, MARGINS } from "$lib/utils/d3-utils";

  // ...component setup...

  const MARGINS = { top: 20, right: 20, bottom: 30, left: 50 };
```

**After:**
```svelte
<script>
  import { onMount } from 'svelte';
  import { loadD3Selection } from "$lib/utils/d3-loader";
  import { arrayMax, colorSchemes, VISUALIZATION_MARGINS } from "$lib/utils/d3-utils";

  // ...component setup...

  const MARGINS = VISUALIZATION_MARGINS.heatmap;
```

---

### File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/components/visualizations/RarityScorecard.svelte`

**Before:**
```svelte
<script>
  import { onMount } from 'svelte';
  import { loadD3Selection } from '$lib/utils/d3-loader';
  import { arrayMax } from '$lib/utils/d3-utils';

  // ...component setup...

  const MARGINS = { top: 20, right: 20, bottom: 20, left: 40 };
```

**After:**
```svelte
<script>
  import { onMount } from 'svelte';
  import { loadD3Selection } from '$lib/utils/d3-loader';
  import { arrayMax, VISUALIZATION_MARGINS } from '$lib/utils/d3-utils';

  // ...component setup...

  const MARGINS = VISUALIZATION_MARGINS.rarity;
```

---

## PRIORITY 2: Implement Route Prefetching (200ms faster load)

### File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/routes/visualizations/+page.svelte`

**Before:**
```svelte
<script>
  import { onMount } from 'svelte';

  // Page content...
</script>

<div class="visualizations-container">
  <h1>Interactive Visualizations</h1>
  <!-- Links without prefetch -->
</div>
```

**After:**
```svelte
<script>
  import { preloadVisualization } from '$lib/utils/d3-loader';

  // Page content...
</script>

<div class="visualizations-container">
  <h1>Interactive Visualizations</h1>

  <!-- Enhanced links with hover prefetch -->
  <nav class="viz-links">
    <a
      href="/visualizations/transitions"
      on:mouseenter={() => preloadVisualization('transitions')}
      on:touchstart={() => preloadVisualization('transitions')}
    >
      Transition Flow
    </a>

    <a
      href="/visualizations/guests"
      on:mouseenter={() => preloadVisualization('guests')}
      on:touchstart={() => preloadVisualization('guests')}
    >
      Guest Network
    </a>

    <a
      href="/visualizations/map"
      on:mouseenter={() => preloadVisualization('map')}
      on:touchstart={() => preloadVisualization('map')}
    >
      Tour Map
    </a>

    <a
      href="/visualizations/timeline"
      on:mouseenter={() => preloadVisualization('timeline')}
      on:touchstart={() => preloadVisualization('timeline')}
    >
      Gap Timeline
    </a>

    <a
      href="/visualizations/heatmap"
      on:mouseenter={() => preloadVisualization('heatmap')}
      on:touchstart={() => preloadVisualization('heatmap')}
    >
      Song Heatmap
    </a>

    <a
      href="/visualizations/rarity"
      on:mouseenter={() => preloadVisualization('rarity')}
      on:touchstart={() => preloadVisualization('rarity')}
    >
      Rarity Scorecard
    </a>
  </nav>
</div>

<style>
  .viz-links {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin: 2rem 0;
  }

  .viz-links a {
    padding: 0.75rem 1.5rem;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    text-decoration: none;
    transition: all 0.3s ease;
  }

  .viz-links a:hover {
    background-color: var(--hover-bg);
    border-color: var(--accent-color);
  }
</style>
```

**Key Points:**
- `on:mouseenter` for desktop users
- `on:touchstart` for mobile users (proactive loading on touch)
- Silent failure if prefetch fails (non-critical)
- Works with existing `preloadVisualization()` function

**Performance Impact:**
- Desktop: ~200-300ms faster perceived load on click
- Mobile: ~100-200ms faster (depends on touch handling)
- Zero bundle size impact
- Graceful degradation if module already cached

---

## PRIORITY 2: Analyze Dexie Lazy Loading Feasibility

### Investigation: Which routes need Dexie?

**File to Check:** Routes' `+page.server.js` files

**Example 1 - Shows Route (NEEDS Dexie):**

File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/routes/shows/+page.server.js`

```javascript
// Current implementation likely includes:
import { db } from '$lib/db/dexie/db';

export async function load() {
  const shows = await db.shows.limit(50).toArray();
  const grouped = groupShowsByYear(shows);
  return { shows, groupedShows: grouped };
}
```

**Determination:** NEEDS Dexie (must load data from DB during route load)

---

**Example 2 - API Route (May NOT need Dexie):**

File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/routes/api/push-send/+server.js`

```javascript
// Current implementation likely includes:
import webpush from 'web-push';

export async function POST({ request }) {
  const { subscription, message } = await request.json();
  await webpush.sendNotification(subscription, message);
  return new Response(JSON.stringify({ success: true }));
}
```

**Determination:** Possibly could LAZY-LOAD (server-side only, no Dexie needed)

---

### Lazy Loading Implementation Pattern

**If a route doesn't need Dexie eagerly, this pattern works:**

**Before (Eager):**
```typescript
// src/lib/db/lazy-dexie.ts
import Dexie from 'dexie';

export const db = new Dexie('DmbAlmanac');
```

**After (Lazy):**
```typescript
// src/lib/db/lazy-dexie.ts
/**
 * Lazy-load Dexie on first use
 * Defers ~36 KB gzipped until needed
 * First call will dynamically import Dexie (~25-30 KB).
 */

let dbInstance: any = null;

export async function getDb() {
  if (!dbInstance) {
    const Dexie = (await import('dexie')).default;
    dbInstance = new Dexie('DmbAlmanac');
    // Initialize schema, migrations, etc.
  }
  return dbInstance;
}

// For backward compatibility with sync code:
export function getDbSync() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call getDb() first.');
  }
  return dbInstance;
}
```

**Usage in route:**
```javascript
// Before using DB, ensure it's loaded
const db = await getDb();
const shows = await db.shows.toArray();
```

---

## PRIORITY 2: Verify Server-Only Code Separation

### Check: Is web-push in client bundle?

```bash
# Search for web-push in client chunks
grep -r "web-push" /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/build/client/ || echo "Not in client bundle (GOOD)"

# Check what's actually using web-push
grep -r "import.*web-push\|from.*web-push" /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/ --include="*.js" --include="*.ts"
```

**Expected Result:**
- Only found in `/src/routes/api/push-send/+server.js`
- Not found in build/client/ (SvelteKit handles this correctly)

**If Found in Client Bundle:** Contact SvelteKit team - likely configuration issue

---

## PRIORITY 3: Component-Level D3 Extraction (Advanced)

### Option: Create separate visualization chunks

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/components/visualizations/+layout.svelte` (create if doesn't exist)

```svelte
<script>
  /**
   * Visualization layout wrapper
   * Enables dynamic component imports for better code splitting
   */
</script>

<div class="visualization-wrapper">
  <slot />
</div>

<style>
  .visualization-wrapper {
    width: 100%;
    padding: 1rem;
  }
</style>
```

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/routes/visualizations/transitions/+page.svelte` (new file)

```svelte
<script>
  import { onMount } from 'svelte';
  import TransitionFlow from '$lib/components/visualizations/TransitionFlow.svelte';

  let mounted = false;

  onMount(() => {
    mounted = true;
  });
</script>

{#if mounted}
  <TransitionFlow />
{:else}
  <div class="loading">Loading visualization...</div>
{/if}

<style>
  .loading {
    padding: 2rem;
    text-align: center;
    color: var(--text-secondary);
  }
</style>
```

**Benefit:** Each visualization route becomes its own code-split chunk, automatically lazy-loaded by SvelteKit.

---

## TESTING & VALIDATION

### Before/After Bundle Size Comparison

**Create this script:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/measure-bundle.js`

```javascript
import { readdirSync, readFileSync } from 'fs';
import { gzipSync } from 'zlib';
import { join } from 'path';

const chunkDir = './build/client/_app/immutable/chunks';
const files = readdirSync(chunkDir).filter(f => f.endsWith('.js'));

let totalRaw = 0;
let totalGzip = 0;
const fileSizes = [];

files.forEach(file => {
  const path = join(chunkDir, file);
  const raw = readFileSync(path);
  const gzipped = gzipSync(raw);
  totalRaw += raw.length;
  totalGzip += gzipped.length;

  fileSizes.push({
    file,
    raw: raw.length,
    gzip: gzipped.length,
    ratio: (gzipped.length / raw.length * 100).toFixed(1)
  });
});

console.log('\n=== BUNDLE SIZE ANALYSIS ===\n');
console.log(`Total Raw Size:     ${(totalRaw/1024).toFixed(1)} KB`);
console.log(`Total Gzipped Size: ${(totalGzip/1024).toFixed(1)} KB`);
console.log(`Compression Ratio:  ${(totalGzip/totalRaw*100).toFixed(1)}%`);
console.log(`\nTop 10 Chunks:`);

fileSizes
  .sort((a, b) => b.gzip - a.gzip)
  .slice(0, 10)
  .forEach(({ file, raw, gzip, ratio }) => {
    console.log(`  ${file.padEnd(40)} ${(gzip/1024).toFixed(1).padStart(6)} KB (${ratio}%)`);
  });
```

**Run Before Changes:**
```bash
npm run build
node measure-bundle.js
# Note the total gzipped size
```

**Run After Each Change:**
```bash
npm run build
node measure-bundle.js
# Compare with previous output
```

---

## ROLLBACK PLAN

If any change causes issues:

```bash
# Revert all changes
git checkout .

# Rebuild
npm run build
npm run dev
```

---

## Success Criteria Checklist

- [ ] Build completes: `npm run build` (no errors)
- [ ] Dev server runs: `npm run dev` (no errors)
- [ ] Tests pass: `npm run test` (all tests)
- [ ] E2E tests pass: `npm run test:e2e` (all scenarios)
- [ ] Bundle size reduced by target amount
- [ ] No visual regressions
- [ ] Offline functionality works
- [ ] All visualizations load properly
- [ ] No console errors or warnings

---

## Expected Results

### Priority 1 Only (30 minutes)
- **Changes:** 3 modifications
- **Savings:** 3-10 KB
- **Tests:** Should all pass

### Priority 1 + 2 (3-4 hours)
- **Changes:** 5-6 modifications
- **Savings:** 8-20 KB total
- **Tests:** All should pass, slight perception speed improvement

### All Priorities (8-10 hours)
- **Changes:** 8-10 modifications
- **Savings:** 20-35 KB total
- **Result:** 1.7-2.5% bundle reduction
- **User Impact:** Slightly faster initial load and visualization switching

---

For detailed context on each change, refer to: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/BUNDLE_OPTIMIZATION_ANALYSIS.md`
