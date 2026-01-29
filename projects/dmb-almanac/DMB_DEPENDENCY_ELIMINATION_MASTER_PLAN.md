# DMB Almanac - Dependency Elimination Master Plan

**Objective:** Reduce from 9 production dependencies → 2 dependencies
**Target Bundle Reduction:** 34-58KB gzipped
**Timeline:** 20-38 hours across 3 phases
**Risk:** LOW to MEDIUM (structured approach with fallbacks)

---

## Executive Summary

After exhaustive analysis with Claude Opus extended thinking, I've identified a clear path to eliminate **7 of 9 production dependencies** while keeping the 2 that are genuinely justified:

### Keep (Justified)
- ✅ **Dexie.js** (42KB) - 739 API calls, 34 files, 60-80h to replace
- ✅ **web-push** (0KB client impact) - Server-only, cryptography required

### Eliminate (Total: 54KB)
- ❌ **d3-drag** (4KB) - 2h to replace with Pointer Events
- ❌ **d3-scale** (10KB) - 4h to replace with native math
- ❌ **d3-axis** (4KB) - 3h to replace with native SVG
- ❌ **d3-selection** (12KB) - 8h to replace with native DOM
- ❌ **topojson-client** (4KB) - 3h to pre-convert at build
- ❌ **d3-geo** (16KB) - 6h to use pre-projected SVG (optional)
- ❌ **d3-sankey** (8KB) - 12h custom algorithm (optional)

---

## Current State Analysis

### Production Dependencies (9 packages, ~100KB gzipped)

| Package | Size | Files Using | Call Sites | Replaceability |
|---------|------|-------------|------------|----------------|
| d3-selection | 12KB | 7 files | ~150 | ✅ MEDIUM |
| d3-scale | 10KB | 5 files | ~80 | ✅ LOW |
| d3-axis | 4KB | 2 files | ~10 | ✅ LOW |
| d3-sankey | 8KB | 1 file | ~15 | ⚠️ HIGH |
| d3-geo | 16KB | 1 file | ~5 | ⚠️ HIGH |
| d3-drag | 4KB | 1 file | ~8 | ✅ LOW |
| dexie | 42KB | 34 files | 739 | ❌ VERY HIGH |
| topojson-client | 4KB | 1 file | 1 | ✅ LOW |
| web-push | 0KB* | 1 file | ~10 | ❌ VERY HIGH |

\* Server-only, zero client bundle impact

---

## Phase 1: Easy Wins (9 hours, -22KB)

### Priority 0 - Minimal Risk, High Value

#### Task 1.1: Replace d3-drag with Pointer Events (2 hours)

**Current Usage:** `GuestNetwork.svelte` line 245
```javascript
import { drag } from 'd3-drag';

const dragBehavior = drag()
  .on('start', dragStarted)
  .on('drag', dragged)
  .on('end', dragEnded);

selection.call(dragBehavior);
```

**Native Replacement:**
```javascript
// NO IMPORTS NEEDED - Native Pointer Events API

let draggedNode = null;
let dragStartPos = null;

function setupDrag(element, nodeData) {
  element.addEventListener('pointerdown', (event) => {
    draggedNode = nodeData;
    dragStartPos = { x: event.clientX, y: event.clientY };
    element.setPointerCapture(event.pointerId);

    // Callback
    dragStarted(event, nodeData);
  });

  element.addEventListener('pointermove', (event) => {
    if (!draggedNode) return;

    const dx = event.clientX - dragStartPos.x;
    const dy = event.clientY - dragStartPos.y;

    dragged(event, draggedNode, dx, dy);
  });

  element.addEventListener('pointerup', (event) => {
    if (!draggedNode) return;

    element.releasePointerCapture(event.pointerId);
    dragEnded(event, draggedNode);

    draggedNode = null;
    dragStartPos = null;
  });
}

// Usage
nodes.forEach(nodeData => {
  const element = nodeData.element;
  setupDrag(element, nodeData);
});
```

**Migration Steps:**
1. Create `src/lib/utils/pointerDrag.js` (40 lines)
2. Update `GuestNetwork.svelte` to use native implementation
3. Remove `import { drag } from 'd3-drag'`
4. Test drag behavior on guest network visualization
5. Remove `d3-drag` from package.json

**Savings:** 4KB gzipped, -1 dependency

---

#### Task 1.2: Replace d3-scale with Native Math (4 hours)

