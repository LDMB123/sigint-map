# DMB Almanac CSS Modernization - Implementation Guide

**Target:** Chromium 143+, Apple Silicon macOS
**Scope:** CSS if(), @scope, Container Queries, Anchor Positioning
**Estimated Time:** 8 hours total

---

## Quick Reference: Implementation Priorities

### 🔴 HIGH Priority (Do First)

1. **Activate @scope rules** (~30 minutes)
2. **Expand CSS if()** to 8 components (~2 hours)
3. **Modernize media queries** to range syntax (~1.5 hours)

### 🟡 MEDIUM Priority

4. Add style() conditions to @container (~1 hour)
5. Optimize anchor positioning (~1 hour)

### 🟢 LOW Priority (Enhancement Only)

6. Polish scroll animations (~30 minutes)
7. Expand light-dark() usage (~30 minutes)

---

## Phase 1: Activate @scope Rules (30 minutes)

### Step 1: Enable Production Import

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/app.css`

Add this import with other style imports (near line 16):

```css
/* Existing imports */
@import './lib/motion/animations.css';
@import './lib/motion/scroll-animations.css';
@import './lib/motion/viewTransitions.css';

/* ADD THIS: Scoped component patterns (Chrome 118+) */
@import './lib/styles/scoped-patterns.css';
```

### Step 2: Test in Browser

```bash
# Build and preview
npm run build
npm run preview

# In Chrome DevTools:
# 1. Right-click any card → Inspect
# 2. Look for @scope rules in Styles panel
# 3. Verify cascading is correct
```

### Step 3: Verify No Conflicts

The scoped-patterns.css uses custom properties, which won't conflict with your existing styles because:

- ✅ Custom property defaults are in scoped-patterns.css
- ✅ Component styles override via CSS custom properties
- ✅ @scope boundaries prevent leakage
- ✅ Fallback styles for older browsers included

---

## Phase 2: Expand CSS if() (2 hours)

### Implementation Template

All CSS if() implementations follow this pattern:

```css
@supports (width: if(style(--x: 1), 10px, 20px)) {
  /* CSS if() is supported - use conditional styles */
  .component {
    property: if(style(--custom-prop: value), true-value, false-value);
  }
}

@supports not (width: if(style(--x: 1), 10px, 20px)) {
  /* Fallback for older browsers */
  .component {
    property: default-value;
  }
}
```

### Component 1: Badge Variants

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/ui/Badge.svelte`

**Find:** The `<style>` block

**Add after existing variants:**

```css
/* Density-responsive badge sizing (Chrome 143+) */
@supports (width: if(style(--x: 1), 10px, 20px)) {
  .badge {
    padding: if(style(--badge-size: large), 0.5rem 0.875rem, 0.25rem 0.625rem);
    font-size: if(style(--badge-size: large), var(--text-sm), var(--text-xs));
    line-height: if(style(--badge-size: large), 1.5, 1.25);
    height: if(style(--badge-size: large), 28px, 24px);
  }

  .badge-label {
    font-weight: if(style(--badge-size: large), var(--font-semibold), var(--font-medium));
  }
}

@supports not (width: if(style(--x: 1), 10px, 20px)) {
  /* Fallback: default badge size */
  .badge {
    padding: 0.25rem 0.625rem;
    font-size: var(--text-xs);
    height: 24px;
  }
}
```

**Usage in parent component:**

```svelte
<script>
  let badgeSize = $state('large');
</script>

<!-- Setting the CSS variable -->
<div style:--badge-size={badgeSize}>
  <Badge label="Featured" />
</div>

<!-- Or set globally for density mode -->
<div style:--badge-size={compactMode ? 'compact' : 'large'}>
  {#each badges as badge}
    <Badge label={badge} />
  {/each}
</div>
```

### Component 2: StatCard Density

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/ui/StatCard.svelte`

**Add to `<style>` block:**

```css
/* Density-responsive stat card (Chrome 143+) */
@supports (width: if(style(--x: 1), 10px, 20px)) {
  .stat-card {
    gap: if(style(--stat-density: compact), 0.5rem, 1rem);
    padding: if(style(--stat-density: compact), var(--space-2), var(--space-4));
  }

  .stat-value {
    font-size: if(style(--stat-density: compact), 1.5rem, 2rem);
    font-weight: if(style(--stat-density: compact), var(--font-semibold), var(--font-bold));
    line-height: if(style(--stat-density: compact), 1.2, 1);
  }

  .stat-label {
    font-size: if(style(--stat-density: compact), var(--text-xs), var(--text-sm));
    color: if(style(--stat-density: compact), var(--color-gray-600), var(--foreground-secondary));
  }

  .stat-trend {
    display: if(style(--stat-density: compact), none, inline-flex);
  }
}

