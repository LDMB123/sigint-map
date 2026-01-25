---
name: implement-details-migration
description: Migrate disclosure/accordion to native <details>/<summary>
trigger: /details-migrate
used_by: [semantic-html-engineer, modern-css-architect]
---

# Implement Details/Summary Disclosure Migration

Convert JavaScript-controlled accordions and disclosure widgets to native `<details>/<summary>` in SvelteKit.

## When to Use
- Migrating accordion components
- Simplifying collapsible sections
- Replacing JS expand/collapse state
- Improving accessibility
- Reducing JavaScript bundle

## Required Inputs
- Source component file path
- Current expand/collapse behavior
- Animation requirements
- Multiple-open vs single-open behavior
- Svelte version (4 or 5)

## Step-by-Step Procedure

### 1. Analyze Current Implementation

```bash
# Find accordion/collapsible patterns
grep -rn "expanded\|collapse\|accordion\|Accordion" src/lib/components/ --include="*.svelte"

# Check for state management
grep -n "\$state.*expanded\|setExpanded\|toggle" src/lib/components/
```

### 2. Create Native Details Structure (Svelte 5)

```svelte
<!-- src/lib/components/ui/Disclosure.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: Snippet | string;
    children: Snippet;
    defaultOpen?: boolean;
    class?: string;
  }

  let { title, children, defaultOpen = false, class: className }: Props = $props();
</script>

<details open={defaultOpen} class="group {className}">
  <summary class="cursor-pointer list-none flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-800">
    {#if typeof title === 'string'}
      <span>{title}</span>
    {:else}
      {@render title()}
    {/if}
    <svg
      class="w-5 h-5 transition-transform group-open:rotate-180"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </summary>
  <div class="overflow-hidden">
    <div class="p-4">
      {@render children()}
    </div>
  </div>
</details>

<style>
  /* Remove default marker */
  summary::marker,
  summary::-webkit-details-marker {
    display: none;
  }
</style>
```

### 3. Add CSS for Smooth Animations

```css
/* In src/app.css or component styles */

/* Grid-based animation (recommended) */
details > div {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 300ms ease-out;
}

details[open] > div {
  grid-template-rows: 1fr;
}

details > div > * {
  overflow: hidden;
}

/* Alternative: max-height animation */
details.max-height-animation > div {
  max-height: 0;
  overflow: hidden;
  transition: max-height 300ms ease-out;
}

details.max-height-animation[open] > div {
  max-height: 1000px; /* Adjust based on content */
}

/* Chevron rotation */
details summary svg {
  transition: transform 200ms ease-out;
}

details[open] summary svg {
  transform: rotate(180deg);
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  details > div,
  details summary svg {
    transition: none;
  }
}
```

### 4. Handle Single-Open Accordion (Exclusive)

For accordion behavior where only one can be open at a time, use the `name` attribute:

```svelte
<!-- Accordion.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface AccordionItem {
    id: string;
    title: string | Snippet;
    content: Snippet;
  }

  interface Props {
    items: AccordionItem[];
    name?: string;
    allowMultiple?: boolean;
    class?: string;
  }

  let { items, name, allowMultiple = false, class: className }: Props = $props();

  // Generate unique name if not provided and single-open
  const accordionName = allowMultiple ? undefined : (name || crypto.randomUUID());
</script>

<div class="divide-y border rounded-lg {className}">
  {#each items as item (item.id)}
    <details name={accordionName} class="group">
      <summary class="p-4 cursor-pointer list-none flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-900">
        {#if typeof item.title === 'string'}
          <span>{item.title}</span>
        {:else}
          {@render item.title()}
        {/if}
        <svg class="h-4 w-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div class="grid grid-rows-[0fr] group-open:grid-rows-[1fr] transition-[grid-template-rows] duration-300">
        <div class="overflow-hidden">
          <div class="px-4 pb-4">
            {@render item.content()}
          </div>
        </div>
      </div>
    </details>
  {/each}
</div>

<style>
  summary::marker,
  summary::-webkit-details-marker {
    display: none;
  }
</style>
```

### 5. Programmatic Control (If Needed)

```svelte
<script lang="ts">
  let detailsRef: HTMLDetailsElement;

  function toggle() {
    if (detailsRef) {
      detailsRef.open = !detailsRef.open;
    }
  }

  function open() {
    if (detailsRef) {
      detailsRef.open = true;
    }
  }

  function close() {
    if (detailsRef) {
      detailsRef.open = false;
    }
  }

  // Listen for toggle events
  function handleToggle(event: Event) {
    const target = event.target as HTMLDetailsElement;
    console.log('Details toggled:', target.open);
  }
</script>

<details bind:this={detailsRef} ontoggle={handleToggle}>
  <summary>Programmatically controlled</summary>
  <p>Content</p>
</details>

<button onclick={toggle}>Toggle</button>
<button onclick={open}>Open</button>
<button onclick={close}>Close</button>
```

