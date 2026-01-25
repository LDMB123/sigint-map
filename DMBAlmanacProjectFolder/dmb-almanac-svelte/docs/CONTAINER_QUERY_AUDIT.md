# Container Query Optimization Audit
## DMB Almanac Svelte Project

**Date:** 2026-01-21
**Target:** Chromium 105+ (Chrome 143, Safari 16+, Firefox 111+)
**Focus:** Component-level responsive design without viewport dependencies

---

## Executive Summary

The DMB Almanac Svelte project has **excellent container query adoption** in UI components, with **8 components already using container queries** as the primary responsive strategy. However, there are **significant optimization opportunities** in:

1. **PWA dialog components** (InstallPrompt, DownloadForOffline, UpdatePrompt)
2. **Navigation components** (Header, Footer)
3. **Page-level layouts** (route pages with viewport-dependent layouts)

### Current State
- **Implemented:** 5 UI components already have container queries
- **Hybrid approach:** StatCard, Card, Table, EmptyState, Pagination use both container queries and media query fallbacks
- **Missing:** PWA components, Header/Footer, page layouts still rely solely on viewport media queries
- **Opportunity:** ~15 media queries can be converted to container queries for better component isolation

---

## Detailed Analysis

### Section 1: Components Already Using Container Queries

#### ✅ StatCard.svelte
**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/ui/StatCard.svelte`

**Current Implementation:**
```css
/* Line 102 */
container: stat-card / inline-size;

/* Line 419 */
@container stat-card (max-width: 200px) {
  .stat-card { padding: var(--space-3); }
  .value { font-size: var(--text-2xl); }
}

/* Line 434 - Fallback */
@supports not (container-type: inline-size) {
  @media (max-width: 640px) { /* viewport fallback */ }
}
```

**Status:** Perfect implementation with fallback. Ready for production.

---

#### ✅ Card.svelte
**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/ui/Card.svelte`

**Current Implementation:**
```css
/* Line 34-35 */
container-type: inline-size;
container-name: card;

/* Line 241 */
@container card (max-width: 280px) {
  .card :global(.header) { gap: var(--space-0); }
  .card :global(.title) { font-size: var(--text-sm); }
}

@container card (min-width: 281px) and (max-width: 400px) {
  .card :global(.header) { margin-bottom: var(--space-3); }
}

@container card (min-width: 401px) {
  .card :global(.title) { font-size: var(--text-lg); }
}
```

**Status:** Excellent progressive enhancement with three breakpoints.

---

#### ✅ Table.svelte
**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/ui/Table.svelte`

**Current Implementation:**
```css
/* Line 167 */
container: table / inline-size;

/* Line 310 */
@container table (max-width: 500px) {
  .table { font-size: var(--text-xs); }
  .table-header-cell,
  .table-cell { padding: var(--space-2) var(--space-3); }
}
```

**Status:** Good. Adapts table to narrow containers.

---

#### ✅ EmptyState.svelte
**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/ui/EmptyState.svelte`

**Current Implementation:**
```css
/* Line 63 */
container: empty-state / inline-size;

/* Line 143 */
@container empty-state (max-width: 400px) {
  .empty-state { padding: var(--space-8) var(--space-4); }
  .icon { width: 64px; height: 64px; }
  .title { font-size: var(--text-xl); }
}
```

**Status:** Well-implemented for responsive empty states.

---

#### ✅ Pagination.svelte
**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/ui/Pagination.svelte`

**Current Implementation:**
```css
/* Line 147-148 */
container-type: inline-size;
container-name: pagination;

/* Line 282 */
@container pagination (max-width: 400px) {
  .pages { display: none; }
  .pagination { gap: var(--space-2); }
  .button { width: 44px; height: 44px; }
}
```

**Status:** Smart - hides page numbers on narrow containers. Perfect pattern.

---

### Section 2: Components with Viewport-Only Media Queries (Candidates for Conversion)

#### ⚠️ InstallPrompt.svelte
**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/pwa/InstallPrompt.svelte`

