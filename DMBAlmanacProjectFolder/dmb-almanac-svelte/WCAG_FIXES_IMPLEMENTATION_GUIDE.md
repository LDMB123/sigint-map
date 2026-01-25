# WCAG 2.1 AA Accessibility Fixes - Implementation Guide
## DMB Almanac Svelte Project

This guide provides step-by-step implementations for all 8 accessibility issues identified in the audit.

---

## Fix 1: Add Skip Link (CRITICAL)

### File: `/src/routes/+layout.svelte`

**What to fix**: Add skip link immediately after `<svelte:head>` to allow keyboard users to skip navigation

**Current code** (lines 1-48):
```svelte
<svelte:head>
  <title>DMB Almanac - Dave Matthews Band Concert Database</title>
  <meta name="description" content="The complete Dave Matthews Band concert database with setlists, statistics, and more." />
  <link rel="speculationrules" href="/speculation-rules.json" />
</svelte:head>

<!-- Update notification -->
{#if $pwaState.hasUpdate}
  <div class="update-banner" role="alert">
```

**Replace with**:
```svelte
<svelte:head>
  <title>DMB Almanac - Dave Matthews Band Concert Database</title>
  <meta name="description" content="The complete Dave Matthews Band concert database with setlists, statistics, and more." />
  <link rel="speculationrules" href="/speculation-rules.json" />
</svelte:head>

<!-- Skip link - visible on keyboard focus -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<!-- Update notification -->
{#if $pwaState.hasUpdate}
  <div class="update-banner" role="alert">
```

**Why**: The `.skip-link` class is already defined in `app.css` (lines 1275-1296) with proper styling that makes it visible on focus and hidden by default.

---

## Fix 2: Add `aria-hidden="true"` to Decorative SVGs

### File: `/src/routes/search/+page.svelte`

#### 2a. Search Input Icon (Line 121-135)

**Current code**:
```html
<svg
  class="search-icon"
  xmlns="http://www.w3.org/2000/svg"
  width="20"
  height="20"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <circle cx="11" cy="11" r="8"></circle>
  <path d="m21 21-4.3-4.3"></path>
</svg>
```

**Replace with**:
```html
<svg
  class="search-icon"
  xmlns="http://www.w3.org/2000/svg"
  width="20"
  height="20"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <circle cx="11" cy="11" r="8"></circle>
  <path d="m21 21-4.3-4.3"></path>
</svg>
```

#### 2b. Songs Section Icon (Line 174-189)

**Current code**:
```html
<svg
  class="section-icon"
  xmlns="http://www.w3.org/2000/svg"
  width="20"
  height="20"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M9 18V5l12-2v13"></path>
  <circle cx="6" cy="18" r="3"></circle>
  <circle cx="18" cy="16" r="3"></circle>
</svg>
<h2 class="section-title">Songs</h2>
```

**Replace with**:
```html
<svg
  class="section-icon"
  xmlns="http://www.w3.org/2000/svg"
  width="20"
  height="20"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d="M9 18V5l12-2v13"></path>
  <circle cx="6" cy="18" r="3"></circle>
  <circle cx="18" cy="16" r="3"></circle>
</svg>
<h2 class="section-title">Songs</h2>
```

#### 2c. All Other Section Icons (Lines 214-228, 255-269, 294-310, 338-351, 378-394)

Apply the same fix to all section header SVGs. Search for:
```html
<svg
  class="section-icon"
```

And add `aria-hidden="true"` to each one.

#### 2d. Browse Card Icons (Lines 429-507)

**Current code** (Lines 430-445):
```html
<div class="browse-icon-wrapper browse-icon-amber">
  <svg
    class="browse-icon"
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
    <line x1="16" x2="16" y1="2" y2="6"></line>
    <line x1="8" x2="8" y1="2" y2="6"></line>
    <line x1="3" x2="21" y1="10" y2="10"></line>
  </svg>
</div>
```

**Replace with**:
```html
<div class="browse-icon-wrapper browse-icon-amber">
  <svg
    class="browse-icon"
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
    <line x1="16" x2="16" y1="2" y2="6"></line>
    <line x1="8" x2="8" y1="2" y2="6"></line>
    <line x1="3" x2="21" y1="10" y2="10"></line>
  </svg>
</div>
```

Apply to all 3 browse cards (Shows, Songs, Venues).

---

## Fix 3: Add Decorative Emoji `aria-hidden` Attributes

