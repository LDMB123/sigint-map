# Accessibility Fixes - Implementation Guide

## Overview

This document provides step-by-step fixes for the 5 moderate accessibility issues identified in the audit. Implementation time: **10-15 hours total**.

---

## Fix #1: StatCard Missing Aria-Label (5 minutes)

**Severity:** MODERATE
**Location:** `/lib/components/ui/StatCard.svelte`
**WCAG Criterion:** 4.1.2 - Name, Role, Value

### Current Code
```svelte
<svelte:element
  this={Tag}
  href={isLink ? href : undefined}
  class="stat-card {variant} {size} {className}"
  class:interactive={isLink}
  role={isLink ? 'link' : undefined}
>
```

### Fixed Code
```svelte
<svelte:element
  this={Tag}
  href={isLink ? href : undefined}
  class="stat-card {variant} {size} {className}"
  class:interactive={isLink}
  role={isLink ? 'link' : undefined}
  aria-label={isLink ? label : undefined}
  title={!isLink ? label : undefined}
>
```

### Explanation
- **aria-label on link:** Provides accessible name for screen readers when stat is a link
- **title on div:** Provides tooltip context for non-link stats
- **Why:** When StatCard is rendered as `<div>` (non-interactive), screen readers have no accessible name for the statistic itself

### Testing
```javascript
// Test with axe-core
const results = await axe.run();
// Should have 0 violations for statcard

// Test with screen reader
// Hover over stat-card div, should hear label
// Tab to stat-card link, should hear label
```

---

## Fix #2: InstallPrompt Button Contrast (15 minutes)

**Severity:** MODERATE
**Location:** `/lib/components/pwa/InstallPrompt.svelte`
**WCAG Criterion:** 1.4.3 - Contrast (Minimum) - Level AA

### Current Code
```css
.button-dismiss {
  background-color: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.button-dismiss:hover {
  background-color: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}
```

### Fixed Code
```css
.button-dismiss {
  background-color: rgba(255, 255, 255, 0.25);
  color: #fff;
  border: 2px solid rgba(255, 255, 255, 0.5);
  font-weight: 500;
}

.button-dismiss:hover {
  background-color: rgba(255, 255, 255, 0.35);
  border-color: rgba(255, 255, 255, 0.7);
}

.button-dismiss:active {
  background-color: rgba(255, 255, 255, 0.25);
}

.button-dismiss:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
```

### Changes Explained
- **Increased opacity:** 0.2 → 0.25 improves visibility without changing visual balance
- **Thicker border:** 1px → 2px provides better definition, especially for colorblind users
- **Font weight:** Added 500 for better readability
- **Border color:** Increased from 0.3 to 0.5 opacity makes button outline more visible
- **Focus state:** Added `:focus-visible` for keyboard users

### Testing
```javascript
// Test contrast with WebAIM Contrast Checker
const bgColor = 'rgba(255, 255, 255, 0.25) over #030712';
// Should show 4.5:1+ contrast

// Visual test: dark mode in browser
// Button should be clearly visible and have good border definition
```

---

## Fix #3: Form Validation Error Messages (2-3 hours)

**Severity:** MODERATE
**Location:** All forms, especially `/routes/search/+page.svelte`
**WCAG Criterion:** 3.3.1 - Error Identification (Level A)

### Step 1: Create Error Message Component

**New file:** `/lib/components/ui/FormError.svelte`

```svelte
<script lang="ts">
  interface Props {
    id: string;
    message: string | null;
    class?: string;
  }

  let { id, message, class: className = '' }: Props = $props();
</script>

{#if message}
  <div
    {id}
    class="form-error {className}"
    role="alert"
    aria-live="assertive"
  >
    <span class="error-icon" aria-hidden="true">!</span>
    <span class="error-text">{message}</span>
  </div>
{/if}

<style>
  .form-error {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background-color: var(--color-error-bg);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-md);
    color: var(--color-error);
    font-size: var(--text-sm);
    margin-top: var(--space-1);
  }

  .error-icon {
    font-weight: var(--font-bold);
    flex-shrink: 0;
  }

  .error-text {
    line-height: var(--leading-tight);
  }

  @media (prefers-color-scheme: dark) {
    .form-error {
      background-color: color-mix(in oklch, var(--color-error) 15%, transparent);
      color: var(--color-error-light);
    }
  }
</style>
```