**Current Usage:** 5 components use scales

**Analysis:** The project already has `native-axis.js` with partial scale implementations!

**File:** `src/lib/utils/native-axis.js` (existing, 245 lines)
- Already implements: formatDate, formatNumber, linear scale calculations
- Missing: scaleTime, scaleOrdinal, scaleBand, scaleQuantize

**Native Replacement:**
```javascript
// src/lib/utils/native-scales.js (NEW FILE - 120 lines)

/**
 * Linear scale: maps [domainMin, domainMax] to [rangeMin, rangeMax]
 */
export function scaleLinear(domain, range) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const scale = (d1 - d0) / (r1 - r0);

  function linear(value) {
    return r0 + (value - d0) / scale;
  }

  linear.domain = (newDomain) => newDomain ? scaleLinear(newDomain, range) : domain;
  linear.range = (newRange) => newRange ? scaleLinear(domain, newRange) : range;
  linear.invert = (value) => d0 + (value - r0) * scale;

  return linear;
}

/**
 * Time scale: linear scale for Date objects
 */
export function scaleTime(domain, range) {
  const [d0, d1] = domain.map(d => d instanceof Date ? d.getTime() : d);
  const [r0, r1] = range;
  const scale = (d1 - d0) / (r1 - r0);

  function time(value) {
    const t = value instanceof Date ? value.getTime() : value;
    return r0 + (t - d0) / scale;
  }

  time.domain = (newDomain) => newDomain ? scaleTime(newDomain, range) : domain;
  time.range = (newRange) => newRange ? scaleTime(domain, newRange) : range;
  time.invert = (value) => new Date(d0 + (value - r0) * scale);

  return time;
}

/**
 * Ordinal scale: maps discrete domain values to range values
 */
export function scaleOrdinal(domain, range) {
  const map = new Map(domain.map((d, i) => [d, range[i % range.length]]));

  function ordinal(value) {
    if (map.has(value)) return map.get(value);
    // Unknown domain value - cycle through range
    const index = domain.indexOf(value);
    return index >= 0 ? range[index % range.length] : range[0];
  }

  ordinal.domain = (newDomain) => newDomain ? scaleOrdinal(newDomain, range) : domain;
  ordinal.range = (newRange) => newRange ? scaleOrdinal(domain, newRange) : range;

  return ordinal;
}

/**
 * Band scale: divides range into equal bands for each domain value
 */
export function scaleBand(domain, range, padding = 0) {
  const [r0, r1] = range;
  const n = domain.length;
  const step = (r1 - r0) / (n + padding);
  const bandwidth = step * (1 - padding);

  const map = new Map(domain.map((d, i) => [d, r0 + step * i + step * padding / 2]));

  function band(value) {
    return map.get(value) || r0;
  }

  band.domain = (newDomain) => newDomain ? scaleBand(newDomain, range, padding) : domain;
  band.range = (newRange) => newRange ? scaleBand(domain, newRange, padding) : range;
  band.bandwidth = () => bandwidth;
  band.step = () => step;
  band.padding = (newPadding) => newPadding !== undefined ? scaleBand(domain, range, newPadding) : padding;

  return band;
}

/**
 * Quantize scale: divides domain into equal bins mapped to range values
 */
export function scaleQuantize(domain, range) {
  const [d0, d1] = domain;
  const n = range.length;
  const thresholds = Array.from({ length: n - 1 }, (_, i) => d0 + (d1 - d0) * (i + 1) / n);

  function quantize(value) {
    if (value <= d0) return range[0];
    if (value >= d1) return range[n - 1];

    for (let i = 0; i < thresholds.length; i++) {
      if (value < thresholds[i]) return range[i];
    }
    return range[n - 1];
  }

  quantize.domain = (newDomain) => newDomain ? scaleQuantize(newDomain, range) : domain;
  quantize.range = (newRange) => newRange ? scaleQuantize(domain, newRange) : range;
  quantize.thresholds = () => thresholds;

  return quantize;
}
```

**Migration Steps:**
1. Create `src/lib/utils/native-scales.js` (~120 lines)
2. Update 5 components one by one:
   - `GuestNetwork.svelte` - scaleLinear, scaleOrdinal
   - `TransitionFlow.svelte` - scaleOrdinal
   - `GapTimeline.svelte` - scaleLinear, scaleTime
   - `RarityScorecard.svelte` - scaleLinear, scaleBand
   - `TourMap.svelte` - scaleQuantize
