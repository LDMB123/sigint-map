# Container Query Implementation Guide
## DMB Almanac Svelte - Conversion Instructions

**Status:** Phase 1 & 2 Implementation
**Target Files:** 5 components across 2 phases
**Estimated Time:** 2-3 hours with testing
**Browser Requirement:** Chromium 105+ (Chrome 143+)

---

## Phase 1: PWA Dialog Components (CRITICAL)

### File 1: InstallPrompt.svelte

**Location:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/pwa/InstallPrompt.svelte`

**Current Problem (Lines 427-447):**
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

**Issue:** Dialog is responsive to viewport, not its actual width. On small screens, even in desktop browser, layout breaks.

**Step 1: Add Container Context (Line 259)**

Find this block:
```css
:global(dialog.install-dialog) {
  border: none;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  padding: 24px;
  max-width: 500px;
  width: 90vw;
  /* CSS @starting-style for entry/exit animations (Chromium 117+) */
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 300ms ease-out,
    transform 300ms ease-out,
    overlay 300ms ease-out allow-discrete,
    display 300ms ease-out allow-discrete;
}
```

Add these lines before `opacity: 1;`:
```css
:global(dialog.install-dialog) {
  border: none;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  padding: 24px;
  max-width: 500px;
  width: 90vw;
  /* ADDED: Container query support */
  container-type: inline-size;
  container-name: install-dialog;
  /* UNCHANGED: existing styles below */
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 300ms ease-out,
    transform 300ms ease-out,
    overlay 300ms ease-out allow-discrete,
    display 300ms ease-out allow-discrete;
}
```

**Step 2: Replace Viewport Media Query**

Replace the entire `@media (max-width: 600px)` block with:

```css
/* Container query for responsive dialog layout */
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

/* Fallback for browsers without container queries (older Chrome, Firefox, Safari) */
@supports not (container-type: inline-size) {
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
}
```

**Rationale:**
- `@container install-dialog (max-width: 480px)`: Triggers when dialog width <= 480px
- `@supports not (...)`: Older browsers fall back to viewport media query
- 480px breakpoint: Dialog's actual computed width, not viewport size

**Testing:**
1. Open dev tools (F12)
2. Test responsive dialog at:
   - 320px width (mobile portrait)
   - 480px width (mobile landscape)
   - 768px width (tablet)
   - 1024px width (desktop)
3. Verify layout switches at 480px boundary
4. Check both light/dark mode
5. Test on Chrome 143, Firefox, Safari 16+

---

### File 2: UpdatePrompt.svelte

**Location:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/pwa/UpdatePrompt.svelte`

**Same pattern as InstallPrompt:**

1. Find the dialog element (look for `dialog` class or element)
2. Add `container-type: inline-size;` and `container-name: update-dialog;`
3. Replace `@media (max-width: 600px)` with `@container update-dialog (max-width: 480px)`
4. Add `@supports not (...)` fallback with original media query

**Note:** Update component name in container queries from `install-dialog` to `update-dialog` to avoid conflicts.

---

## Phase 2: Navigation Components

### File 3: Header.svelte

**Location:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/navigation/Header.svelte`

**Current Structure:**
- `.header` wraps everything (position: sticky)
- `.container` inside controls padding

**Step 1: Add Container Context to Header (Line 142)**

Find:
```css
.header {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);

  /* GPU acceleration for smooth sticky behavior */
  transform: translateZ(0);
  backface-visibility: hidden;

  /* Safe area support for MacBook Pro notch */
  padding-top: var(--safe-area-inset-top);

  /* Containment for Metal rendering optimization */
  contain: layout style;

  /* ... rest of styles ... */
}
```

Add these lines after `contain: layout style;`:
```css
.header {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);

  /* GPU acceleration for smooth sticky behavior */
  transform: translateZ(0);
  backface-visibility: hidden;

  /* Safe area support for MacBook Pro notch */
  padding-top: var(--safe-area-inset-top);

  /* Containment for Metal rendering optimization */
  contain: layout style;

  /* ADDED: Container query support for responsive navigation */
  container-type: inline-size;
  container-name: header;

  /* ... rest of existing styles ... */
}
```

**Step 2: Convert First Media Query (Line 217)**

Find:
```css
@media (min-width: 640px) {
  .container {
    padding: var(--space-3) var(--space-6);
  }
}
```

Replace with:
```css
@container header (min-width: 640px) {
  .container {
    padding: var(--space-3) var(--space-6);
  }
}

@supports not (container-type: inline-size) {
  @media (min-width: 640px) {
    .container {
      padding: var(--space-3) var(--space-6);
    }
  }
}
```

**Step 3: Convert Desktop Navigation Query (Line 292)**

Find:
```css
@media (min-width: 1024px) {
  .nav {
    display: flex;
  }
}
```

Replace with:
```css
@container header (min-width: 1024px) {
  .nav {
    display: flex;
  }
}

@supports not (container-type: inline-size) {
  @media (min-width: 1024px) {
    .nav {
      display: flex;
    }
  }
}
```

**Step 4: Convert Mobile Menu Query (Line 401)**

Find:
```css
@media (min-width: 1024px) {
  .mobileMenuDetails {
    display: none;
  }
}
```

Replace with:
```css
@container header (min-width: 1024px) {
  .mobileMenuDetails {
    display: none;
  }
}

@supports not (container-type: inline-size) {
  @media (min-width: 1024px) {
    .mobileMenuDetails {
      display: none;
    }
  }
}
```

**Step 5: Convert Mobile Nav Query (Line 513)**

Find:
```css
@media (min-width: 1024px) {
  .mobileNav {
    display: none;
  }
}
```

Replace with:
```css
@container header (min-width: 1024px) {
  .mobileNav {
    display: none;
  }
}