### Step 2: Update Form Component

**File:** `/routes/search/+page.svelte` (lines 296-362)

```svelte
<script lang="ts">
  // Add validation state
  let searchError = $state('');

  function validateSearchInput(value: string): boolean {
    // Clear previous error
    searchError = '';

    // Validation rules
    if (value.length > 100) {
      searchError = 'Search query must be 100 characters or less';
      return false;
    }

    if (/[<>&"]/.test(value)) {
      searchError = 'Search query contains invalid characters: < > & "';
      return false;
    }

    return true;
  }

  const handleSearchInputWithValidation = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const value = target.value;

    if (!validateSearchInput(value)) {
      // Don't update if invalid
      return;
    }

    searchInput = value;
    debouncedUpdateQuery(value);
  };
</script>

<!-- In template -->
<search class="search-form" role="search" aria-label="Search DMB database">
  <div class="search-field">
    <label for="search-input" class="visually-hidden">
      Search shows, songs, venues, and more
    </label>
    <div class="search-input-wrapper">
      <svg class="search-icon" ... aria-hidden="true"><!-- ... --></svg>
      <input
        type="search"
        id="search-input"
        list="search-suggestions"
        placeholder="Search for anything..."
        class="search-input"
        class:error={searchError}
        value={searchInput}
        oninput={handleSearchInputWithValidation}
        aria-invalid={searchError ? 'true' : 'false'}
        aria-describedby={searchError ? 'search-error' : undefined}
        autofocus
        minlength="1"
        maxlength="100"
        spellcheck="false"
        enterkeyhint="search"
      />
    </div>

    <!-- Error message -->
    <FormError
      id="search-error"
      message={searchError}
      class="mt-2"
    />
  </div>

  <datalist id="search-suggestions">
    <!-- ... existing options ... -->
  </datalist>
</search>
```

### Step 3: Add CSS for Error State

```css
.search-input.error {
  border-color: var(--color-error);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-error) 20%, transparent);
}

.search-input.error:focus {
  border-color: var(--color-error);
  box-shadow:
    0 0 0 3px color-mix(in oklch, var(--color-error) 20%, transparent),
    0 0 0 1px var(--color-error);
}
```

### Step 4: Import Component

Add to search page imports:
```svelte
<script lang="ts">
  import FormError from '$lib/components/ui/FormError.svelte';
  // ... other imports
</script>
```

### Testing
```javascript
// Test with axe-core
// Error message should be associated with input via aria-describedby

// Test with screen reader
// Focus on input
// Type invalid content
// Screen reader should announce error message

// Visual test
// Error message should be visible and readable
// Border color should indicate error state
```

---

## Fix #4: Trend Indicator Dark Mode Colors (20 minutes)

**Severity:** MODERATE
**Location:** `/lib/components/ui/StatCard.svelte` (lines 461-469)
**WCAG Criterion:** 1.4.3 - Contrast (Minimum)

### Current Code
```css
/* Dark mode */
.trend-down {
  color: var(--color-primary-300);
  background-color: color-mix(in oklch, var(--color-error) 20%, transparent);
}

.trend-up {
  color: var(--color-secondary-300);
  background-color: color-mix(in oklch, var(--color-success) 20%, transparent);
}
```

### Fixed Code
```css
/* Dark mode */
.trend-down {
  color: #ff6b6b; /* Bright red for better contrast */
  background-color: color-mix(in oklch, var(--color-error) 25%, transparent);
  font-weight: 600;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-decoration-skip-ink: auto;
}

.trend-up {
  color: #51cf66; /* Bright green for better contrast */
  background-color: color-mix(in oklch, var(--color-success) 25%, transparent);
  font-weight: 600;
}

/* Light mode adjustments */
.trend-down {
  color: var(--color-primary-800);
  background-color: var(--color-error-bg);
}

.trend-up {
  color: var(--color-secondary-700);
  background-color: var(--color-success-bg);
}
```

