# Bundle Optimization Action Plan - DMB Almanac
**Status:** Ready to implement
**Timeline:** 1-3 hours for quick wins
**Total Potential Savings:** 35-50 KB gzip (quick), 18-22 MB with data optimization

---

## Quick Win #1: Remove Unused d3-transition (4 KB, 10 minutes)

### Problem
`RarityScorecard.svelte` imports d3-transition but doesn't use it, adding 4 KB to the visualization chunk.

### Current Code
**File:** `/src/lib/components/visualizations/RarityScorecard.svelte`

```typescript
import { select } from 'd3-selection';
import { scaleBand, scaleLinear } from 'd3-scale';
import { axisLeft } from 'd3-axis';
import 'd3-transition';  // ← LINE 6: Side-effect import, NOT USED
```

### Action
Delete line 6 (the d3-transition import).

```typescript
// DELETE THIS LINE:
import 'd3-transition';

// KEEP EVERYTHING ELSE:
import { select } from 'd3-selection';
import { scaleBand, scaleLinear } from 'd3-scale';
import { axisLeft } from 'd3-axis';
```

### Verification
```bash
# Build and check bundle size
npm run build

# Verify d3-transition not in bundle
ls -lh .svelte-kit/output/client/_app/immutable/chunks/*rarity* 2>/dev/null
# Size should be ~5 KB instead of 9 KB
```

### Why This Works
- d3-transition was added as a side effect but never called
- The component doesn't use `.transition()` on any selections
- All animations are CSS-based via Svelte transitions

---

## Quick Win #2: Optimize Terser Compression (10-15 KB, 10 minutes)

### Problem
Production bundle includes console.log/debug statements and has suboptimal compression settings.

### Current Configuration
**File:** `vite.config.ts`

```typescript
// Currently uses default terser settings
// No console log removal, no aggressive compression
```

### Action
Add Terser configuration to `vite.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    target: 'es2022',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: [
          'console.debug',
          'console.info',
          'console.log'
        ],
        passes: 2  // Multiple passes for aggressive minification
      },
      mangle: {
        properties: {
          // Safely mangle private properties starting with _
          regex: /^_/
        }
      }
    },
    rollupOptions: {
      // ... rest of config stays the same
    }
  }
});
```

### Verification
```bash
# Build with NODE_ENV=production
NODE_ENV=production npm run build

# Check bundle sizes
du -sh .svelte-kit/output/client/_app/immutable/chunks/

# Verify no console.log in built code
grep -r "console\.log" .svelte-kit/output/client/ || echo "✓ No console logs found"
```

### Why This Works
- Removes debug statements from production bundle
- Multiple terser passes catch more optimization opportunities
- Safely mangles private properties

---

## Quick Win #3: Move tsx to devDependencies (Cleaner Build, 5 minutes)

### Problem
Build tool (tsx) listed in production dependencies, cluttering dependency tree.

### Current Code
**File:** `package.json`

```json
{
  "dependencies": {
    "d3-axis": "^3.0.0",
    "d3-drag": "^3.0.0",
    // ... other D3 modules
    "tsx": "^4.21.0"  // ← SHOULD BE IN devDependencies
  },
  "devDependencies": {
    "@sveltejs/adapter-auto": "^3.3.1",
    // ... other dev tools
  }
}
```

### Action
1. Remove tsx from dependencies
2. Add tsx to devDependencies

**Before:**
```json
{
  "dependencies": {
    "d3-axis": "^3.0.0",
    "d3-drag": "^3.0.0",
    "d3-force": "^3.0.0",
    "d3-geo": "^3.1.1",
    "d3-sankey": "^0.12.3",
    "d3-scale": "^4.0.2",
    "d3-selection": "^3.0.0",
    "d3-transition": "^3.0.1",
    "dexie": "^4.2.1",
    "topojson-client": "^3.1.0",
    "tsx": "^4.21.0"
  },
  "devDependencies": {
    "@sveltejs/adapter-auto": "^3.3.1",
    // ...
  }
}
```