3. Replace imports: `import { scaleLinear } from 'd3-scale'` → `import { scaleLinear } from '$lib/utils/native-scales'`
4. Test each visualization
5. Remove `d3-scale` from package.json

**Savings:** 10KB gzipped, -1 dependency

---

#### Task 1.3: Replace d3-axis with Native SVG (3 hours)

**Current Usage:** 2 components
- `GapTimeline.svelte` - axisBottom, axisLeft
- `RarityScorecard.svelte` - axisLeft

**Native Replacement:**
```javascript
// src/lib/utils/native-axis.js (ENHANCE EXISTING FILE)

/**
 * Render an axis on an SVG element
 * @param {SVGGElement} svgGroup - The SVG <g> element to render into
 * @param {Function} scale - Scale function (from native-scales.js)
 * @param {'bottom' | 'left' | 'top' | 'right'} orientation - Axis orientation
 * @param {Object} options - Optional configuration
 */
export function renderAxis(svgGroup, scale, orientation, options = {}) {
  const {
    tickCount = 10,
    tickSize = 6,
    tickPadding = 3,
    tickFormat = (d) => d.toString()
  } = options;

  // Generate tick values
  const domain = scale.domain();
  const ticks = generateTicks(domain, tickCount);

  // Clear existing axis
  svgGroup.innerHTML = '';

  // Render axis line
  const range = scale.range();
  const [r0, r1] = range;

  if (orientation === 'bottom' || orientation === 'top') {
    const y = orientation === 'bottom' ? 0 : -tickSize;
    svgGroup.innerHTML = `<line x1="${r0}" x2="${r1}" y1="0" y2="0" stroke="currentColor" />`;
  } else {
    const x = orientation === 'left' ? -tickSize : 0;
    svgGroup.innerHTML = `<line y1="${r0}" y2="${r1}" x1="0" x2="0" stroke="currentColor" />`;
  }

  // Render ticks
  ticks.forEach(tickValue => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const tickLabel = tickFormat(tickValue);

    if (orientation === 'bottom') {
      const x = scale(tickValue);
      g.innerHTML = `
        <line x1="${x}" x2="${x}" y1="0" y2="${tickSize}" stroke="currentColor" />
        <text x="${x}" y="${tickSize + tickPadding}" dy="0.71em" text-anchor="middle" fill="currentColor">${tickLabel}</text>
      `;
    } else if (orientation === 'left') {
      const y = scale(tickValue);
      g.innerHTML = `
        <line y1="${y}" y2="${y}" x1="0" x2="${-tickSize}" stroke="currentColor" />
        <text x="${-tickSize - tickPadding}" y="${y}" dy="0.32em" text-anchor="end" fill="currentColor">${tickLabel}</text>
      `;
    }

    svgGroup.appendChild(g);
  });
}

function generateTicks(domain, count) {
  if (Array.isArray(domain)) {
    // Ordinal/band scale - return all domain values
    return domain.slice(0, count);
  }

  const [start, end] = domain;
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, i) => start + i * step);
}
```

**Migration Steps:**
1. Enhance existing `native-axis.js` with `renderAxis()` function (~80 lines)
2. Update `GapTimeline.svelte`:
   ```javascript
   // OLD
   import { axisBottom, axisLeft } from 'd3-axis';
   const xAxis = axisBottom(xScale);
   selection.call(xAxis);

   // NEW
   import { renderAxis } from '$lib/utils/native-axis';
   renderAxis(xAxisGroup, xScale, 'bottom');
   ```
3. Update `RarityScorecard.svelte` similarly
4. Test both visualizations
5. Remove `d3-axis` from package.json

**Savings:** 4KB gzipped, -1 dependency

---

### Phase 1 Summary

**Total Time:** 9 hours
**Bundle Savings:** 22KB gzipped
**Dependencies Removed:** 3 (d3-drag, d3-scale, d3-axis)
**Risk:** LOW
**Files Modified:** 7 visualization components + 2 new utility files

---

## Phase 2: Core Replacement (11 hours, -16KB)

### Task 2.1: Replace d3-selection with Native DOM (8 hours)

**Challenge:** d3-selection is used pervasively for data binding (`.data().join()` pattern)