### Explanation
- **Changed colors:** Primary-300 → #ff6b6b (bright red), Secondary-300 → #51cf66 (bright green)
- **Increased opacity:** 20% → 25% for background
- **Added font-weight:** 600 for better visibility
- **Added underline (down only):** Distinguishes down from up without relying solely on color

### Contrast Testing
```javascript
// Test with WebAIM Contrast Checker
// #ff6b6b on error-bg (dark mode) should be 4.5:1+
// #51cf66 on success-bg (dark mode) should be 4.5:1+
```

---

## Fix #5: InstallPrompt Focus Return (1 hour)

**Severity:** MODERATE
**Location:** `/lib/components/pwa/InstallPrompt.svelte`
**WCAG Criterion:** 2.4.3 - Focus Order (Level A)

### Current Code
```javascript
// Handle dismiss with 7-day persistence
function handleDismiss() {
  isDismissed = true;
  shouldShow = false;
  localStorage.setItem(DISMISS_KEY, Date.now().toString());

  // Return focus to trigger element if available
  const previousFocusElement = document.activeElement as HTMLElement;
  if (previousFocusElement) {
    previousFocusElement.blur(); // ❌ Only blurs, doesn't refocus
  }
}
```

### Fixed Code
```typescript
// Add this to component script
let triggerElement: HTMLElement | null = null;

// Store reference to trigger when banner shows
$effect(() => {
  if (shouldShow && bannerRef) {
    // Find a meaningful element to refocus
    // Priority: find trigger, then header, then skip-link, then body
    triggerElement =
      document.querySelector('[aria-label="Mobile navigation menu"]') ||
      document.querySelector('header') ||
      document.body;
  }
});

// Updated dismiss handler
function handleDismiss() {
  isDismissed = true;
  shouldShow = false;
  localStorage.setItem(DISMISS_KEY, Date.now().toString());

  // Return focus to meaningful element with slight delay
  // to allow banner to close first
  setTimeout(() => {
    if (triggerElement && triggerElement !== document.body) {
      triggerElement.focus();
    } else {
      // Fallback to main content
      const mainContent = document.querySelector('main') ||
                         document.querySelector('[role="main"]');
      if (mainContent) {
        (mainContent as HTMLElement).focus();
      }
    }
  }, 150); // Wait for animation to complete

  // Also track dismissal for analytics
  if ('gtag' in window) {
    (window as any).gtag('event', 'pwa_install_dismissed', {
      event_category: 'engagement',
      event_label: 'PWA Install Prompt Dismissed'
    });
  }
}

// Handle install action
async function handleInstall() {
  if (!deferredPrompt) {
    console.log('[PWA] No deferred prompt available');
    return;
  }

  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] User response:', outcome);

    if (outcome === 'accepted') {
      canInstall = false;
      deferredPrompt = null;
      shouldShow = false;
      localStorage.removeItem(DISMISS_KEY);

      // Track successful install
      if ('gtag' in window) {
        (window as any).gtag('event', 'pwa_install', {
          event_category: 'engagement',
          event_label: 'PWA Installed'
        });
      }

      // Move focus to main content after successful install
      setTimeout(() => {
        const mainContent = document.querySelector('main') ||
                           document.querySelector('[role="main"]');
        if (mainContent) {
          (mainContent as HTMLElement).focus();
        }
      }, 200);
    }
  } catch (error) {
    console.error('[PWA] Install failed:', error);
  }
}
```

### Explanation
- **Store trigger element:** Capture meaningful element when banner appears
- **Refocus with delay:** 150ms delay allows banner animation to complete
- **Fallback chain:** Try trigger → header → main content → body
- **Timeout:** Ensures DOM is ready before attempting focus

### Testing
```javascript
// Test with keyboard:
// 1. Load page, wait for install banner
// 2. Tab to "Not now" button
// 3. Press Enter to dismiss
// 4. Verify focus moved to header or main content (not lost)

// Test with screen reader:
// 1. Banner appears
// 2. Dismiss with keyboard
// 3. Verify focus announcement at new location
```

---

## Fix #6: Focus Indicator Modernization (2-4 hours)

**Severity:** SERIOUS
**WCAG Criterion:** 2.4.7 - Focus Visible (Level AA)
**Files:** 7 CSS files

