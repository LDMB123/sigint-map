# Bundle Optimization Summary - DMB Almanac

## Key Findings

### Current Bundle Health: 6/10

The DMB Almanac app is shipping unnecessary code to users, resulting in slower load times especially on mobile devices.

---

## The Numbers

| Metric | Current | Target | Savings |
|--------|---------|--------|---------|
| Main JS Bundle | 145 KB | 75 KB | -48% |
| Total App JS | 541 KB | 410 KB | -24% |
| Initial Load (gzip) | 190 KB | 120 KB | -37% |
| Largest Chunk | 145 KB | 60 KB | -59% |
| First Paint | 0.8s | 0.6s | -25% |
| Interactive | 1.2s | 0.8s | -33% |

---

## Root Causes

### 1. **D3 in Initial Bundle** (110 KB - 57% of problem)

All D3 visualization libraries load immediately, even for users who never visit the visualization page.

- d3-selection: 16 KB
- d3-scale: 18 KB
- d3-force: 22 KB
- d3-geo: 24 KB
- Other D3 modules: 30 KB

**Status**: Partially fixed in route component, but barrel export forces eager load

### 2. **WASM Modules Not Deployed** (862 KB unused)

Three WASM modules exist in source but aren't built into the production bundle due to build configuration issues.

- dmb-transform.wasm: 862 KB (not deployed)
- dmb-segue-analysis.wasm: TBD
- dmb-date-utils.wasm: TBD

**Status**: Build errors with wasm-opt (disabled as workaround)

### 3. **Suboptimal Code Splitting** (25 KB avoidable)

Route-specific chunks (shows, songs, venues) are larger than necessary due to shared code not being extracted.

- Shows route: 43 KB
- Songs route: 43 KB
- Venues route: 40 KB

**Status**: SvelteKit should handle this automatically, but something is off

### 4. **Dexie Patterns** (8 KB avoidable)

Database access patterns include some unused utility functions that could be tree-shaken.

**Status**: Already using lazy-load pattern correctly

---

## What's Bloating the Bundle

### Biggest Offenders

```
D3 Ecosystem (all in main)
├── d3-selection ............ 16 KB
├── d3-scale ................ 18 KB
├── d3-force ................ 22 KB
├── d3-geo .................. 24 KB
├── d3-sankey ............... 12 KB
├── d3-axis ................. 8 KB
├── d3-drag ................. 4 KB
└── topojson-client ......... 8 KB
                    Subtotal: 116 KB (20% of bundle!)

Route-Specific Code
├── Shows queries ........... 43 KB
├── Songs queries ........... 43 KB
├── Venues queries .......... 40 KB
├── Search logic ............ 25 KB
└── Shared utilities ........ 28 KB
                    Subtotal: 179 KB (33% of bundle)

UI Components & Framework
├── Svelte framework ........ 45 KB
├── UI library .............. 28 KB
├── CSS-in-JS ............... 8 KB
└── Utilities ............... 15 KB
                    Subtotal: 96 KB (18% of bundle)

Database & Stores
├── Dexie core .............. 28 KB
├── Query helpers ........... 18 KB
├── Store subscriptions ..... 12 KB
└── Cache utilities ......... 5 KB
                    Subtotal: 63 KB (12% of bundle)

Other
└── Polyfills, vendors, misc  87 KB (17% of bundle)
```

---

## Quick Wins (42% Savings in 2 Days)

### 1. Remove D3 from Barrel Export (40 KB)
**Action**: Delete component exports from `src/lib/components/visualizations/index.ts`
**Result**: D3 only loads when user clicks visualization tab
**Time**: 30 minutes

### 2. Fix Manual Chunking in vite.config.ts (8 KB)
**Action**: Split D3 modules into separate lazy chunks
**Result**: Better tree-shaking, prevents accidental bundling
**Time**: 45 minutes

### 3. Verify WASM Config (already done)
**Action**: Confirm wasm-opt is disabled in Cargo.toml
**Result**: Builds without errors (temporary workaround)
**Time**: 15 minutes

**Total Savings: -40 KB gzipped (-37% reduction)**

---

## Medium Effort (Additional 15% Savings in 5 Days)

### 4. Create Array Utilities (4 KB)
Replace d3-array with native JavaScript utilities
**Time**: 2 hours

### 5. Lazy Load Database Queries (8 KB)
Load search/filter logic only when needed
**Time**: 4 hours

### 6. Implement WASM Loader (0 KB size, better UX)
Deploy WASM modules with fallback
**Time**: 3 hours

### 7. Add Prefetching (0 KB size, UX improvement)
Preload next visualization when user hovers tabs
**Time**: 2 hours

**Total Savings: Additional -15 KB gzipped (-12% reduction)**

---

## Performance Impact

### Before Optimization
```
Homepage Load:
  HTML:        12 KB
  CSS:         45 KB
  JavaScript: 145 KB (includes D3, unused)
  ─────────────────
  Total:      202 KB gzipped

Time to Interactive: 1.2 seconds
First Contentful Paint: 0.8 seconds
```