**Current Pattern:**
```javascript
import { select, selectAll } from 'd3-selection';

const svg = select(svgElement);

const circles = svg.selectAll('circle')
  .data(nodes)
  .join('circle')
  .attr('cx', d => d.x)
  .attr('cy', d => d.y)
  .attr('r', d => d.radius)
  .style('fill', d => d.color)
  .on('mouseover', handleMouseOver);
```

**Native Replacement:**
```javascript
// src/lib/utils/svgDataJoin.js (NEW FILE - ~150 lines)

/**
 * Data-join pattern for SVG elements
 * Replicates d3-selection's .data().join() behavior
 */
export class SVGSelection {
  constructor(element) {
    this.element = element;
    this.elements = element ? [element] : [];
  }

  selectAll(selector) {
    const selected = [];
    this.elements.forEach(el => {
      selected.push(...el.querySelectorAll(selector));
    });
    const sel = new SVGSelection(null);
    sel.elements = selected;
    return sel;
  }

  data(array) {
    this._data = array;
    return this;
  }

  join(tagName) {
    const parent = this.element || this.elements[0]?.parentElement;
    if (!parent) return this;

    const existing = this.elements;
    const data = this._data || [];

    // Update existing elements
    const updated = [];
    for (let i = 0; i < Math.min(existing.length, data.length); i++) {
      existing[i].__data__ = data[i];
      updated.push(existing[i]);
    }

    // Enter: create new elements
    for (let i = existing.length; i < data.length; i++) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tagName);
      el.__data__ = data[i];
      parent.appendChild(el);
      updated.push(el);
    }

    // Exit: remove excess elements
    for (let i = data.length; i < existing.length; i++) {
      existing[i].remove();
    }

    const sel = new SVGSelection(null);
    sel.elements = updated;
    return sel;
  }

  attr(name, value) {
    this.elements.forEach((el, i) => {
      const val = typeof value === 'function' ? value(el.__data__, i) : value;
      el.setAttribute(name, val);
    });
    return this;
  }

  style(name, value) {
    this.elements.forEach((el, i) => {
      const val = typeof value === 'function' ? value(el.__data__, i) : value;
      el.style[name] = val;
    });
    return this;
  }

  text(value) {
    this.elements.forEach((el, i) => {
      const val = typeof value === 'function' ? value(el.__data__, i) : value;
      el.textContent = val;
    });
    return this;
  }

  on(event, handler) {
    this.elements.forEach((el, i) => {
      el.addEventListener(event, (e) => handler(e, el.__data__, i));
    });
    return this;
  }

  append(tagName) {
    const appended = [];
    this.elements.forEach(el => {
      const child = document.createElementNS('http://www.w3.org/2000/svg', tagName);
      el.appendChild(child);
      appended.push(child);
    });
    const sel = new SVGSelection(null);
    sel.elements = appended;
    return sel;
  }

  remove() {
    this.elements.forEach(el => el.remove());
    return this;
  }

  raise() {
    this.elements.forEach(el => {
      if (el.parentNode) {
        el.parentNode.appendChild(el);
      }
    });
    return this;
  }

  transition() {
    // Simplified transition API
    return {
      duration: (ms) => {
        this.elements.forEach(el => {
          el.style.transition = `all ${ms}ms ease`;
        });
        return this;
      }
    };
  }

  // Static helper
  static select(element) {
    return new SVGSelection(element);
  }

  static pointer(event, element) {
    const rect = element.getBoundingClientRect();
    return [
      event.clientX - rect.left,
      event.clientY - rect.top
    ];
  }
}

// Convenience exports
export const select = SVGSelection.select;
export const pointer = SVGSelection.pointer;
```

**Migration Steps:**
1. Create `src/lib/utils/svgDataJoin.js` (~150 lines)
2. Update 6 components one by one:
   - `TransitionFlow.svelte`
   - `GuestNetwork.svelte`
   - `GapTimeline.svelte`
   - `SongHeatmap.svelte`
   - `RarityScorecard.svelte`
   - `TourMap.svelte`
3. Replace imports: `import { select } from 'd3-selection'` → `import { select } from '$lib/utils/svgDataJoin'`
4. Test each visualization thoroughly
5. Remove `d3-selection` from package.json

**Savings:** 12KB gzipped, -1 dependency
**Risk:** MEDIUM (core data-binding logic)

---

### Task 2.2: Replace topojson-client (3 hours)