### Pattern to Replace

**Find:**
```css
selector {
  outline: none;
}

selector:focus {
  box-shadow: ...;
}
```

**Replace with:**
```css
selector:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
  box-shadow: ...; /* keep shadow for extra feedback */
}

/* Fallback for browsers without :focus-visible support */
@supports not selector(:focus-visible) {
  selector:focus {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
  }
}
```

### Files to Update

1. **`/routes/search/+page.svelte`** (line 880)
   ```css
   /* Remove */
   .search-input {
     outline: none;
   }

   /* Add */
   .search-input:focus-visible {
     border-color: var(--color-primary-500);
     outline: 2px solid var(--color-primary-500);
     outline-offset: 2px;
     box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-primary-500) 20%, transparent);
   }
   ```

2. **`/routes/+layout.svelte`** - Search for `outline: none`

3. **`/lib/components/ui/VirtualList.svelte`** - Search for `outline: none`

4. **`/lib/components/pwa/ServiceWorkerUpdateBanner.svelte`** - Focus styles

5. **`/routes/venues/+page.svelte`** - Focus styles

6. **`/routes/songs/+page.svelte`** - Focus styles

7. **`/routes/guests/+page.svelte`** - Focus styles

### Automated Fix Script

```bash
#!/bin/bash
# Fix all outline: none removals

find /lib/components /routes -name "*.svelte" -o -name "*.css" | while read file; do
  # Add :focus-visible to focus styles
  sed -i 's/:focus[[:space:]]*{/:focus-visible {/g' "$file"

  # Remove outline: none lines
  sed -i '/outline[[:space:]]*:[[:space:]]*none/d' "$file"
done

echo "Focus indicator fixes applied!"
```

### Testing Checklist

- [ ] Tab through page with keyboard only
- [ ] All interactive elements show visible focus
- [ ] Focus outline is 2px and visible on light/dark backgrounds
- [ ] High contrast mode respected with `forced-colors: active`
- [ ] Test with different color schemes (light/dark)
- [ ] VoiceOver/NVDA announces focused element
- [ ] Mobile browser keyboard still works

---

## Implementation Timeline

### Week 1 (5 fixes, 10-15 hours total)

**Monday (2-3 hours)**
- Fix #1: StatCard aria-label (5 min) ✓ QUICK WIN
- Fix #2: InstallPrompt button contrast (15 min) ✓ QUICK WIN
- Fix #4: Trend indicator colors (20 min) ✓ QUICK WIN

**Tuesday-Wednesday (3-4 hours)**
- Fix #3: Form error messages
  - Create FormError component (1 hour)
  - Update search page (1 hour)
  - Test with axe-core (30 min)

**Thursday-Friday (2-4 hours)**
- Fix #5: InstallPrompt focus return (1 hour)
- Fix #6: Focus indicator modernization (1-3 hours)
  - Audit all files (30 min)
  - Apply updates (1-2.5 hours)
  - Testing and verification (30 min)

### Testing (2-3 hours)

**After each fix:**
- [ ] Run axe-core automated tests
- [ ] Keyboard navigation test
- [ ] Screen reader test (NVDA/VoiceOver)
- [ ] Visual verification

---

## Verification Checklist

### After Each Fix
```javascript
// Run automated tests
npm run test:a11y

// Manual testing steps
// 1. Tab through affected component
// 2. Verify focus visible and logical
// 3. Test on mobile keyboard
// 4. Test with screen reader
// 5. Verify color contrast
```

### Final Verification
```bash
# Run full accessibility audit
npm run audit:a11y

# Expected results
✓ 0 critical issues
✓ 0 serious issues (after fix #6)
✓ 0 moderate issues (after fixes)
```

---

## Documentation

After implementing fixes, update:
1. **ACCESSIBILITY_AUDIT_SUMMARY.md** - Mark issues as FIXED
2. **Project README.md** - Add accessibility guidelines
3. **CONTRIBUTING.md** - Add accessibility checklist

---

## Questions?

Refer back to the main audit report for detailed context on each issue:
**File:** `/ACCESSIBILITY_AUDIT_DMB_ALMANAC.md`

Questions specific to components contact the maintainer.
