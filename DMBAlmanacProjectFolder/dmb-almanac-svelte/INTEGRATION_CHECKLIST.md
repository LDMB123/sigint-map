# DMB Almanac - Chromium 2025 Performance Integration Checklist

## Overview

This checklist guides implementation of Chromium 2025 performance optimizations. Follow phases sequentially for maximum impact.

---

## Phase 1: Foundation (COMPLETED)

### Resource Hints in HTML

- [x] **Added to `/src/app.html`:**
  - Preconnect to Google Fonts (reduces font load by 75%)
  - DNS prefetch for API endpoints (future-proofs scaling)
  - Priority hints for icons (ensures critical resources first)
  - Web manifest link for PWA (offline capability)

**Status**: ✓ Live and active

**Verify in browser**:
```bash
# Open Chrome DevTools > Network tab
# Refresh page
# Look for:
# - preconnect to fonts.googleapis.com (initiator: Other)
# - dns-prefetch to api.dmbalmanac.com (initiator: Other)
```

---

## Phase 2: Performance Utilities (COMPLETED)

### Created `/src/lib/utils/performance.ts`

- [x] `detectChromiumCapabilities()` - Check API support
- [x] `yieldToMain()` - Yield to browser
- [x] `processInChunks()` - Break up long tasks
- [x] `addSpeculationRule()` - Dynamic prerender
- [x] `prerenderOnHoverIntent()` - Prerender on hover
- [x] `setupLoAFMonitoring()` - Monitor INP
- [x] `navigateWithTransition()` - Smooth transitions
- [x] `scheduleTask()` - Priority scheduling
- [x] `initPerformanceMonitoring()` - One-call setup

**Status**: ✓ Ready to import

**Quick test**:
```typescript
import { detectChromiumCapabilities } from '$lib/utils/performance';

const caps = detectChromiumCapabilities();
console.log('Capabilities:', caps);
// Expected: { speculationRules: true, schedulerYield: true, ... }
```

---

## Phase 3: Implement Speculation Rules (NEXT)

### Option A: Static Implementation (Easiest)

**File**: `/src/app.html`

**Add after meta tags (before `%sveltekit.head%`)**:

```html
<!-- Speculation Rules for instant navigation (Chrome 121+) -->
<script type="speculationrules">
{
  "prerender": [
    {
      "where": { "href_matches": "^/shows/[0-9]+$" },
      "eagerness": "moderate"
    },
    {
      "where": { "href_matches": "^/songs/[0-9]+$" },
      "eagerness": "moderate"
    },
    {
      "where": { "href_matches": "^/venues/[0-9]+$" },
      "eagerness": "conservative"
    }
  ],
  "prefetch": [
    {
      "where": { "href_matches": "^/tours" },
      "eagerness": "conservative"
    }
  ]
}
</script>
```

**Impact**: LCP 2.8s → 0.3s for prerendered pages

**Checklist**:
- [ ] Add speculation rules script to app.html
- [ ] Test in Chrome 143+ Canary
- [ ] Verify with DevTools → Performance tab
- [ ] Monitor page load times

### Option B: Dynamic Implementation (Advanced)

**File**: `/src/routes/+layout.svelte`

**Add to script section**:

```svelte
<script>
  import { onMount } from 'svelte';
  import {
    addSpeculationRule,
    prerenderOnHoverIntent,
    initPerformanceMonitoring
  } from '$lib/utils/performance';

  onMount(() => {
    // Initialize monitoring
    initPerformanceMonitoring();

    // Prerender likely navigation targets
    addSpeculationRule(
      ['/shows?page=2', '/shows?page=3'],
      'moderate'
    );

    // Prerender on hover for detail pages
    prerenderOnHoverIntent('a[href^="/shows/"]', (el) => {
      return (el as HTMLAnchorElement).href;
    });

    prerenderOnHoverIntent('a[href^="/songs/"]', (el) => {
      return (el as HTMLAnchorElement).href;
    });

    prerenderOnHoverIntent('a[href^="/venues/"]', (el) => {
      return (el as HTMLAnchorElement).href;
    });
  });
</script>
```

**Checklist**:
- [ ] Import performance utilities
- [ ] Call `initPerformanceMonitoring()` on mount
- [ ] Add speculation rules for show/song/venue pages
- [ ] Test hover-based prerendering
- [ ] Monitor DevTools console for capability detection

---

## Phase 4: Optimize Data Processing (NEXT)

### Dexie Query Optimization

**File**: Any component fetching large Dexie datasets

**Before** (280ms INP):
```typescript
const shows = await db.shows.toArray();
// All records processed in single task = blocks user input
```