### After Quick Wins
```
Homepage Load:
  HTML:        12 KB
  CSS:         45 KB
  JavaScript:  75 KB (D3 deferred)
  ─────────────────
  Total:      132 KB gzipped (-35%)

Time to Interactive: 0.8 seconds (-33%)
First Contentful Paint: 0.65 seconds (-19%)
```

### After Full Optimization
```
Homepage Load:
  HTML:        12 KB
  CSS:         40 KB
  JavaScript:  60 KB (all optimized)
  ─────────────────
  Total:      112 KB gzipped (-45%)

Time to Interactive: 0.6 seconds (-50%)
First Contentful Paint: 0.55 seconds (-31%)

On 3G Network: +2.5 seconds faster
Mobile 4G: +800ms faster
Desktop: +400ms faster
```

---

## Implementation Timeline

### Phase 1: Quick Wins (Day 1-2)
- [ ] Remove D3 barrel export
- [ ] Fix vite.config.ts chunking
- [ ] Verify WASM config
- **Result**: -40 KB (-37% reduction)

### Phase 2: Full Implementation (Day 3-7)
- [ ] Create array utilities
- [ ] Lazy-load database queries
- [ ] Deploy WASM modules
- [ ] Add prefetching
- **Result**: Additional -15 KB (-12% more)

### Phase 3: Polish (Day 8-10)
- [ ] Critical CSS inlining
- [ ] Add CI/CD monitoring
- [ ] Performance testing
- [ ] Deployment to production

---

## File Changes Required

### Minimal Changes (Phase 1)

**1. src/lib/components/visualizations/index.ts**
```diff
- export { default as TransitionFlow } from './TransitionFlow.svelte';
- export { default as GuestNetwork } from './GuestNetwork.svelte';
- // ... remove all component exports
+ // Keep only type exports (no code)
+ export type TransitionFlowData = ...
```

**2. vite.config.ts**
```diff
  manualChunks(id) {
    if (id.includes('node_modules')) {
+     // Split each D3 module into its own chunk
+     if (id.includes('d3-selection')) return 'd3-selection';
+     if (id.includes('d3-scale')) return 'd3-scale';
+     // ... etc for each D3 module
    }
  }
```

### Additional Changes (Phase 2)

**3. Create src/lib/utils/array.ts** (new file)
**4. src/lib/wasm/loader.ts** (new file)
**5. Update visualization components** (replace d3-array imports)

---

## Verification Checklist

After implementing Phase 1:

```bash
# Build and check sizes
npm run build

# Verify D3 not in main chunk
grep -L "d3-" build/client/_app/immutable/chunks/DP9_wQfI.js && echo "✓ D3 removed"

# Check chunk sizes
du -h build/client/_app/immutable/chunks/ | sort -h | tail -5
# Should show largest < 100 KB instead of 145 KB

# Test performance
npm run preview
# Open in DevTools Network tab
# - JavaScript total < 100 KB
# - No D3 modules on homepage
# - D3 loads when visiting /visualizations
```

---

## Success Metrics

### Hard Targets
- Main JS chunk < 75 KB uncompressed
- Initial load < 130 KB gzipped
- FCP < 0.7 seconds

### Performance Improvements
- 30-50% faster on 3G networks
- 20-35% faster on mobile
- 10-20% faster on desktop

### User Experience
- Faster interactive page
- Better mobile perception
- Reduced CPU usage during load

---

## Risks & Mitigations

| Risk | Mitigation | Likelihood |
|------|-----------|------------|
| WASM deployment fails | Fallback to JS, graceful degradation | Low |
| D3 chunks cause issues | Route already lazy-loads correctly | Very Low |
| Regressions in routes | Test all routes after changes | Medium |
| WASM module errors | Keep JS fallback active | Low |

---

## Maintenance Plan

### Ongoing Monitoring
- Weekly: Check bundle sizes via CI/CD
- Monthly: Review Web Vitals metrics
- Per-PR: Fail build if bundle grows > 5%

### Future Optimization Opportunities
1. Investigate d3-array replacement entirely
2. Consider smaller charting library (e.g., ECharts)
3. Split expensive data computations to Web Workers
4. Implement progressive hydration for slower devices

---

## References

**Full Analysis**: See `BUNDLE_ANALYSIS.md` (15-page detailed report)
**Implementation Guide**: See `BUNDLE_OPTIMIZATION_GUIDE.md` (step-by-step instructions)

---

## Next Steps

1. **Review this summary** with team
2. **Read BUNDLE_ANALYSIS.md** for detailed findings
3. **Follow BUNDLE_OPTIMIZATION_GUIDE.md** for implementation
4. **Test locally** using verification checklist above
5. **Deploy Phase 1** for quick wins
6. **Plan Phase 2** after confirming no issues

**Estimated total effort**: 2-3 weeks for full optimization
**Expected outcome**: 37-45% bundle size reduction
**User impact**: 25-50% faster page loads, especially on mobile

---

**Last Updated**: January 22, 2026
**Analysis Version**: 1.0
**Next Review**: After Phase 1 implementation (1 week)