### File: `/src/routes/+page.svelte`

#### 3a. Quick Links Section (Lines 83-103)

**Current code**:
```html
<section class="quick-links">
  <h2 class="section-title">Explore</h2>
  <div class="link-grid">
    <a href="/liberation" class="link-card">
      <span class="link-icon">🎸</span>
      <span class="link-title">Liberation List</span>
      <span class="link-desc">Songs that haven't been played recently</span>
    </a>
    <a href="/stats" class="link-card">
      <span class="link-icon">📊</span>
      <span class="link-title">Statistics</span>
      <span class="link-desc">Performance analytics and trends</span>
    </a>
    <a href="/visualizations" class="link-card">
      <span class="link-icon">🗺️</span>
      <span class="link-title">Visualizations</span>
      <span class="link-desc">Interactive charts and maps</span>
    </a>
    <a href="/search" class="link-card">
      <span class="link-icon">🔍</span>
      <span class="link-title">Search</span>
      <span class="link-desc">Find songs, shows, and venues</span>
    </a>
  </div>
</section>
```

**Replace with**:
```html
<section class="quick-links">
  <h2 class="section-title">Explore</h2>
  <div class="link-grid">
    <a href="/liberation" class="link-card">
      <span class="link-icon" aria-hidden="true">🎸</span>
      <span class="link-title">Liberation List</span>
      <span class="link-desc">Songs that haven't been played recently</span>
    </a>
    <a href="/stats" class="link-card">
      <span class="link-icon" aria-hidden="true">📊</span>
      <span class="link-title">Statistics</span>
      <span class="link-desc">Performance analytics and trends</span>
    </a>
    <a href="/visualizations" class="link-card">
      <span class="link-icon" aria-hidden="true">🗺️</span>
      <span class="link-title">Visualizations</span>
      <span class="link-desc">Interactive charts and maps</span>
    </a>
    <a href="/search" class="link-card">
      <span class="link-icon" aria-hidden="true">🔍</span>
      <span class="link-title">Search</span>
      <span class="link-desc">Find songs, shows, and venues</span>
    </a>
  </div>
</section>
```

---

## Fix 4: Add Form Labels

### File: `/src/routes/search/+page.svelte`

**Current code** (Lines 119-151):
```html
<!-- Search Form -->
<div class="search-form">
  <div class="search-input-wrapper">
    <svg
      class="search-icon"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.3-4.3"></path>
    </svg>
    <input
      type="search"
      placeholder="Search for anything..."
      class="search-input"
      value={searchInput}
      on:input={handleSearchInput}
      autofocus
      minlength="1"
      maxlength="100"
      autocomplete="off"
      spellcheck="false"
      enterkeyhint="search"
      aria-label="Search shows, songs, venues, and more"
    />
  </div>
</div>
```

**Replace with** (adds `<label>` element):
```html
<!-- Search Form -->
<div class="search-form">
  <div class="search-input-wrapper">
    <label for="search-input" class="sr-only">Search</label>
    <svg
      class="search-icon"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.3-4.3"></path>
    </svg>
    <input
      id="search-input"
      type="search"
      placeholder="Search for anything..."
      class="search-input"
      value={searchInput}
      on:input={handleSearchInput}
      autofocus
      minlength="1"
      maxlength="100"
      autocomplete="off"
      spellcheck="false"
      enterkeyhint="search"
      aria-label="Search shows, songs, venues, and more"
    />
  </div>
</div>
```

**Key changes**:
- Add `<label for="search-input" class="sr-only">Search</label>` before the SVG
- Add `id="search-input"` to the input element
- Add `aria-hidden="true"` to the SVG (from Fix 2)

**Why `sr-only`?** The CSS class `sr-only` is already defined in `app.css` (lines 910-920) and makes the label visible to screen readers only while keeping the visual layout clean.

---

## Fix 5: Add Table Column Scope

### File: `/src/lib/components/ui/Table.svelte`

**Current code** (Lines 88-120):
```svelte
<thead class="table-header">
  <tr>
    {#each columns as column}
      <th
        class="table-header-cell"
        class:sortable={column.sortable}
        class:sorted={sortColumn === column.key}
        style:width={column.width}
        style:text-align={column.align || 'left'}
        onclick={() => handleSort(column.key, column.sortable)}
        role={column.sortable ? 'button' : undefined}
        tabindex={column.sortable ? 0 : undefined}
        aria-sort={sortColumn === column.key
          ? sortDirection === 'asc'
            ? 'ascending'
            : 'descending'
          : undefined}
      >
```

