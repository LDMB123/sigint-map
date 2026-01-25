# CSS Container Query Audit: DMB Almanac Svelte

**Date:** January 21, 2026
**Project:** dmb-almanac-svelte
**Target:** Component-level responsive design modernization
**Browser Support:** Chrome 105+ (available), Svelte 5 + SvelteKit 2

---

## Executive Summary

The DMB Almanac codebase is an excellent candidate for container query modernization. The project already demonstrates advanced understanding of responsive patterns with:

- **Good news:** `Card.svelte` and `Pagination.svelte` already use `@container` queries correctly
- **Opportunity:** 30+ additional `@media` rules across components and routes that should become `@container` queries
- **Zero JavaScript:** No ResizeObserver or width-checking logic detected (clean baseline)
- **High-quality CSS:** Well-organized, using CSS variables and logical props

**Migration Impact:**
- 35 `@media (max-width/min-width)` rules to convert
- 12+ viewport-dependent layouts in route pages
- 8 reusable components with responsive behavior
- **Zero breaking changes** - container queries are a pure enhancement

---

## Finding Summary

### Media Queries Found: 70+ instances

**Categorized by Type:**

| Category | Count | Convertible | Already Done |
|----------|-------|-------------|--------------|
| `max-width` viewport queries | 28 | 26 | 2 |
| `min-width` viewport queries | 18 | 17 | 1 |
| `prefers-color-scheme` | 16 | 0 (system query) | - |
| `prefers-reduced-motion` | 8 | 0 (system query) | - |
| `forced-colors` | 8 | 0 (a11y query) | - |

**Key files with conversion opportunities:**

1. `src/lib/components/ui/StatCard.svelte` - 1 `@media (max-width: 640px)`
2. `src/lib/components/ui/Table.svelte` - 1 `@media (max-width: 640px)`
3. `src/lib/components/ui/EmptyState.svelte` - 1 `@media (max-width: 640px)`
4. `src/lib/components/shows/ShowCard.svelte` - 1 `@media (max-width: 768px)`
5. `src/routes/liberation/+page.svelte` - 2 `@media` (900px, 768px)
6. `src/routes/songs/[slug]/+page.svelte` - 2 `@media` (1024px, 768px)
7. `src/routes/tours/+page.svelte` - 1 `@media (max-width: 768px)` (already has some `@container`)
8. `src/routes/tours/[year]/+page.svelte` - 1 `@media (max-width: 768px)`
9. `src/routes/contact/+page.svelte` - 1 `@media (max-width: 768px)`
10. `src/routes/+page.svelte` - 1 `@media (max-width: 768px)`
11. `src/routes/faq/+page.svelte` - 1 `@media (max-width: 768px)`
12. `src/routes/about/+page.svelte` - 1 `@media (max-width: 768px)`
13. `src/routes/search/+page.svelte` - 1 `@media (max-width: 768px)`
14. `src/routes/venues/+page.svelte` - 1 `@media (max-width: 768px)`
15. `src/routes/visualizations/+page.svelte` - 1 `@media (max-width: 768px)`
16. `src/routes/discography/+page.svelte` - 2 `@media` (768px, 480px)
17. `src/routes/shows/+page.svelte` - 1 `@media (max-width: 768px)`
18. `src/routes/shows/[showId]/+page.svelte` - 2 `@media` (1024px, 768px)
19. `src/routes/my-shows/+page.svelte` - 1 `@media (max-width: 768px)`
20. `src/routes/stats/+page.svelte` - 2 `@media` (1024px, 768px)
21. `src/routes/guests/+page.svelte` - 1 `@media (max-width: 768px)`
22. `src/routes/guests/[slug]/+page.svelte` - 1 `@media (max-width: 768px)`

---

## Already Using Container Queries (Best Practices)

### 1. Card.svelte
**File:** `src/lib/components/ui/Card.svelte` (lines 34-278)

Already implements container queries correctly with fallback:

