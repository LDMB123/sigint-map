# D3 Visualization Audit - Quick Reference Card

**Audit Date:** 2026-01-22 | **Grade:** A- (91/100) | **Status:** Complete

---

## Critical Issues (Fix First)

### 1. TourMap Type Error
```
File: src/lib/components/visualizations/TourMap.svelte
Line: 57-62
Fix: Remove [9] index - just use schemeBlues not schemeBlues[9]
Effort: 5 min
```

### 2. GuestNetwork Main Thread Blocking
```
File: src/lib/components/visualizations/GuestNetwork.svelte
Issue: Force simulation runs on main thread
Fix: Integrate with force-simulation.worker.ts
Effort: 2 hours
Impact: 60 FPS responsiveness
```

### 3. SVG Clearing Inefficiency
```
Files: TransitionFlow, TourMap, GuestNetwork
Fix: Use layered groups instead of selectAll('*').remove()
Effort: 1 hour
Impact: 15-25% faster re-renders
```

---

## Performance Issues

| Issue | Location | Effort | Impact |
|-------|----------|--------|--------|
| Data transforms on resize | GapTimeline, SongHeatmap | 1.5h | 30-40% faster |
| Lazy-load d3-geo | TourMap | 2h | -37KB bundle |
| Duplicate d3-array | All components | 30m | -2KB bundle |
| No keyboard navigation | All interactive | 2h | WCAG AA compliance |
| No canvas fallback | GuestNetwork | 2h | Better perf for 500+ |

---

## Files to Modify

```
Priority 1 (Critical):
✓ src/lib/components/visualizations/TourMap.svelte
✓ src/lib/components/visualizations/GuestNetwork.svelte
✓ src/lib/components/visualizations/TransitionFlow.svelte

Priority 2 (Performance):
✓ src/lib/components/visualizations/GapTimeline.svelte
✓ src/lib/components/visualizations/SongHeatmap.svelte
✓ src/lib/components/visualizations/RarityScorecard.svelte

New Files to Create:
✓ src/lib/utils/d3-helpers.ts (consolidate utilities)
✓ src/lib/utils/d3-color-schemes.ts (centralize colors)
```

---

## Code Patterns to Implement

### Pattern 1: Efficient SVG Clearing
```typescript
// Before (slow)
select(svgElement).selectAll('*').remove();

// After (fast)
svg.select('g.links-layer').selectAll('*').remove();
svg.select('g.nodes-layer').selectAll('*').remove();
```

### Pattern 2: Data Memoization
```typescript
// Before
const renderChart = () => {
  const parsedData = data.map(d => ({ ...d, date: new Date(d.date) }));
};

// After
let parsedData = $derived(
  data.map(d => ({ ...d, date: new Date(d.date) }))
);
```

### Pattern 3: Worker Integration
```typescript
// Create worker
workerRef = new Worker(
  new URL('$lib/workers/force-simulation.worker.ts', import.meta.url),
  { type: 'module' }
);

// Send data
workerRef.postMessage({ type: 'init', data: { nodes, links, width, height } });

// Listen for updates
workerRef.onmessage = (event) => {
  if (event.data.type === 'tick') {
    // Update DOM from worker results
  }
};
```

### Pattern 4: Lazy Loading
```typescript
const loadGeoModules = async () => {
  const [geoModule, topoModule] = await Promise.all([
    import('d3-geo'),
    import('topojson-client')
  ]);
  // Use modules...
};

onMount(loadGeoModules);
```

---

## Bundle Impact

```
Current D3 Bundle: 171KB
After Optimizations:
  - Lazy-load d3-geo + topojson: -37KB
  - Consolidate d3-array: -2KB
  - Total saved: 39KB (23% reduction)

Target: < 150KB
```

---

## Performance Targets

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Render Time | 8-25ms | <16ms | 75% met |
| FPS | 45-60 | 60 | GuestNetwork needs work |
| Memory | 1-3.5MB | <3MB | Good |
| Bundle | 171KB | <150KB | -39KB possible |

---

## Apple Silicon Optimizations

Add to CSS for GPU compositing:
```css
will-change: transform, opacity;
transform: translateZ(0);
```

Use worker threads for force simulation (8+ cores available).

---

## Accessibility Checklist

- [ ] Fix TourMap color scheme
- [ ] Add keyboard navigation (arrow keys, Enter, Home, End)
- [ ] Tab focus management (tabindex)
- [ ] aria-pressed for selected states
- [ ] Data table alternatives (sr-only)
- [ ] ARIA descriptions (aria-describedby)
- [ ] Test with NVDA/JAWS

---

## Testing Checklist

```typescript
// Performance
[ ] Render time < 16ms (Chrome DevTools)
[ ] FPS = 60 (Lighthouse)
[ ] No memory leaks (DevTools Memory tab)

// Responsiveness
[ ] Resize smooth (no jank)
[ ] Drag smooth (force simulation)
[ ] Keyboard smooth (arrow keys work)

// Accessibility
[ ] Keyboard navigation works
[ ] Screen reader announces labels
[ ] WCAG 2.1 AA compliant

// Bundle
[ ] TourMap lazy-loads
[ ] No duplicate d3 code
[ ] < 150KB total D3 code
```

---

## Implementation Timeline

```
Week 1 (15 hours): Critical fixes + performance
  - Fix TourMap type error (5m)
  - Implement SVG layering (1h)
  - Add keyboard nav to 2 components (1h)
  - Integrate GuestNetwork worker (2h)
  - Test & benchmark (2h)
  - Consolidate utilities (0.5h)

Week 2 (12 hours): More optimization
  - Memoization with $derived (1.5h)
  - Lazy-load TourMap (2h)
  - Dynamic debounce (1.5h)
  - Benchmarking (2h)

Week 3 (8+ hours): Polish
  - Canvas fallback (2h)
  - Full keyboard nav (2h)
  - Accessibility tables (3h)
```

---

## Success Metrics

After implementation, measure:

**Performance:**
- Render time: < 16ms (60 FPS)
- Main thread responsiveness: < 100ms
- Memory: Stable (no leaks)

**Bundle:**
- D3 code: < 150KB (from 171KB)
- TourMap: Lazy-loaded
- d3-array: Consolidated

**Accessibility:**
- Keyboard navigation: 100% of interactive elements
- ARIA: Complete labeling
- WCAG: 2.1 Level AA compliant

---

## Documents

1. **D3_VISUALIZATION_AUDIT.md** - Full 700+ line audit with detailed analysis
2. **OPTIMIZATION_GUIDE.md** - Step-by-step implementation code examples
3. **VISUALIZATION_AUDIT_SUMMARY.md** - Executive summary
4. **QUICK_REFERENCE.md** - This cheat sheet

---

## Key Files Reference

```
Visualizations:
  src/lib/components/visualizations/TransitionFlow.svelte
  src/lib/components/visualizations/TourMap.svelte (HAS BUG)
  src/lib/components/visualizations/GuestNetwork.svelte (NEEDS WORKER)
  src/lib/components/visualizations/GapTimeline.svelte
  src/lib/components/visualizations/SongHeatmap.svelte
  src/lib/components/visualizations/RarityScorecard.svelte

Workers:
  src/lib/workers/force-simulation.worker.ts (GOOD - NOT USED)

Types:
  src/lib/types/visualizations.ts

Utils (to create):
  src/lib/utils/d3-helpers.ts
  src/lib/utils/d3-color-schemes.ts
```

---

**Report Generated:** 2026-01-22
**Auditor:** Senior D3 Visualization Engineer
**Next Step:** Start with TourMap type error fix