### 6. Using Svelte 5 State with Details

```svelte
<script lang="ts">
  let isOpen = $state(false);
  let detailsRef: HTMLDetailsElement;

  function handleToggle() {
    isOpen = detailsRef.open;
  }

  // Sync state to element
  $effect(() => {
    if (detailsRef) {
      detailsRef.open = isOpen;
    }
  });
</script>

<details bind:this={detailsRef} ontoggle={handleToggle}>
  <summary>Synced with state</summary>
  <p>State is: {isOpen ? 'open' : 'closed'}</p>
</details>

<button onclick={() => isOpen = !isOpen}>
  {isOpen ? 'Close' : 'Open'} via state
</button>
```

### 7. Test Accessibility

```markdown
- [ ] Keyboard: Enter/Space toggles open state
- [ ] `open` attribute reflects current state
- [ ] Summary is focusable
- [ ] Proper heading hierarchy within summary (if needed)
- [ ] Screen reader announces expanded/collapsed state
- [ ] Visual focus indicator on summary
- [ ] Reduced motion respected
```

### 8. Playwright Test

```typescript
import { test, expect } from '@playwright/test';

test('details toggle works', async ({ page }) => {
  await page.goto('/');

  const details = page.locator('details').first();
  const summary = details.locator('summary');

  // Initially closed
  await expect(details).not.toHaveAttribute('open');

  // Click to open
  await summary.click();
  await expect(details).toHaveAttribute('open');

  // Click to close
  await summary.click();
  await expect(details).not.toHaveAttribute('open');
});

test('details keyboard navigation', async ({ page }) => {
  await page.goto('/');

  const summary = page.locator('summary').first();

  // Focus
  await summary.focus();
  await expect(summary).toBeFocused();

  // Open with Enter
  await page.keyboard.press('Enter');
  const details = page.locator('details').first();
  await expect(details).toHaveAttribute('open');

  // Close with Space
  await page.keyboard.press('Space');
  await expect(details).not.toHaveAttribute('open');
});

test('accordion single-open behavior', async ({ page }) => {
  await page.goto('/accordion');

  const firstDetails = page.locator('details').nth(0);
  const secondDetails = page.locator('details').nth(1);

  // Open first
  await firstDetails.locator('summary').click();
  await expect(firstDetails).toHaveAttribute('open');
  await expect(secondDetails).not.toHaveAttribute('open');

  // Open second (should close first)
  await secondDetails.locator('summary').click();
  await expect(firstDetails).not.toHaveAttribute('open');
  await expect(secondDetails).toHaveAttribute('open');
});
```

### 9. Update Consumers

```svelte
<!-- Before -->
<script>
  let expanded = $state(false);
</script>

<button onclick={() => expanded = !expanded}>
  {expanded ? 'Collapse' : 'Expand'}
</button>

{#if expanded}
  <div transition:slide>
    Content here
  </div>
{/if}

<!-- After -->
<script>
  import Disclosure from '$lib/components/ui/Disclosure.svelte';
</script>

<Disclosure title="Click to expand">
  Content here
</Disclosure>
```

## Expected Artifacts

| Artifact | Location |
|----------|----------|
| Disclosure component | `src/lib/components/ui/Disclosure.svelte` |
| Accordion component | `src/lib/components/ui/Accordion.svelte` |
| CSS additions | `src/app.css` |
| Tests | `tests/disclosure.spec.ts` |

## Validation Checklist

- [ ] Native `<details>/<summary>` used
- [ ] Click/keyboard toggles state
- [ ] Animation works smoothly
- [ ] Single-open accordion uses `name` attribute
- [ ] Multiple-open accordion works
- [ ] Reduced motion respected
- [ ] Accessible to screen readers
- [ ] Focus visible on summary
- [ ] Default marker hidden
- [ ] Custom chevron rotates
- [ ] Tests pass

## Success Criteria
- Disclosure functionality preserved
- Zero JavaScript for basic expand/collapse
- Animation smooth and accessible
- Accordion single-open works via `name`
- Bundle size reduced
- Accessibility improved

## Browser Support
- Chrome/Chromium 143+ (name attribute support)
- Firefox 120+
- Safari 17+
- Edge 143+

Note: The `name` attribute for exclusive accordions is supported in Chromium 143+. For older browsers, a small JavaScript polyfill may be needed.

## Advanced: Custom Animations

```css
/* Fade in content */
details > div {
  opacity: 0;
  transition: opacity 200ms, grid-template-rows 300ms;
}

details[open] > div {
  opacity: 1;
}

/* Slide and fade */
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

details[open] > div > div {
  animation: slideDown 300ms ease-out;
}
```

## References
- [MDN: `<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details)
- [MDN: `<summary>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/summary)
- [WHATWG: Exclusive accordions](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element)