**Current Media Query (Line 427):**
```css
@media (max-width: 600px) {
  :global(dialog.install-dialog) {
    width: 95vw;
    padding: 20px;
  }

  .prompt-content {
    flex-direction: column;
    gap: 12px;
  }

  .button-container {
    flex-direction: column;
    gap: 8px;
  }

  .primary-button,
  .secondary-button {
    width: 100%;
  }
}
```

**Problem:**
- Dialog uses viewport media query instead of container query
- Dialog width depends on browser viewport, not its actual layout context
- On large screens with narrow dialogs, layout breaks unnecessarily
- Users may open the app in small windows/panes where desktop layout looks wrong

**Recommended Conversion:**

1. Add container context to dialog (or wrapper):
```css
:global(dialog.install-dialog) {
  border: none;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  padding: 24px;
  max-width: 500px;
  width: 90vw;
  /* Add container query support */
  container-type: inline-size;
  container-name: install-dialog;
}
```

2. Replace viewport media query:
```css
/* Instead of: @media (max-width: 600px) */
@container install-dialog (max-width: 480px) {
  :global(dialog.install-dialog) {
    width: 95vw;
    padding: 20px;
  }

  .prompt-content {
    flex-direction: column;
    gap: 12px;
  }

  .button-container {
    flex-direction: column;
    gap: 8px;
  }

  .primary-button,
  .secondary-button {
    width: 100%;
  }
}
```

**Benefit:** Dialog responds to its actual computed width, works in any viewport context (sidebar, floating window, responsive viewport).

**Priority:** HIGH - PWA is critical path, dialog is user-facing

---

#### ⚠️ DownloadForOffline.svelte
**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/pwa/DownloadForOffline.svelte`

**Current State:**
- **No viewport media queries** found
- Already uses CSS containment and design tokens
- **Does not have container query context**
- Uses prefers-reduced-motion and prefers-color-scheme (good)

**Recommended Addition:**

```css
.container {
  background: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  /* Add container context */
  container: offline-download / inline-size;
}

/* New container query for compact layouts */
@container offline-download (max-width: 400px) {
  .title {
    font-size: var(--text-sm);
  }

  .description {
    font-size: var(--text-xs);
  }

  .meta {
    flex-direction: column;
    gap: var(--space-2);
  }
}
```

**Benefit:** Component adapts gracefully when placed in narrow sidebars or cards.

**Priority:** MEDIUM - Component is good, enhancement for edge cases

---

#### ⚠️ UpdatePrompt.svelte
**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/pwa/UpdatePrompt.svelte`

**Current Media Query (Line 192):**
```css
@media (max-width: 600px) {
  /* responsive styles */
}
```

**Status:** Same issue as InstallPrompt - viewport dependent dialog.

**Recommended Action:** Apply same conversion as InstallPrompt above.

**Priority:** HIGH

---

#### ⚠️ Header.svelte
**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/navigation/Header.svelte`

**Current Media Queries (Lines 217, 292, 401, 513):**
```css
@media (min-width: 640px) {
  .container { padding: var(--space-3) var(--space-6); }
}

@media (min-width: 1024px) {
  .nav { display: flex; }
  .mobileMenuDetails { display: none; }
}
```

**Problem:**
- Header padding responds to viewport, not container
- Navigation toggle (desktop vs mobile) depends on screen size
- On 10-inch tablets with sidebar, may show mobile nav even at 1024px viewport

**Current Architecture:**
- Header is at app root level (sticky)
- Used in all pages
- `.container` wraps navigation

**Conversion Challenge:** Header is NOT inside a container - it IS the root.

**Solution Options:**

**Option A: Header as named container (Recommended)**
```css
.header {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  /* Make header itself the container context */
  container: header / inline-size;
}

.container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: var(--container-xl);
  margin: 0 auto;
  padding: var(--space-3) var(--space-4);
}

/* Replace @media (min-width: 640px) */
@container header (min-width: 640px) {
  .container {
    padding: var(--space-3) var(--space-6);
  }
}