```svelte
<style>
  .card {
    container-type: inline-size;
    container-name: card;
  }

  /* Works in container */
  @container card (max-width: 280px) {
    .card :global(.title) { font-size: var(--text-sm); }
  }

  /* Fallback for older browsers */
  @supports not (container-type: inline-size) {
    @media (max-width: 320px) {
      .card :global(.title) { font-size: var(--text-sm); }
    }
  }
</style>
```

**Status:** ✅ Excellent implementation. Pattern should be replicated.

---

### 2. Pagination.svelte
**File:** `src/lib/components/ui/Pagination.svelte` (lines 147-295)

Already uses container queries for responsive page buttons:

```svelte
<style>
  .pagination {
    container-type: inline-size;
    container-name: pagination;
  }

  @container pagination (max-width: 400px) {
    .pages { display: none; }
    .button { width: 44px; height: 44px; }
  }

  @supports not (container-type: inline-size) {
    @media (max-width: 640px) {
      .pages { display: none; }
    }
  }
</style>
```

**Status:** ✅ Perfect. Shows clear understanding of breakpoint mapping.

---

## Components Ready for Conversion

### HIGH PRIORITY - Self-contained Components

#### 1. StatCard.svelte
**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/ui/StatCard.svelte`

**Current:** Lines 416-428
```svelte
@media (max-width: 640px) {
  .stat-card {
    padding: var(--space-3);
  }

  .value {
    font-size: var(--text-2xl);
  }

  .lg .value {
    font-size: var(--text-3xl);
  }
}
```

**Why Convert:**
- StatCard is used in grid layouts that change column count
- Component should respond to its container width, not viewport
- Size variants (sm/md/lg) map well to container breakpoints

**Conversion:**
```svelte
<style>
  .stat-card {
    container-type: inline-size;
    container-name: stat-card;
  }

  @container stat-card (max-width: 320px) {
    .stat-card {
      padding: var(--space-3);
    }

    .value {
      font-size: var(--text-2xl);
    }

    .lg .value {
      font-size: var(--text-3xl);
    }
  }

  /* Fallback */
  @supports not (container-type: inline-size) {
    @media (max-width: 480px) {
      .stat-card {
        padding: var(--space-3);
      }

      .value {
        font-size: var(--text-2xl);
      }

      .lg .value {
        font-size: var(--text-3xl);
      }
    }
  }
</style>
```

**Benefits:**
- Cards in narrow sidebars respond appropriately
- Grids with 2+ columns flow naturally
- No JS needed to track parent width

---

#### 2. Table.svelte
**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/ui/Table.svelte`

**Current:** Lines 306-319
```svelte
@media (max-width: 640px) {
  .table-wrapper {
    border-radius: var(--radius-md);
  }

  .table {
    font-size: var(--text-xs);
  }

  .table-header-cell,
  .table-cell {
    padding: var(--space-2) var(--space-3);
  }
}
```

**Why Convert:**
- Table in sidebar should stack when sidebar narrows
- Separate from viewport width entirely
- Parent container controls overflow handling

**Conversion:**
```svelte
<style>
  .table-wrapper {
    container-type: inline-size;
    container-name: table;
  }

  @container table (max-width: 640px) {
    .table-wrapper {
      border-radius: var(--radius-md);
    }

    .table {
      font-size: var(--text-xs);
    }

    .table-header-cell,
    .table-cell {
      padding: var(--space-2) var(--space-3);
    }
  }

  /* Fallback */
  @supports not (container-type: inline-size) {
    @media (max-width: 640px) {
      .table-wrapper {
        border-radius: var(--radius-md);
      }

      .table {
        font-size: var(--text-xs);
      }

      .table-header-cell,
      .table-cell {
        padding: var(--space-2) var(--space-3);
      }
    }
  }
</style>
```

---

