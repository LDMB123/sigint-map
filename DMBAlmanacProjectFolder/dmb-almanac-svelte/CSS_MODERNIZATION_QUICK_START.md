# CSS Modernization Quick Start Guide
## DMB Almanac - Chrome 143+ Features

**Read Time:** 5 minutes
**Document:** Quick reference for developers
**Target:** Implement modern CSS in phases

---

## At-a-Glance Opportunity Matrix

```
HIGH IMPACT, LOW EFFORT
├─ Anchor Positioning Refactor (anchor.ts)
│  Savings: 6.5KB JS
│  Effort: 4 hours
│  Files: 1 core file
│
├─ Light-Dark() Theme System (app.css)
│  Savings: 4.3KB CSS
│  Effort: 8 hours
│  Files: 1 + 20 components
│
MEDIUM IMPACT, MEDIUM EFFORT
├─ Container Queries (responsive)
│  Savings: 4KB JS
│  Effort: 7 hours
│  Files: 8-10 components
│
├─ :has() Hover States (UI)
│  Savings: 1.5KB JS
│  Effort: 2 hours
│  Files: 3-4 components
│
NICE-TO-HAVE, FUTURE
└─ Sticky Header Enhancement (Header.svelte)
   Savings: 1KB JS
   Effort: 3 hours
   Timeline: 2026 Q2+
```

---

## What's Already Perfect ✅

These don't need changes:

1. **Scroll-Driven Animations** - Using native CSS scroll() timeline
2. **@starting-style Transitions** - Properly implemented with Popover API
3. **Native Details/Summary** - Excellent accordion implementation
4. **Popover API** - Good use with proper fallbacks
5. **CSS Classes for Animations** - All actions are CSS-first

**Total Already Native:** 0KB left to modernize (these are already using CSS!)

---

## Quick Win #1: Anchor Positioning (6.5KB savings in 4 hours)

### Before:
```typescript
// src/lib/actions/anchor.ts - 120 lines of JavaScript
function applyAnchorPositioning(node, anchor, position, offset) {
  node.style.position = 'absolute';
  node.style.positionAnchor = `--${anchor}`;
  // 100+ more lines...
}
```

### After:
```typescript
// Simplified to 30 lines
function applyAnchorPositioning(node, position, offset) {
  node.dataset.position = position;
  node.style.setProperty('--anchor-offset', `${offset}px`);
  // CSS handles the rest
}
```

### Add to CSS:
```css
[data-position="bottom"] {
  position: absolute;
  position-anchor: var(--anchor-name);
  position-area: bottom;
  margin-top: var(--anchor-offset, 8px);
}

@supports not (position-anchor: --test) {
  /* Fallback for older browsers */
  [data-position="bottom"] {
    top: calc(100% + var(--anchor-offset, 8px));
    left: 50%;
    transform: translateX(-50%);
  }
}
```

**Implementation Steps:**
1. Open `/src/lib/actions/anchor.ts`
2. Replace `applyAnchorPositioning()` function (keep feature detection)
3. Create new CSS file or add to app.css with position data attributes
4. Update `anchoredTo()` action to use dataset instead of inline styles
5. Test with dropdown + tooltip components

**Time:** 3-4 hours | **Savings:** 6.5KB

---

## Quick Win #2: Light-Dark() Theme (4.3KB savings in 8 hours)

### Before:
```css
.button {
  background: linear-gradient(to bottom,
    var(--color-primary-500),
    var(--color-primary-600)
  );
  color: white;
}

@media (prefers-color-scheme: dark) {
  .button {
    background: linear-gradient(to bottom,
      var(--color-primary-500),
      var(--color-primary-600)
    );
  }
}
```

### After:
```css
.button {
  background: light-dark(
    linear-gradient(to bottom,
      var(--color-primary-500),
      var(--color-primary-600)
    ),
    linear-gradient(to bottom,
      var(--color-primary-400),
      var(--color-primary-500)
    )
  );
  color: light-dark(white, #f0f0f0);
}
```

**Implementation Steps:**
1. In `src/app.css`, create light/dark variable pairs:
   ```css
   :root {
     --color-primary-light: oklch(0.70 0.20 60);
     --color-primary-dark: oklch(0.50 0.18 60);
   }
   ```

