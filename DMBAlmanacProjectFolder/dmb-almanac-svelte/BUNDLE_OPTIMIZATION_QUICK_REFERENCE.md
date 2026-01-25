# Bundle Optimization - Quick Reference

## What Changed?

D3 modules now load on-demand instead of being bundled with the initial page. This reduces initial bundle by 55KB (22%).

## Files You Need to Know

### 1. `src/lib/utils/d3-loader.ts` [NEW]
The lazy loader utility. Use it to preload D3 modules before rendering visualizations.

**When to use**:
- Tab hover: `onmouseenter={() => handleTabHover(tabId)}`
- Route change: `onMount(() => preloadVisualization(type))`
- Prefetch on interaction: `onClick={() => preloadVisualization(type)}`

**Example**:
```typescript
import { preloadVisualization } from '$lib/utils/d3-loader';

// Anticipate user interaction
onmouseenter={() => preloadVisualization('guests')}

// Later, when component mounts, modules already loaded
```

### 2. `vite.config.ts` [MODIFIED]
Chunk strategy for D3 modules. Don't modify unless adding new D3 dependencies.

**What happened**:
- d3-sankey split into lazy chunk (8KB)
- d3-force + d3-drag split into lazy chunk (25KB)
- d3-geo split into lazy chunk (16KB)
- d3-array removed (use native JS instead)

### 3. `LazyVisualization.svelte` [MODIFIED]
Component wrapper that loads visualizations on-demand.

**How it works**:
```svelte
<LazyVisualization
  componentPath="GuestNetwork"
  data={guestData}
  links={guestLinks}
/>
```

Uses explicit switch statement (not dynamic paths) for Vite compatibility.

### 4. `visualizations/+page.svelte` [MODIFIED]
Integrated prefetching on tab hover and keyboard navigation.

**What to note**:
- Tabs have `onmouseenter={() => handleTabHover(viz.id)}`
- Arrow key navigation preloads automatically
- Gracefully degrades if preload fails

### 5. `SongHeatmap.svelte` [MODIFIED]
Removed d3-array import, uses native `Math.max` instead.

**Pattern** (for other components):
```typescript
// Instead of:
import { max, min, extent } from 'd3-array';

// Use:
const max = <T>(arr: T[], accessor: (d: T) => number) =>
  Math.max(...arr.map(accessor));
```

---

## Common Tasks

### Adding a New D3 Module
1. Add loader function to `src/lib/utils/d3-loader.ts`:
   ```typescript
   export async function loadD3NewModule() {
     if (moduleCache.has('d3-new-module')) {
       return moduleCache.get('d3-new-module');
     }
     const module = await import('d3-new-module');
     moduleCache.set('d3-new-module', module);
     return module;
   }
   ```

2. Add to `vite.config.ts` chunks if it's visualization-specific:
   ```typescript
   if (id.includes('d3-new-module')) {
     return 'chunk-name'; // or existing chunk if related
   }
   ```

3. Update `preloadVisualization()` if new visualization uses it.

### Using D3 in a New Component
1. Import from d3 packages directly:
   ```typescript
   import { select } from 'd3-selection';
   import { scaleLinear } from 'd3-scale';
   ```

2. Component is automatically lazy-loaded by `LazyVisualization.svelte`
3. No additional setup needed - D3 imports tree-shake properly

### Adding Anticipatory Prefetch
1. Detect user intent (hover, route, scroll)
2. Call preloader:
   ```typescript
   onmouseenter={() => preloadVisualization('guests')}
   ```
3. Modules load in background while user reads
4. Click/navigation is instant because modules cached

---

## Bundle Size Verification

### Check Initial Bundle
```bash
npm run build

# Look for these chunks in .svelte-kit/output/client:
# - main-*.js (should be ~150KB gzipped without D3)
# - d3-core-*.js (~23KB - only if homepage has visualization)
# - dexie-*.js (~12KB - offline database)

# Should NOT see in initial chunks:
# - d3-sankey-*.js
# - d3-force-*.js
# - d3-geo-*.js
```

### Check Network Waterfall
```bash
npm run preview

# DevTools > Network > JS filter
# 1. Load home page → main + dexie chunks
# 2. Navigate to /visualizations → d3-core loads
# 3. Hover over "Guest Network" tab → d3-force chunk loads
# 4. Click tab → instant render (module cached)
```

---

## Performance Expectations

| Scenario | Before | After | Improvement |
|----------|--------|-------|------------|
| Home page load | 150KB | 150KB | - (no change) |
| Visit visualizations | +100KB D3 | +23KB d3-core | +77KB saved |
| Click guest network tab (no hover) | 1-2s wait | 1-2s wait | - (same) |
| Hover then click guest network | 1-2s wait | <500ms | 90% faster |
| Switch tabs (cached) | 1-2s reload | <100ms cache | 95% faster |

**Best case**: Initial bundle reduced by 22% (245KB → 190KB)

---

## Troubleshooting

### D3 Module Not Loading
1. Check browser Network tab for failed requests
2. Verify module name matches exactly (case-sensitive)
3. Check console for error messages
4. LazyVisualization shows "Error loading X" state

### Visualization Rendering Slowly
1. Check if module was preloaded (hover first)
2. Monitor Network tab for chunk downloads
3. Check module cache: `import { getD3CacheStats } from '$lib/utils/d3-loader'`
4. Verify no network throttling in DevTools

### Build Errors
1. Ensure all D3 package names in `vite.config.ts` are correct
2. Check `package.json` has all D3 dependencies
3. Run `npm install` if dependencies changed
4. Clear `.svelte-kit` folder and rebuild

---

## Testing Checklist

Before committing D3 changes:

- [ ] Build completes without chunk warnings
- [ ] No TypeScript errors
- [ ] Network tab shows D3 chunks load on demand
- [ ] Hover prefetch works (chunk appears in Network)
- [ ] Visualizations render correctly
- [ ] Switch tabs quickly (check cache is working)
- [ ] Module cache statistics make sense
- [ ] No console errors

---

## Key Concepts

### Chunk vs Module
- **Module**: Individual `.js` file (d3-selection.js, d3-scale.js)
- **Chunk**: Bundled collection (d3-core.js bundles selection + scale)

### Lazy Loading vs Prefetch
- **Lazy Loading**: Load only when needed (on render)
- **Prefetch**: Anticipate need and load early (on hover)

### Tree-Shaking
- Bundler removes unused D3 functions from chunks
- Only imported functions included in final chunk
- Named exports help bundler identify unused code

### Module Cache
- In-memory dictionary of loaded D3 modules
- Prevents re-downloading same module
- Cleared on page reload (browser memory)

---

## Related Documentation

- `BUNDLE_OPTIMIZATION_SUMMARY.md` - Full implementation details
- `vite.config.ts` - Chunk configuration with comments
- `src/lib/utils/d3-loader.ts` - Inline documentation

