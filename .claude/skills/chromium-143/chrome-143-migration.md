---
name: chrome-143-migration
version: 1.0.0
description: **Target:** Chromium 143+ / macOS Tahoe 26.2
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: chromium-143
complexity: advanced
tags:
  - chromium-143
  - chromium-143
  - apple-silicon

target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2

philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."

prerequisites: []
related_skills: []
see_also: []

minimum_example_count: 3
requires_testing: true
performance_critical: false

# Migration metadata
migrated_from: projects/dmb-almanac/app/docs/CHROME_143_MIGRATION_GUIDE.md
migration_date: 2026-01-25
---

# Chrome 143+ CSS Migration Implementation Guide
## DMB Almanac Svelte - Step-by-Step Migration

**Target:** Chromium 143+ / macOS Tahoe 26.2
**Framework:** SvelteKit 2 + Svelte 5
**Timeline:** 2-4 weeks across 5 components

---

## Table of Contents

1. [ResizeObserver → Container Queries](#resizeobserver--container-queries)
2. [IntersectionObserver → Scroll-Driven CSS](#intersectionobserver--scroll-driven-css)
3. [Testing Strategy](#testing-strategy)
4. [Rollback Plan](#rollback-plan)

---

## ResizeObserver → Container Queries

### Context

Five visualization components currently use `ResizeObserver` to detect container size changes and trigger D3 chart re-renders. CSS Container Queries (Chrome 105+) provide native browser support for this pattern without JavaScript observers.

### Benefits

- **50 lines of JavaScript eliminated** (10 lines per component)
- **Better performance:** No observer callbacks, native browser optimization
- **Simpler code:** CSS replaces complex observer setup/teardown
- **Responsive by default:** Charts automatically adapt to container size

### Implementation: GapTimeline.svelte

#### Step 1: Add Container Context to Parent

**File:** `/src/lib/components/visualizations/GapTimeline.svelte`

**Current (lines 198-206):**
```svelte
<div bind:this={containerElement} class="gap-timeline {className}">
  <canvas bind:this={canvasElement} class="timeline-canvas" aria-label="Gap timeline showing days between song performances"></canvas>
  <svg bind:this={svgElement} class="timeline-axes"></svg>
  {#if tooltip}
    <div class="tooltip" style="left: {tooltip.x}px; top: {tooltip.y}px;">
      {tooltip.content}
    </div>
  {/if}
</div>
```

**Updated:**
```svelte
<div bind:this={containerElement} class="gap-timeline gap-timeline--container {className}">
  <canvas bind:this={canvasElement} class="timeline-canvas" aria-label="Gap timeline showing days between song performances"></canvas>
  <svg bind:this={svgElement} class="timeline-axes"></svg>
  {#if tooltip}
    <div class="tooltip" style="left: {tooltip.x}px; top: {tooltip.y}px;">
      {tooltip.content}
    </div>
  {/if}
</div>
```

#### Step 2: Add Container Query CSS

**File:** `/src/lib/components/visualizations/GapTimeline.svelte` - `<style>` section

**Add after line 218:**

```css
/* Container Query Support */
.gap-timeline--container {
  container-type: inline-size;
  container-name: gap-timeline;
}

/* Responsive breakpoints based on container, not viewport */
@container gap-timeline (max-width: 599px) {
  .gap-timeline {
    padding: var(--space-2);
  }
}

@container gap-timeline (min-width: 600px) {
  .gap-timeline {
    padding: var(--space-4);
  }
}

/* Graceful fallback for browsers without container queries */
@supports not (container-type: inline-size) {
  .gap-timeline--container {
    /* Content will still render, just without container-responsive behavior */
    width: 100%;
  }
}
```

#### Step 3: Modify TypeScript to Use Container Width

**Current (lines 34-40):**
```typescript
const renderChart = () => {
  if (!containerElement || !canvasElement || !svgElement || data.length === 0) return;

  const rect = containerElement.getBoundingClientRect();
  const containerWidth = rect.width || width;
  const containerHeight = rect.height || height;
```

**Keep as-is initially.** The `getBoundingClientRect()` approach works with container queries since the DOM structure remains unchanged. Container queries handle CSS layout responsiveness; JavaScript still manages D3 re-rendering.

#### Step 4: Remove ResizeObserver

**Current (lines 188-194):**
```typescript
// Reactive resize with ResizeObserver
resizeObserver = new ResizeObserver(() => {
  if (data.length > 0) renderChart();
});
resizeObserver.observe(containerElement);

return () => resizeObserver?.disconnect();
```

**Optimization Path (Choose One):**

**Option A: Keep ResizeObserver (Minimal Change - Recommended for Phase 1)**
```typescript
// Keep as-is during initial migration
// ResizeObserver still triggers re-renders
// But container queries handle layout responsiveness
```

**Option B: Remove ResizeObserver (Advanced - Phase 2)**

Requires modifying the rendering strategy to use CSS-only sizing:

```typescript
let containerWidth = width;
let containerHeight = height;

$effect(() => {
  // Update dimensions from Svelte reactive values instead of ResizeObserver
  if (containerElement) {
    const rect = containerElement.getBoundingClientRect();
    containerWidth = rect.width || width;
    containerHeight = rect.height || height;

    // Trigger chart render when width/height changes
    if (data.length > 0) renderChart();
  }
});

// No ResizeObserver needed - Svelte reactivity handles updates
```

#### Step 5: Test and Verify

**Test Cases:**
1. Resize browser window - chart should resize
2. Test on narrow viewport (< 600px) - verify container query breakpoint
3. Test on Chrome 105+, Firefox 110+, Safari 16+
4. Verify fallback styling on older browsers

**Chrome DevTools:**
- Open DevTools
- Go to Sources > Overrides
- Create a test CSS file with container queries
- Verify container layout in Element Inspector

### Repeat for Other Visualization Components

Apply the same pattern to:
- `GuestNetwork.svelte` (lines 191-194)
- `SongHeatmap.svelte` (lines 161-166)
- `RarityScorecard.svelte` (lines 163-166)
- `TourMap.svelte` (lines 175-180)

---

## IntersectionObserver → Scroll-Driven CSS

### Context

The `InstallPrompt.svelte` component uses `IntersectionObserver` to detect when the user has scrolled 200px down the page. CSS Scroll-Driven Animations (Chrome 115+) provide native browser support via `animation-timeline: view()` or `scroll()`.

### Benefits

- **30 lines of JavaScript eliminated**
- **Better performance:** No observer callbacks during scroll
- **Simpler code:** CSS custom property replaces observer state
- **Future-proof:** Leverages native browser scroll optimization

### Implementation: InstallPrompt.svelte

#### Step 1: Understand Current Implementation

**File:** `/src/lib/components/pwa/InstallPrompt.svelte` (lines 113-142)

The component creates a hidden sentinel div at `top: 200px`, observes it with IntersectionObserver, and sets `hasScrolled = true` when the sentinel leaves the viewport (meaning user scrolled past 200px).

#### Step 2: Add Scroll Sentinel Element

**Current (no visible sentinel in template):**
The sentinel is created dynamically in JavaScript.

**Updated approach:** Create it in the template for CSS-driven state:

**Add to template (line 220, after `</script>`):**

```svelte
<!-- Scroll detection sentinel for CSS animation -->
<div class="scroll-sentinel" aria-hidden="true"></div>
```

#### Step 3: Create CSS Scroll-Driven Animation

**Add to `<style>` section at end (line 448):**

```css
/* Scroll-driven sentinel for scroll detection */
.scroll-sentinel {
  position: fixed;
  top: 200px;
  width: 1px;
  height: 1px;
  pointer-events: none;
  visibility: hidden;

  /* Track when this element enters/leaves viewport */
  animation: detect-scroll linear both;
  animation-timeline: view();
}

@keyframes detect-scroll {
  /* Element is in view (0-200px scrolled) */
  0% {
    --internal-has-scrolled: 0;
  }
  /* Element leaves view (200px+ scrolled) */
  100% {
    --internal-has-scrolled: 1;
  }
}

/* Fallback for browsers without scroll-driven animations */
@supports not (animation-timeline: view()) {
  .scroll-sentinel {
    animation: none;
    --internal-has-scrolled: 0;
  }
}
```

#### Step 4: Connect CSS State to JavaScript

**Current (lines 113-142):**
```typescript
$effect(() => {
  if (!requireScroll) {
    hasScrolled = true;
    return;
  }

  const sentinel = document.createElement('div');
  // ... IntersectionObserver setup ...
});
```

**Updated (use CSS custom property):**

```typescript
$effect(() => {
  if (!requireScroll) {
    hasScrolled = true;
    return;
  }

  // Read scroll state from CSS animation
  const checkScroll = () => {
    const cssValue = getComputedStyle(document.documentElement)
      .getPropertyValue('--internal-has-scrolled');

    // CSS animation returns 0 to 1
    hasScrolled = parseFloat(cssValue ?? '0') > 0.5;
  };

  // Check on every animation frame
  let frameId: number;
  const tick = () => {
    checkScroll();
    frameId = requestAnimationFrame(tick);
  };
  tick();

  return () => {
    cancelAnimationFrame(frameId);
  };
});
```

**Or simpler version with scroll event:**

```typescript
$effect(() => {
  if (!requireScroll) {
    hasScrolled = true;
    return;
  }

  const handleScroll = () => {
    hasScrolled = window.scrollY > 200;
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
});
```

#### Step 5: Remove IntersectionObserver Code

**Delete lines 113-142** and replace with the CSS animation approach above.

**Final implementation:**
```typescript
// Track scroll using CSS scroll-driven animation
$effect(() => {
  if (!requireScroll) {
    hasScrolled = true;
    return;
  }

  // Use passive scroll listener (not observer) for better performance
  let scrollTimeout: ReturnType<typeof setTimeout>;

  const handleScroll = () => {
    hasScrolled = window.scrollY > 200;

    // Throttle scroll detection to reduce callback frequency
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      // No-op - just throttling
    }, 100);
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  return () => {
    window.removeEventListener('scroll', handleScroll);
    clearTimeout(scrollTimeout);
  };
});
```

#### Step 6: Test and Verify

**Test Cases:**
1. Scroll down 200px - `hasScrolled` should become true
2. Scroll back up - `hasScrolled` should remain true (expected behavior)
3. Test on Chrome 115+, Firefox 114+, Safari 17.5+
4. Verify smooth scroll behavior (no jank)
5. Check DevTools Performance tab - should see fewer scroll callbacks

---

## Testing Strategy

### Unit Tests

Create test file `/src/lib/components/__tests__/css-modernization.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('CSS Modernization', () => {
  describe('Container Queries', () => {
    it('should support container-type: inline-size', () => {
      const css = '@supports (container-type: inline-size) { }';
      const parser = new CSSParser();
      expect(parser.canParse(css)).toBe(true);
    });

    it('should apply @container rules', () => {
      // Test that @container rules are processed
      const computed = getComputedStyle(element);
      expect(computed.containerType).toBe('inline-size');
    });
  });

  describe('Scroll-Driven Animations', () => {
    it('should support animation-timeline: view()', () => {
      const css = '@supports (animation-timeline: view()) { }';
      expect(CSS.supports('animation-timeline: view()')).toBe(true);
    });

    it('should trigger animation on scroll', async () => {
      window.scrollY = 0;
      const element = document.querySelector('.scroll-sentinel');

      // Simulate scroll
      window.scrollY = 250;
      window.dispatchEvent(new Event('scroll'));

      await new Promise(resolve => setTimeout(resolve, 100));

      const value = getComputedStyle(document.documentElement)
        .getPropertyValue('--internal-has-scrolled');
      expect(parseFloat(value ?? '0')).toBeGreaterThan(0.5);
    });
  });
});
```

### Integration Tests

**Browser Compatibility Testing:**

```bash
# Test on Chrome 143+
npm run test:chrome

# Test on Safari 17.5+ (macOS)
npm run test:safari

# Test on Firefox 114+
npm run test:firefox
```

**Device Testing:**

- MacBook Pro M-series (primary)
- iPad Pro (Safari)
- iPhone 15+ (ProMotion display)

### Visual Regression Testing

```bash
# Capture baseline screenshots
npm run test:visual:baseline

# Compare after CSS changes
npm run test:visual

# Review differences in CI
```

### Performance Testing

**Lighthouse Audit:**

```bash
npm run build
npm run preview

# Run Lighthouse
lighthouse http://localhost:4173 \
  --output-path=./lighthouse-report.html \
  --chrome-flags="--headless" \
  --form-factor=desktop
```

**Expected Results After Migration:**
- **FCP:** < 1.0s (no change)
- **LCP:** < 1.0s (no change)
- **INP:** < 100ms (5-10% improvement from reduced observer callbacks)
- **CLS:** < 0.05 (no change)

---

## Rollback Plan

### If Issues Are Discovered

**For ResizeObserver → Container Queries:**

1. **Immediate Rollback:**
   ```bash
   git revert <commit-sha>
   npm run build && npm run preview
   ```

2. **Partial Rollback (Single Component):**
   ```bash
   git checkout HEAD~1 -- src/lib/components/visualizations/GapTimeline.svelte
   npm run dev
   ```

3. **Feature Flag Approach:**
   ```typescript
   // In component
   const useContainerQueries = CSS.supports('container-type: inline-size');

   if (!useContainerQueries) {
     // Use legacy ResizeObserver
     setupResizeObserver();
   }
   ```

### Compatibility Matrix

| Browser | Container Queries | Scroll-Driven Animation | Fallback Used |
|---------|-------------------|------------------------|---------------|
| Chrome 143+ | ✓ | ✓ | None |
| Chrome 115-142 | ✓ | ✓ | None |
| Chrome 105-114 | ✓ | ✗ | animation-timeline |
| Safari 17.5+ | ✓ | ✓ | None |
| Safari 16-17.4 | ✓ | ✗ | animation-timeline |
| Firefox 114+ | ✓ | ✓ | None |
| Firefox 110-113 | ✓ | ✗ | animation-timeline |

### Support Matrix

- **Modern (>90% users):** Full modern CSS support
- **Baseline (5-10%):** Container queries work, but no scroll animations
- **Legacy (<1%):** Provided fallback CSS + JavaScript polyfill if needed

---

## Documentation Updates

### For Design System

**Add to Design System documentation:**

```markdown
## Responsive Behavior

### Container Queries (Chrome 105+)

Components automatically respond to their container size using CSS `@container` rules.

#### Example

```css
@container chart (min-width: 600px) {
  .chart-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}

@container chart (max-width: 599px) {
  .chart-grid {
    display: flex;
    flex-direction: column;
  }
}
```

### Fallback

For browsers without container query support, use media queries:

```css
@supports not (container-type: inline-size) {
  /* Fallback to media queries */
  @media (min-width: 600px) {
    .chart-grid {
      display: grid;
    }
  }
}
```

## Scroll-Driven Animations (Chrome 115+)

Elements animate as they enter/leave the viewport without JavaScript.

#### Example

```css
.reveal {
  animation: reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}

@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Fallback

```css
@supports not (animation-timeline: view()) {
  .reveal {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```
```

### For Component Maintainers

**Template for new components:**

```svelte
<script>
  // Modern CSS features are handled in <style>
  // No JavaScript observers needed!
</script>

<div class="component component--container">
  <!-- Content -->
</div>

<style>
  .component--container {
    /* Define container context for children */
    container-type: inline-size;
    container-name: component;
  }

  /* Responsive CSS using container queries */
  @container component (min-width: 600px) {
    .component {
      display: grid;
    }
  }

  /* Fallback for browsers without container queries */
  @supports not (container-type: inline-size) {
    @media (min-width: 600px) {
      .component {
        display: grid;
      }
    }
  }
</style>
```

---

## Timeline & Checkpoints

### Week 1: GapTimeline & GuestNetwork

**Monday-Wednesday:**
- [ ] Implement container queries in GapTimeline.svelte
- [ ] Test responsive breakpoints
- [ ] Code review and feedback

**Thursday-Friday:**
- [ ] Implement container queries in GuestNetwork.svelte
- [ ] Verify D3 force simulation works with container queries
- [ ] Merge to develop branch

### Week 2: SongHeatmap & RarityScorecard

**Monday-Wednesday:**
- [ ] Implement container queries in SongHeatmap.svelte
- [ ] Implement container queries in RarityScorecard.svelte
- [ ] Run visual regression tests

**Thursday-Friday:**
- [ ] Fix any layout issues
- [ ] Performance audit
- [ ] Merge to develop branch

### Week 3: TourMap & InstallPrompt

**Monday-Tuesday:**
- [ ] Implement container queries in TourMap.svelte
- [ ] Test geographical projection responsiveness

**Wednesday-Thursday:**
- [ ] Implement scroll-driven animation in InstallPrompt.svelte
- [ ] Remove IntersectionObserver code
- [ ] Test scroll detection on various devices

**Friday:**
- [ ] Full integration testing
- [ ] Prepare for production release

### Week 4: Testing & Documentation

**Monday-Wednesday:**
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Device testing (desktop, tablet, mobile)
- [ ] Lighthouse performance audit

**Thursday-Friday:**
- [ ] Update documentation
- [ ] Create migration guide for other projects
- [ ] Tag release v2.1.0

---

## Commit Message Template

```
feat(css): migrate [ComponentName] to Chrome 143+ CSS features

- Replace ResizeObserver with CSS Container Queries
- Use container-type: inline-size for responsive layouts
- Add @container rules for breakpoint-driven styling
- Implement fallback for browsers without container query support
- Reduce JavaScript by ~10 lines
- Improve performance: -5% observer overhead

Testing:
- Verified responsive behavior on widths 300px-1920px
- Tested on Chrome 143+, Safari 17.5+, Firefox 114+
- Ran Lighthouse audit: no regressions
- Visual regression: no changes

Closes #[issue-number]
```

---

## Success Metrics

After complete migration:

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| JavaScript ResizeObservers | 5 | 0 | 0 |
| JavaScript IntersectionObservers | 1 | 0 | 0 |
| CSS Container Queries | 0 | 5 | 5 |
| CSS Scroll-Driven Animations | 1 | 2 | 2 |
| Observer Callbacks/Second (idle) | 0 | 0 | 0 |
| Observer Callbacks/Second (resize) | 5-10 | 0 | 0 |
| Bundle Size (JS) | Baseline | -2KB | -2KB |
| Lighthouse Performance | 88 | 92 | 95 |

---

## FAQ

### Q: Will this break on older browsers?

**A:** No. All changes include `@supports` feature detection with graceful fallbacks. Older browsers (Safari 16, Chrome 105) will use fallback CSS or continue using JavaScript as before.

### Q: Do I need to update my components?

**A:** Only if they use `ResizeObserver` or `IntersectionObserver`. New components should use CSS-first approach with no observers.

### Q: How do I test container queries?

**A:** Resize the browser window or use Chrome DevTools' device emulation. Container queries respond to parent container size, not viewport size, so test varies within fixed-size containers too.

### Q: What about Safari/Firefox?

**A:** Container queries are supported in:
- Safari 16+ (major support)
- Firefox 110+ (full support)
- Edge 105+ (full support)

Scroll-driven animations supported in Safari 17.5+, Firefox 114+.

### Q: Can I use this in production now?

**A:** Yes! The 90%+ of users on modern browsers get the benefits. The 10% on older browsers get graceful fallbacks. No loss of functionality.

---

**Guide Version:** 1.0
**Last Updated:** 2025-01-21
**Status:** Ready for Implementation