2. Replace `@media (prefers-color-scheme: dark)` with `light-dark()`

3. Test on Chrome 143+ (fallback to @media for older browsers)

**Phase 1:** Update 5 core components (Button, Dropdown, Tooltip, Card, Table)
**Phase 2:** Update remaining 15+ components
**Phase 3:** Clean up CSS to remove @media color rules

**Time:** 8 hours spread over 2-3 days | **Savings:** 4.3KB

---

## Quick Win #3: Container Queries (4KB savings in 7 hours)

### Before:
```css
.card {
  display: grid;
  grid-template-columns: 1fr;
}

@media (min-width: 600px) {
  .card {
    grid-template-columns: 200px 1fr;
  }
}

@media (max-width: 400px) {
  .card {
    grid-template-columns: 1fr;
  }
}
```

### After:
```css
.card-container {
  container-type: inline-size;
}

.card {
  display: grid;
  grid-template-columns: 1fr;
}

@container (min-width: 600px) {
  .card {
    grid-template-columns: 200px 1fr;
  }
}

@container (max-width: 400px) {
  .card {
    grid-template-columns: 1fr;
  }
}
```

**Identify Candidates:**
- Look for components that should resize based on their container, not viewport
- Cards, visualizations, sidebar widgets are good candidates
- ~8-10 components in the project

**Implementation Steps:**
1. Add `container-type: inline-size` to parent of responsive component
2. Replace `@media (max-width: X)` with `@container (max-width: X)`
3. Test that component resizes with container, not just window

**Time:** 7 hours (spread over 3-4 days) | **Savings:** 4KB

---

## Quick Win #4: :has() Hover States (1.5KB savings in 2 hours)

### Before:
```typescript
// src/lib/components/ui/Tooltip.svelte
function handleMouseEnter() {
  if (!tooltipElement || isSupported) return;
  tooltipElement.classList.add('popover-open');
}

function handleMouseLeave() {
  if (!tooltipElement || isSupported) return;
  tooltipElement.classList.remove('popover-open');
}

// HTML needs handlers
onmouseenter={isSupported ? undefined : handleMouseEnter}
onmouseleave={isSupported ? undefined : handleMouseLeave}
```

### After:
```css
/* Pure CSS detection of hover */
.tooltip-wrapper:has(.tooltip-trigger:hover) .tooltip-popover {
  opacity: 1;
  visibility: visible;
  transform: scale(1);
}

/* Keyboard support */
.tooltip-wrapper:has(.tooltip-trigger:focus-visible) .tooltip-popover {
  opacity: 1;
  visibility: visible;
  transform: scale(1);
}

/* Fallback for browsers without :has() */
@supports not selector(:has(*)) {
  /* Keep JS handlers */
}
```

**Affected Components:**
- Tooltip (1 component)
- Dropdown hover (optional enhancement)
- Custom icon hover effects (2-3 instances)

**Implementation Steps:**
1. Add `:has()` CSS rules to component
2. Add feature detection: `@supports not selector(:has(*))`
3. Keep JS handlers inside the feature detection
4. Test on Chrome 105+, Safari 15.4+, Firefox 121+

**Time:** 2 hours | **Savings:** 1.5KB

---

## Phase Implementation Plan

### Phase 1: Quick Wins (Week 1 - 16 hours, 10.8KB savings)
- [ ] Anchor positioning refactor (4 hours, 6.5KB)
- [ ] Light-dark() in Button component (2 hours, 0.8KB)
- [ ] Light-dark() in Dropdown component (2 hours, 0.8KB)
- [ ] Light-dark() in app.css variables (2 hours, 0.5KB)
- [ ] Basic testing & verification (4 hours)

### Phase 2: Medium Efforts (Week 2-3 - 12 hours, 5.5KB savings)
- [ ] Light-dark() in remaining components (4 hours, 2.2KB)
- [ ] Container queries for 5 card components (4 hours, 2KB)
- [ ] :has() for hover states (2 hours, 1.3KB)
- [ ] Testing & cross-browser verification (2 hours)

### Phase 3: Documentation & Monitoring (Week 4 - 4 hours)
- [ ] Update project documentation
- [ ] Create CSS modernization guide for team
- [ ] Monitor Chrome 143+ for CSS if() stabilization
- [ ] Plan sticky header enhancement for Q2

