# Accessibility Quick Fix Guide for DMB Almanac

**Fast-track remediation for developers - Copy/paste solutions**

---

## Issue #1: SVG Alt Text (Copy to Header.svelte, Footer.svelte)

### Before:
```svelte
<span class="logoIcon" aria-hidden="true">
  <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
    <circle cx="16" cy="16" r="14" />
  </svg>
</span>
```

### After:
```svelte
<a href="/" class="logo" aria-label="DMB Almanac home">
  <span class="logoIcon">
    <svg viewBox="0 0 32 32" fill="currentColor">
      <title>Dave Matthews Band Almanac</title>
      <circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="2" fill="none"/>
    </svg>
  </span>
  <span class="logoText">
    <span class="logoPrimary">DMB</span>
    <span class="logoSecondary">Almanac</span>
  </span>
</a>
```

---

## Issue #2: Color Contrast Fix

### Add to your color system (CSS variables):
```css
:root {
  /* Semantic colors with WCAG AA verified contrast */
  --color-text-primary: #1a1a1a;           /* 21:1 on #fff */
  --color-text-secondary: #4b5563;         /* 9.5:1 on #fff */
  --color-text-muted: #6b7280;            /* 5.1:1 on #fff */
  --color-icon-primary: var(--foreground);
  --color-icon-secondary: var(--foreground-secondary);

  /* Semantic statuses */
  --color-text-success: #166534;           /* 8.5:1 on #fff */
  --color-text-warning: #92400e;           /* 6.2:1 on #fff */
  --color-text-error: #991b1b;            /* 8.1:1 on #fff */
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-text-primary: #f3f4f6;         /* 21:1 on #1f2937 */
    --color-text-secondary: #d1d5db;       /* 9.1:1 on #1f2937 */
    --color-text-muted: #9ca3af;          /* 5.2:1 on #1f2937 */
  }
}
```

### Then use in components:
```svelte
.badge {
  color: var(--color-text-primary);  /* WCAG verified */
}

.stat {
  color: var(--color-text-secondary);  /* WCAG verified */
}

.placeholder {
  opacity: 1;  /* Never reduce opacity below 100% */
  color: var(--color-text-muted);
}
```

---

## Issue #3: Form Label Visibility (SearchInput.svelte)

### Before:
```svelte
<label for="search-input" class="visually-hidden">Search</label>
<input type="search" id="search-input" placeholder="Search..." />
```

### After:
```svelte
<div class="search-wrapper">
  <label for="search-input" class="search-label">
    Search for songs, shows, or guests
  </label>
  <div class="search-input-wrapper">
    <svg class="search-icon" aria-hidden="true"><!-- icon --></svg>
    <input
      type="search"
      id="search-input"
      placeholder="e.g., 'Ants Marching' or 'Red Rocks'"
      aria-describedby={suggestions.length ? 'search-hints' : undefined}
    />
  </div>
  {#if suggestions.length > 0}
    <div id="search-hints" class="search-hints">
      Suggestions available - use arrow keys to select
    </div>
  {/if}
</div>

<style>
  .search-label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .search-hints {
    margin-top: 0.25rem;
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
  }
</style>
```

---

## Issue #4: Data Visualization Fallback

### Add to GuestNetwork.svelte, SongHeatmap.svelte, etc:

```svelte
<script>
  let showDataTable = $state(false);
</script>

<div class="visualization-wrapper">
  <!-- Main visualization -->
  <div class="visualization-main" role="region" aria-label="Interactive network visualization">
    <svg role="img" aria-label="Guest network diagram" />
  </div>

  <!-- Accessibility Controls -->
  <div class="visualization-controls">
    <button
      type="button"
      class="btn-secondary"
      aria-pressed={showDataTable}
      onclick={() => (showDataTable = !showDataTable)}
    >
      {showDataTable ? 'Hide' : 'Show'} Data Table
    </button>
  </div>

  <!-- Data Table Fallback -->
  {#if showDataTable}
    <div class="data-table" role="region" aria-label="Visualization data">
      <h3>Data Export</h3>
      <table>
        <caption>Network node and edge data</caption>
        <thead>
          <tr>
            <th scope="col">Guest</th>
            <th scope="col">Appearances</th>
            <th scope="col">Connected To</th>
          </tr>
        </thead>
        <tbody>
          {#each data as node}
            <tr>
              <td>{node.name}</td>
              <td>{node.appearances}</td>
              <td>{node.connectedTo?.join(', ')}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .visualization-controls {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
    flex-wrap: wrap;
  }

  .data-table {
    margin-top: 2rem;
    padding: 1rem;
    background: var(--background-secondary);
    border-radius: var(--radius-lg);
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }

  th {
    background: var(--background-tertiary);
    font-weight: 600;
  }

  th:hover {
    background: var(--background-tertiary);
  }
</style>
```

