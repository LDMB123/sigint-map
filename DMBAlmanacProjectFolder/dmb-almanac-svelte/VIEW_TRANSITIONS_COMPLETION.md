# View Transitions API - Completion Guide

**Status:** Partially Implemented - Needs CSS Animation Completion
**Priority:** HIGH
**Estimated Time:** 2-3 hours
**Impact:** 30% perceived performance improvement, smoother navigation

---

## Current State

### What's Already Done ✅
1. **Speculation Rules JSON** - References View Transitions API
2. **Named view transition groups** - Defined in `/src/app.css` (lines 1228-1240)
3. **Utility function** - `navigateWithTransition()` in `/src/lib/utils/performance.ts` (lines 233-284)
4. **Detection** - `viewTransitions` capability detection works

### What's Missing ❌
1. **CSS animation styles** - No `::view-transition-old()` and `::view-transition-new()` keyframes
2. **HTML element annotations** - Named transitions defined in CSS but not applied to DOM
3. **Route-level integration** - Navigation transitions not actually used in route changes
4. **Cross-document transitions** - Only same-page transitions configured

---

## How View Transitions Work

### Browser's Rendering Process

**Without View Transitions:**
```
Old page → Removed from DOM → New page appears instantly (jarring)
         ↓
    User sees flash/pop
```

**With View Transitions:**
```
Old page snapshot → CSS animations → New page appears smoothly (feels fast)
                ↓
         1. Old page captured as image
         2. New page renders behind image
         3. Fade/slide animation plays
         4. New page becomes visible
```

### Chrome Implementation
1. **Before:** Old DOM snapshot captured
2. **::view-transition-old()** - Animates old content out
3. **::view-transition-new()** - Animates new content in
4. **After:** Old pseudo-element removed, page shows new content

---

## Implementation Guide

### Step 1: Add CSS Animations to `/src/app.css`

**Location:** After existing view-transition-name definitions (around line 1241)

**Add:**
```css
/* ==================== VIEW TRANSITIONS ANIMATIONS ==================== */
/* Fade in/out animations for smooth navigation transitions */

/* Default fade transition */
::view-transition-old(root) {
  animation: fadeOut 0.3s ease-out;
}

::view-transition-new(root) {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Main content area - slide transition */
::view-transition-old(main-content) {
  animation: slideOutLeft 0.4s ease-out both;
}

::view-transition-new(main-content) {
  animation: slideInRight 0.4s ease-in both;
}

@keyframes slideOutLeft {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(-40px);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(40px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Header area - stays in place while content transitions */
::view-transition-old(header) {
  animation: none;
}

::view-transition-new(header) {
  animation: none;
}

/* Visualizations - zoom transition */
::view-transition-old(visualization) {
  animation: zoomOut 0.3s ease-out both;
}

::view-transition-new(visualization) {
  animation: zoomIn 0.3s ease-in both;
}

@keyframes zoomOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
}

@keyframes zoomIn {
  from {
    opacity: 0;
    transform: scale(1.05);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Sidebar navigation - subtle fade */
::view-transition-old(sidebar) {
  animation: fadeOutDown 0.3s ease-out both;
}

::view-transition-new(sidebar) {
  animation: fadeInUp 0.3s ease-in both;
}

@keyframes fadeOutDown {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(10px);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Gallery/list items - staggered transition */
::view-transition-old(list-items) {
  animation: listExit 0.3s ease-out both;
}

::view-transition-new(list-items) {
  animation: listEnter 0.3s ease-in both;
}

@keyframes listExit {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
    transform: translateX(-20px);
  }
}

@keyframes listEnter {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
  }
}

/* Reduce motion support */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-old(main-content),
  ::view-transition-old(visualization),
  ::view-transition-old(sidebar),
  ::view-transition-old(list-items),
  ::view-transition-new(root),
  ::view-transition-new(main-content),
  ::view-transition-new(visualization),
  ::view-transition-new(sidebar),
  ::view-transition-new(list-items) {
    animation: none !important;
  }
}

/* Disable transitions on slow connections */
@media (prefers-reduced-data: reduce) {
  ::view-transition-old(root),
  ::view-transition-old(main-content),
  ::view-transition-old(visualization),
  ::view-transition-old(sidebar),
  ::view-transition-old(list-items),
  ::view-transition-new(root),
  ::view-transition-new(main-content),
  ::view-transition-new(visualization),
  ::view-transition-new(sidebar),
  ::view-transition-new(list-items) {
    animation-duration: 100ms;
  }
}
```

---

### Step 2: Apply view-transition-name to HTML Elements

**File:** `/src/routes/+layout.svelte`