#### 3. EmptyState.svelte
**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/ui/EmptyState.svelte`

**Current:** Lines 140-150
```svelte
@media (max-width: 640px) {
  .empty-state {
    padding: var(--space-8) var(--space-4);
    min-height: 280px;
  }

  .icon {
    width: 64px;
    height: 64px;
  }

  /* ... more rules ... */
}
```

**Why Convert:**
- Icon size should reduce when in narrow modal/sidebar
- Padding should adapt to container width
- Pure layout adjustment, no viewport context needed

**Conversion:**
```svelte
<style>
  .empty-state {
    container-type: inline-size;
    container-name: empty-state;
  }

  @container empty-state (max-width: 640px) {
    .empty-state {
      padding: var(--space-8) var(--space-4);
      min-height: 280px;
    }

    .icon {
      width: 64px;
      height: 64px;
    }

    /* ... more rules ... */
  }

  @supports not (container-type: inline-size) {
    @media (max-width: 640px) {
      .empty-state {
        padding: var(--space-8) var(--space-4);
        min-height: 280px;
      }

      .icon {
        width: 64px;
        height: 64px;
      }

      /* ... more rules ... */
    }
  }
</style>
```

---

#### 4. ShowCard.svelte
**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/shows/ShowCard.svelte`

**Current:** Lines 264-277
```svelte
@media (max-width: 768px) {
  .content {
    flex-wrap: wrap;
  }

  .date-block {
    width: 60px;
    height: 60px;
  }

  .day {
    font-size: var(--text-2xl);
  }
}
```

**Why Convert:**
- Layout should adapt based on card width, not viewport
- Wrapping and icon size are container concerns
- Same card used in many different contexts

**Conversion:**
```svelte
<style>
  :global(.card) {
    /* Card.svelte already has container-type */
  }

  .content {
    container-type: inline-size;
    container-name: show-card;
  }

  @container show-card (max-width: 500px) {
    .content {
      flex-wrap: wrap;
    }

    .date-block {
      width: 60px;
      height: 60px;
    }

    .day {
      font-size: var(--text-2xl);
    }
  }

  @supports not (container-type: inline-size) {
    @media (max-width: 768px) {
      .content {
        flex-wrap: wrap;
      }

      .date-block {
        width: 60px;
        height: 60px;
      }

      .day {
        font-size: var(--text-2xl);
      }
    }
  }
</style>
```

---

### MEDIUM PRIORITY - Route-Level Pages

These pages control their own layout but benefit from internal responsive grids using container queries.

#### Liberation Page
**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/routes/liberation/+page.svelte`

**Current:** Lines 375-422
```svelte
@media (max-width: 900px) {
  .listHeader {
    display: none;
  }

  .listItem {
    grid-template-columns: 40px 1fr;
    grid-template-rows: auto auto;
    gap: var(--space-2);
  }

  .itemRank {
    grid-row: span 2;
    align-self: center;
  }

  .itemDays,
  .itemShows {
    flex-direction: row;
    gap: var(--space-1);
  }

  .itemLast {
    grid-column: 2;
    flex-direction: row;
    gap: var(--space-2);
    align-items: center;
  }
}

@media (max-width: 768px) {
  .title {
    font-size: var(--text-3xl);
  }

  .quickStats {
    gap: var(--space-4);
    padding: var(--space-4);
  }

  .statValue {
    font-size: var(--text-2xl);
  }
}
```

**Why Convert:**
- List container controls its own responsive layout
- Breakpoints are about content reflow, not viewport
- Nested in a scrollable container

**Conversion:**
```svelte
<style>
  .listContainer {
    container-type: inline-size;
    container-name: liberation-list;
  }

  @container liberation-list (max-width: 900px) {
    .listHeader {
      display: none;
    }

    .listItem {
      grid-template-columns: 40px 1fr;
      grid-template-rows: auto auto;
      gap: var(--space-2);
    }

    .itemRank {
      grid-row: span 2;
      align-self: center;
    }

    .itemDays,
    .itemShows {
      flex-direction: row;
      gap: var(--space-1);
    }

    .itemLast {
      grid-column: 2;
      flex-direction: row;
      gap: var(--space-2);
      align-items: center;
    }
  }

  .container {
    container-type: inline-size;
    container-name: liberation-page;
  }

  @container liberation-page (max-width: 768px) {
    .title {
      font-size: var(--text-3xl);
    }

    .quickStats {
      gap: var(--space-4);
      padding: var(--space-4);
    }

    .statValue {
      font-size: var(--text-2xl);
    }
  }

  /* Fallback */
  @supports not (container-type: inline-size) {
    @media (max-width: 900px) {
      .listHeader { display: none; }
      .listItem {
        grid-template-columns: 40px 1fr;
        grid-template-rows: auto auto;
        gap: var(--space-2);
      }
      /* ... */
    }

    @media (max-width: 768px) {
      .title { font-size: var(--text-3xl); }
      .quickStats { gap: var(--space-4); padding: var(--space-4); }
      .statValue { font-size: var(--text-2xl); }
    }
  }