---

## Browser Support Quick Reference

| Feature | Chrome | Edge | Firefox | Safari | Notes |
|---------|--------|------|---------|--------|-------|
| scroll-driven animations | 115+ | 115+ | ❌ | 18+ | Already using |
| Anchor positioning | 125+ | 125+ | ❌ | 17.2+ | With fallback |
| light-dark() | 143+ | 143+ | ❌ | 16.4+ | Monitor, fallback ready |
| Container queries | 105+ | 105+ | 111+ | 16+ | Ready to implement |
| :has() selector | 105+ | 105+ | 121+ | 15.4+ | Good coverage |
| Popover API | 114+ | 114+ | ❌ | 17+ | Already using |

---

## Files You'll Touch

### High Priority
1. `/src/lib/actions/anchor.ts` - Simplify to CSS-first
2. `/src/app.css` - Add light-dark() variables
3. `/src/lib/components/ui/Button.svelte` - Use light-dark()
4. `/src/lib/components/ui/Dropdown.svelte` - Use light-dark()
5. `/src/lib/components/ui/Tooltip.svelte` - Add :has() support

### Medium Priority
6. `/src/lib/components/ui/Card.svelte` - Add container-type
7. `/src/lib/components/shows/ShowCard.svelte` - Container queries
8. Multiple responsive components - Gradual migration

### Monitoring
9. `src/lib/motion/` - For future scroll-state() features

---

## Testing Checklist

After each change:

- [ ] Component renders without errors
- [ ] Feature detection works (CSS.supports)
- [ ] Fallback styles applied for older browsers
- [ ] Keyboard navigation still works
- [ ] Focus visible indicators work
- [ ] Touch targets >= 44x44px
- [ ] Reduced motion respected
- [ ] Dark mode toggle works
- [ ] Cross-browser tested (Chrome, Safari, Firefox, Edge)

---

## Code Examples by Component

### Example 1: Simple :has() Enhancement

```css
/* Before: Needs JS */
.tooltip-trigger:hover ~ .tooltip { display: block; }

/* After: No JS needed */
.tooltip-wrapper:has(.tooltip-trigger:hover) .tooltip {
  opacity: 1;
  visibility: visible;
}

/* Fallback for older browsers */
@supports not selector(:has(*)) {
  /* Keep JS event handlers */
}
```

### Example 2: Container Query Migration

```css
/* Before: Media query */
@media (min-width: 768px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}

/* After: Container query */
.grid-container { container-type: inline-size; }

@container (min-width: 768px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}
```

### Example 3: Light-Dark() Migration

```css
/* Before: Duplicate rules */
.button {
  background: oklch(0.70 0.20 60);
  color: white;
}

@media (prefers-color-scheme: dark) {
  .button {
    background: oklch(0.50 0.18 60);
    color: #f0f0f0;
  }
}

/* After: Single rule */
.button {
  background: light-dark(
    oklch(0.70 0.20 60),
    oklch(0.50 0.18 60)
  );
  color: light-dark(white, #f0f0f0);
}
```

---

## Performance Metrics Expected

After all optimizations:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Interactive JS | 23KB | 9.5KB | 59% ↓ |
| CSS (with variables) | 180KB | 183KB | +3KB |
| **Net JavaScript** | 203KB | 192.5KB | 10.5KB ↓ |
| INP (Interaction) | ~45ms | ~28ms | 38% ↓ |
| JS Execution Time | ~120ms | ~35ms | 71% ↓ |

---

## Next Steps

1. **Read the full audit:** `CSS_MODERNIZATION_AUDIT_2025.md`
2. **Review findings:** `CSS_MODERNIZATION_FINDINGS.txt`
3. **Start Phase 1:** Begin with anchor.ts refactoring
4. **Measure progress:** Use Chrome DevTools to track JS reduction
5. **Iterate:** Complete all phases over 3-4 weeks

---

## Questions?

Refer to the full audit document for:
- Detailed analysis of each pattern
- Implementation guides with code examples
- Browser support matrix
- Testing procedures
- Performance impact analysis

---

**Last Updated:** January 23, 2026
**Target:** Chrome 143+ (Chromium 2025)
**Maintenance:** Annual review recommended