@supports not (width: if(style(--x: 1), 10px, 20px)) {
  .stat-card {
    padding: var(--space-4);
    gap: 1rem;
  }

  .stat-value {
    font-size: 2rem;
  }

  .stat-label {
    font-size: var(--text-sm);
  }
}
```

### Component 3: Pagination Density

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/ui/Pagination.svelte`

**Replace media query (line 301) with CSS if():**

```css
/* BEFORE: Media query (old way) */
/* @media (max-width: 640px) {
  .pagination-button { padding: var(--space-1) var(--space-2); }
} */

/* AFTER: CSS if() with fallback (new way) */
@supports (width: if(style(--x: 1), 10px, 20px)) {
  .pagination-button {
    padding: if(style(--page-density: compact),
      var(--space-1) var(--space-2),
      var(--space-2) var(--space-3)
    );
    font-size: if(style(--page-density: compact), var(--text-xs), var(--text-sm));
    min-width: if(style(--page-density: compact), 32px, 40px);
  }

  .pagination-ellipsis {
    display: if(style(--page-density: compact), none, inline-block);
  }

  .pagination-info {
    display: if(style(--page-density: compact), none, block);
  }
}

@supports not (width: if(style(--x: 1), 10px, 20px)) {
  /* Fallback for older browsers - use small layout always */
  .pagination-button {
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-sm);
    min-width: 40px;
  }
}
```

### Component 4: ShowCard Featured Layout

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/shows/ShowCard.svelte`

**Find the variant handling in `<style>` block**

**Add CSS if() version:**

```css
/* Featured vs default layout (Chrome 143+) */
@supports (width: if(style(--x: 1), 10px, 20px)) {
  .show-card {
    display: if(style(--show-layout: featured), grid, flex);
    grid-template-columns: if(style(--show-layout: featured), 1fr 1fr, auto);
    grid-template-rows: if(style(--show-layout: featured), auto auto, auto);
    flex-direction: if(style(--show-layout: featured), row, column);
    padding: if(style(--show-layout: featured), var(--space-6), var(--space-4));
    border-width: if(style(--show-layout: featured), 2px, 1px);
  }

  .show-image {
    display: if(style(--show-layout: featured), block, none);
    grid-column: if(style(--show-layout: featured), 1, auto);
    aspect-ratio: if(style(--show-layout: featured), 1, auto);
    width: if(style(--show-layout: featured), auto, 100px);
  }

  .show-content {
    grid-column: if(style(--show-layout: featured), 2, auto);
    flex: if(style(--show-layout: featured), 1, 0 0 auto);
  }
}

@supports not (width: if(style(--x: 1), 10px, 20px)) {
  .show-card {
    display: flex;
    flex-direction: column;
    padding: var(--space-4);
  }

  .show-image {
    display: none;
  }
}
```

**Usage:**

```svelte
<script>
  let showFeatured = true;
</script>

<div style:--show-layout={showFeatured ? 'featured' : 'default'}>
  <ShowCard {show} />
</div>
```

### Component 5: Table Compact Mode

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/ui/Table.svelte`

**Replace media query (line 366):**

```css
/* Compact table mode (Chrome 143+) */
@supports (width: if(style(--x: 1), 10px, 20px)) {
  .table {
    font-size: if(style(--table-compact: true), var(--text-xs), var(--text-sm));
  }

  th, td {
    padding: if(style(--table-compact: true), 0.5rem, var(--space-3));
  }

  .table-column-hide {
    display: if(style(--table-compact: true), none, table-cell);
  }

  .table-expand-icon {
    display: if(style(--table-compact: true), inline-block, none);
  }
}

@supports not (width: if(style(--x: 1), 10px, 20px)) {
  .table {
    font-size: var(--text-sm);
  }

  th, td {
    padding: var(--space-3);
  }

  .table-column-hide {
    display: table-cell;
  }
}
```

---

## Phase 3: Modernize Media Queries (1.5 hours)

### Strategy

Find & replace legacy syntax. Three patterns to update:

```
Pattern 1: (min-width: 640px)   → (width >= 640px)
Pattern 2: (max-width: 639px)   → (width < 640px)
Pattern 3: (min-width: 640px) and (max-width: 1023px) → (640px <= width < 1024px)
```

### File-by-File Updates

#### File 1: app.css (Lines 921-925)