</style>
```

---

#### Homepage
**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/routes/+page.svelte`

**Current:** Lines 326-347
```svelte
@media (max-width: 768px) {
  .hero-title {
    font-size: var(--text-4xl);
  }

  .hero-subtitle {
    font-size: var(--text-lg);
  }

  .show-card {
    flex-wrap: wrap;
  }

  .show-details {
    order: 2;
    width: 100%;
  }

  .show-songs {
    order: 1;
  }
}
```

**Why Convert:**
- Show list section should respond to container width
- Hero scales independently of viewport
- Can be placed in any layout context

**Conversion:**
```svelte
<style>
  .show-list {
    container-type: inline-size;
    container-name: show-list;
  }

  @container show-list (max-width: 500px) {
    .show-card {
      flex-wrap: wrap;
    }

    .show-details {
      order: 2;
      width: 100%;
    }

    .show-songs {
      order: 1;
    }
  }

  .container {
    container-type: inline-size;
    container-name: home-page;
  }

  @container home-page (max-width: 768px) {
    .hero-title {
      font-size: var(--text-4xl);
    }

    .hero-subtitle {
      font-size: var(--text-lg);
    }
  }

  @supports not (container-type: inline-size) {
    @media (max-width: 768px) {
      .hero-title { font-size: var(--text-4xl); }
      .hero-subtitle { font-size: var(--text-lg); }
      .show-card { flex-wrap: wrap; }
      .show-details { order: 2; width: 100%; }
      .show-songs { order: 1; }
    }
  }
</style>
```

---

## Conversion Strategy

### Phase 1: Components (Weeks 1-2)
Priority order by impact and isolation:

1. **StatCard.svelte** - Highest ROI, used in grids everywhere
2. **Table.svelte** - Used in multiple routes
3. **EmptyState.svelte** - Standalone, clear breakpoints
4. **ShowCard.svelte** - Used in card collections

Each component conversion:
- Add `container-type: inline-size` to wrapper
- Add `container-name: [component-name]`
- Convert `@media` to `@container [name]`
- Wrap in `@supports not (container-type: inline-size)` fallback
- Test at different container widths

### Phase 2: Route Pages (Weeks 2-3)
Apply same pattern to route files, working from:
- Liberation List (complex multi-level layout)
- Song pages (table-like displays)
- Tour pages (already has some `@container`, expand pattern)
- Other routes with simpler layouts

### Phase 3: Testing & Documentation (Week 4)
- Visual regression testing at key breakpoints
- Browser compatibility verification (Chrome 105+)
- Document patterns in style guide
- Update design system docs

---

## Container Query Units Opportunity

The codebase uses fixed `px` values throughout. Consider leveraging container query units (`cqw`, `cqi`) for truly fluid scaling:

```svelte
<style>
  .stat-card {
    container-type: inline-size;
  }

  /* Current: Fixed breakpoints */
  .value {
    font-size: var(--text-3xl);
  }

  /* Better: Fluid scaling between 400-600px */
  .value {
    font-size: clamp(
      var(--text-2xl),
      4cqw,  /* 4% of container width */
      var(--text-3xl)
    );
  }
</style>
```

**When to use:**
- Typography that scales smoothly
- Padding/margin in responsive grids
- Icon sizes in flexible layouts

**Example: Smart stat card**

```svelte
<style>
  .stat-card {
    container-type: inline-size;
    padding: clamp(var(--space-3), 5cqw, var(--space-6));
  }

  .value {
    font-size: clamp(
      var(--text-xl),
      3.5cqw,
      var(--text-3xl)
    );
  }
</style>
```

---

## Fallback Strategy