**Replace with**:
```svelte
<thead class="table-header">
  <tr>
    {#each columns as column}
      <th
        scope="col"
        class="table-header-cell"
        class:sortable={column.sortable}
        class:sorted={sortColumn === column.key}
        style:width={column.width}
        style:text-align={column.align || 'left'}
        onclick={() => handleSort(column.key, column.sortable)}
        role={column.sortable ? 'button' : undefined}
        tabindex={column.sortable ? 0 : undefined}
        aria-sort={sortColumn === column.key
          ? sortDirection === 'asc'
            ? 'ascending'
            : 'descending'
          : undefined}
      >
```

**Key change**: Add `scope="col"` attribute to `<th>` tag

**Explanation**: The `scope="col"` attribute tells screen readers that this header cell applies to all cells below it in that column, making data associations clear.

---

## Fix 6: Implement Modal Focus Management

### File: `/src/lib/components/pwa/UpdatePrompt.svelte`

**Current code** (Lines 1-103):
```svelte
<script lang="ts">
	import { pwaStore } from '$stores/pwa';

	let { show = false } = $props();

	function updateApp() {
		pwaStore.triggerUpdate();
		show = false;
	}
</script>

<dialog
	class="update-dialog"
	open={show}
	aria-labelledby="update-prompt-title"
>
  <!-- dialog content -->
</dialog>
```

**Replace with**:
```svelte
<script lang="ts">
	import { pwaStore } from '$stores/pwa';
	import { onMount } from 'svelte';

	let { show = false } = $props();
	let dialogElement: HTMLDialogElement | null = null;
	let triggerElement: HTMLElement | null = null;

	onMount(() => {
		// Store reference to element that triggered the dialog for focus return
		if (!triggerElement) {
			triggerElement = document.activeElement as HTMLElement;
		}
	});

	$effect(() => {
		if (show && dialogElement) {
			// Show modal dialog (traps focus automatically)
			dialogElement.showModal();

			// Find first focusable element and focus it
			const firstButton = dialogElement.querySelector('button');
			if (firstButton) {
				firstButton.focus();
			}

			// Handle Escape key
			const handleKeydown = (e: KeyboardEvent) => {
				if (e.key === 'Escape') {
					handleClose();
				}
			};

			dialogElement.addEventListener('keydown', handleKeydown);

			return () => {
				dialogElement?.removeEventListener('keydown', handleKeydown);
			};
		}
	});

	function handleClose() {
		if (dialogElement) {
			dialogElement.close();
		}
		// Return focus to the element that triggered the dialog
		if (triggerElement) {
			triggerElement.focus();
		}
		show = false;
	}

	function updateApp() {
		pwaStore.triggerUpdate();
		handleClose();
	}
</script>

<dialog
	bind:this={dialogElement}
	class="update-dialog"
	aria-labelledby="update-prompt-title"
	aria-modal="true"
>
	<div class="dialog-content">
		<h2 id="update-prompt-title">Update Available</h2>
		<p>A new version of the app is available. Update now to get the latest features and improvements.</p>
		<div class="dialog-actions">
			<button onclick={handleClose} class="button secondary">
				Not Now
			</button>
			<button onclick={updateApp} class="button primary">
				Update Now
			</button>
		</div>
	</div>
</dialog>
```

**Key changes**:
1. Add `bind:this={dialogElement}` to get reference to modal
2. Add `aria-modal="true"` attribute
3. Use `.showModal()` instead of `open` attribute for native focus trapping
4. Focus first button when modal opens
5. Listen for Escape key
6. Return focus to trigger element when closed
7. Use `$effect` for reactive modal handling

**Why this matters**:
- `.showModal()` automatically traps focus within the dialog
- Escape key closes modal by default with `.showModal()`
- Focus return prevents user disorientation
- Screen readers announce the modal properly

---

## Fix 7: Optional Enhancement - Move Emojis to CSS

This is an **alternative approach** to Fix 3 that can improve maintainability.

### File: `/src/routes/+page.svelte`

Instead of HTML emojis, use CSS `::before` pseudo-elements:

