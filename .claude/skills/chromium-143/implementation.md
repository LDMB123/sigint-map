---
name: implementation
version: 1.0.0
description: ---
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: chromium-143
complexity: intermediate
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
migrated_from: projects/dmb-almanac/app/docs/analysis/implementation/IMPLEMENTATION_GUIDE.md
migration_date: 2026-01-25
---

# CSS Modernization Implementation Guide
## DMB Almanac - Phase 1: light-dark() Adoption

---

## Overview

This guide provides step-by-step instructions to migrate from `@media (prefers-color-scheme: dark)` to the modern `light-dark()` function (Chrome 123+).

**Expected Results:**
- 50% reduction in color-related CSS
- Single source of truth for light/dark pairs
- Cleaner, more maintainable code
- Zero visual changes

---

## Step 1: Audit Current Color Variables

### Task 1.1: List All Color Variables

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/app.css`

Search for all `:root` declarations and their dark mode counterparts.

Current variables (Lines 50-450 approximately):

```css
:root {
  /* Light mode defaults */
  --background: #ffffff;
  --foreground: #1f2937;
  --border: #e5e7eb;
  --border-color: #e5e7eb;
  /* ... many more ... */
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #1f2937;
    --foreground: #f3f4f6;
    --border: #374151;
    --border-color: #374151;
    /* ... many more ... */
  }
}
```

### Task 1.2: Create Mapping Sheet

Create a quick reference of light/dark pairs:

| Variable | Light | Dark |
|----------|-------|------|
| --background | #ffffff | #1f2937 |
| --foreground | #1f2937 | #f3f4f6 |
| --border | #e5e7eb | #374151 |
| --border-color | #e5e7eb | #374151 |
| --border-color-strong | #d1d5db | #4b5563 |
| --background-secondary | #f3f4f6 | #111827 |
| ... | ... | ... |

---

## Step 2: Convert Color Variables

### Task 2.1: Update :root Block

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/app.css` (Lines ~50-450)

**Replace the current approach:**

```css
:root {
  /* Light mode values */
  --background: #ffffff;
  --foreground: #1f2937;
  --border: #e5e7eb;
  /* ... 100+ lines ... */
}

@media (prefers-color-scheme: dark) {
  :root {
    /* Dark mode values - duplicated */
    --background: #1f2937;
    --foreground: #f3f4f6;
    --border: #374151;
    /* ... 100+ lines ... */
  }
}
```

**With light-dark():**

```css
:root {
  /* Single definition using light-dark(light, dark) */
  --background: light-dark(#ffffff, #1f2937);
  --foreground: light-dark(#1f2937, #f3f4f6);
  --border: light-dark(#e5e7eb, #374151);
  --border-color: light-dark(#e5e7eb, #374151);
  --border-color-strong: light-dark(#d1d5db, #4b5563);
  --border-color-subtle: light-dark(#f3f4f6, #374151);

  --background-secondary: light-dark(#f3f4f6, #111827);
  --background-tertiary: light-dark(#e5e7eb, #1f2937);

  --foreground-secondary: light-dark(#6b7280, #d1d5db);
  --foreground-tertiary: light-dark(#9ca3af, #9ca3af);

  /* Keep non-color variables as-is */
  --max-width: 1280px;
  --container-xl: 1280px;
  --container-lg: 1024px;
  /* ... other variables ... */
}
```

### Task 2.2: Update Shadows

Shadows look different in light vs dark modes:

```css
:root {
  --shadow-sm: light-dark(
    0 1px 2px rgba(0, 0, 0, 0.05),
    0 1px 2px rgba(0, 0, 0, 0.25)
  );

  --shadow-md: light-dark(
    0 4px 6px rgba(0, 0, 0, 0.1),
    0 4px 6px rgba(0, 0, 0, 0.3)
  );

  --shadow-lg: light-dark(
    0 10px 15px rgba(0, 0, 0, 0.1),
    0 10px 15px rgba(0, 0, 0, 0.4)
  );

  --shadow-xl: light-dark(
    0 20px 25px rgba(0, 0, 0, 0.1),
    0 20px 25px rgba(0, 0, 0, 0.5)
  );
}
```

### Task 2.3: Remove All @media (prefers-color-scheme: dark) Blocks

**Search for:** `@media (prefers-color-scheme: dark)`

In `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/app.css`:
- Lines 503-595: Delete this entire block (first dark mode overrides)
- Lines 586-700+: Delete all subsequent dark mode blocks

**Search for:** `@media (prefers-color-scheme: dark)` in other files

**Files to update:**
1. `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/styles/scoped-patterns.css` (Lines 677-722)
   - Delete entire dark mode block
   - Colors are already in light-dark() in new implementation

