---
name: implement-dialog-migration
description: Migrate modal component to native <dialog> element
trigger: /dialog-migrate
used_by: [semantic-html-engineer, modern-css-architect]
---

# Implement Dialog Modal Migration

Convert a Svelte modal component to use native `<dialog>` element with minimal JavaScript.

## When to Use
- Migrating custom modal implementations
- Replacing component library modals
- Simplifying modal state management
- Improving accessibility

## Required Inputs
- Source component file path
- Current props/API to preserve
- Accessibility requirements
- Animation requirements
- Browser support targets

## Step-by-Step Procedure

### 1. Analyze Current Implementation

```bash
# Find current dialog/modal usage
grep -rn "modal\|dialog\|Modal\|Dialog" src/lib/components/ --include="*.svelte"

# Check for controlled state
grep -n "isOpen\|open.*=.*\$state\|showModal" src/lib/components/
```

### 2. Create Native Dialog Structure (Svelte 5)

```svelte
<!-- src/lib/components/ui/Dialog.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    id: string;
    children?: Snippet;
    class?: string;
    onClose?: () => void;
  }

  let { id, children, class: className, onClose }: Props = $props();

  let dialogRef: HTMLDialogElement;

  onMount(() => {
    const handleClose = () => onClose?.();
    dialogRef.addEventListener('close', handleClose);
    return () => dialogRef.removeEventListener('close', handleClose);
  });
</script>

<dialog
  bind:this={dialogRef}
  {id}
  class="fixed inset-0 m-auto p-6 rounded-lg shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm open:animate-in open:fade-in open:zoom-in-95 {className}"
>
  {@render children?.()}
</dialog>

<style>
  dialog {
    max-width: 600px;
    border: none;
  }

  dialog::backdrop {
    background: oklch(0% 0 0 / 0.5);
    backdrop-filter: blur(4px);
  }
</style>
```

### 3. Create Trigger Using Invoker Commands

```svelte
<!-- DialogTrigger.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    dialogId: string;
    children: Snippet;
  }

  let { dialogId, children, ...restProps }: Props = $props();
</script>

<button
  commandfor={dialogId}
  command="show-modal"
  {...restProps}
>
  {@render children()}
</button>
```

### 4. Add CSS for Animations

```css
/* In src/app.css or component styles */
dialog {
  /* Entry animation */
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 150ms, transform 150ms, display 150ms allow-discrete;
}

dialog[open] {
  opacity: 1;
  transform: scale(1);
}

@starting-style {
  dialog[open] {
    opacity: 0;
    transform: scale(0.95);
  }
}

/* Exit animation (requires display: none transition) */
@media (prefers-reduced-motion: no-preference) {
  dialog {
    transition:
      opacity 150ms,
      transform 150ms,
      display 150ms allow-discrete,
      overlay 150ms allow-discrete;
  }
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  dialog {
    transition: none;
  }
}

/* Backdrop */
dialog::backdrop {
  background: oklch(0% 0 0 / 0.5);
  backdrop-filter: blur(4px);
  transition: backdrop-filter 150ms;
}

@media (prefers-reduced-motion: reduce) {
  dialog::backdrop {
    backdrop-filter: none;
  }
}
```

### 5. Handle Close Actions

```svelte
<!-- DialogClose.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    dialogId: string;
    children?: Snippet;
  }

  let { dialogId, children }: Props = $props();
</script>

<button
  commandfor={dialogId}
  command="close"
  aria-label="Close dialog"
>
  {#if children}
    {@render children()}
  {:else}
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M6 6l12 12M18 6L6 18" stroke-width="2" stroke-linecap="round"/>
    </svg>
  {/if}
</button>
```

### 6. Form Method Dialog Pattern

```svelte
<!-- For forms that close dialog on submit -->
<dialog id="edit-form">
  <h2>Edit Item</h2>

  <form method="dialog">
    <label>
      Name
      <input type="text" name="name" required />
    </label>

    <div class="actions">
      <button type="submit" value="cancel">Cancel</button>
      <button type="submit" value="save">Save</button>
    </div>
  </form>
</dialog>

<script>
  // Listen for close and check returnValue
  dialogRef.addEventListener('close', () => {
    const returnValue = dialogRef.returnValue;
    if (returnValue === 'save') {
      // Handle save
    }
  });
</script>
```