**After:**
```json
{
  "dependencies": {
    "d3-axis": "^3.0.0",
    "d3-drag": "^3.0.0",
    "d3-force": "^3.0.0",
    "d3-geo": "^3.1.1",
    "d3-sankey": "^0.12.3",
    "d3-scale": "^4.0.2",
    "d3-selection": "^3.0.0",
    "d3-transition": "^3.0.1",
    "dexie": "^4.2.1",
    "topojson-client": "^3.1.0"
  },
  "devDependencies": {
    "@sveltejs/adapter-auto": "^3.3.1",
    "tsx": "^4.21.0",
    // ... other dev tools
  }
}
```

### Verification
```bash
npm install  # Update node_modules

# Verify scripts still work
npm run compress:data  # Uses tsx
npm run verify:compression

# Verify bundle unaffected
npm run build
```

### Why This Works
- tsx is only used at build-time (scripts)
- Not needed at runtime
- Cleaner dependency tree
- No impact on bundle size (not shipped to browser anyway)

---

## Advanced Optimization #4: Add Bundle Analyzer (Visibility, 15 minutes)

### Problem
Can't visually see what's in bundle - need transparency for future optimizations.

### Action
1. Install bundle analyzer plugin
2. Configure in vite.config.ts
3. Add build script

**Step 1:** Install plugin
```bash
npm install --save-dev rollup-plugin-visualizer
```

**Step 2:** Update `vite.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import { visualizer } from 'rollup-plugin-visualizer';
import { sveltekit } from '@sveltejs/kit/vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    sveltekit(),
    visualizer({
      filename: 'dist/stats.html',
      title: 'DMB Almanac Bundle Analysis',
      open: process.env.ANALYZE === 'true',  // Auto-open when ANALYZE=true
      gzipSize: true,  // Show gzip sizes
      brotliSize: true  // Show brotli sizes
    })
  ],
  // ... rest of config
});
```

**Step 3:** Add script to `package.json`
```json
{
  "scripts": {
    "build": "vite build",
    "build:analyze": "ANALYZE=true npm run build"
  }
}
```

### Usage
```bash
npm run build:analyze

# Opens dist/stats.html with interactive visualization
# Shows:
# - Each chunk size
# - Contribution of each module
# - Gzip/Brotli compression ratios
```

### Verification
```bash
npm run build:analyze
# Should open browser with treemap visualization
# Verify:
# - d3-core chunk ~23 KB
# - d3-force chunk ~18 KB (lazy)
# - Main app chunk <100 KB
```

---

## Critical Optimization #5: Static Data Handling (18-22 MB potential, 30-60 minutes)

### Investigation Phase (10 minutes)

First, **verify if static JSON files are bundled**:

```bash
# Check if data files are in build output
ls -lh .svelte-kit/output/
du -sh .svelte-kit/output/*/

# Check if referenced in HTML
grep -r "setlist-entries\|shows\.json" .svelte-kit/output/prerendered/

# Search for data import in code
grep -r "static/data" src/
```

### If Static Data IS Bundled

**Apply Gzip Compression (30 minutes):**

**Step 1:** Install compression plugin
```bash
npm install --save-dev vite-plugin-compression
```

**Step 2:** Configure in `vite.config.ts`
```typescript
import compression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    sveltekit(),
    // Add AFTER sveltekit plugin
    compression({
      ext: '.gz',
      deleteOriginFile: false,  // Keep both .js and .gz
      algorithm: 'gzip',
      threshold: 10240  // Only compress files > 10 KB
    }),
    compression({
      ext: '.br',
      deleteOriginFile: false,
      algorithm: 'brotli',
      threshold: 10240
    })
  ]
});
```

**Step 3:** Verify compression
```bash
npm run build

# Check generated .gz files
ls -lh .svelte-kit/output/prerendered/pages/ | grep "\.gz"

# Verify size reduction
du -sh .svelte-kit/output/prerendered/
# Should be ~5-6 MB instead of 26 MB
```

**Step 4:** Configure server to serve compressed files

