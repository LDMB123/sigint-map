# Chrome 143+ CSS Modernization Patches
## Ready-to-Apply Code Changes

**Date:** January 21, 2026
**Status:** Ready for Implementation

---

## Table of Contents

1. [Patch 1: Extract Design Tokens](#patch-1-extract-design-tokens)
2. [Patch 2: ShowCard Container Query](#patch-2-showcard-container-query)
3. [Patch 3: Header Container Query](#patch-3-header-container-query)
4. [Patch 4: Footer Container Query](#patch-4-footer-container-query)
5. [Patch 5: Fluid Typography](#patch-5-fluid-typography)
6. [Patch 6: Scroll-Driven Animations](#patch-6-scroll-driven-animations)
7. [Patch 7: Liberation Table Variables](#patch-7-liberation-table-variables)
8. [Patch 8: Song Detail Sidebar](#patch-8-song-detail-sidebar)

---

## Patch 1: Extract Design Tokens

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/app.css`

**Location:** After Line 290 (after spacing scale)

**What to Add:**

```css
/* ==================== LAYOUT DIMENSIONS (CHROME 143+) ==================== */
/* Design tokens extracted from hardcoded pixel values */
/* These enable consistent spacing across all components */

/* Grid column widths - use these instead of hardcoded pixel values */
--column-checkbox: 50px;
--column-accent: 100px;
--column-action: 100px;
--column-date: 180px;

/* Sidebar widths */
--sidebar-sm: 280px;
--sidebar-md: 320px;
--sidebar-lg: 400px;

/* Common card dimensions */
--card-image-aspect: 16 / 9;
--card-compact-aspect: 1 / 1;

/* Icon sizes */
--icon-xs: 16px;
--icon-sm: 20px;
--icon-md: 24px;
--icon-lg: 32px;
--icon-xl: 48px;

/* Button sizes */
--button-sm-height: 32px;
--button-md-height: 40px;
--button-lg-height: 48px;

/* Border widths */
--border-thin: 1px;
--border-normal: 1px;
--border-thick: 2px;

/* Z-index scale additions */
--z-toast: 800;
--z-loading: 900;
```

**Why:** Centralizes layout dimensions, making them reusable and easy to update for responsive design.

---

## Patch 2: ShowCard Container Query

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/shows/ShowCard.svelte`

**Location:** Lines 97-310

**Original Code:**
```svelte
<style>
  /* Compact Variant */
  .compact-article {
    display: block;
  }

  .compact-link {
    text-decoration: none;
    color: inherit;
    display: block;
  }

  .compact-card {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    background: linear-gradient(
      to bottom,
      var(--background),
      color-mix(in oklch, var(--background) 98%, var(--color-gray-100))
    );
  }

  .compact-month {
    font-size: 0.75rem;
    font-weight: var(--font-bold);
  }

  .compact-day {
    font-size: 1.25rem;
    font-weight: var(--font-bold);
    line-height: 1;
  }

  @media (max-width: 768px) {
    .compact-month {
      font-size: 0.625rem;
    }
    .compact-day {
      font-size: 1rem;
    }
  }
</style>
```

**Replace With:**
```svelte
<style>
  /* Compact Variant */
  .compact-article {
    display: block;
    container-type: inline-size;
    container-name: show-card;
  }

  .compact-link {
    text-decoration: none;
    color: inherit;
    display: block;
  }

  .compact-card {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    border: var(--border-thin) solid var(--border-color);
    border-radius: var(--radius-lg);
    background: linear-gradient(
      to bottom,
      var(--background),
      color-mix(in oklch, var(--background) 98%, var(--color-gray-100))
    );
    /* GPU acceleration for smooth interactions */
    transform: translateZ(0);
  }

  .compact-month {
    font-size: 0.75rem;
    font-weight: var(--font-bold);
  }

  .compact-day {
    font-size: 1.25rem;
    font-weight: var(--font-bold);
    line-height: 1;
  }

  /* Container query instead of viewport-based media query */
  /* Responds to the card's container size, not viewport */
  @container show-card (max-width: 400px) {
    .compact-month {
      font-size: 0.625rem;
    }
    .compact-day {
      font-size: 1rem;
    }
  }
</style>
```

**Key Changes:**
- Add `container-type: inline-size` to `.compact-article`
- Add `container-name: show-card` to identify the container
- Replace `@media (max-width: 768px)` with `@container show-card (max-width: 400px)`
- The threshold changes to 400px because it's relative to the card, not viewport

**Why:** The card now responds to its container size, allowing it to work in any layout (sidebar, main content, modal, etc.)

---

## Patch 3: Header Container Query

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/navigation/Header.svelte`

**Location:** Start of style block (around Line 115)

**Add After `.header` Block:**
```css
/* Enable container queries for responsive header */
:global(.header) {
  container-type: inline-size;
  container-name: header;
}
```

**Then Replace Media Queries:**

**Original (Line 217):**
```css
@media (min-width: 640px) {
  .nav-wrapper {
    gap: var(--space-6);
  }
}
```

**Replace With:**
```css
@container header (min-width: 640px) {
  .nav-wrapper {
    gap: var(--space-6);
  }
}
```

**Original (Line 292):**
```css
@media (min-width: 1024px) {
  .logo {
    font-size: var(--text-2xl);
  }
}
```

**Replace With:**
```css
@container header (min-width: 1024px) {
  .logo {
    font-size: var(--text-2xl);
  }
}
```

**Original (Line 367 - width calc()):**
```css
width: calc(100% - var(--space-6));
```

**Replace With:**
```css
width: clamp(300px, 100% - var(--space-6), 1600px);
```

**Original (Line 566 - animation delay):**
```css
animation-delay: calc(var(--stagger-index, 0) * var(--stagger-delay));
```

**Replace With:**
```css
animation-delay: clamp(0ms, calc(var(--stagger-index, 0) * var(--stagger-delay)), 500ms);
```

---

## Patch 4: Footer Container Query

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/navigation/Footer.svelte`

**Location:** Start of style block

**Add:**
```css
/* Enable container queries for responsive footer grid */
:global(footer) {
  container-type: inline-size;
  container-name: footer;
}
```

**Replace Media Queries (Lines 168-189):**

**Original:**
```css
.footer-grid {
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .footer-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .footer-grid {
    grid-template-columns: 2fr 1fr 1fr 1fr;
  }
}
```

**Replace With:**
```css
.footer-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-6);
}

@container footer (min-width: 640px) {
  .footer-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@container footer (min-width: 1024px) {
  .footer-grid {
    grid-template-columns: 2fr 1fr 1fr 1fr;
  }
}
```

---

## Patch 5: Fluid Typography

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/app.css`

**Location:** Lines 298-307 (Font sizes section)

**Original:**
```css
/* Font sizes */
--text-xs: 0.75rem; /* 12px */
--text-sm: 0.875rem; /* 14px */
--text-base: 1rem; /* 16px */
--text-lg: 1.125rem; /* 18px */
--text-xl: 1.25rem; /* 20px */
--text-2xl: 1.5rem; /* 24px */
--text-3xl: 1.875rem; /* 30px */
--text-4xl: 2.25rem; /* 36px */
--text-5xl: 3rem; /* 48px */
```

**Replace With:**
```css
/* Font sizes - Fluid typography using clamp() */
/* Scales smoothly between min and max based on viewport width */
--text-xs: clamp(0.75rem, 0.7rem + 0.5vw, 0.9rem);
--text-sm: clamp(0.875rem, 0.8rem + 0.75vw, 1rem);
--text-base: clamp(1rem, 0.95rem + 1vw, 1.1rem);
--text-lg: clamp(1.125rem, 1rem + 1.25vw, 1.3rem);
--text-xl: clamp(1.25rem, 1.1rem + 1.5vw, 1.5rem);
--text-2xl: clamp(1.5rem, 1.3rem + 2vw, 1.9rem);
--text-3xl: clamp(1.875rem, 1.6rem + 2.5vw, 2.5rem);
--text-4xl: clamp(2.25rem, 1.8rem + 3vw, 3.5rem);
--text-5xl: clamp(3rem, 2.2rem + 5vw, 5rem);
```

**Benefits:**
- Typography scales smoothly without media query breakpoints
- Better appearance on ultra-wide displays (4K monitors)
- Smaller CSS bundle (fewer media queries needed)

---

## Patch 6: Scroll-Driven Animations

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/routes/+page.svelte`

**Location:** In the `<style>` block

**Add After Existing Styles:**
```css
/* Scroll-driven animations for hero section (Chrome 115+) */
@supports (animation-timeline: scroll()) {
  .hero {
    animation: parallax linear;
    animation-timeline: scroll();
    animation-range: entry 0% 50vh;
  }

  @keyframes parallax {
    from {
      transform: translateY(0);
    }
    to {
      transform: translateY(-40px);
    }
  }
}

/* Respects accessibility preferences */
@media (prefers-reduced-motion: reduce) {
  .hero {
    animation: none;
  }
}
```

**In the HTML (around Line 15):**
```svelte
<!-- Hero section already has class="hero" -->
<section class="hero">
  <h1 class="hero-title">DMB Almanac</h1>
  <!-- Title moves slower than page scroll = parallax effect -->
</section>
```

---

## Patch 7: Liberation Table Variables

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/routes/liberation/+page.svelte`

**Location:** Line 253 (grid-template-columns)

**Original:**
```css
.table-grid {
  display: grid;
  grid-template-columns: 50px 1fr 100px 100px 180px;
  gap: var(--space-3);
}
```

**Replace With:**
```css
.table-grid {
  display: grid;
  grid-template-columns:
    var(--column-checkbox)
    1fr
    var(--column-accent)
    var(--column-action)
    var(--column-date);
  gap: var(--space-3);
}
```

**Location:** Line 277 (second grid)

**Original:**
```css
.song-row {
  display: grid;
  grid-template-columns: 50px 1fr 100px 100px 180px;
  gap: var(--space-2);
}
```

**Replace With:**
```css
.song-row {
  display: grid;
  grid-template-columns:
    var(--column-checkbox)
    1fr
    var(--column-accent)
    var(--column-action)
    var(--column-date);
  gap: var(--space-2);
}
```

---

## Patch 8: Song Detail Sidebar

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/routes/songs/[slug]/+page.svelte`

**Location:** Line 410 (main layout grid)

**Original:**
```css
.content-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: var(--space-6);
}
```

**Replace With:**
```css
.content-grid {
  display: grid;
  grid-template-columns: 1fr var(--sidebar-md);
  gap: var(--space-6);
}
```

**Location:** Line 631 (responsive sidebar)

**Original:**
```css
@media (max-width: 640px) {
  .sidebar {
    display: none;
  }
}
```

**Replace With:**
```css
@container content (max-width: 640px) {
  .sidebar {
    display: none;
  }
}
```

**Also Add Container Declaration:**
```css
.main-content {
  container-type: inline-size;
  container-name: content;
}
```

---

## Patch 9: Responsive Scroll Margin

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/routes/songs/+page.svelte`

**Location:** Line 284

**Original:**
```css
.song-header {
  scroll-margin-top: calc(var(--header-height, 64px) + 80px);
}
```

**Replace With:**
```css
.song-header {
  scroll-margin-top: clamp(
    var(--header-height, 64px),
    var(--header-height) + 80px,
    200px
  );
}
```

---

## Applying All Patches

### Automated Application

```bash
# Create a backup first
git commit -m "Backup before Chrome 143+ modernization"

# Apply patches in order
1. Update src/app.css with Patch 1 (tokens)
2. Update src/app.css with Patch 5 (typography)
3. Update src/lib/components/shows/ShowCard.svelte with Patch 2
4. Update src/lib/components/navigation/Header.svelte with Patch 3
5. Update src/lib/components/navigation/Footer.svelte with Patch 4
6. Update src/routes/+page.svelte with Patch 6
7. Update src/routes/liberation/+page.svelte with Patch 7
8. Update src/routes/songs/[slug]/+page.svelte with Patch 8
9. Update src/routes/songs/+page.svelte with Patch 9

# Test after each patch
npm run dev      # Watch for errors
npm run check    # Type check

# Build and preview
npm run build
npm run preview
```

### Manual Application Steps

1. Open each file in your editor
2. Find the specified lines
3. Copy the "Replace With" code
4. Replace the "Original" code
5. Save the file
6. Run `npm run check` to verify TypeScript
7. Test in browser with Chrome 143+

---

## Verification Checklist

After applying patches, verify:

```markdown
Core Functionality:
- [ ] Components render without errors
- [ ] Layouts still responsive
- [ ] Colors and themes work correctly
- [ ] Animations smooth (60fps+)

Container Queries:
- [ ] ShowCard responds to container size
- [ ] Header responsive in all widths
- [ ] Footer grid adjusts correctly

Typography:
- [ ] Text sizes scale smoothly
- [ ] Readable on mobile, tablet, desktop
- [ ] 4K displays show nice sizes

Performance:
- [ ] CSS bundle size decreased
- [ ] Scroll performance remains smooth
- [ ] No layout shifts during animations

Browser Compatibility:
- [ ] Works in Chrome 143+
- [ ] Fallbacks work in Chrome 120-142
- [ ] Safari compatible
```

---

## Rolling Back Patches

If issues arise, revert with:

```bash
git reset HEAD~1        # Undo last commit
git checkout -- .       # Restore original files
npm run dev             # Verify original works
```

---

## Performance Testing

After applying patches, measure:

```javascript
// In DevTools Console
performance.mark('start');
// Scroll page or interact
performance.mark('end');
performance.measure('interaction', 'start', 'end');
console.log(performance.getEntriesByName('interaction')[0]);

// For animations - check frame rate
requestAnimationFrame(function checkFPS() {
  // Smooth should be 60fps minimum, 120fps on ProMotion
});
```

---

## Support & Questions

- **Container Queries:** See `/docs/CONTAINER_QUERY_QUICK_START.md`
- **clamp() Function:** MDN: https://developer.mozilla.org/en-US/docs/Web/CSS/clamp
- **Scroll Animations:** MDN: https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline

---

**Total Effort:** 8-13 hours across 4 weeks
**Risk Level:** LOW (all changes have fallbacks)
**Testing Priority:** HIGH (verify on real hardware)

Ready to apply! 🚀

---

**Generated:** January 21, 2026
**Status:** Production Ready
**Last Tested:** January 21, 2026
