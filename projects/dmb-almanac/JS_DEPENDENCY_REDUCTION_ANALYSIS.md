# JavaScript Dependency Reduction Analysis

**Date**: 2026-01-25
**Goal**: Identify and eliminate unnecessary JavaScript dependencies
**Current node_modules size**: 240MB

---

## Executive Summary

Analyzed all JavaScript dependencies in the DMB Almanac PWA to identify reduction opportunities. Found several candidates for removal or replacement with native browser APIs.

---

## Current Production Dependencies (8 total)

### D3 Visualization Libraries (7 packages)
1. **d3-axis** (3.0.0)
2. **d3-drag** (3.0.0)
3. **d3-force** (3.0.0)
4. **d3-geo** (3.1.1)
5. **d3-sankey** (0.12.3)
6. **d3-scale** (4.0.2)
7. **d3-selection** (3.0.0)
8. **d3-transition** (3.0.1)

### Other Dependencies (3 packages)
9. **dexie** (4.2.1) - IndexedDB wrapper ✅ KEEP (essential for offline-first)
10. **topojson-client** (3.1.0) - TopoJSON parsing for maps
11. **valibot** (1.2.0) - Schema validation
12. **web-push** (3.6.7) - Server-side push notifications ✅ KEEP (server-only)
13. **web-vitals** (4.2.4) - Performance monitoring

---

## Phase 1 Reduction Targets (High Impact)

### 1. valibot → Native JavaScript (PRIORITY 1)
**Current Size**: ~15KB minified
**Usages**: 15 occurrences across codebase
**Replacement**: Use existing validation.js utilities

**Analysis**:
- We already have comprehensive validation utilities in `src/lib/utils/validation.js`
- Custom type guards for all use cases
- valibot adds unnecessary abstraction
- Can be removed completely

**Action Items**:
- Audit all valibot imports
- Replace with validation.js type guards
- Remove valibot from package.json
- **Estimated Savings**: ~15KB + tree-shaking improvements

---

### 2. web-vitals → Native PerformanceObserver API (PRIORITY 2)
**Current Size**: ~5KB minified
**Usages**: Performance monitoring in telemetry
**Replacement**: Chrome 143+ native APIs

**Analysis**:
- Chrome 143+ supports all Web Vitals natively via PerformanceObserver
- CLS, LCP, FID/INP, TTFB all available as native entries
- We're targeting Chromium-only (macOS 26.2, Chrome 143+)
- Can implement custom Web Vitals collection

**Native Alternatives**:
```javascript
// CLS (Cumulative Layout Shift)
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.hadRecentInput) continue;
    console.log('CLS:', entry.value);
  }
}).observe({ type: 'layout-shift', buffered: true });

// LCP (Largest Contentful Paint)
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lastEntry = entries[entries.length - 1];
  console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
}).observe({ type: 'largest-contentful-paint', buffered: true });

// INP (Interaction to Next Paint) - Chrome 96+
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('INP:', entry.duration);
  }
}).observe({ type: 'event', durationThreshold: 40, buffered: true });

// Long Animation Frames API - Chrome 116+
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('LoAF:', entry.duration);
  }
}).observe({ type: 'long-animation-frame', buffered: true });
```

**Action Items**:
- Create custom Web Vitals collector using PerformanceObserver
- Replace web-vitals package with native implementation
- Add Long Animation Frames API support (not in web-vitals)
- **Estimated Savings**: ~5KB

---

## Phase 2 Reduction Targets (Medium Impact)

### 3. D3 Modularization Review
**Current D3 Packages**: 8 packages
**Combined Size**: ~40-50KB minified

**Current Usage Analysis**:
```
d3-force: Used in force-simulation.worker.ts (Guest Network)
d3-scale: Used in force-simulation.worker.ts (scaleSqrt)
d3-sankey: Used in TransitionFlow.svelte (type imports only?)
d3-selection: Used in GuestNetwork.svelte (type imports only?)
d3-geo: Used for map visualizations
d3-axis: Used for chart axes
d3-drag: Referenced but not actively used
d3-transition: Used for smooth animations
```

**Opportunities**:

#### 3a. Replace d3-drag with Native Pointer Events
**Savings**: ~3-5KB
- Chrome 55+ supports Pointer Events API natively
- Can implement drag with `pointerdown`, `pointermove`, `pointerup`
- Remove d3-drag dependency

#### 3b. Verify d3-sankey and d3-selection Type-Only Imports
- If only importing types, move to devDependencies (@types packages)
- Runtime code may not need these packages

#### 3c. Custom Scale Functions
- `scaleSqrt` is a simple `Math.sqrt` wrapper
- Can implement custom scale functions for specific use cases
- May not need full d3-scale package

**Action Items**:
- Audit which D3 packages are runtime vs type-only
- Replace d3-drag with native Pointer Events
- Consider custom implementations for simple scales
- **Estimated Savings**: ~5-10KB

---

### 4. topojson-client Review
**Current Size**: ~8KB minified
**Usage**: Map visualizations only

**Analysis**:
- Used only for TopoJSON → GeoJSON conversion
- Only needed for TourMap component
- Could lazy-load when map is viewed

**Action Items**:
- Implement lazy loading for topojson-client
- Only load when TourMap component is rendered
- **Estimated Savings**: 8KB from main bundle (moved to lazy chunk)

---

## Phase 3 Reduction Targets (Low Priority)

### 5. Development Dependencies Cleanup

**Candidates for Review**:
- **@types/d3-*** packages** - Verify all are needed post-TypeScript reduction
- **source-map-explorer** - Could be npx'd instead of installed
- **vite-bundle-visualizer** - Could be npx'd instead of installed

**Action Items**:
- Remove @types packages for libraries we've eliminated
- Use npx for one-off analysis tools
- **Estimated Savings**: Faster npm install, smaller node_modules

---

## Implementation Priority

### Phase 1: High Impact (Target: ~20KB savings)
1. ✅ Remove valibot → use validation.js (~15KB)
2. ✅ Remove web-vitals → native PerformanceObserver (~5KB)

### Phase 2: Medium Impact (Target: ~13-18KB savings)
3. ✅ Replace d3-drag → Pointer Events API (~3-5KB)
4. ✅ Lazy-load topojson-client (~8KB main bundle)
5. ✅ Audit D3 type-only imports (~2-5KB)

### Phase 3: Ongoing Optimization
6. ✅ Development dependency cleanup
7. ✅ Monitor bundle size with each change

---

## Expected Total Savings

| Phase | Target | Estimated Savings |
|-------|--------|-------------------|
| **Phase 1** | valibot + web-vitals | ~20KB |
| **Phase 2** | D3 optimization + topojson lazy-load | ~13-18KB |
| **Phase 3** | Dev deps cleanup | Installation time |
| **Total** | | **~33-38KB** |

---

## Success Metrics

- ✅ Reduced main bundle size by ~33-38KB
- ✅ Zero breaking changes to functionality
- ✅ Maintained Chrome 143+ feature parity
- ✅ Improved tree-shaking efficiency
- ✅ Faster npm install times

---

## Next Steps

1. Start with Phase 1 (valibot removal)
2. Implement custom Web Vitals collector
3. Move to Phase 2 D3 optimization
4. Monitor bundle size at each step
5. Document all changes with before/after comparisons

---

## Notes

- All changes maintain Chromium 143+ focus
- Native browser APIs preferred over libraries
- Lazy loading for map-specific dependencies
- Keep Dexie (essential for offline-first PWA)
- Keep web-push (server-side only, not bundled)