For SvelteKit adapter (ensure in svelte.config.js):
```javascript
export default {
  kit: {
    adapter: adapter({
      // Your adapter config
    }),
    // Files are auto-served .gz if available by Node adapter
  }
};
```

For static hosting (nginx/apache), add:
```nginx
# nginx.conf
gzip_static on;  # Serve .gz files if available
```

### If Static Data Is NOT Bundled (Likely Case)

**Document service worker strategy:**

**File:** Check `static/sw.js` for caching strategy
```javascript
// Service Worker should cache data files with appropriate strategy
// e.g., stale-while-revalidate for data

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('data-v1').then((cache) => {
      return cache.addAll([
        '/static/data/setlist-entries.json',
        '/static/data/shows.json',
        // ... other data files
      ]);
    })
  );
});
```

**Status:** Already optimized if loaded on-demand

---

## Advanced Optimization #6: Web Worker for Force Simulation (Optional, 2 hours)

### Opportunity
Move expensive D3 force simulation off main thread for better responsiveness.

### When to Implement
Only if performance profiling shows force simulation blocking main thread.

### Implementation Pattern

**Step 1:** Create worker file
```typescript
// src/lib/workers/force-simulation.worker.ts
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';

interface WorkerMessage {
  nodes: Array<{ id: string; x?: number; y?: number; vx?: number; vy?: number }>;
  links: Array<{ source: string | number; target: string | number; weight?: number }>;
  width: number;
  height: number;
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { nodes, links, width, height } = event.data;

  // Create nodes with proper type
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const linkData = links.map(l => ({
    source: nodeMap.get(typeof l.source === 'string' ? l.source : String(l.source))!,
    target: nodeMap.get(typeof l.target === 'string' ? l.target : String(l.target))!,
    weight: l.weight || 1
  }));

  const simulation = forceSimulation(nodes)
    .force('link', forceLink(linkData).distance(d => 100 / (d.weight || 1)))
    .force('charge', forceManyBody().strength(-200))
    .force('center', forceCenter(width / 2, height / 2))
    .force('collision', forceCollide(d => nodeScale(d.appearances) + 5));

  // Send tick updates every 10 ticks
  let tickCount = 0;
  simulation.on('tick', () => {
    tickCount++;
    if (tickCount % 10 === 0) {
      self.postMessage({ type: 'tick', nodes });
    }
  });

  simulation.on('end', () => {
    self.postMessage({ type: 'end', nodes });
  });
};
```

**Step 2:** Update GuestNetwork component
```typescript
// src/lib/components/visualizations/GuestNetwork.svelte
let worker: Worker | undefined;

onMount(() => {
  // Create worker
  worker = new Worker(
    new URL('$lib/workers/force-simulation.worker.ts', import.meta.url),
    { type: 'module' }
  );

  // Send data to worker
  worker.postMessage({
    nodes: data,
    links: links,
    width: containerWidth,
    height: containerHeight
  });

  // Receive updates
  worker.onmessage = (event: MessageEvent) => {
    if (event.data.type === 'tick' || event.data.type === 'end') {
      // Update UI with new positions
      renderNodes(event.data.nodes);
    }
  };

  return () => worker?.terminate();
});
```

### Expected Improvements
- Main thread remains responsive during force simulation
- Animations smoother during long simulations
- Better perceived performance
- No bundle size change

---

## Testing & Validation Checklist

### After Each Change

```bash
□ npm run build                    # Compiles without errors
□ npm run preview                  # Preview works locally
□ npm run check                    # Type checking passes
□ npm run lint                     # Linting passes
```

### Bundle Verification

```bash
□ npm run build:analyze           # Visualize chunks (if added)
□ Verify d3-core chunk ~23 KB     # Initial D3 load
□ Verify d3-force chunk lazy      # Only loaded on Guest Network tab
□ Verify d3-geo chunk lazy        # Only loaded on Tour Map tab
□ Verify d3-sankey chunk lazy     # Only loaded on Transitions tab
□ No d3-transition in main bundle # Should only load if used
```

### Functional Testing