**Before:**
```css
@media (min-width: 640px) {
  .container {
    padding-inline: var(--space-6);
  }
}
```

**After:**
```css
@media (width >= 640px) {
  .container {
    padding-inline: var(--space-6);
  }
}
```

#### File 2: scoped-patterns.css (Line 413)

**Before:**
```css
@media (max-width: 768px) {
  flex-direction: column;
}
```

**After:**
```css
@media (width < 768px) {
  flex-direction: column;
}
```

#### File 3: SongListItem.svelte (Lines 337, 363)

**Before:**
```css
@media (max-width: 639px) {
  /* mobile */
}
@media (min-width: 640px) {
  /* desktop */
}
```

**After:**
```css
@media (width < 640px) {
  /* mobile */
}
@media (width >= 640px) {
  /* desktop */
}
```

#### File 4: Header.svelte (Lines 229, 304, 413, 524)

**Before:**
```css
@media (min-width: 640px) { ... }
@media (min-width: 1024px) { ... }
```

**After:**
```css
@media (width >= 640px) { ... }
@media (width >= 1024px) { ... }
```

#### File 5: Batch Update Remaining Files

Use VS Code find & replace (Ctrl+H):

**Pattern 1:**
```
Find:     @media \(min-width:\s+(\d+)px\)
Replace:  @media (width >= $1px)
Regex:    ✓ Enable
```

**Pattern 2:**
```
Find:     @media \(max-width:\s+(\d+)px\)
Replace:  @media (width < $1px)
Regex:    ✓ Enable
```

**Pattern 3 (Compound):**
```
Find:     @media \(min-width:\s+(\d+)px\)\s+and\s+\(max-width:\s+(\d+)px\)
Replace:  @media ($1px <= width < $2px)
Regex:    ✓ Enable
```

---

## Phase 4: Container Query Enhancement (1 hour)

### Add Style Conditions to Existing Containers

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/app.css`

**Current (Line 2264):**
```css
@container card (width >= 400px) {
  .card-title { font-size: var(--text-lg); }
}
```

**Enhanced (Add style conditions):**
```css
@container card (width >= 400px) and style(--featured: true) {
  .card {
    border-width: 2px;
    padding: var(--space-6);
  }

  .card-title {
    font-size: var(--text-2xl);
  }
}

@container card (width >= 400px) and style(--featured: false) {
  .card-title { font-size: var(--text-lg); }
}

/* Glass variant */
@container card and style(--glass: true) {
  .card {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border-strong);
  }
}

/* Compact variant */
@container card and style(--compact: true) {
  .card {
    padding: var(--space-2);
  }

  .card-title {
    font-size: var(--text-base);
  }
}
```

**Usage in component:**

```svelte
<script>
  export let featured = false;
  export let glass = false;
  export let compact = false;
</script>

<div
  class="card"
  style:--featured={featured}
  style:--glass={glass}
  style:--compact={compact}
>
  <!-- content -->
</div>
```

---

## Phase 5: Anchor Positioning Polish (1 hour)

### Enhance Dropdown with Custom Fallbacks

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/anchored/Dropdown.svelte`

**Replace:**
```css
position-try-fallbacks: flip-block;
```

**With:**
```css
/* Define custom positioning strategies */
@position-try --prefer-top-start {
  top: anchor(bottom);
  left: anchor(left);
  right: auto;
  bottom: auto;
  margin-top: 4px;
  margin-bottom: auto;
}

@position-try --prefer-top-end {
  top: anchor(bottom);
  right: anchor(right);
  left: auto;
  bottom: auto;
  margin-top: 4px;
  margin-bottom: auto;
}

@position-try --prefer-left {
  top: anchor(top);
  right: anchor(left);
  left: auto;
  bottom: auto;
  margin-right: 4px;
  margin-left: auto;
}

.dropdown-menu {
  position: absolute;
  position-anchor: var(--position-anchor);
  min-width: anchor-size(width);

  /* Try in order of preference */
  position-try-fallbacks: flip-block, --prefer-top-end, --prefer-left;
}
```

### Add Anchor Size Responsiveness

**Add to same file:**

```css
.dropdown-menu {
  /* Width based on trigger, but with max limit */
  width: min(anchor-size(width), 300px);

  /* Responsive padding based on anchor height */
  padding: max(8px, anchor-size(height) / 4);
}

.dropdown-item {
  /* Dynamic padding based on trigger size */
  padding: if(style(--trigger-size: large),
    var(--space-3) var(--space-4),
    var(--space-2) var(--space-3)
  );
}
```

---

## Phase 6: Testing Checklist