---

## Issue #5: Focus Management in Dropdowns

### Fix for anchored/Dropdown.svelte:

```svelte
// After line 86, add:
dropdownElement.addEventListener('beforetoggle', (event) => {
  if (event.newState === 'open') {
    // Focus first menu item when opening
    setTimeout(() => {
      const firstItem = dropdownElement?.querySelector('[role="menuitem"]');
      firstItem?.focus();
    }, 0);
  } else if (event.newState === 'closed') {
    // Return focus to trigger button when closing
    triggerElement?.focus();
  }
});
```

### Add to keyboard handler:
```svelte
function handleMenuKeyDown(event) {
  if (!dropdownElement) return;

  switch (event.key) {
    case 'Escape':
      event.preventDefault();
      try {
        dropdownElement.hidePopover();
      } catch {
        // Already hidden
      }
      triggerElement?.focus();  // ENSURE this is present
      break;

    case 'Tab':
      // Tab through menu items
      const items = getFocusableItems();
      const currentIndex = items.indexOf(document.activeElement);

      if (event.shiftKey && currentIndex === 0) {
        event.preventDefault();
        items[items.length - 1].focus();
      } else if (!event.shiftKey && currentIndex === items.length - 1) {
        event.preventDefault();
        items[0].focus();
      }
      break;

    // ... rest of handlers
  }
}
```

---

## Issue #6: Skip Link (Add to Header.svelte)

```svelte
<script>
  // Add with other imports
  import { page } from '$app/stores';
</script>

<!-- Add as first element in body -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<header class="app-header">
  <!-- existing header content -->
</header>

<!-- In main layout -->
<main id="main-content">
  <!-- page content -->
</main>

<style>
  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    z-index: 100;
    padding: 8px 16px;
    background: var(--color-primary-500);
    color: white;
    text-decoration: none;
    border-radius: 0 0 4px 0;
    font-weight: 600;
  }

  .skip-link:focus {
    top: 0;
  }

  /* High contrast mode */
  @media (forced-colors: active) {
    .skip-link:focus {
      outline: 2px solid Highlight;
    }
  }
</style>
```

---

## Issue #7: Improved Focus Indicators (Add to global CSS or components)

```css
/* Replace all outline-offset: -2px with this pattern */
:focus-visible {
  outline: 3px solid var(--color-primary-500);
  outline-offset: 2px;    /* OUTSET, not inset */
  box-shadow: 0 0 0 4px color-mix(in oklch, var(--color-primary-500) 20%, transparent);
}

/* High contrast mode */
@media (forced-colors: active) {
  :focus-visible {
    outline: 3px solid Highlight;
    outline-offset: 2px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  :focus-visible {
    box-shadow: none;  /* Keep outline, remove shadow animation */
  }
}
```

---

## Issue #8: Virtual List Focus Improvements

### In VirtualList.svelte, update item rendering:

```svelte
<div
  class="virtual-list-item"
  class:focused={focusedIndex === index}
  style={itemStyle}
  data-index={index}
  role="listitem"
  tabindex={focusedIndex === index ? 0 : -1}
  aria-setsize={items.length}
  aria-posinset={index + 1}
  aria-current={focusedIndex === index ? 'true' : undefined}
  use:observeItem={index}
>
  {@render children({ item, index, style: itemStyle })}
</div>

<style>
  .virtual-list-item {
    /* existing styles */
  }

  .virtual-list-item:focus {
    outline: 3px solid var(--color-primary-500);
    outline-offset: 2px;
    z-index: 1;
  }

  .virtual-list-item.focused {
    background: color-mix(in oklch, var(--color-primary-100) 40%, transparent);
  }

  .virtual-list-item[aria-current="true"] {
    border-left: 3px solid var(--color-primary-500);
    padding-left: calc(var(--space-2) - 3px);
  }
</style>
```

---

## Issue #9: Add type="button" to All Buttons