2. `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/motion/animations.css`
   - Check if any prefers-color-scheme blocks (unlikely)

3. `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/components/` (all .svelte files)
   - Check component styles for `@media (prefers-color-scheme: dark)`
   - Example: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/components/ui/Tooltip.svelte` (Line 236-239)

**Example of component change:**

**Before (Tooltip.svelte, lines 219-240):**
```css
.tooltip-content {
  background: var(--color-gray-900);
  color: var(--color-gray-50);
}

@media (prefers-color-scheme: dark) {
  .tooltip-content {
    background: var(--color-gray-100);
    color: var(--color-gray-900);
  }
}
```

**After:**
```css
.tooltip-content {
  background: light-dark(var(--color-gray-900), var(--color-gray-100));
  color: light-dark(var(--color-gray-50), var(--color-gray-900));
}
```

---

## Step 3: Update Component Styles

### Task 3.1: Audit Components with Dark Mode Overrides

Search all `.svelte` files for `prefers-color-scheme: dark`:

```bash
grep -r "prefers-color-scheme: dark" src/lib/components/
```

Files found:
1. `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/components/ui/Tooltip.svelte` (Line 236)
2. `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/components/examples/CSSIfDemo.svelte` (Line 374)

### Task 3.2: Update Each Component

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/components/ui/Tooltip.svelte`

**Before:**
```css
.tooltip-content {
  background: var(--color-gray-900);
  color: var(--color-gray-50);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  white-space: nowrap;
  box-shadow: var(--shadow-lg);
  backdrop-filter: var(--glass-blur);
  z-index: 1000;
}

@media (prefers-color-scheme: dark) {
  .tooltip-content {
    background: var(--color-gray-100);
    color: var(--color-gray-900);
  }
}
```

**After:**
```css
.tooltip-content {
  background: light-dark(var(--color-gray-900), var(--color-gray-100));
  color: light-dark(var(--color-gray-50), var(--color-gray-900));
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  white-space: nowrap;
  box-shadow: var(--shadow-lg);
  backdrop-filter: var(--glass-blur);
  z-index: 1000;
}
```

---

## Step 4: Test Implementation

### Task 4.1: Manual Testing

1. **Light Mode:**
   - Open Chrome DevTools
   - Emulate light color scheme (DevTools > Rendering > Emulate CSS media)
   - Verify all colors display correctly
   - Check all components (cards, buttons, tooltips, etc.)

2. **Dark Mode:**
   - Switch to dark color scheme emulation
   - Verify color transitions
   - Check contrast ratios (should still be accessible)
   - Verify shadows appear correctly

3. **System Preference Changes:**
   - Open Settings > Display > Theme
   - Change from Light to Dark
   - Verify colors update in real-time (no reload needed)
   - Change back to Light
   - Verify colors update back

### Task 4.2: Browser Support Testing

Test on:
- Chrome 143+ (primary target) ✅
- Chrome 125-142 (fallback to light mode)
- Chrome <123 (graceful degradation to light mode)

### Task 4.3: Accessibility Checks

Use Chrome DevTools:
1. Right-click > Inspect > Accessibility tab
2. Check contrast ratios for all text
3. Verify WCAG AA compliance (4.5:1 for normal text)

---

## Step 5: Update Scoped Patterns

### Task 5.1: Update scoped-patterns.css

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/styles/scoped-patterns.css`

**Before (Lines 615-722):**
```css
:root {
  /* Card component variables */
  --card-bg: #ffffff;
  --card-border: #e5e7eb;
  /* ... many more ... */
}