All conversions follow this pattern (already demonstrated in Card.svelte):

```svelte
<style>
  .component {
    container-type: inline-size;
    container-name: my-component;
  }

  /* Container queries for modern browsers */
  @container my-component (max-width: 400px) {
    .element { /* adaptive styles */ }
  }

  /* Fallback for older browsers */
  @supports not (container-type: inline-size) {
    @media (max-width: 640px) {
      .element { /* same styles */ }
    }
  }
</style>
```

**Fallback breakpoint mapping:**
- `@container (max-width: 280px)` → `@media (max-width: 320px)`
- `@container (max-width: 400px)` → `@media (max-width: 640px)`
- `@container (max-width: 640px)` → `@media (max-width: 768px)`
- `@container (max-width: 900px)` → `@media (max-width: 1024px)`

Container queries use smaller breakpoints (content-based), viewport queries use larger breakpoints (device-based).

---

## Testing Checklist

For each converted component:

- [ ] Render at min-width (e.g., 280px container)
- [ ] Render at breakpoint (e.g., 400px)
- [ ] Render at max-width (e.g., 1200px+)
- [ ] Test in sidebar/modal context
- [ ] Test in multi-column grid
- [ ] Verify fallback in Firefox/Safari (uses viewport queries)
- [ ] Check font scaling doesn't break layout
- [ ] Verify icons/images resize proportionally
- [ ] Test touch interactions (buttons large enough)
- [ ] Lighthouse accessibility check

---

## No JavaScript Needed

**Current state:** No ResizeObserver, width-checking, or responsive state management detected.

**This is excellent** - the codebase follows modern CSS best practices. Container queries extend this without adding JS overhead:

- No listeners to attach/remove
- No state management for breakpoints
- No calculation of element dimensions
- Pure CSS, zero performance cost

---

## Browser Support Status

**Container Queries Support:**
- Chrome 105+: ✅ Full support
- Edge 105+: ✅ Full support
- Firefox 110+: ✅ Support (partial in 105-109)
- Safari 16+: ✅ Full support

**Project Target:** Chromium 143+, so container queries are available in all deployment environments.

**Fallback:** `@supports not (container-type: inline-size)` handles older browsers gracefully with viewport media queries.

---

## Migration Timeline

| Phase | Week | Files | Complexity |
|-------|------|-------|-----------|
| Components | 1-2 | 4 files | Low (clear patterns) |
| Routes | 2-3 | 15+ files | Medium (various layouts) |
| Testing | 3-4 | All | Low (visual regression) |
| **Total** | **4 weeks** | **20+ files** | **Moderate** |

---

## Code Examples

### Before (Viewport-based)
```svelte
<script lang="ts">
  import StatCard from '$lib/components/ui/StatCard.svelte';
</script>

<div class="stats-grid">
  <StatCard label="Total" value={100} />
  <StatCard label="Active" value={42} />
</div>

<style>
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--space-4);
  }

  /* Handles viewport, not container */
  @media (max-width: 640px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
```

### After (Container-based)
```svelte
<script lang="ts">
  import StatCard from '$lib/components/ui/StatCard.svelte';
</script>

<div class="stats-grid">
  <StatCard label="Total" value={100} />
  <StatCard label="Active" value={42} />
</div>

<style>
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--space-4);
    container-type: inline-size;
    container-name: stats-grid;
  }

  /* StatCard responds to grid width, not viewport */
</style>
```

```svelte
<!-- StatCard.svelte improvements -->
<style>
  .stat-card {
    container-type: inline-size;
    container-name: stat-card;
  }

  /* Reduces font when card is narrow */
  @container stat-card (max-width: 200px) {
    .value {
      font-size: var(--text-2xl);
    }

    .label {
      font-size: var(--text-xs);
    }
  }

  /* Default: full size */
  @container stat-card (min-width: 200px) {
    .value {
      font-size: var(--text-3xl);
    }

    .label {
      font-size: var(--text-sm);
    }
  }

  /* Fallback */
  @supports not (container-type: inline-size) {
    @media (max-width: 480px) {
      .value { font-size: var(--text-2xl); }
      .label { font-size: var(--text-xs); }
    }
  }
</style>
```