### 7. Programmatic Control (Svelte 5)

```svelte
<script lang="ts">
  let dialogRef: HTMLDialogElement;

  function openDialog() {
    dialogRef.showModal();
  }

  function closeDialog() {
    dialogRef.close();
  }

  // Export for parent control
  export { openDialog, closeDialog };
</script>

<dialog bind:this={dialogRef}>
  <!-- content -->
</dialog>
```

### 8. Test Accessibility

```markdown
- [ ] Focus moves to dialog on open
- [ ] Focus trapped within dialog
- [ ] ESC key closes dialog
- [ ] Focus returns to trigger on close
- [ ] Screen reader announces dialog role
- [ ] `aria-labelledby` points to title
- [ ] `aria-describedby` points to description (if any)
- [ ] Backdrop prevents interaction with page
- [ ] Light-dismiss NOT enabled (modal should require explicit action)
```

### 9. Playwright Test

```typescript
import { test, expect } from '@playwright/test';

test('dialog opens, traps focus, and closes', async ({ page }) => {
  await page.goto('/');

  // Open dialog
  await page.click('[data-testid="open-dialog"]');
  const dialog = page.locator('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('open');

  // Test focus trap
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const focusedElement = await page.evaluateHandle(() => document.activeElement);
  const isInDialog = await page.evaluate(
    ({ dialog, focused }) => dialog.contains(focused),
    { dialog: await dialog.elementHandle(), focused: focusedElement }
  );
  expect(isInDialog).toBe(true);

  // Close with ESC
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();

  // Verify focus returned
  const trigger = page.locator('[data-testid="open-dialog"]');
  await expect(trigger).toBeFocused();
});
```

### 10. Update Consumers

```svelte
<!-- Before -->
<script>
  let isOpen = $state(false);
</script>

<button onclick={() => isOpen = true}>Open Modal</button>

{#if isOpen}
  <div class="modal-overlay">
    <div class="modal">
      <button onclick={() => isOpen = false}>Close</button>
      <!-- content -->
    </div>
  </div>
{/if}

<!-- After -->
<script>
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DialogTrigger from '$lib/components/ui/DialogTrigger.svelte';
  import DialogClose from '$lib/components/ui/DialogClose.svelte';
</script>

<DialogTrigger dialogId="my-dialog">
  Open Modal
</DialogTrigger>

<Dialog id="my-dialog" onClose={() => console.log('closed')}>
  <DialogClose dialogId="my-dialog" />
  <h2 id="dialog-title">Modal Title</h2>
  <p id="dialog-desc">Modal description</p>
  <!-- content -->
</Dialog>
```

## Expected Artifacts

| Artifact | Location |
|----------|----------|
| Dialog component | `src/lib/components/ui/Dialog.svelte` |
| DialogTrigger | `src/lib/components/ui/DialogTrigger.svelte` |
| DialogClose | `src/lib/components/ui/DialogClose.svelte` |
| CSS additions | `src/app.css` |
| Tests | `tests/dialog.spec.ts` |

## Validation Checklist

- [ ] Native `<dialog>` element used
- [ ] `showModal()` called for modal behavior
- [ ] Invoker Commands used for triggers
- [ ] Focus trap works (native)
- [ ] ESC closes (native)
- [ ] Focus restores on close
- [ ] Animations work
- [ ] Reduced motion respected
- [ ] Backdrop styled via `::backdrop`
- [ ] ARIA attributes correct
- [ ] Playwright tests pass
- [ ] Screen reader tested

## Success Criteria
- Modal functionality preserved
- JavaScript reduced (no $state for open state)
- Accessibility maintained or improved
- All consumers updated
- Bundle size reduced

## Browser Support
- Chrome/Chromium 143+
- Firefox 98+
- Safari 15.4+
- Edge 143+

## References
- [MDN: `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog)
- [Invoker Commands](https://open-ui.org/components/invokers.explainer/)
- [ARIA: dialog role](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