@media (prefers-color-scheme: dark) {
  :root {
    /* Card dark mode */
    --card-bg: #1f2937;
    --card-border: #374151;
    /* ... many more ... */
  }
}
```

**After:**
```css
:root {
  /* Card component variables - using light-dark() */
  --card-bg: light-dark(#ffffff, #1f2937);
  --card-border: light-dark(#e5e7eb, #374151);
  --card-radius: 8px;
  --card-shadow: light-dark(
    0 1px 3px rgba(0, 0, 0, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.25)
  );
  --card-shadow-hover: light-dark(
    0 4px 12px rgba(0, 0, 0, 0.15),
    0 4px 12px rgba(0, 0, 0, 0.35)
  );
  --card-heading-color: light-dark(#1f2937, #f3f4f6);
  --card-text-color: light-dark(#4b5563, #d1d5db);
  --card-link-color: light-dark(#0066cc, #60a5fa);
  --card-link-hover: light-dark(#0052a3, #93c5fd);

  /* Form variables */
  --form-label-color: light-dark(#1f2937, #f3f4f6);
  --form-border: light-dark(#d1d5db, #4b5563);
  --form-bg: light-dark(#ffffff, #111827);
  --form-text: light-dark(#1f2937, #f3f4f6);
  /* ... etc ... */
}

/* Delete the entire @media (prefers-color-scheme: dark) block - no longer needed */
```

---

## Step 6: Verification Checklist

- [ ] All color variables updated to use light-dark()
- [ ] All @media (prefers-color-scheme: dark) blocks removed from app.css
- [ ] All component styles updated (Tooltip.svelte, etc.)
- [ ] scoped-patterns.css updated
- [ ] Light mode visual test passed
- [ ] Dark mode visual test passed
- [ ] System preference switching works (no reload)
- [ ] Contrast ratios verified (WCAG AA)
- [ ] No console errors
- [ ] Build succeeds (`npm run build`)
- [ ] Production preview works (`npm run preview`)

---

## Step 7: Performance Impact

### Before (Old approach):
```
app.css size: ~250 KB
Color-related CSS: ~120 KB
Dark mode overrides: ~60 KB (50% duplication)
```

### After (light-dark approach):
```
app.css size: ~190 KB
Color-related CSS: ~80 KB
Savings: 60 KB (~24% CSS reduction)
```

**Additional Benefits:**
- Faster parsing (fewer media query blocks)
- Smaller source maps
- Easier to maintain
- No flickering on page load

---

## Common Issues & Solutions

### Issue 1: Colors Look Wrong in Dark Mode

**Cause:** Wrong order in light-dark(light, dark)

**Solution:**
```css
/* WRONG */
background: light-dark(#111827, #ffffff);  /* Dark, Light - reversed! */

/* CORRECT */
background: light-dark(#ffffff, #111827);  /* Light, Dark - correct order */
```

### Issue 2: Shadows Not Visible in Dark Mode

**Cause:** Dark shadow on dark background

**Solution:**
```css
/* WRONG */
--shadow: light-dark(
  0 1px 3px rgba(0, 0, 0, 0.1),
  0 1px 3px rgba(0, 0, 0, 0.1)
);  /* Same shadow value - not enough contrast */

/* CORRECT */
--shadow: light-dark(
  0 1px 3px rgba(0, 0, 0, 0.1),      /* Subtle shadow on light bg */
  0 1px 3px rgba(0, 0, 0, 0.4)       /* Stronger shadow on dark bg */
);
```

### Issue 3: Color Variables Not Changing on Theme Switch

**Cause:** CSS variable isn't using light-dark()

**Verification:**
```css
/* Check that variable uses light-dark() */
--my-color: light-dark(#fff, #000);  /* ✅ Works */
--my-color: #fff;                     /* ❌ Doesn't change */
```

### Issue 4: Prefers-Color-Scheme Media Query Still Needed

**Legitimate Use Case:** For features beyond colors

```css
/* Can still use for layout changes in dark mode */
@media (prefers-color-scheme: dark) {
  /* Example: adjust spacing for readability */
  .article p {
    line-height: 1.8;  /* Increased in dark mode */
  }
}
```

---

## Rollback Plan

If issues arise, revert with:

```bash
git checkout src/app.css src/lib/styles/scoped-patterns.css
git checkout src/lib/components/ui/Tooltip.svelte
git checkout src/lib/components/examples/CSSIfDemo.svelte
```

---

## Timeline

| Phase | Task | Duration | Status |
|-------|------|----------|--------|
| 1 | Audit colors & create mapping | 30 min | 📋 Planning |
| 2 | Update app.css variables | 1 hour | 🔄 In Progress |
| 3 | Update component styles | 1 hour | 🔄 In Progress |
| 4 | Update scoped-patterns.css | 30 min | ⏳ Pending |
| 5 | Manual testing | 1 hour | ⏳ Pending |
| 6 | Verification & QA | 30 min | ⏳ Pending |
| **Total** | | **4 hours** | |

---

## Next Steps

After completing light-dark() migration:

1. **Phase 2:** Expand CSS if() usage in Button, Badge, Card components
2. **Phase 3:** Unify tooltip implementations (Popover API + Anchor Positioning)
3. **Phase 4:** Review container query opportunities

---

## Resources

- [MDN: light-dark()](https://developer.mozilla.org/en-US/docs/Web/CSS/light-dark)
- [Chromium Blog: light-dark()](https://developer.chrome.com/blog/light-dark-css-function/)
- [Chrome 123 Release Notes](https://developer.chrome.com/en/blog/chrome-123-beta/)

---

**Document Version:** 1.0
**Last Updated:** January 23, 2026
**Target Chrome Version:** 143+