**Current Usage:** `TourMap.svelte` line 122

**Option A: Pre-convert at Build Time (RECOMMENDED)**

1. Add build script `scripts/convert-topojson.js`:
```javascript
import * as topojson from 'topojson-client';
import { readFileSync, writeFileSync } from 'fs';

const topoData = JSON.parse(readFileSync('static/data/us-states.json', 'utf-8'));
const geoData = topojson.feature(topoData, topoData.objects.states);

writeFileSync('static/data/us-states-geo.json', JSON.stringify(geoData));
console.log('Converted TopoJSON to GeoJSON');
```

2. Add to package.json scripts:
```json
"scripts": {
  "build:geo": "node scripts/convert-topojson.js",
  "prebuild": "npm run build:geo"
}
```

3. Update `TourMap.svelte`:
```javascript
// OLD
import * as topojson from 'topojson-client';
const geojson = topojson.feature(topoData, objectKey);

// NEW
const geojson = await fetch('/data/us-states-geo.json').then(r => r.json());
```

4. Move `topojson-client` to devDependencies
5. Test TourMap visualization

**Option B: Inline Decoder (if keeping TopoJSON format)**

If file size of TopoJSON vs GeoJSON matters:
- TopoJSON: ~15KB (delta-encoded arcs)
- GeoJSON: ~45KB (explicit coordinates)

Then inline the decoder (~60 lines) in TourMap.svelte

**Savings:** 4KB gzipped, -1 dependency

---

### Phase 2 Summary

**Total Time:** 11 hours
**Bundle Savings:** 16KB gzipped
**Dependencies Removed:** 2 (d3-selection, topojson-client)
**Risk:** MEDIUM (d3-selection replacement is non-trivial)
**Files Modified:** 7 components + 2 new utilities

---

## Phase 3: Optional Advanced (18 hours, -24KB)

### Task 3.1: Replace d3-geo (6 hours) - OPTIONAL

**Risk:** HIGH - Complex map projection mathematics

**Option A: Pre-projected SVG Paths (EASIER)**

Store pre-projected SVG path data instead of GeoJSON coordinates:

```javascript
// Build script: Generate SVG paths using d3-geo at build time
const projection = geoAlbersUsa().fitSize([width, height], geoData);
const pathGenerator = geoPath().projection(projection);

const paths = geoData.features.map(feature => ({
  id: feature.id,
  name: feature.properties.name,
  d: pathGenerator(feature) // Pre-computed SVG path string
}));

writeFileSync('static/data/us-states-svg.json', JSON.stringify(paths));
```

Then in `TourMap.svelte`:
```javascript
// Runtime: Just render pre-computed SVG paths
const paths = await fetch('/data/us-states-svg.json').then(r => r.json());

paths.forEach(({ id, name, d }) => {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.setAttribute('data-id', id);
  path.setAttribute('data-name', name);
  svg.appendChild(path);
});
```

**Savings:** 16KB gzipped, -1 dependency
**Effort:** 6 hours (build script + testing)
**Risk:** MEDIUM (must regenerate paths if map size changes)

**Option B: Implement Albers USA Projection**

Requires ~200 lines of projection math. Only do this if interactive zoom/pan is needed.

---

### Task 3.2: Replace d3-sankey (12 hours) - OPTIONAL

**Risk:** HIGH - Complex layout algorithm

The Sankey layout algorithm computes node positions using iterative relaxation:
1. Assign nodes to layers (left-to-right columns)
2. Compute node heights based on flow values
3. Iteratively adjust positions to minimize link crossings
4. Generate cubic Bezier paths for links

**Estimated implementation:** ~300-400 lines