### Browser Testing

- [ ] Chrome 143+ (all features)
- [ ] Chrome 140 (graceful fallback)
- [ ] Chrome 120 (light-dark, nesting works)
- [ ] Chrome 105 (container queries work)
- [ ] Safari 18+ (if/when supported)
- [ ] Firefox (if/when supported)

### Feature Testing

```javascript
// Test CSS if() support
const supportsIfFunction = CSS.supports('width: if(style(--x: 1), 10px, 20px)');
console.log('CSS if():', supportsIfFunction ? '✓' : '✗');

// Test @scope
const supportsScope = CSS.supports('selector(:scope)');
console.log('@scope:', supportsScope ? '✓' : '✗');

// Test container queries
const supportsContainers = CSS.supports('container-type: inline-size');
console.log('Container Queries:', supportsContainers ? '✓' : '✗');

// Test anchor positioning
const supportsAnchors = CSS.supports('anchor-name: --test');
console.log('Anchor Positioning:', supportsAnchors ? '✓' : '✗');
```

### Visual Regression Testing

1. **Build:** `npm run build`
2. **Preview:** `npm run preview`
3. **Test pages:**
   - Shows page (ShowCard - featured variant)
   - Stats page (StatCard density)
   - Tables (compact mode)
   - Dropdowns (anchor positioning)
   - Navigation (responsive media queries)

### Accessibility Audit

- [ ] Focus management in dropdowns
- [ ] Tooltip ARIA labels
- [ ] Modal backdrop (no light dismiss for hints)
- [ ] Color contrast in light/dark modes
- [ ] Keyboard navigation (Tab, Enter, Escape)

---

## Performance Optimization Tips

### 1. CSS if() Performance

CSS if() has zero runtime cost - it's resolved at parse time:

```css
/* Good: Single if() statement */
.component {
  padding: if(style(--mode: compact), 0.5rem, 1rem);
}

/* Avoid: Multiple nested if() statements */
.component {
  padding: if(style(--a: true),
    if(style(--b: true), 0.25rem, 0.5rem),
    1rem
  );
}
```

### 2. Container Query Performance

Minimize re-evaluations:

```css
/* Good: Minimal style recalculations */
@container card (width >= 400px) {
  .card-title { font-size: var(--text-lg); }
}

/* Avoid: Expensive re-layouts */
@container card (width >= 400px) {
  .card { width: 100%; } /* Avoid width changes */
  .card { display: grid; } /* Avoid display changes */
}
```

### 3. Scroll Animation Performance

Already optimized in your code:

```css
.scroll-progress-bar {
  /* Good: GPU-accelerated properties */
  animation: scrollProgress linear both;
  transform: scaleX(0);
  will-change: transform; /* ✓ Already present */
}
```

---

## Rollback Plan

If issues arise:

### Quick Rollback

```bash
# Undo last commit
git revert HEAD

# Or remove Phase file
rm src/lib/styles/scoped-patterns.css
# from src/app.css
```

### Partial Rollback

```bash
# Keep @scope but revert CSS if()
git checkout -- src/lib/components/ui/Card.svelte
git checkout -- src/lib/components/ui/Button.svelte
```

---

## Next Steps

1. **Start with Phase 1** (Activate @scope) - 30 minutes, zero risk
2. **Run tests** - Ensure no visual regressions
3. **Proceed to Phase 2** (CSS if()) - Highest impact
4. **Update media queries** as time allows

---

## Questions & Troubleshooting

### "CSS if() styles not applying"

**Check:**
1. Browser supports Chrome 143+
2. `@supports` block is wrapped correctly
3. Custom properties are set on parent element
4. No specificity conflicts

**Debug:**
```javascript
// In DevTools Console
const el = document.querySelector('.card');
const style = getComputedStyle(el);
console.log(style.getPropertyValue('--card-density')); // Should show value
```

### "Container queries not responding to size changes"

**Check:**
1. `container-type: inline-size` is set
2. Container can actually change width
3. Query threshold is correct
4. No `@supports` block preventing it

### "@scope rules not showing in DevTools"

This is normal - @scope doesn't show as separate rules. Check that:
1. Styles are applied correctly
2. Scope boundaries are correct (use `to` keyword)
3. No specificity issues with other styles

---

## Additional Resources

- [Chrome 143 Release Notes](https://chromium.googlesource.com)
- [Can I Use: CSS if()](https://caniuse.com)
- [MDN: @scope](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope)
- [MDN: Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Container_queries)

---

**Good luck with your modernization! Start with Phase 1, test thoroughly, and expand incrementally.**
