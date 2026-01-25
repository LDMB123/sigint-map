# Container Query Conversion Reference

**Quick lookup for all files needing conversion**

---

## High Priority Components (Phase 1)

### 1. StatCard.svelte
**Path:** `/src/lib/components/ui/StatCard.svelte`
**Status:** ⏳ Ready for conversion
**Lines:** 416-428 (responsive section)
**Rule:** `@media (max-width: 640px)`
**Converts to:** `@container stat-card (max-width: 320px)`
**Complexity:** LOW
**Est. Time:** 15 min
**Impact:** HIGH (used in multiple grids/dashboards)

**What to change:**
- Add `container-type: inline-size;` to `.stat-card`
- Add `container-name: stat-card;`
- Change `@media (max-width: 640px)` to `@container stat-card (max-width: 320px)`
- Add `@supports not` fallback with `@media (max-width: 480px)`

---

### 2. Table.svelte
**Path:** `/src/lib/components/ui/Table.svelte`
**Status:** ⏳ Ready for conversion
**Lines:** 306-319 (responsive section)
**Rules:** `@media (max-width: 640px)`
**Converts to:** `@container table (max-width: 640px)`
**Complexity:** LOW
**Est. Time:** 15 min
**Impact:** HIGH (used in multiple routes)

**What to change:**
- Add `container-type: inline-size;` to `.table-wrapper`
- Add `container-name: table;`
- Change `@media (max-width: 640px)` to `@container table (max-width: 640px)`
- Add `@supports not` fallback

---

### 3. EmptyState.svelte
**Path:** `/src/lib/components/ui/EmptyState.svelte`
**Status:** ⏳ Ready for conversion
**Lines:** 140-150+ (responsive section)
**Rules:** `@media (max-width: 640px)`
**Converts to:** `@container empty-state (max-width: 640px)`
**Complexity:** LOW
**Est. Time:** 15 min
**Impact:** MEDIUM (used in empty states throughout)

**What to change:**
- Add `container-type: inline-size;` to `.empty-state`
- Add `container-name: empty-state;`
- Change `@media` to `@container`
- Add `@supports not` fallback

---

### 4. ShowCard.svelte
**Path:** `/src/lib/components/shows/ShowCard.svelte`
**Status:** ⏳ Ready for conversion
**Lines:** 264-277 (responsive section)
**Rules:** `@media (max-width: 768px)`
**Converts to:** `@container show-card (max-width: 500px)`
**Complexity:** LOW
**Est. Time:** 20 min
**Impact:** MEDIUM (used in card grids/collections)

**What to change:**
- Add `container-type: inline-size;` to `.content`
- Add `container-name: show-card;`
- Change `@media (max-width: 768px)` to `@container show-card (max-width: 500px)`
- Add `@supports not` fallback

---

## Already Using Container Queries ✅

### Card.svelte
**Path:** `/src/lib/components/ui/Card.svelte`
**Status:** ✅ DONE (best practice example)
**Lines:** 34-278
**Implementation:** `@container card (max-width: 280px)` with fallback

**Use as reference pattern for all conversions.**

---

### Pagination.svelte
**Path:** `/src/lib/components/ui/Pagination.svelte`
**Status:** ✅ DONE (container-aware breakpoint mapping)
**Lines:** 147-295
**Implementation:** `@container pagination (max-width: 400px)` with fallback

**Demonstrates smart breakpoint mapping (container breakpoint smaller than media query fallback).**

---

## Medium Priority Routes (Phase 2)

### Liberation List Page
**Path:** `/src/routes/liberation/+page.svelte`
**Status:** ⏳ Ready for conversion
**Lines:** 375-422 (two separate @media blocks)
**Rules:**
  - `@media (max-width: 900px)` - List layout
  - `@media (max-width: 768px)` - Page layout
**Converts to:**
  - `@container liberation-list (max-width: 900px)`
  - `@container liberation-page (max-width: 768px)`
**Complexity:** MEDIUM
**Est. Time:** 30 min
**Impact:** MEDIUM

---

### Homepage
**Path:** `/src/routes/+page.svelte`
**Status:** ⏳ Ready for conversion
**Lines:** 326-347
**Rules:** `@media (max-width: 768px)`
**Converts to:**
  - `@container show-list (max-width: 500px)`
  - `@container home-page (max-width: 768px)`
**Complexity:** LOW
**Est. Time:** 25 min
**Impact:** MEDIUM

---

### Song Detail Page
**Path:** `/src/routes/songs/[slug]/+page.svelte`
**Status:** ⏳ Ready for conversion
**Lines:** 610, 625 (two separate @media blocks)
**Rules:**
  - `@media (max-width: 1024px)`
  - `@media (max-width: 768px)`