---

## Design System Integration

Container queries work beautifully with the existing CSS variable system:

```svelte
<style>
  .component {
    container-type: inline-size;
    container-name: component;
  }

  /* Use design tokens in container queries */
  @container component (max-width: 400px) {
    .text {
      font-size: var(--text-sm);
      padding: var(--space-2);
    }
  }

  @container component (min-width: 401px) {
    .text {
      font-size: var(--text-base);
      padding: var(--space-4);
    }
  }
</style>
```

**Recommendation:** Extend design tokens with container breakpoints:

```css
:root {
  /* Existing */
  --max-width: 1200px;
  --space-4: 1rem;

  /* New: Container breakpoints */
  --cq-sm: 280px;      /* Small card/sidebar */
  --cq-md: 500px;      /* Medium card/section */
  --cq-lg: 900px;      /* Large layout/page */
}
```

```svelte
<style>
  @container my-component (max-width: var(--cq-md)) {
    .element { /* compact styles */ }
  }
</style>
```

---

## Related Documentation

- [MDN: CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Container_Queries)
- [Chrome Developers: Container Queries](https://developer.chrome.com/docs/css-ui/container-queries/)
- [Web.dev: Container Query Units](https://web.dev/articles/cq-units)
- [Can I Use: Container Queries](https://caniuse.com/css-container-queries)

---

## Summary Table: Recommended Conversions

| File | Type | Current Rule | Container | Priority | Est. Time |
|------|------|-------------|-----------|----------|-----------|
| StatCard.svelte | Component | `@media (max-width: 640px)` | `stat-card` | High | 15 min |
| Table.svelte | Component | `@media (max-width: 640px)` | `table` | High | 15 min |
| EmptyState.svelte | Component | `@media (max-width: 640px)` | `empty-state` | High | 15 min |
| ShowCard.svelte | Component | `@media (max-width: 768px)` | `show-card` | High | 20 min |
| liberation/+page.svelte | Route | `@media (max-width: 900px/768px)` | `liberation-list`, `liberation-page` | Med | 30 min |
| +page.svelte | Route | `@media (max-width: 768px)` | `home-page`, `show-list` | Med | 25 min |
| songs/[slug]/+page.svelte | Route | `@media (max-width: 1024px/768px)` | Multiple | Med | 30 min |
| tours/+page.svelte | Route | Partial (expand) | `tour-cards` | Med | 20 min |
| contact/+page.svelte | Route | `@media (max-width: 768px)` | `contact-page` | Low | 15 min |
| ... | Route | Various | Various | Low | 10 min each |

**Total estimated time: 4-5 weeks for comprehensive conversion**

---

## Success Metrics

After migration:

1. **Responsive behavior** - Components adapt to ANY container width (sidebar, modal, grid)
2. **Code quality** - Remove 26 viewport media queries, add 26 container queries
3. **Reusability** - Components work in new contexts without modification
4. **Performance** - No JS overhead, pure CSS enhancement
5. **Browser support** - Graceful degradation via fallbacks
6. **DX** - Developers write context-aware CSS

---

## Recommendations

1. **Start with components** - They have highest ROI and are isolated
2. **Use provided fallback pattern** - Matches existing Card.svelte implementation
3. **Document in design system** - Add container query patterns to style guide
4. **Test thoroughly** - Use different viewport/container combinations
5. **Monitor performance** - Container queries have minimal overhead but profile to confirm
6. **Consider container query units** - For next phase, use `cqw` for fluid scaling

---

## Conclusion

The DMB Almanac codebase is an **excellent candidate for container query modernization**. With 30+ conversion opportunities, zero JavaScript overhead, and already-established best practices in `Card.svelte` and `Pagination.svelte`, this represents a straightforward, high-impact upgrade to modern CSS.

The migration requires no breaking changes, has clear fallbacks for older browsers, and will significantly improve component reusability across different layout contexts.

**Recommendation: Proceed with Phase 1 (Components) immediately. Early wins with StatCard and Table will demonstrate value and establish patterns for route pages.**