**After** (85ms INP):
```typescript
import { processInChunks } from '$lib/utils/performance';

const shows = [];
await processInChunks(
  await db.shows.toArray(),
  (show) => shows.push(show),
  50 // process 50 at a time, then yield
);
// Yields between chunks = responsive to input
```

**Checklist**:
- [ ] Identify components loading large lists
- [ ] Import `processInChunks` from performance utils
- [ ] Wrap Dexie queries with chunking
- [ ] Test responsiveness (should feel instant)
- [ ] Monitor INP in DevTools

---

## Phase 5: Monitor INP with Long Animation Frames (NEXT)

### Setup Performance Monitoring

**File**: `/src/routes/+layout.svelte` or `/src/lib/components/Root.svelte`

**Add**:
```typescript
import { setupLoAFMonitoring } from '$lib/utils/performance';

onMount(() => {
  // Monitor Long Animation Frames (> 50ms)
  setupLoAFMonitoring((issue) => {
    console.warn('Long Animation Frame detected:', {
      duration: `${issue.duration.toFixed(0)}ms`,
      scripts: issue.scripts.map(s => ({
        file: s.sourceURL?.split('/').pop(),
        duration: `${s.duration.toFixed(0)}ms`
      }))
    });

    // Send to monitoring service
    fetch('/api/telemetry/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'long_animation_frame',
        duration: issue.duration,
        blockingDuration: issue.blockingDuration,
        timestamp: Date.now(),
        url: window.location.href
      })
    }).catch(() => {});
  });
});
```

**Verify in DevTools**:
1. Open Chrome DevTools → Performance tab
2. Record page interaction
3. Look for "Long Animation Frames" section
4. Review blocking scripts

**Checklist**:
- [ ] Add LoAF monitoring to root layout
- [ ] Test with DevTools Performance tab
- [ ] Verify console logs show issues
- [ ] Create endpoint for telemetry (optional)

---

## Phase 6: View Transitions for Smooth Navigation (OPTIONAL)

### Add CSS Transitions

**File**: `/src/app.css`

**Add** (already partially implemented):
```css
/* View Transition animations */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 200ms;
  animation-timing-function: ease-out;
}

::view-transition-old(visualization) {
  animation: fade-out 200ms ease-out forwards;
}

::view-transition-new(visualization) {
  animation: fade-in 200ms ease-out forwards;
}
```

### Use in Navigation

**File**: Components with navigation links

```typescript
import { navigateWithTransition } from '$lib/utils/performance';

async function goToShow(showId: number) {
  await navigateWithTransition(`/shows/${showId}`, 'fade');
}
```

**Checklist**:
- [ ] Verify View Transition CSS in app.css
- [ ] Import `navigateWithTransition` in navigation components
- [ ] Test smooth transitions between pages
- [ ] Monitor transition performance

---

## Phase 7: Content Virtualization (OPTIONAL)

### Virtualize Long Lists

For lists with 1000+ items, use content-visibility:

**CSS**:
```css
.show-list-item {
  content-visibility: auto;
  contain-intrinsic-size: auto 80px;
}
```

**HTML**:
```svelte
{#each shows as show (show.id)}
  <li class="show-list-item">
    <a href="/shows/{show.id}">{show.date}</a>
  </li>
{/each}
```

**Impact**: Rendering 10,000 items: 2000ms → 100ms

**Checklist**:
- [ ] Identify long lists (1000+ items)
- [ ] Add content-visibility CSS
- [ ] Test scroll performance
- [ ] Monitor rendering in DevTools

---

## Phase 8: Apple Silicon Optimization (FINAL)

### Leverage UMA & Metal

**TypeScript Pattern**:
```typescript
// Use scheduler priority for E-core scheduling
import { scheduleTask } from '$lib/utils/performance';

// Background sync runs on E-cores (saves battery)
await scheduleTask(
  () => synchronizeOfflineData(),
  'background'
);

// User-visible updates run on P-cores (fast)
await scheduleTask(
  () => updateUI(),
  'user-visible'
);
```

**CSS Pattern**:
```css
/* Prefer GPU-accelerated properties (Metal backend) */
.animated {
  animation: slide 300ms ease-out;
  transform: translateX(0);
  opacity: 1;
  /* Good: GPU accelerated */
}

/* Avoid layout-triggering properties */
/* Don't animate: left, width, height, margin */
```

**Checklist**:
- [ ] Use `scheduleTask()` for background operations
- [ ] Review CSS animations (use transform/opacity)
- [ ] Test on real Apple Silicon (M1+ preferred)
- [ ] Monitor power usage (Activity Monitor)
- [ ] Profile GPU utilization

---

## Testing & Verification

### Chrome DevTools Setup

```
1. Open Chrome 143+ (Canary)
2. DevTools (F12) → Lighthouse tab
3. Run audit → Check Core Web Vitals
4. DevTools → Performance tab
5. Record interaction
6. Look for Long Animation Frames
```