**Complexity:** MEDIUM
**Est. Time:** 30 min

---

### Tour List Page
**Path:** `/src/routes/tours/+page.svelte`
**Status:** ⏳ Partially converted
**Lines:** 250 (still has @media)
**Notes:** Already has some `@container tourcard` usage (line 304+)
**Est. Time:** 20 min

---

### Tour Year Page
**Path:** `/src/routes/tours/[year]/+page.svelte`
**Status:** ⏳ Ready for conversion
**Lines:** 383
**Rules:** `@media (max-width: 768px)`
**Est. Time:** 20 min

---

### Contact Page
**Path:** `/src/routes/contact/+page.svelte`
**Status:** ⏳ Ready for conversion
**Lines:** 291
**Rules:** `@media (max-width: 768px)`
**Est. Time:** 15 min

---

### FAQ Page
**Path:** `/src/routes/faq/+page.svelte`
**Status:** ⏳ Ready for conversion
**Lines:** 329
**Rules:** `@media (max-width: 768px)`
**Est. Time:** 15 min

---

### About Page
**Path:** `/src/routes/about/+page.svelte`
**Status:** ⏳ Ready for conversion
**Lines:** 254
**Rules:** `@media (max-width: 768px)`
**Est. Time:** 15 min

---

### Search Page
**Path:** `/src/routes/search/+page.svelte`
**Status:** ⏳ Ready for conversion
**Lines:** 796
**Rules:** `@media (max-width: 768px)`
**Est. Time:** 15 min

---

### Venues Page
**Path:** `/src/routes/venues/+page.svelte`
**Status:** ⏳ Ready for conversion
**Lines:** 370
**Rules:** `@media (max-width: 768px)`
**Est. Time:** 15 min

---

### Visualizations Page
**Path:** `/src/routes/visualizations/+page.svelte`
**Status:** ⏳ Ready for conversion
**Lines:** 596
**Rules:** `@media (max-width: 768px)`
**Est. Time:** 15 min

---

### Discography Page
**Path:** `/src/routes/discography/+page.svelte`
**Status:** ⏳ Ready for conversion
**Lines:** 547, 589 (two separate @media blocks)
**Rules:**
  - `@media (max-width: 768px)`
  - `@media (max-width: 480px)`
**Est. Time:** 25 min

---

### Shows List Page
**Path:** `/src/routes/shows/+page.svelte`
**Status:** ⏳ Ready for conversion
**Lines:** 367
**Rules:** `@media (max-width: 768px)`
**Est. Time:** 15 min

---

### Show Detail Page
**Path:** `/src/routes/shows/[showId]/+page.svelte`
**Status:** ⏳ Ready for conversion
**Lines:** 788, 799 (two separate @media blocks)
**Rules:**
  - `@media (max-width: 1024px)`
  - `@media (max-width: 768px)`
**Est. Time:** 25 min

---

### My Shows Page
**Path:** `/src/routes/my-shows/+page.svelte`
**Status:** ⏳ Ready for conversion
**Lines:** 843
**Rules:** `@media (max-width: 768px)`
**Est. Time:** 15 min

---

### Statistics Page
**Path:** `/src/routes/stats/+page.svelte`
**Status:** ⏳ Ready for conversion
**Lines:** 401, 411 (two separate @media blocks)
**Rules:**
  - `@media (max-width: 1024px)`
  - `@media (max-width: 768px)`
**Est. Time:** 25 min

---

### Guests Page
**Path:** `/src/routes/guests/+page.svelte`
**Status:** ⏳ Ready for conversion
**Lines:** 247
**Rules:** `@media (max-width: 768px)`
**Est. Time:** 15 min

---

### Guest Detail Page
**Path:** `/src/routes/guests/[slug]/+page.svelte`
**Status:** ⏳ Ready for conversion
**Lines:** 359
**Rules:** `@media (max-width: 768px)`
**Est. Time:** 15 min

---

## Other Components Using @media (Non-responsive)

These use `@media` for **system features**, not responsive layout. No conversion needed:

- **Button.svelte** - `@media (forced-colors)`
- **Skeleton.svelte** - `@media (prefers-color-scheme)`, `@media (prefers-reduced-motion)`
- **Badge.svelte** - `@media (prefers-color-scheme)`
- **Header.svelte** - `@media (min-width)` for layout, `@media (prefers-color-scheme)`, `@media (forced-colors)`
- **Footer.svelte** - `@media (min-width)` for layout, `@media (prefers-color-scheme)`
- **UpdatePrompt.svelte** - `@media (max-width)` for modal layout
- **LoadingScreen.svelte** - `@media` for screen size, motion preferences
- **InstallPrompt.svelte** - `@media (max-width)` for dialog layout
- **DownloadForOffline.svelte** - `@media (prefers-color-scheme)`