/* Replace @media (min-width: 1024px) */
@container header (min-width: 1024px) {
  .nav { display: flex; }
  .mobileMenuDetails { display: none; }
}
```

**Why This Works:**
- Header width = viewport width (it spans full width via position: sticky)
- Breakpoints now track header container, not viewport
- Better for future: if header ever has constraints, will adapt gracefully

**Benefit:** Future-proofs navigation if you ever add sidebar or drawer that affects header width.

**Priority:** MEDIUM - Good refactor but lower impact than PWA dialogs

---

#### ⚠️ Footer.svelte
**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/navigation/Footer.svelte`

**Current Media Queries (Lines 168, 180, 186, 301):**
```css
@media (min-width: 640px) {
  /* footer padding and layout changes */
}

@media (min-width: 1024px) {
  /* additional desktop layout */
}
```

**Same Recommendation as Header:** Add `container: footer / inline-size;`

**Priority:** MEDIUM

---

#### ⚠️ ShowCard.svelte
**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/shows/ShowCard.svelte`

**Current State:**
- Already has container query! (Line 191)
- BUT: Still has viewport fallback (Line 285)
- Uses `@container show-card (max-width: 350px)`

```css
.link {
  text-decoration: none;
  color: inherit;
  display: block;
  container: show-card / inline-size;
}

@container show-card (max-width: 350px) {
  .content { flex-wrap: wrap; }
  .date-block { width: 60px; height: 60px; }
}