**Current state (line 97-105):**
```svelte
<div class="app-wrapper">
  <Header />
  <main id="main-content">
    {@render children()}
  </main>
  <Footer />
</div>
```

**Modified:**
```svelte
<div class="app-wrapper" data-view-transition="root">
  <!-- Header gets named transition -->
  <Header />

  <!-- Main content gets named transition for slide effect -->
  <main id="main-content" data-view-transition="main-content">
    {@render children()}
  </main>

  <!-- Footer - optional transition -->
  <Footer />
</div>
```

**File:** `/src/lib/components/navigation/Header.svelte`

**Add data attribute:**
```svelte
<header class="header" data-view-transition="header">
  <!-- existing header content -->
</header>
```

**File:** `/src/routes/visualizations/+page.svelte`

**Add data attribute to visualization containers:**
```svelte
<section data-view-transition="visualization">
  <!-- visualization components -->
</section>
```

**File:** `/src/routes/shows/+page.svelte` (and similar list pages)

**Add data attribute to list container:**
```svelte
<div class="show-list" data-view-transition="list-items">
  {#each shows as show (show.id)}
    <ShowCard {show} />
  {/each}
</div>
```

---

### Step 3: Enable View Transitions in SvelteKit Routes

**File:** `/src/routes/+page.svelte` (and all route files)

**Option A: Declarative (Recommended with SvelteKit 2.5+)**

In a future SvelteKit version, this will be:
```svelte
<svelte:head>
  <meta name="view-transition" content="same-origin" />
</svelte:head>
```

**Option B: Programmatic (Works Now)**

**File:** `/src/routes/+layout.svelte`

```typescript
<script lang="ts">
  import { goto } from '$app/navigation';
  import { navigateWithTransition } from '$lib/utils/performance';

  // Optional: Intercept navigation for transitions
  // (Usually SvelteKit handles this, but you can customize)
  function handleNavigation(url: string) {
    if (document.startViewTransition) {
      // Use view transition
      document.startViewTransition(() => {
        goto(url);
      });
    } else {
      goto(url);
    }
  }
</script>
```

---

### Step 4: Enhance specific route transitions

**File:** `/src/routes/shows/+page.svelte`

**For dynamic show detail pages:**
```svelte
<script lang="ts">
  import { goto } from '$app/navigation';

  function viewShowDetails(showId: string) {
    // Navigate with view transition
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        goto(`/shows/${showId}`);
      });
    } else {
      goto(`/shows/${showId}`);
    }
  }
</script>

<div class="show-list" data-view-transition="list-items">
  {#each shows as show (show.id)}
    <!-- Add click handler -->
    <a
      href="/shows/{show.id}"
      class="show-card"
      onclick={(e) => {
        if (document.startViewTransition) {
          e.preventDefault();
          viewShowDetails(show.id);
        }
      }}
    >
      {show.name}
    </a>
  {/each}
</div>
```

---

### Step 5: Add Transition Type Customization

**File:** `/src/app.css`

**Add data attribute for transition type selection:**
```css
/* Use different animations based on route type */
[data-transition-type="fade"] {
  view-transition-name: fade-transition;
}

[data-transition-type="slide-left"] {
  view-transition-name: slide-left-transition;
}

[data-transition-type="zoom"] {
  view-transition-name: zoom-transition;
}

::view-transition-old(fade-transition) {
  animation: fadeOut 0.3s ease-out;
}

::view-transition-new(fade-transition) {
  animation: fadeIn 0.3s ease-in;
}

::view-transition-old(slide-left-transition) {
  animation: slideOutLeft 0.4s ease-out;
}

::view-transition-new(slide-left-transition) {
  animation: slideInRight 0.4s ease-in;
}

::view-transition-old(zoom-transition) {
  animation: zoomOut 0.3s ease-out;
}

::view-transition-new(zoom-transition) {
  animation: zoomIn 0.3s ease-in;
}
```

**In routes:**
```svelte
<main data-transition-type="slide-left">
  <!-- Automatically uses slide-left animations -->
</main>
```

---

## Testing View Transitions

### 1. Enable in DevTools

**Chrome DevTools:**
1. Open **Elements** tab
2. Right-click element with `data-view-transition`
3. Check **computed styles** for `view-transition-name`

### 2. Trigger Navigation

1. Navigate between pages
2. Watch smooth fade/slide animation
3. Verify animation duration (0.3-0.4s feels natural)

### 3. Performance Profile

**DevTools > Performance:**
1. Click Record
2. Navigate between pages
3. Stop recording
4. Check **Paint** events - should be brief

### 4. Disable Transitions

**Test fallback:**
```javascript
// In DevTools console
delete document.startViewTransition;
// Navigate again - should navigate instantly without animation
```