**Note:** Header and Footer use min-width media queries for main layout. Consider converting these too if they're placed in flexible containers.

---

## Quick Stats

| Category | Count |
|----------|-------|
| **High Priority (Phase 1)** | 4 components |
| **Already Done** | 2 components |
| **Medium Priority (Phase 2)** | 18 routes |
| **Total convertible @media rules** | 26 rules |
| **System-only @media** | 16+ rules (keep as-is) |
| **Total estimated time** | 4-5 weeks |

---

## Phase 1 Checklist

- [ ] StatCard.svelte - Converted & tested
- [ ] Table.svelte - Converted & tested
- [ ] EmptyState.svelte - Converted & tested
- [ ] ShowCard.svelte - Converted & tested
- [ ] All Phase 1 tests passing
- [ ] Documentation updated

**Estimated completion:** Week 2

---

## Phase 2 Checklist

- [ ] Liberation page - Converted & tested
- [ ] Homepage - Converted & tested
- [ ] Song detail - Converted & tested
- [ ] Tour pages - Converted & tested
- [ ] Contact/FAQ/About - Converted & tested
- [ ] Search/Venues/Visualizations - Converted & tested
- [ ] Discography/Shows - Converted & tested
- [ ] Statistics/Guests - Converted & tested
- [ ] All Phase 2 tests passing

**Estimated completion:** Week 3

---

## Implementation Order Recommendation

### Week 1 (Start here)
1. StatCard.svelte
2. Table.svelte
3. EmptyState.svelte
4. ShowCard.svelte

### Week 2-3
5. liberation/+page.svelte (most complex)
6. +page.svelte (homepage, widely used)
7. songs/[slug]/+page.svelte
8. tours/+page.svelte (already partially done)
9. contact/+page.svelte
10. +page.svelte components

...continue with remaining routes

### Week 4
- Full regression testing
- Documentation & training
- Deploy with confidence

---

## Testing Checklist (Per File)

When converting each file:

- [ ] Add `container-type: inline-size`
- [ ] Add `container-name: [descriptive-name]`
- [ ] Convert all responsive `@media` to `@container`
- [ ] Add `@supports not (container-type)` fallback
- [ ] Test at minimum width (280-300px)
- [ ] Test at breakpoint (400-500px)
- [ ] Test at maximum width (1200px+)
- [ ] Test in sidebar context (if applicable)
- [ ] Test in modal (if applicable)
- [ ] Test in multi-column grid
- [ ] Run Lighthouse (accessibility)
- [ ] Verify Firefox fallback works
- [ ] Verify Safari fallback works
- [ ] No layout regressions
- [ ] No z-index issues
- [ ] Hover states work
- [ ] Focus states work
- [ ] Touch targets adequate (44px minimum)

---

## Code Template (Copy-Paste Ready)

Every conversion follows this pattern:

```svelte
<style>
  /* Add to main wrapper element */
  .element {
    container-type: inline-size;
    container-name: descriptive-name;
  }

  /* Convert existing @media (max-width/min-width) */
  @container descriptive-name (max-width: 400px) {
    /* existing styles */
  }

  /* Add fallback for older browsers */
  @supports not (container-type: inline-size) {
    @media (max-width: 640px) {
      /* same styles as @container */
    }
  }
</style>
```

---

## Documentation Files

- **CONTAINER_QUERY_AUDIT.md** - Full technical analysis (15 pages)
- **CONTAINER_QUERY_IMPLEMENTATION.md** - Ready-to-copy code (complete implementations)
- **CONTAINER_QUERY_SUMMARY.md** - Executive overview (this is the quick version)
- **CONTAINER_QUERY_FILES.md** - This file (quick lookup reference)

---

## References

- [MDN: CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Container_Queries)
- [Chrome Developers: Container Queries](https://developer.chrome.com/docs/css-ui/container-queries/)
- [Can I Use: Container Queries](https://caniuse.com/css-container-queries)

---

## Next Step

Pick **StatCard.svelte** and start converting. See `CONTAINER_QUERY_IMPLEMENTATION.md` for the complete code example.

**Time to first conversion:** 15 minutes
**Time to first PR:** 30 minutes
**Time to team understanding:** By end of week 1

Go! 🚀