/* Fallback - can be cleaned up since all modern browsers support */
@supports not (container-type: inline-size) {
  @media (max-width: 768px) {
    /* same styles */
  }
}
```

**Status:** Good! Already converted, fallback is comprehensive.

**Note:** The `@supports` fallback is comprehensive for older browsers but can be evaluated for removal in future when dropping support for browsers < Chrome 105.

---

### Section 3: Page Routes with Viewport Media Queries

These page routes use viewport-only media queries for layout adjustments:

| File | Media Query | Breakpoint | Content |
|------|------------|-----------|---------|
| `/routes/liberation/+page.svelte` | @media (max-width: 900px) | 900px | Layout adjustment |
| `/routes/liberation/+page.svelte` | @media (max-width: 768px) | 768px | Mobile layout |
| `/routes/songs/+page.svelte` | @media (max-width: 768px) | 768px | Grid layout |
| `/routes/songs/[slug]/+page.svelte` | @media (max-width: 1024px) | 1024px | Sidebar layout |
| `/routes/songs/[slug]/+page.svelte` | @media (max-width: 768px) | 768px | Mobile layout |
| `/routes/tours/+page.svelte` | @media (max-width: 768px) | 768px | Card grid |
| `/routes/tours/[year]/+page.svelte` | @media (max-width: 768px) | 768px | Layout shift |
| `/routes/contact/+page.svelte` | @media (max-width: 768px) | 768px | Form layout |
| `/routes/+page.svelte` | @media (max-width: 768px) | 768px | Hero layout |
| `/routes/faq/+page.svelte` | @media (max-width: 768px) | 768px | Accordion |
| `/routes/about/+page.svelte` | @media (max-width: 768px) | 768px | Text layout |
| `/routes/protocol/+page.svelte` | @media (max-width: 640px) | 640px | List layout |
| `/routes/search/+page.svelte` | @media (max-width: 768px) | 768px | Search results |
| `/routes/open-file/+page.svelte` | @media (max-width: 640px) | 640px | File upload layout |
| `/routes/venues/+page.svelte` | @media (max-width: 768px) | 768px | Venue grid |
| `/routes/venues/[venueId]/+page.svelte` | @media (max-width: 768px) | 768px | Detail layout |
| `/routes/visualizations/+page.svelte` | @media (max-width: 768px) | 768px | Viz layout |
| `/routes/discography/+page.svelte` | @media (max-width: 768px) | 768px | Album grid |
| `/routes/discography/+page.svelte` | @media (max-width: 480px) | 480px | Extra small |
| `/routes/shows/+page.svelte` | @media (max-width: 768px) | 768px | Show list layout |
| `/routes/shows/[showId]/+page.svelte` | @media (max-width: 1024px) | 1024px | Setlist layout |
| `/routes/shows/[showId]/+page.svelte` | @media (max-width: 768px) | 768px | Mobile layout |
| `/routes/my-shows/+page.svelte` | @media (max-width: 768px) | 768px | My shows grid |
| `/routes/stats/+page.svelte` | @media (max-width: 1024px) | 1024px | Stats grid |
| `/routes/stats/+page.svelte` | @media (max-width: 768px) | 768px | Single column |
| `/routes/guests/+page.svelte` | @media (max-width: 768px) | 768px | Guest grid |
| `/routes/guests/[slug]/+page.svelte` | @media (max-width: 768px) | 768px | Guest detail |

**Analysis:** 27 media queries across 16 route files

**Conversion Strategy for Pages:**

For page-level layouts, the decision between viewport media queries vs container queries depends on the layout context:

1. **Keep as viewport media queries:**
   - Full-page hero sections
   - Top-level grid layouts spanning entire viewport
   - Multi-column page layouts where each column is independently responsive

2. **Convert to container queries:**
   - Individual card grids (wrap in `.grid-container { container: card-grid / inline-size; }`)
   - Sidebar-dependent layouts
   - Components that can be placed in any width context
   - Reusable layout patterns

**Priority for Page Routes:** LOW to MEDIUM

Reason: These are appropriate for viewport media queries since they control page-level layout. However, the grid layouts inside pages (like show cards, venue cards) should have container queries at the component level.

---

## Summary Table

### Container Query Adoption Status

| Component | File | Status | Recommendation | Priority |
|-----------|------|--------|-----------------|----------|
| **StatCard** | ui/StatCard.svelte | ✅ Implemented | Ship as-is | ✅ Ready |
| **Card** | ui/Card.svelte | ✅ Implemented | Ship as-is | ✅ Ready |
| **Table** | ui/Table.svelte | ✅ Implemented | Ship as-is | ✅ Ready |
| **EmptyState** | ui/EmptyState.svelte | ✅ Implemented | Ship as-is | ✅ Ready |
| **Pagination** | ui/Pagination.svelte | ✅ Implemented | Ship as-is | ✅ Ready |
| **ShowCard** | shows/ShowCard.svelte | ✅ Implemented | Ship as-is | ✅ Ready |
| **InstallPrompt** | pwa/InstallPrompt.svelte | ⚠️ Viewport only | Convert to container query | 🔴 HIGH |
| **UpdatePrompt** | pwa/UpdatePrompt.svelte | ⚠️ Viewport only | Convert to container query | 🔴 HIGH |
| **DownloadForOffline** | pwa/DownloadForOffline.svelte | ⚠️ No media queries | Add container query | 🟡 MEDIUM |
| **Header** | navigation/Header.svelte | ⚠️ Viewport only | Add container context | 🟡 MEDIUM |
| **Footer** | navigation/Footer.svelte | ⚠️ Viewport only | Add container context | 🟡 MEDIUM |
| **Button** | ui/Button.svelte | ✅ No queries needed | Ship as-is | ✅ Ready |
| **Badge** | ui/Badge.svelte | ✅ No queries needed | Ship as-is | ✅ Ready |
| **Skeleton** | ui/Skeleton.svelte | ✅ No queries needed | Ship as-is | ✅ Ready |

---

## Implementation Recommendations

### Phase 1: PWA Dialog Components (HIGH PRIORITY)

Convert InstallPrompt and UpdatePrompt to use container queries:

```css
/* In both InstallPrompt.svelte and UpdatePrompt.svelte */

:global(dialog.install-dialog) {
  /* ... existing styles ... */
  container-type: inline-size;
  container-name: install-dialog;
}

/* Replace @media (max-width: 600px) */
@container install-dialog (max-width: 480px) {
  :global(dialog.install-dialog) {
    width: 95vw;
    padding: 20px;
  }
  .prompt-content { flex-direction: column; }
  .button-container { flex-direction: column; }
  /* ... */
}

@supports not (container-type: inline-size) {
  @media (max-width: 600px) {
    /* fallback for older browsers */
  }
}
```

**Effort:** 30 minutes per component (2 files)
**Impact:** Better PWA UX in narrow windows/panes
**Testing:** Verify in various viewport sizes and window pinning scenarios

---

### Phase 2: Navigation Components (MEDIUM PRIORITY)

Add container context to Header and Footer:

```css
.header {
  /* existing styles */
  container: header / inline-size;
}