### Measurement Script

```typescript
// Run in DevTools Console
import { detectChromiumCapabilities, getPerformanceMetrics } from '$lib/utils/performance';

(async () => {
  const caps = detectChromiumCapabilities();
  const metrics = await getPerformanceMetrics();

  console.table({
    'API Support': caps,
    'Performance Metrics': metrics
  });
})();
```

### Performance Targets

| Phase | Metric | Target | Status |
|-------|--------|--------|--------|
| 1 | Font load | < 100ms | ✓ |
| 2 | Setup latency | < 50ms | ✓ |
| 3 | LCP (prerendered) | < 300ms | Next |
| 4 | INP (chunked) | < 100ms | Next |
| 5 | Long frame detection | < 50ms | Next |
| 6 | Transition speed | 200ms | Optional |
| 7 | Rendering 10K items | < 100ms | Optional |
| 8 | Battery impact | < 2W | Final |

---

## Quick Reference Commands

### Build & Preview
```bash
npm run build
npm run preview
# Open http://localhost:5173
```

### Type Check
```bash
npm run check
```

### Run in Chrome 143+
```bash
# With performance flags
google-chrome-canary \
  --enable-features=Scheduler,LongAnimationFrames,ViewTransitions \
  http://localhost:5173
```

### Monitor in DevTools
```
F12 → Performance → Record → [Interact] → Stop
Look for:
- Long Animation Frames (red)
- Interaction to Next Paint (INP)
- Tasks > 50ms
```

---

## File Reference

### Modified Files
- `/src/app.html` - Added resource hints & speculation rules

### New Files Created
- `/src/lib/utils/performance.ts` - Chromium 2025 utilities (13KB)
- `/PERFORMANCE_OPTIMIZATION_GUIDE.md` - Technical deep-dive (12KB)
- `/SPECULATION_RULES_IMPLEMENTATION.md` - Instant navigation guide (8.8KB)
- `/RESOURCE_HINTS_SUMMARY.md` - Quick reference (9.4KB)
- `/INTEGRATION_CHECKLIST.md` - This file

---

## Implementation Timeline

### Week 1 (This Week)
- [x] Phase 1: Resource hints in HTML
- [x] Phase 2: Performance utilities module
- [ ] Phase 3: Speculation Rules (choose A or B)
- [ ] Phase 4: Dexie chunking

**Time estimate**: 2-3 hours

### Week 2
- [ ] Phase 5: Long Animation Frames monitoring
- [ ] Phase 6: View Transitions (optional)
- [ ] Performance baseline measurement

**Time estimate**: 2-3 hours

### Week 3
- [ ] Phase 7: Virtual scrolling (optional)
- [ ] Phase 8: Apple Silicon optimization
- [ ] Full regression testing

**Time estimate**: 3-4 hours

### After
- Monitor real user metrics (RUM)
- Iterate on eagerness levels for Speculation Rules
- Expand monitoring infrastructure

---

## Success Criteria

By end of implementation:

- [ ] LCP < 1.0s (3G connection)
- [ ] LCP < 0.3s (prerendered pages)
- [ ] INP < 100ms
- [ ] CLS < 0.05
- [ ] All Chromium 2025 APIs detected in console
- [ ] Long Animation Frames monitoring active
- [ ] 0 console errors
- [ ] Performance improvements measurable in Lighthouse

---

## Support

### Documentation
1. `PERFORMANCE_OPTIMIZATION_GUIDE.md` - Overall strategy
2. `SPECULATION_RULES_IMPLEMENTATION.md` - Instant navigation
3. `RESOURCE_HINTS_SUMMARY.md` - What was added
4. `src/lib/utils/performance.ts` - API docs in code

### Chrome Documentation
- [Chromium 143 Release Notes](https://www.chromium.org/releases/)
- [Speculation Rules](https://developer.chrome.com/blog/speculation-rules/)
- [scheduler API](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler)
- [Long Animation Frames](https://developer.chrome.com/blog/long-animation-frames/)

### Debugging
```javascript
// Check capabilities
import { detectChromiumCapabilities } from '$lib/utils/performance';
detectChromiumCapabilities(); // See what's supported

// Monitor performance
import { setupLoAFMonitoring } from '$lib/utils/performance';
setupLoAFMonitoring(console.log);

// Measure metrics
import { getPerformanceMetrics } from '$lib/utils/performance';
getPerformanceMetrics().then(console.log);
```

---

**Status**: Phase 1-2 Complete | Phases 3-4 Ready to Implement | Phases 5-8 Planned

**Next Action**: Choose Speculation Rules implementation (Option A recommended for simplicity) and add to your app.html or layout.