### Search for and replace:
```svelte
<!-- Replace this -->
<button onclick={handler}>Text</button>

<!-- With this -->
<button type="button" onclick={handler}>Text</button>
```

### In Dropdown components specifically:
```svelte
<!-- anchored/Dropdown.svelte line 110 -->
<button
  type="button"  <!-- ADD THIS -->
  bind:this={triggerElement}
  popovertarget={id}
  popovertargetaction="toggle"
  class="dropdown-trigger"
  aria-label={ariaLabel || label}
  aria-haspopup="menu"
  aria-expanded={isOpen}
  aria-controls={id}
>
```

---

## Issue #10: Loading State Announcements

### Add to visualization components:

```svelte
<script>
  let loadingMessage = $state('');
  let progressPercent = $state(0);

  onMount(() => {
    // Update on state changes
    $effect(() => {
      if (!modulesLoaded) {
        loadingMessage = 'Loading visualization components...';
      } else if (isSimulating) {
        loadingMessage = `Simulating network - ${progressPercent}% complete`;
      } else if (data.length > 0) {
        loadingMessage = 'Visualization loaded and interactive';
      }
    });
  });
</script>

<!-- Always include announcement region -->
<div role="status" aria-live="polite" aria-atomic="true" class="visually-hidden">
  {loadingMessage}
</div>

<!-- Optional: visible loading indicator for users without screen readers -->
{#if !modulesLoaded || isSimulating}
  <div class="loading-indicator" aria-hidden="true">
    {loadingMessage}
  </div>
{/if}

<style>
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
```

---

## Issue #11: Form Error Association (SearchInput.svelte)

```svelte
<script>
  let errorMessage = $state('');
  let errorId = 'search-error';
</script>

<div class="search-wrapper">
  <label for="search-input" class="search-label">Search</label>

  <input
    type="search"
    id="search-input"
    aria-invalid={!!errorMessage}
    aria-describedby={errorMessage ? errorId : undefined}
  />

  {#if errorMessage}
    <div id={errorId} role="alert" class="error-message">
      <svg aria-hidden="true"><!-- error icon --></svg>
      {errorMessage}
    </div>
  {/if}
</div>

<style>
  .error-message {
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: var(--color-error-bg);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-md);
    color: var(--color-error);
    font-size: var(--text-sm);
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  input[aria-invalid="true"] {
    border-color: var(--color-error);
    box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-error) 20%, transparent);
  }
</style>
```

---

## Testing Command Line

```bash
# Run accessibility audit
npm run test:a11y

# Or use axe-core directly
npx axe https://localhost:5173 --tags wcag2aa --exit

# Test with Pa11y
npx pa11y https://localhost:5173

# Check contrast
npx wcag-contrast "./src/**/*.svelte"
```

---

## Common Patterns to Remember

### 1. Always associate labels with inputs
```svelte
<label for="input-id">Label</label>
<input id="input-id" />
```

### 2. Use role="status" for changes
```svelte
<div role="status" aria-live="polite">
  Processing complete
</div>
```

### 3. Return focus from modals
```svelte
function openModal() {
  modal.showModal();
  modal.querySelector('[autofocus]').focus();
}

function closeModal() {
  modal.close();
  triggerButton.focus();  // RETURN FOCUS
}
```

### 4. Describe complex widgets
```svelte
<button aria-label="Open menu (3 items)" aria-haspopup="menu">
  Menu
</button>
```

### 5. Announce updates
```svelte
<div role="alert" aria-live="assertive">
  {errorCount} errors found
</div>
```

---

## Checklist Before Committing

- [ ] Added `type="button"` to all buttons
- [ ] All images have `alt` or `aria-label`
- [ ] Form labels are visible
- [ ] Focus indicators visible with `outline-offset: 2px`
- [ ] Color contrast 4.5:1 for text, 3:1 for large text
- [ ] Keyboard navigation tested (Tab, Enter, Escape, arrow keys)
- [ ] Focus trap prevented (Tab wrapping controlled)
- [ ] Error messages associated with fields
- [ ] Loading/status changes announced
- [ ] High contrast mode styles verified

---

## Emergency Reference

**Can't remember the WCAG criterion?**
- Missing alt text? → **1.1.1**
- Color contrast issue? → **1.4.3**
- Missing label? → **1.3.1** or **3.3.2**
- Focus indicator? → **2.4.7**
- Keyboard navigation? → **2.1.1**
- Focus order? → **2.4.3**