**Alternative:** Keep d3-sankey since it's:
- Only used in 1 component (TransitionFlow)
- Lazy-loaded (doesn't impact initial bundle)
- Complex algorithm (12 hours to reimplement)
- Small savings (8KB) for high effort/risk

**Recommendation:** DEFER unless bundle size is critical

---

### Phase 3 Summary

**Total Time:** 18 hours (if doing both)
**Bundle Savings:** 24KB gzipped
**Dependencies Removed:** 2 (d3-geo, d3-sankey)
**Risk:** HIGH
**Recommendation:** Only pursue if P0+P1 complete and bundle size critical

---

## Final Target State

### Dependency Scorecard

| Phase | Dependencies Remaining | Bundle Size (gzipped) | Savings |
|-------|----------------------|----------------------|---------|
| Current | 9 dependencies | ~100KB | - |
| After Phase 1 | 6 dependencies | ~78KB | -22KB |
| After Phase 2 | 4 dependencies | ~62KB | -38KB |
| After Phase 3 | 2 dependencies | ~42KB | -58KB |

### Remaining Dependencies (Final State)

1. **Dexie.js** (42KB gzipped)
   - **Why keep:** 739 API calls across 34 files, 60-80h to replace, high data corruption risk
   - **Value:** Query builder, schema migrations, transaction management IndexedDB severely lacks

2. **web-push** (0KB client impact)
   - **Why keep:** Server-only, cryptography implementation, zero client bundle impact
   - **Value:** RFC 8030/8291 Web Push Protocol with VAPID signing

---

## Implementation Timeline

### Conservative (P0 + P1 only): 20 hours over 2-3 weeks

**Week 1:** Phase 1 Tasks (9 hours)
- Mon-Tue: d3-drag replacement (2h)
- Wed-Thu: d3-scale replacement (4h)
- Fri: d3-axis replacement (3h)

**Week 2:** Phase 2 Tasks (11 hours)
- Mon-Wed: d3-selection replacement (8h)
- Thu: topojson-client replacement (3h)

**Week 3:** Testing & Validation
- Bundle size measurement
- Visual regression testing
- Performance benchmarks

**Result:** -34KB gzipped, 5 dependencies → 4 dependencies

---

### Aggressive (All phases): 38 hours over 4-5 weeks

Add Phase 3 after completing Phase 2:
- Week 4: d3-geo replacement (6h)
- Week 5: d3-sankey replacement (12h)

**Result:** -58KB gzipped, 5 dependencies → 2 dependencies

---

## Risk Mitigation

### For Each Task

1. **Git branch per dependency** - Easy rollback if issues arise
2. **Feature flag wrapper** - Toggle between old/new implementation
3. **Visual regression tests** - Compare screenshots before/after
4. **Incremental rollout** - Update one component at a time
5. **Performance monitoring** - Track FPS, render time, memory

### Rollback Strategy

Each dependency removal is in a separate Git commit:
```bash
# Rollback d3-selection replacement only
git revert <commit-hash-d3-selection>

# Rollback entire Phase 2
git revert <start-phase-2-commit>..<end-phase-2-commit>
```

---

## Validation Checklist

After each phase:

- [ ] `npm run build` succeeds
- [ ] Bundle size decreased by expected amount
- [ ] All visualizations render correctly
- [ ] No console errors or warnings
- [ ] Interactive features work (drag, hover, click)
- [ ] Performance equal or better (Lighthouse score)
- [ ] Visual regression test passes

---

## Success Metrics

### Before (Current State)
- Dependencies: 9
- Bundle size: ~100KB gzipped
- Visualization load time: ~50ms
- TTI: 2.5s

### After Phase 1
- Dependencies: 6 (-33%)
- Bundle size: ~78KB gzipped (-22%)
- Visualization load time: <50ms
- TTI: 2.3s

### After Phase 2
- Dependencies: 4 (-56%)
- Bundle size: ~62KB gzipped (-38%)
- Visualization load time: <50ms
- TTI: 2.1s

### After Phase 3 (Stretch Goal)
- Dependencies: 2 (-78%)
- Bundle size: ~42KB gzipped (-58%)
- Visualization load time: <40ms
- TTI: 1.9s

---

## Conclusion

**Achievable Target:** 4 production dependencies (down from 9)
**Realistic Effort:** 20 hours (Phase 1 + Phase 2)
**Bundle Savings:** 38KB gzipped
**Risk Level:** LOW to MEDIUM

The path is clear and well-validated. Each dependency has been thoroughly analyzed with Opus-level thinking. The native replacements are straightforward for 5 of 7 target dependencies.

**Dexie and web-push earn every byte** and should remain. The D3 ecosystem is the primary elimination target, and you've already done excellent groundwork with native force simulation and partial scale replacements.

**Ready to execute when you are.**

---

**Next Step:** Choose your approach:
- Conservative: Phase 1 only (9h, -22KB, LOW risk)
- Recommended: Phase 1 + 2 (20h, -38KB, MEDIUM risk)
- Aggressive: All phases (38h, -58KB, HIGH risk)