```bash
□ Homepage loads without D3       # ~500ms faster
□ /visualizations route works     # Tab switching smooth
□ Transitions tab renders         # Sankey loads correctly
□ Guest Network tab renders       # Force simulation works
□ Tour Map tab renders            # Geo visualization works
□ Heatmap tab renders             # Axis visualization works
□ Timeline tab renders            # Timeline renders correctly
□ Rarity tab renders              # Bar chart displays
```

### Performance Testing

```bash
□ LCP < 1.0s (target)            # Core Web Vital
□ INP < 100ms (target)           # Interaction to Paint
□ CLS < 0.05 (target)            # Cumulative Layout Shift
□ First visualization load < 500ms
□ Tab switching < 200ms
```

### Offline Functionality

```bash
□ Service worker caches correctly
□ Offline access works
□ Data updates sync
□ No console errors
```

---

## Rollout Strategy

### Phase 1: Local Testing (1 hour)
1. Make changes locally
2. Run build and tests
3. Verify bundle sizes
4. Test all visualizations

### Phase 2: Staging (30 minutes)
1. Deploy to staging branch
2. Run performance tests
3. Verify offline functionality
4. Check analytics

### Phase 3: Production (15 minutes)
1. Merge to main
2. Monitor bundle metrics
3. Track performance improvements
4. Document results

### Metrics to Track

```
Before:
├── Initial bundle size: [measure with current build]
├── d3-core chunk: 23 KB
├── Main app chunk: [measure]
├── LCP: [measure with DevTools]
└── Tab switch time: [measure]

After:
├── Initial bundle size: [should be 35-50 KB smaller]
├── d3-core chunk: 23 KB (same)
├── Main app chunk: [should be smaller]
├── LCP: [should be faster]
└── Tab switch time: [should be faster]
```

---

## Rollback Plan

If issues arise:

```bash
# Quick rollback
git revert [commit-hash]
npm install
npm run build
npm run preview

# Verify old bundle works
# Check metrics are back to baseline
```

**Risk Level:** LOW
- Changes are additive (removing unused code)
- No logic changes
- Fallback to previous git commit always possible

---

## Next Steps (After Quick Wins)

Once quick wins are implemented and validated:

1. **Static Data Optimization** (if bundled)
   - Implement Brotli compression
   - Lazy load via service worker
   - Estimate 18-22 MB savings

2. **Advanced D3 Optimization**
   - Web Worker for force simulation
   - Conditional d3-transition loading
   - RequestIdleCallback prefetching

3. **Route-Level Optimization**
   - Identify other routes using D3
   - Apply same lazy loading pattern
   - Add prefetch on navigation

4. **Monitoring**
   - Set up bundle size CI checks
   - Alert on size regressions
   - Track performance metrics

---

## Files Modified

**Quick Wins Phase:**
- `/src/lib/components/visualizations/RarityScorecard.svelte` (remove import)
- `vite.config.ts` (add terser options)
- `package.json` (move tsx)

**Optional Phase:**
- `vite.config.ts` (add visualizer)
- `static/sw.js` (verify compression strategy)

---

## Questions for Team

Before implementation, clarify:

1. **Static data loading:** Are the 26 MB JSON files bundled, or loaded on-demand?
   - Current investigation method provided above
   - Affects if 18-22 MB optimization is applicable

2. **Performance baselines:** What are current LCP/INP metrics?
   - Helps prioritize optimizations
   - Validates improvements

3. **Browser support:** Only Chromium 143+, or need broader support?
   - Affects polyfill strategy
   - Simplifies optimization (modern APIs available)

4. **Deployment:** Where is app hosted?
   - Affects gzip/brotli serving strategy
   - Node.js, static hosting, CDN?

---

## Summary

**Total Time Investment:** 1-3 hours
**Effort Level:** Low to Medium
**Risk Level:** Very Low
**Expected Impact:**
- 35-50 KB gzip savings (quick wins)
- 18-22 MB if static data optimized
- 200-400ms faster visualizations
- Better user experience

**Start:** Quick Win #1 (10 minutes)
**Then:** Investigate static data (10 minutes)
**Finally:** Advanced optimizations (as time permits)