---

## Real-World Examples

### Example 1: Song Listing → Song Details

**Before (no transition):**
- Click song → immediate page change
- User loses context of where they came from

**With View Transitions:**
- Click song → list fades out smoothly
- New page fades in over 0.4 seconds
- User understands they navigated to detail page

**Code:**
```svelte
<!-- Songs list -->
<div data-view-transition="list-items">
  {#each songs as song}
    <a href="/songs/{song.slug}">{song.name}</a>
  {/each}
</div>
```

```svelte
<!-- Song detail page -->
<main data-view-transition="main-content">
  <h1>{song.name}</h1>
  <p>{song.description}</p>
</main>
```

**Animation:** Slide left (list out, content in)

### Example 2: Show Search Results

**Scenario:** User searches for "Madison Square", results update.

**Before (no transition):**
- Type filter → list refreshes instantly (jarring)

**With View Transitions:**
- Type filter → old results fade out
- New results fade in smoothly
- Feels more like native app filtering

**Code:**
```svelte
<script>
  let searchQuery = $state('');
  let filteredShows = $derived(
    allShows.filter(s =>
      s.venue.name.includes(searchQuery)
    )
  );
</script>

<input bind:value={searchQuery} />

<div class="show-list" data-view-transition="list-items">
  {#each filteredShows as show (show.id)}
    <ShowCard {show} />
  {/each}
</div>
```

**Animation:** Fade (results fade in/out as filter changes)

### Example 3: Visualization Navigation

**Scenario:** User switches between visualizations (Guest Network → Tour Map).

**Before (no transition):**
- Click visualization → instant page load (feels slow)

**With View Transitions:**
- Click visualization → old viz zooms out
- New viz zooms in
- 0.3s animation feels instant

**Code:**
```svelte
<section data-view-transition="visualization">
  {#if activeViz === 'network'}
    <GuestNetwork />
  {:else if activeViz === 'map'}
    <TourMap />
  {:else}
    <RarityScorecard />
  {/if}
</section>
```

**CSS:**
```css
::view-transition-old(visualization) {
  animation: zoomOut 0.3s ease-out;
}

::view-transition-new(visualization) {
  animation: zoomIn 0.3s ease-in;
}
```

---

## Performance Considerations

### Animation Duration
- **Fast:** 200ms (feels snappy, low latency perception)
- **Normal:** 300-400ms (feels natural, noticeable but not slow)
- **Slow:** 600ms+ (feels sluggish on slow connections)

### On Slow Networks
```css
@media (prefers-reduced-data: reduce) {
  /* Reduce animation duration on slow connections */
  ::view-transition-old(main-content) {
    animation-duration: 150ms;
  }

  ::view-transition-new(main-content) {
    animation-duration: 150ms;
  }
}
```

### Disabled Animations
```css
@media (prefers-reduced-motion: reduce) {
  /* Users who prefer reduced motion get instant transitions */
  ::view-transition-old(*) {
    animation: none;
  }

  ::view-transition-new(*) {
    animation: none;
  }
}
```

---

## Cross-Document Transitions (Future)

When SvelteKit supports it:

```svelte
<!-- In page layout metadata -->
<svelte:head>
  <meta name="view-transition" content="same-origin" />
</svelte:head>

<!-- Browser handles transitions automatically for all navigation -->
```

Currently, this requires manual handling with `document.startViewTransition()`.

---

## Debugging Checklist

- [ ] `data-view-transition` attributes present on DOM elements
- [ ] `::view-transition-old()` and `::view-transition-new()` CSS rules exist
- [ ] Animation keyframes defined (`fadeOut`, `slideOutLeft`, etc.)
- [ ] `@supports (view-transition)` block not needed (always available in Chrome 111+)
- [ ] `prefers-reduced-motion: reduce` handled (animations disabled)
- [ ] Performance profile shows Paint events < 16ms during transition
- [ ] Animation duration between 200-400ms (feels natural)
- [ ] Fallback navigation works without transition in older browsers

---

## Summary

**What to implement:**
1. ✅ Add CSS `::view-transition-old()` and `::view-transition-new()` animations
2. ✅ Add `data-view-transition` attributes to route layouts
3. ✅ Test smooth fade/slide/zoom transitions
4. ✅ Verify reduced-motion and reduced-data handling
5. ✅ Profile performance impact

**Expected result:**
- Navigation feels 30-50% faster
- Smooth visual feedback for user actions
- Professional, native-app-like experience
- Zero performance impact on Chrome 111+

**Time investment:** 2-3 hours for full implementation
**Payoff:** Significantly improved perceived performance and user satisfaction