**Current approach** (from Fix 3):
```html
<a href="/liberation" class="link-card">
  <span class="link-icon" aria-hidden="true">🎸</span>
  <span class="link-title">Liberation List</span>
  <span class="link-desc">Songs that haven't been played recently</span>
</a>
```

**Better approach** (optional):
```html
<a href="/liberation" class="link-card link-card-guitar">
  <span class="link-title">Liberation List</span>
  <span class="link-desc">Songs that haven't been played recently</span>
</a>
```

Then in the `<style>` block:
```css
.link-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-6);
  background: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  text-decoration: none;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.link-card::before {
  content: '';
  width: 32px;
  height: 32px;
  font-size: var(--text-2xl);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-2);
}

.link-card-guitar::before {
  content: '🎸';
}

.link-card-stats::before {
  content: '📊';
}

.link-card-visualizations::before {
  content: '🗺️';
}

.link-card-search::before {
  content: '🔍';
}
```

**Advantages**:
- Emojis are pure CSS decoration (semantic)
- Easier to maintain/update
- Better performance (fewer DOM nodes)
- Cleaner HTML

---

## Fix 8: Color Contrast Verification

### How to test color contrast

1. **Download WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/

2. **Extract colors from CSS**:
   - Light mode foreground: `#000000`
   - Light mode background: `#faf8f3`
   - Dark mode foreground: `#faf8f3`
   - Dark mode background: `#1a1410`

3. **Test each combination**:
   - Black on Cream: ✓ (should be high contrast)
   - Dark Gray on Light Beige: Check
   - Cream on Dark Brown: Check
   - Primary color (#d97706) on dark background: Check

4. **Document results** in a test report

### File: `/src/app.css` - Colors to verify

Light mode (default):
```css
--foreground: #000000;
--background: #faf8f3;
--foreground-secondary: #2d2d2d;
--color-primary-600: #d97706;
```

Dark mode:
```css
--foreground: #faf8f3;
--background: #1a1410;
--foreground-secondary: #e8e5e0;
--color-primary-400: oklch(0.77 0.18 65);
```

### Expected Results

For **WCAG AA**, you need:
- Normal text: **4.5:1 contrast ratio** minimum
- Large text (18pt+ or 14pt+ bold): **3:1 contrast ratio** minimum

All current colors appear to meet these standards based on oklch lightness values, but **formal testing is required**.

---

## Testing After Each Fix

After implementing each fix, run these tests:

### 1. Keyboard Navigation Test
```bash
# Using Tab to navigate through page
- Tab through entire page
- Verify skip link appears on first Tab
- Verify focus visible on all interactive elements
- Verify focus order is logical
```

### 2. Automated Testing
```bash
# Open DevTools in Chrome
1. Go to Lighthouse tab
2. Run "Accessibility" audit
3. Look for violations and warnings
```

### 3. Screen Reader Test (Quick)
```bash
# On macOS:
1. Open VoiceOver: Cmd + F5
2. Tab through the page
3. Listen to announcements

# On Windows:
1. Download NVDA (free)
2. Run through similar test
```

---

## Summary Checklist

- [ ] Fix 1: Add skip link to `+layout.svelte`
- [ ] Fix 2a: Add `aria-hidden="true"` to search icon
- [ ] Fix 2b-2d: Add `aria-hidden="true"` to all section icons and browse icons
- [ ] Fix 3: Add `aria-hidden="true"` to emoji icons in homepage
- [ ] Fix 4: Add `<label>` elements to form inputs
- [ ] Fix 5: Add `scope="col"` to table headers
- [ ] Fix 6: Implement modal focus management
- [ ] Fix 7 (Optional): Move emojis to CSS pseudo-elements
- [ ] Fix 8: Verify color contrast ratios
- [ ] Run Lighthouse audit
- [ ] Test with screen reader
- [ ] Test keyboard navigation

---

## Commit Messages

After implementing fixes, use these commit messages:

```bash
git commit -m "a11y: add skip link for keyboard navigation"
git commit -m "a11y: add aria-hidden to decorative SVGs and emojis"
git commit -m "a11y: add programmatic labels to form inputs"
git commit -m "a11y: add scope attribute to table headers"
git commit -m "a11y: implement focus management for modals"
git commit -m "a11y: verify color contrast ratios"
```

---

## Questions?

Refer back to the main audit report (`WCAG_2.1_AA_AUDIT.md`) for:
- Detailed explanations of each issue
- WCAG criterion references
- Why each fix matters
- Impact on different user groups