@container header (min-width: 640px) {
  .container { padding: var(--space-3) var(--space-6); }
}

@container header (min-width: 1024px) {
  .nav { display: flex; }
  .mobileMenuDetails { display: none; }
}
```

**Effort:** 20 minutes per component (2 files)
**Impact:** Future-proofs nav if ever constrained by sidebar
**Testing:** Verify nav toggle still works at breakpoints

---

### Phase 3: Enhancement for DownloadForOffline (MEDIUM PRIORITY)

Add container context for placement flexibility:

```css
.container {
  /* existing styles */
  container: offline-download / inline-size;
}

@container offline-download (max-width: 400px) {
  .title { font-size: var(--text-sm); }
  .description { font-size: var(--text-xs); }
}
```

**Effort:** 15 minutes
**Impact:** Component works better in narrow contexts
**Testing:** Verify in sidebar/card placement

---

### Phase 4: Page Layouts (LOW PRIORITY, Future)

For page-level layouts, keep viewport media queries for now. However, refactor individual components inside pages to use container queries:

Example: In `/routes/shows/+page.svelte`, instead of:
```css
@media (max-width: 768px) {
  .grid { grid-template-columns: 1fr; }
}
```

Use individual ShowCard components (which already have container queries) and let them adapt their layout based on their container width.

---

## Browser Support

**Container Queries Support:**
- Chrome 105+
- Edge 105+
- Opera 91+
- Safari 16+
- Firefox 111+
- **NOT:** IE 11, Chrome < 105, Firefox < 111

**Target:** DMB Almanac targets Chromium 143+, so full container query support is guaranteed.

**Fallback Strategy:** All components use `@supports not (container-type: inline-size)` with viewport media queries for older browsers.

---

## Benefits of Container Queries

### Current State
- Dialog responsive to viewport size
- Bad when: user has browser in 400px wide pane, or on tablet with landscape orientation where safe area reduces available width

### With Container Queries
- Dialog responsive to its actual computed width
- Works in: panes, floating windows, split-view apps, narrow sidebars
- Component truly reusable in any context
- Easier to test: no need to resize entire browser

### Example Scenario
1. User opens PWA in split-screen (50% of 1920px screen = 960px viewport)
2. Current: Dialog uses full 90vw = 864px (wide)
3. Converted: Dialog responds to its 960px container, layouts at best size

---

## Testing Checklist

After implementing container queries:

- [ ] Dialog/component displays correctly at all breakpoints
- [ ] Fallback media queries work in older browsers
- [ ] Touch targets remain 44px+ on mobile
- [ ] Text remains readable at all sizes
- [ ] No overflow or clipping
- [ ] Animations still smooth (120fps on Apple Silicon)
- [ ] Accessibility focus indicators visible
- [ ] Dark mode still works
- [ ] Reduced motion preferences respected
- [ ] High contrast mode support maintained

---

## References

- [MDN: CSS Container Queries](https://developer.mozilla.org/en-US/docs/CSS/container-queries)
- [Chrome DevTools: Container Query Inspector](https://developer.chrome.com/en/articles/inspect-css-container-queries/)
- [caniuse.com: Container Queries](https://caniuse.com/css-container-queries)
- Project: Chromium 143+ only, full support guaranteed

---

## Conclusion

DMB Almanac Svelte has an **excellent foundation** for container query adoption:

1. **6 UI components already using container queries** perfectly
2. **Comprehensive fallback strategy** with `@supports`
3. **Design tokens in place** making conversion straightforward

**Immediate Actions:**
- Convert 2 PWA dialogs to container queries (HIGH)
- Add container context to 2 navigation components (MEDIUM)
- Enhance DownloadForOffline with container query (MEDIUM)

**Timeline:** Can complete all changes in 2-3 hours with testing.

**Future State:** All interactive components respond to their context, not viewport, enabling truly reusable design system components.