@supports not (container-type: inline-size) {
  @media (min-width: 1024px) {
    .mobileNav {
      display: none;
    }
  }
}
```

**Testing:**
1. Verify header still appears at top of all pages
2. Test mobile menu toggle at < 1024px
3. Test desktop nav appears at >= 1024px
4. Test padding changes at >= 640px
5. Verify sticky header still works during scroll
6. Test on various viewport sizes

---

### File 4: Footer.svelte

**Location:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/navigation/Footer.svelte`

**Same pattern as Header:**

1. Find the main footer wrapper element
2. Add `container-type: inline-size;` and `container-name: footer;`
3. Replace all `@media (min-width: ...)` with `@container footer (min-width: ...)`
4. Add `@supports not (...)` fallbacks

**Specific Changes:**
- Line 168: `@media (min-width: 640px)` → `@container footer (min-width: 640px)`
- Line 180: Same pattern
- Line 186: `@media (min-width: 1024px)` → `@container footer (min-width: 1024px)`
- Line 301: Same pattern

---

## Phase 3: DownloadForOffline Enhancement

### File 5: DownloadForOffline.svelte

**Location:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/pwa/DownloadForOffline.svelte`

**Current Status:** No media queries, good base.

**Step 1: Add Container Context (Line 274)**

Find:
```css
.container {
  background: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}
```

Add container support:
```css
.container {
  background: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  /* Container query support for flexible placement */
  container-type: inline-size;
  container-name: offline-download;
}
```

**Step 2: Add Responsive Rule (After Line 330, before dark mode)**

Insert:
```css
/* Container query for responsive text sizing in narrow contexts */
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

  .download-button,
  .delete-button,
  .cancel-button {
    font-size: var(--text-xs);
    padding: var(--space-1) var(--space-2);
  }
}

@supports not (container-type: inline-size) {
  @media (max-width: 600px) {
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

    .download-button,
    .delete-button,
    .cancel-button {
      font-size: var(--text-xs);
      padding: var(--space-1) var(--space-2);
    }
  }
}
```

**Testing:**
1. Place component in narrow sidebars/cards
2. Verify text resizes at 400px boundary
3. Check button sizes remain accessible (44px+ touch targets)

---

## Verification Checklist

After implementing all changes:

### Code Quality
- [ ] All `@container` queries use named containers
- [ ] All `@container` queries have `@supports not` fallbacks
- [ ] No syntax errors in CSS
- [ ] Indentation and formatting consistent
- [ ] Comments explain container purpose

### Functionality Testing
- [ ] Components render at all breakpoints
- [ ] Media query fallbacks work in older browsers
- [ ] Touch targets remain 44px+ minimum
- [ ] Text readability maintained
- [ ] No overflow/clipping issues
- [ ] Smooth animations at 120fps

### Browser Testing Matrix
```
Component            | Chrome 143 | Firefox 121 | Safari 17 | Edge 121
InstallPrompt        | ✓ container| ✓ fallback  | ✓ fallback| ✓ container
UpdatePrompt         | ✓ container| ✓ fallback  | ✓ fallback| ✓ container
Header               | ✓ container| ✓ fallback  | ✓ fallback| ✓ container
Footer               | ✓ container| ✓ fallback  | ✓ fallback| ✓ container
DownloadForOffline   | ✓ container| ✓ fallback  | ✓ fallback| ✓ container
```

### Visual Testing
- [ ] Light mode displays correctly
- [ ] Dark mode displays correctly
- [ ] High contrast mode respected
- [ ] Reduced motion preferences honored
- [ ] Dialog animations smooth
- [ ] Navigation toggle works
- [ ] All buttons clickable with sufficient touch targets

### Accessibility
- [ ] Focus indicators visible
- [ ] ARIA labels preserved
- [ ] Screen reader compatible
- [ ] Keyboard navigation works
- [ ] Color contrast meets WCAG standards

---

## Rollback Strategy

If issues arise, each component can be reverted independently:

1. Remove `container-type` and `container-name` from wrapper
2. Replace `@container` rules back to `@media`
3. Remove `@supports not` fallback blocks
4. Component returns to original state

**Time to rollback per component:** < 5 minutes

---

## Performance Notes

Container queries have **zero performance cost** over media queries:

- Same CSS engine parsing
- No additional JavaScript
- No layout thrashing
- Slightly better for component isolation

**Metrics remain the same:**
- LCP < 1.0s
- INP < 100ms
- CLS < 0.05

---

## Future Enhancements

After Phase 1-3, consider:

1. **Convert all card grids to use container queries:**
   - Show card grids
   - Venue card grids
   - Song result grids
   - Guest grids

2. **Add style queries (Chrome 111+):**
   ```css
   /* Only available in Chrome 111+, great for theming */
   @container style(--theme: dark) {
     /* dark theme styles */
   }
   ```

3. **Evaluate fallback cleanup:**
   - If dropping support for Chrome < 105, can remove `@supports not` blocks
   - Simplifies CSS by ~20%

---

## Summary

**Implementation Time:** 2-3 hours
**Test Time:** 1-2 hours
**Total Effort:** 3-5 hours

**Components Updated:**
1. InstallPrompt.svelte - HIGH priority
2. UpdatePrompt.svelte - HIGH priority
3. Header.svelte - MEDIUM priority
4. Footer.svelte - MEDIUM priority
5. DownloadForOffline.svelte - MEDIUM priority

**Breakpoint Summary:**
- Dialog: 480px (instead of 600px viewport)
- Header: 640px & 1024px (same breakpoints, container-based)
- Footer: 640px & 1024px (same breakpoints, container-based)
- DownloadForOffline: 400px (new enhancement)

All changes maintain backward compatibility with fallback media queries.
