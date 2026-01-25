# Chromium 143+ Native API Patterns for dmb-almanac-svelte

**Target:** Chromium 143+ on Apple Silicon macOS 26.2
**Framework:** SvelteKit 2 + Svelte 5
**Updated:** January 21, 2026

---

## Quick Reference: When to Use What

```
┌─────────────────────────────────────────────────────────────┐
│ HTML Element Decision Tree                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Modal with backdrop overlay?                                │
│ YES → Use <dialog> with showModal()                         │
│ NO  → Continue...                                           │
│                                                              │
│ Floating content, auto light-dismiss?                       │
│ YES → Use <div popover>                                     │
│ NO  → Continue...                                           │
│                                                              │
│ Toggle/Collapse pattern?                                    │
│ YES → Use <details>/<summary>                               │
│ NO  → Continue...                                           │
│                                                              │
│ Regular content?                                            │
│ YES → Use semantic HTML (div, section, etc.)               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Pattern 1: Modal Dialog (Already Excellent!)

### Use Cases:
- Install prompts ✅ (already using)
- Update notifications ✅ (already using)
- Confirmation dialogs (not yet needed)
- Complex forms (future feature)

### Implementation:

**Component File: ModalDialog.svelte**
```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  interface ModalProps {
    title: string;
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
  }

  let { title, isOpen, onClose, onConfirm }: ModalProps = $props();
  let dialogRef: HTMLDialogElement | null = $state(null);

  // Sync isOpen state with dialog open/close
  $effect(() => {
    if (isOpen && dialogRef && !dialogRef.open) {
      dialogRef.showModal();
    } else if (!isOpen && dialogRef?.open) {
      dialogRef.close();
    }
  });

  function handleDialogClose() {
    onClose();
  }

  function handleConfirm() {
    onConfirm?.();
    onClose();
  }
</script>

<dialog
  bind:this={dialogRef}
  onclose={handleDialogClose}
  aria-labelledby="modal-title"
  class="modal-dialog"
>
  <h2 id="modal-title" class="modal-title">{title}</h2>

  <div class="modal-content">
    <slot />
  </div>

  <div class="modal-actions">
    <button
      type="button"
      class="button button-secondary"
      onclick={onClose}
    >
      Cancel
    </button>
    {#if onConfirm}
      <button
        type="button"
        class="button button-primary"
        onclick={handleConfirm}
      >
        Confirm
      </button>
    {/if}
  </div>
</dialog>

<style>
  .modal-dialog {
    border: none;
    border-radius: var(--radius-xl);
    padding: 2rem;
    max-width: 500px;
    width: 90vw;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);

    /* Entry animation */
    opacity: 1;
    transform: translateY(0) scale(1);
    transition:
      opacity 300ms var(--ease-out-expo),
      transform 300ms var(--ease-out-expo),
      overlay 300ms var(--ease-out-expo) allow-discrete,
      display 300ms var(--ease-out-expo) allow-discrete;
  }

  /* Entry state */
  @starting-style {
    .modal-dialog[open] {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
  }

  /* Exit state */
  .modal-dialog:not([open]) {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }

  /* Backdrop styling */
  .modal-dialog::backdrop {
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    transition:
      background-color 300ms var(--ease-out-expo),
      backdrop-filter 300ms var(--ease-out-expo),
      overlay 300ms var(--ease-out-expo) allow-discrete;
  }

  @starting-style {
    .modal-dialog[open]::backdrop {
      background-color: rgba(0, 0, 0, 0);
      backdrop-filter: blur(0);
    }
  }

  .modal-title {
    margin: 0 0 1.5rem 0;
    font-size: var(--text-2xl);
    font-weight: var(--font-bold);
    color: var(--foreground);
  }

  .modal-content {
    margin-bottom: 2rem;
    color: var(--foreground-secondary);
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  .button {
    padding: 0.75rem 1.5rem;
    border-radius: var(--radius-lg);
    border: none;
    font-weight: var(--font-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .button-primary {
    background-color: var(--color-primary-600);
    color: white;
  }

  .button-primary:hover {
    background-color: var(--color-primary-700);
  }

  .button-secondary {
    background-color: var(--background-secondary);
    color: var(--foreground);
  }

  .button-secondary:hover {
    background-color: var(--background-tertiary);
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    .modal-dialog::backdrop {
      background-color: rgba(0, 0, 0, 0.8);
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .modal-dialog,
    .modal-dialog::backdrop {
      transition: none;
    }
  }
</style>
```

### Usage:
```svelte
<script>
  let showConfirmDelete = $state(false);

  function handleDelete() {
    // Delete logic
    showConfirmDelete = false;
  }
</script>

<button onclick={() => (showConfirmDelete = true)}>
  Delete Show
</button>

<ModalDialog
  title="Delete Show?"
  isOpen={showConfirmDelete}
  onClose={() => (showConfirmDelete = false)}
  onConfirm={handleDelete}
>
  <p>This action cannot be undone. Are you sure?</p>
</ModalDialog>
```

**Key Features:**
- ✅ Automatic focus management
- ✅ Native ESC key closing
- ✅ Backdrop blur on Apple Silicon GPU
- ✅ Smooth entry/exit animations
- ✅ Full keyboard support
- ✅ ARIA compliant

---

## Pattern 2: Popover (Non-Modal Floating Content)

### Use Cases:
- Dropdown menus (future filter menus)
- Tooltips with interactive content
- Inline help text
- Quick-action panels
- Search suggestions

### Implementation:

**Component File: Popover.svelte**
```svelte
<script lang="ts">
  interface PopoverProps {
    id: string;
    triggerId: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    class?: string;
  }

  let { id, triggerId, position = 'bottom', class: className = '' }: PopoverProps =
    $props();
</script>

<div
  {id}
  popover
  class="popover popover-{position} {className}"
  role="dialog"
  aria-label="popover"
>
  <slot />
</div>

<style>
  .popover {
    opacity: 0;
    transform: scale(0.95);
    transition:
      opacity 200ms var(--ease-out-expo),
      transform 200ms var(--ease-out-expo),
      display 200ms var(--ease-out-expo) allow-discrete;
    padding: 1rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    background-color: var(--background);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    z-index: 100;
  }

  .popover:popover-open {
    opacity: 1;
    transform: scale(1);
  }

  @starting-style {
    .popover:popover-open {
      opacity: 0;
      transform: scale(0.95);
    }
  }

  /* Position variants */
  .popover-top {
    margin-bottom: 0.5rem;
  }

  .popover-bottom {
    margin-top: 0.5rem;
  }

  .popover-left {
    margin-right: 0.5rem;
  }

  .popover-right {
    margin-left: 0.5rem;
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    .popover {
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .popover {
      transition: none;
    }
  }
</style>
```

### Usage Example 1: Simple Menu
```svelte
<button popovertarget="filter-menu" class="filter-button">
  Filters
</button>

<Popover id="filter-menu" triggerId="filter-menu">
  <div class="filter-options">
    <label>
      <input type="checkbox" />
      Available Offline
    </label>
    <label>
      <input type="checkbox" />
      Favorites Only
    </label>
    <label>
      <input type="checkbox" />
      Recent Shows
    </label>
  </div>
</Popover>

<style>
  .filter-options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: var(--text-sm);
  }
</style>
```

### Usage Example 2: Tooltip
```svelte
<button popovertarget="info-tooltip" class="help-button">
  <span aria-hidden="true">?</span>
  <span class="sr-only">More information</span>
</button>

<Popover id="info-tooltip" triggerId="info-tooltip" position="top">
  <p class="tooltip-text">
    This field determines the order of results in your search.
  </p>
</Popover>

<style>
  .help-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid var(--border-color);
    background: transparent;
    cursor: pointer;
    color: var(--foreground-secondary);
    transition: all var(--transition-fast);
  }

  .help-button:hover {
    border-color: var(--color-primary-500);
    color: var(--color-primary-500);
  }

  .tooltip-text {
    margin: 0;
    font-size: var(--text-sm);
    max-width: 200px;
  }
</style>
```

**Key Features:**
- ✅ Auto light-dismiss (click outside closes)
- ✅ Automatic positioning
- ✅ No manual backdrop needed
- ✅ Full keyboard support
- ✅ Focus returns to trigger on close
- ✅ Works with `anchor()` CSS (future)

---

## Pattern 3: Disclosure/Collapse (Like Mobile Menu)

### Use Cases:
- Mobile navigation menu ✅ (already using)
- Expandable sections
- Accordion panels
- Advanced filters
- FAQ sections

### Implementation:

**Component File: Disclosure.svelte**
```svelte
<script lang="ts">
  interface DisclosureProps {
    title: string;
    startOpen?: boolean;
    class?: string;
  }

  let { title, startOpen = false, class: className = '' }: DisclosureProps =
    $props();
  let detailsRef: HTMLDetailsElement | null = $state(null);
  let isOpen = $state(startOpen);

  $effect(() => {
    if (detailsRef) {
      isOpen = detailsRef.open;
    }
  });
</script>

<details bind:this={detailsRef} class="disclosure {className}">
  <summary class="disclosure-trigger">
    <span class="disclosure-icon" aria-hidden="true">▶</span>
    <span class="disclosure-title">{title}</span>
  </summary>

  <div class="disclosure-content">
    <slot />
  </div>
</details>

<style>
  .disclosure {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    margin-bottom: 1rem;
  }

  .disclosure-trigger {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    cursor: pointer;
    user-select: none;
    transition: background-color var(--transition-fast);
    list-style: none;
  }

  /* Remove default marker */
  .disclosure-trigger::-webkit-details-marker {
    display: none;
  }

  .disclosure-trigger::marker {
    display: none;
  }

  .disclosure-trigger:hover {
    background-color: var(--background-secondary);
  }

  .disclosure-icon {
    display: inline-flex;
    align-items: center;
    font-size: 0.75rem;
    transition: transform var(--transition-fast);
  }

  /* Rotate icon when open */
  details[open] .disclosure-icon {
    transform: rotate(90deg);
  }

  .disclosure-title {
    font-weight: var(--font-semibold);
    color: var(--foreground);
  }

  .disclosure-content {
    padding: 1rem;
    border-top: 1px solid var(--border-color);
    animation: slideDown 200ms var(--ease-out-expo);
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .disclosure-icon,
    .disclosure-content {
      animation: none;
      transition: none;
    }
  }
</style>
```

### Usage:
```svelte
<Disclosure title="Advanced Filters">
  <div class="filters">
    <label>
      <input type="checkbox" />
      Only Verified Shows
    </label>
    <label>
      <input type="checkbox" />
      Include Soundchecks
    </label>
  </div>
</Disclosure>

<style>
  .filters {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
</style>
```

**Key Features:**
- ✅ Zero JavaScript for toggle
- ✅ Automatic ESC key handling
- ✅ CSS-only icon animation
- ✅ Semantic `<details>` element
- ✅ Great accessibility out of box
- ✅ Minimal JavaScript needed

---

## Pattern 4: Toast/Notification (Non-Modal Alert)

### Use Cases:
- Form submission confirmations
- Error messages (non-blocking)
- Success feedback
- Undo prompts
- Loading progress

### Implementation:

**Component File: Toast.svelte**
```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  type ToastType = 'success' | 'error' | 'info' | 'warning';

  interface ToastProps {
    message: string;
    type?: ToastType;
    duration?: number;
    onDismiss?: () => void;
  }

  let {
    message,
    type = 'info',
    duration = 4000,
    onDismiss
  }: ToastProps = $props();

  let isVisible = $state(true);

  onMount(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        isVisible = false;
        onDismiss?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  });

  function handleDismiss() {
    isVisible = false;
    onDismiss?.();
  }
</script>

{#if isVisible}
  <div class="toast toast-{type}" role="status" aria-live="polite">
    <div class="toast-icon" aria-hidden="true">
      {#if type === 'success'}
        ✓
      {:else if type === 'error'}
        ✕
      {:else if type === 'warning'}
        ⚠
      {:else}
        ℹ
      {/if}
    </div>

    <p class="toast-message">{message}</p>

    <button
      type="button"
      class="toast-dismiss"
      aria-label="Dismiss notification"
      onclick={handleDismiss}
    >
      ✕
    </button>
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border-radius: var(--radius-lg);
    background-color: var(--background-secondary);
    border: 1px solid var(--border-color);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    max-width: 400px;
    animation: slideInUp 300ms var(--ease-out-expo);
    z-index: 1000;
  }

  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .toast-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    font-weight: bold;
    flex-shrink: 0;
  }

  .toast-success .toast-icon {
    color: var(--color-green-600);
  }

  .toast-error .toast-icon {
    color: var(--color-red-600);
  }

  .toast-warning .toast-icon {
    color: var(--color-amber-600);
  }

  .toast-info .toast-icon {
    color: var(--color-blue-600);
  }

  .toast-message {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--foreground);
    flex: 1;
  }

  .toast-dismiss {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: var(--foreground-secondary);
    cursor: pointer;
    padding: 0;
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    flex-shrink: 0;
  }

  .toast-dismiss:hover {
    background-color: var(--background-tertiary);
    color: var(--foreground);
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .toast {
      animation: none;
    }
  }

  /* Mobile */
  @media (max-width: 640px) {
    .toast {
      left: 1rem;
      right: 1rem;
      bottom: 1rem;
    }
  }
</style>
```

### Usage Store: `stores/toast.ts`
```typescript
import { writable, derived } from 'svelte/store';

type Toast = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
};

export const toasts = writable<Toast[]>([]);

export function addToast(
  message: string,
  type: 'success' | 'error' | 'info' | 'warning' = 'info',
  duration = 4000
) {
  const id = Math.random().toString(36).substr(2, 9);
  const toast: Toast = { id, message, type, duration };

  toasts.update(t => [...t, toast]);

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
}

export function removeToast(id: string) {
  toasts.update(t => t.filter(toast => toast.id !== id));
}

export const successToast = (message: string) => addToast(message, 'success');
export const errorToast = (message: string) => addToast(message, 'error');
export const warningToast = (message: string) => addToast(message, 'warning');
export const infoToast = (message: string) => addToast(message, 'info');
```

### Usage:
```svelte
<script>
  import { successToast, errorToast } from '$stores/toast';

  async function handleSave() {
    try {
      await save();
      successToast('Changes saved!');
    } catch (error) {
      errorToast('Failed to save: ' + error.message);
    }
  }
</script>

<button onclick={handleSave}>Save</button>
```

**Key Features:**
- ✅ Non-blocking notifications
- ✅ Auto-dismiss with duration
- ✅ Multiple toasts stacking
- ✅ Accessible with `role="status"`
- ✅ Dismissible by user
- ✅ Easy store-based API

---

## Pattern 5: Focus Management in Custom Components

### When You Need Custom Focus Handling:

Most of the time, use native HTML elements:
- `<dialog>` → automatic focus trap
- `<details>` → automatic keyboard handling
- `<popover>` → automatic focus return

### Only custom focus when:
- Creating composite components
- Integrating third-party libraries
- Complex keyboard interactions

### Implementation:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let containerRef: HTMLDivElement | null = null;
  let firstFocusableElement: HTMLElement | null = null;
  let lastFocusableElement: HTMLElement | null = null;

  onMount(() => {
    if (!containerRef) return;

    // Get all focusable elements
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      'textarea:not([disabled])',
      'select:not([disabled])'
    ];

    const focusableElements = containerRef.querySelectorAll(
      focusableSelectors.join(',')
    );

    if (focusableElements.length > 0) {
      firstFocusableElement = focusableElements[0] as HTMLElement;
      lastFocusableElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    }

    // Handle Tab key for focus cycling
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift+Tab
        if (document.activeElement === firstFocusableElement) {
          e.preventDefault();
          lastFocusableElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusableElement) {
          e.preventDefault();
          firstFocusableElement?.focus();
        }
      }
    };

    containerRef.addEventListener('keydown', handleKeydown);

    return () => {
      containerRef?.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<div bind:this={containerRef} role="region" aria-label="Interactive component">
  <!-- Your interactive content -->
  <slot />
</div>
```

**Recommendation:** Prefer native `<dialog>` and `<details>` to avoid this complexity.

---

## Chromium 143 Specific: `@starting-style`

This is used in multiple components. It provides entry animations for discrete properties:

```css
/* Element state BEFORE appearing on screen */
@starting-style {
  dialog[open] {
    opacity: 0;
    transform: translateY(20px);
  }
}

/* Element state WHILE appearing (Chromium handles this) */
dialog[open] {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 300ms, transform 300ms;
}

/* Element state AFTER closing */
dialog:not([open]) {
  opacity: 0;
  transform: translateY(20px);
}
```

**Browser Support:**
- Chrome 117+ ✅
- Edge 117+ ✅
- Safari 17.2+ ✅
- Firefox 105+ ✅

---

## Performance Tips for Apple Silicon

### 1. GPU-Accelerated Transforms
```css
/* Good - GPU composited */
.element {
  transform: translateY(0);
  transition: transform 300ms;
}

/* Avoid - CPU rasterized */
.element {
  top: 0;
  transition: top 300ms;
}
```

### 2. Backdrop Blur on Metal
```css
/* Efficient on Apple Silicon */
dialog::backdrop {
  backdrop-filter: blur(4px);  /* ~1% GPU utilization */
}

/* Avoid */
dialog::backdrop {
  backdrop-filter: blur(20px);  /* Higher cost */
}
```

### 3. Containment for Optimization
```css
.container {
  contain: layout style;  /* Tells Metal to optimize rendering */
}
```

### 4. Will-Change (Use Sparingly)
```css
/* Only for elements that will definitely animate */
.animated-element {
  will-change: transform, opacity;
}
```

---

## Testing Checklist

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Shift+Tab works backwards
- [ ] ESC closes dialogs and popovers
- [ ] Enter/Space activates buttons

### Focus Management
- [ ] Focus trapped in modal dialogs
- [ ] Focus returns to trigger on dismiss
- [ ] Focus visible indicators present
- [ ] Focus outline has sufficient contrast

### Screen Reader
- [ ] ARIA labels present
- [ ] Semantic HTML used
- [ ] Live regions for dynamic updates
- [ ] No empty `aria-label` attributes

### Mobile
- [ ] Touch targets minimum 44x44px
- [ ] No hover-only content
- [ ] Landscape and portrait tested
- [ ] Popovers don't cover essential content

### Animation
- [ ] Reduced motion respected
- [ ] 60+ FPS on all animations
- [ ] No jank during transitions
- [ ] Entry/exit animations match

---

## Accessibility Checklist

### ARIA Labels
```svelte
<!-- Good -->
<button popovertarget="menu" aria-label="Open navigation menu">
  Menu
</button>

<!-- Avoid -->
<button popovertarget="menu">☰</button>
```

### Focus Indicators
```css
/* Must have visible focus */
button:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}
```

### Semantic HTML
```svelte
<!-- Good -->
<details>
  <summary>More Info</summary>
  Content here
</details>

<!-- Avoid -->
<div class="accordion">
  <div class="toggle">More Info</div>
  <div class="content">Content here</div>
</div>
```

---

## Common Pitfalls & Solutions

### ❌ Problem: Dialog loses focus on navigate
```typescript
// Wrong
$effect(() => {
  if (isOpen) dialogRef?.showModal();  // Every render
});

// Correct
$effect.pre(() => {
  if (isOpen && !dialogRef?.open) {
    dialogRef?.showModal();  // Only when needed
  }
});
```

### ❌ Problem: Escape key doesn't work
```css
/* This breaks native ESC behavior */
dialog {
  background: transparent;
  border: none;
  padding: 0;
}

/* Better */
dialog {
  border: none;
  padding: 2rem;
  /* Let browser handle ESC */
}
```

### ❌ Problem: Backdrop doesn't blur smoothly
```css
/* Avoid rapid backdrop-filter changes */
dialog::backdrop {
  transition: background-color 300ms;  /* backdrop-filter missing */
}

/* Better */
dialog::backdrop {
  transition:
    background-color 300ms,
    backdrop-filter 300ms;
}
```

---

## File Organization Recommendation

```
src/lib/components/
├── dialog/
│   ├── Modal.svelte          # Generic modal wrapper
│   ├── ConfirmDialog.svelte  # Confirmation pattern
│   └── AlertDialog.svelte    # Alert pattern
├── popover/
│   ├── Popover.svelte        # Generic popover
│   ├── Dropdown.svelte       # Menu pattern
│   └── Tooltip.svelte        # Tooltip pattern
├── disclosure/
│   ├── Disclosure.svelte     # Generic disclosure
│   └── Accordion.svelte      # Multi-disclosure
└── notifications/
    ├── Toast.svelte          # Toast notification
    └── Notification.svelte   # Alert banner
```

---

## Resources

### Chromium 143+ Specifications
- [HTML Dialog Element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element)
- [Popover API](https://html.spec.whatwg.org/multipage/popover.html)
- [Details Element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element)
- [@starting-style CSS](https://drafts.csswg.org/css-transitions/#animation-composite)

### Accessibility
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Focus Management](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- [Modal Dialog Example](https://www.w3.org/WAI/ARIA/apg/patterns/dialogmodal/)

### Performance
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [Web Vitals](https://web.dev/vitals/)
- [Metal Performance Metrics](https://developer.apple.com/documentation/metalperformanceshaders)

---

**Last Updated:** January 21, 2026
**Next Review:** January 21, 2027 (or when Chromium 144 released)
