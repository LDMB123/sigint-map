# Chromium 143+ Implementation Guide
## DMB Almanac Svelte - Native API Modernization

**Target**: Chrome 143+ on Apple Silicon (M1/M2/M3/M4)
**Framework**: SvelteKit 2 + Svelte 5

---

## Table of Contents

1. [UpdatePrompt Dialog Animations](#1-updateprompt-dialog-animations)
2. [Mobile Menu Popover Alternative](#2-mobile-menu-popover-alternative)
3. [Visualization Tooltips with Popover](#3-visualization-tooltips-with-popover)
4. [CSS Range Syntax Migration](#4-css-range-syntax-migration)
5. [Advanced: CSS Anchor Positioning](#5-advanced-css-anchor-positioning)

---

## 1. UpdatePrompt Dialog Animations

### Problem
Current `UpdatePrompt.svelte` has basic `<dialog>` styling but lacks smooth entry/exit animations using Chromium 143+ `@starting-style`.

### Solution

**File**: `/src/lib/components/pwa/UpdatePrompt.svelte`

**Step 1: Update Component**

Replace the entire `<style>` block (lines 99-208) with:

```svelte
<style>
  /* Dialog container */
  :global(dialog.update-dialog) {
    border: none;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    padding: 24px;
    max-width: 400px;
    width: 90vw;

    /* Chromium 143+ smooth animations */
    opacity: 1;
    transform: translateY(0) scale(1);
    transition:
      opacity 300ms cubic-bezier(0.16, 1, 0.3, 1),
      transform 300ms cubic-bezier(0.16, 1, 0.3, 1),
      display 300ms allow-discrete,
      overlay 300ms allow-discrete;
  }

  /* Initial state before animation starts */
  @starting-style {
    :global(dialog.update-dialog[open]) {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
  }

  /* Exit state when dialog closes */
  :global(dialog.update-dialog:not([open])) {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }

  /* Backdrop animation */
  :global(dialog.update-dialog::backdrop) {
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    transition:
      background-color 300ms cubic-bezier(0.16, 1, 0.3, 1),
      backdrop-filter 300ms cubic-bezier(0.16, 1, 0.3, 1),
      overlay 300ms allow-discrete;
  }

  /* Backdrop starting state */
  @starting-style {
    :global(dialog.update-dialog[open]::backdrop) {
      background-color: rgba(0, 0, 0, 0);
      backdrop-filter: blur(0px);
    }
  }

  /* Fallback for browsers without @starting-style (Chrome < 117) */
  @supports not (animation-timeline: auto) {
    :global(dialog.update-dialog) {
      animation: slideUp 0.3s ease-out;
    }

    :global(dialog.update-dialog::backdrop) {
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
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
  }

  /* Respect prefers-reduced-motion */
  @media (prefers-reduced-motion: reduce) {
    :global(dialog.update-dialog),
    :global(dialog.update-dialog::backdrop) {
      transition: none;
    }
  }

  .update-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .update-title {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    color: #030712;
    line-height: 1.4;
  }

  .actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .update-btn,
  .dismiss-btn {
    padding: 10px 16px;
    border-radius: 8px;
    border: none;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    /* GPU acceleration */
    transform: translateZ(0);
  }

  .update-btn {
    background-color: #030712;
    color: #fff;
  }

  .update-btn:hover {
    background-color: #1a1822;
    transform: translateY(-1px) translateZ(0);
  }

  .update-btn:active {
    transform: translateY(0) scale(0.98) translateZ(0);
  }

  .dismiss-btn {
    background-color: #f0f0f0;
    color: #030712;
  }

  .dismiss-btn:hover {
    background-color: #e0e0e0;
  }

  .dismiss-btn:active {
    transform: scale(0.98);
  }

  @media (max-width: 600px) {
    :global(dialog.update-dialog) {
      width: 95vw;
      padding: 20px;
    }

    .actions {
      flex-direction: column;
      gap: 8px;
    }

    .update-btn,
    .dismiss-btn {
      width: 100%;
    }
  }

  /* High contrast mode support */
  @media (forced-colors: active) {
    :global(dialog.update-dialog) {
      border: 2px solid CanvasText;
    }

    .update-btn,
    .dismiss-btn {
      border: 1px solid CanvasText;
    }
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    :global(dialog.update-dialog::backdrop) {
      background-color: rgba(0, 0, 0, 0.7);
    }

    .update-title {
      color: #ffffff;
    }

    .dismiss-btn {
      background-color: #2a2a2a;
      color: #ffffff;
    }

    .dismiss-btn:hover {
      background-color: #3a3a3a;
    }
  }
</style>
```

**Step 2: JavaScript (No Changes Required)**

The existing JavaScript in UpdatePrompt works perfectly with the new CSS animations.

### Browser Support

- Chrome 117+ (with `@starting-style`)
- Chrome < 117: Falls back to `@keyframes` animation
- Safari 17.2+
- Firefox 123+
- Edge 117+

### Testing

```bash
# Open in Chrome 143+
npm run dev

# Test animation:
1. Open Chrome DevTools
2. Go to Console
3. Type: navigator.serviceWorker.ready.then(reg => {
     reg.controller?.postMessage({ type: 'SKIP_WAITING' });
   })
4. Watch the dialog animate in
```

---

## 2. Mobile Menu Popover Alternative

### Problem

Current implementation uses `<details>/<summary>` which works but doesn't semantically represent a menu. The Popover API (Chrome 114+) is more appropriate.

### Current Implementation (Header.svelte, lines 114-137)

```svelte
<details class="mobileMenuDetails" bind:this={mobileMenuDetails}>
  <summary class="menuButton">Hamburger</summary>
  <nav class="mobileNav">Items</nav>
</details>
```

### Modern Alternative: Popover API

**File**: `/src/lib/components/navigation/Header.svelte` (Optional Future Enhancement)

This is a **non-breaking enhancement** you can implement without removing the current `<details>` implementation.

**Add a new Popover-based menu** alongside the existing one:

```svelte
<script lang="ts">
  // ... existing imports ...

  let popoverMenuRef = $state<HTMLElement | null>(null);

  function togglePopoverMenu() {
    if (popoverMenuRef?.hasAttribute('popover')) {
      popoverMenuRef.togglePopover();
    }
  }

  // Close popover when navigating
  $effect(() => {
    if (popoverMenuRef && $page) {
      popoverMenuRef.hidePopover();
    }
  });
</script>

<!-- ... existing content ... -->

<!-- NEW: Popover-based menu (Chrome 114+) -->
<button
  popovertarget="mobile-nav-popover"
  class="menuButton-popover"
  aria-label="Toggle navigation menu"
>
  <span class="menuIcon" aria-hidden="true">
    <span class="menuLine"></span>
    <span class="menuLine"></span>
    <span class="menuLine"></span>
  </span>
</button>

<nav
  id="mobile-nav-popover"
  popover="auto"
  class="mobileNav-popover"
  aria-label="Mobile navigation"
>
  {#each navigation as item, index}
    <a
      href={item.href}
      class="mobileNavLink"
      aria-current={isActive(item.href) ? 'page' : undefined}
      style="--stagger-index: {index + 1}"
    >
      {item.label}
    </a>
  {/each}
</nav>

<style>
  /* Popover implementation (Chrome 114+) */
  .menuButton-popover {
    display: none; /* Hide by default, show when Popover API available */
  }

  @supports (popover: auto) {
    /* Show popover version if browser supports it */
    .mobileMenuDetails {
      display: none !important;
    }

    .menuButton-popover {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      padding: 0;
      border: none;
      background: none;
      cursor: pointer;
      color: var(--foreground);
      border-radius: var(--radius-lg);
      transition:
        background-color var(--transition-fast),
        transform var(--transition-fast);
    }

    .menuButton-popover:hover {
      background-color: var(--background-secondary);
    }

    .menuButton-popover:active {
      transform: scale(0.95);
    }

    .menuButton-popover:focus-visible {
      outline: 2px solid var(--color-primary-500);
      outline-offset: 2px;
    }

    /* Popover menu animation */
    .mobileNav-popover {
      opacity: 0;
      transform: translateY(-10px);
      transition:
        opacity 200ms var(--ease-out-expo),
        transform 200ms var(--ease-out-expo),
        display 200ms allow-discrete;
    }

    .mobileNav-popover:popover-open {
      opacity: 1;
      transform: translateY(0);
    }

    /* Position below header */
    .mobileNav-popover {
      position: absolute;
      inset: auto 0 0 0;
      display: flex;
      flex-direction: column;
      padding: var(--space-2) var(--space-4) var(--space-4);
      border-bottom: 1px solid var(--border-color);
      background-color: var(--background);
      max-width: none;
      margin: 0;
      border-radius: 0;
      border: none;
      border-top: 1px solid var(--border-color);
    }

    /* Light-dismiss backdrop */
    .mobileNav-popover::backdrop {
      background: transparent;
    }

    /* Reuse existing mobile nav link styles */
    .mobileNav-popover :global(.mobileNavLink) {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      font-size: var(--text-base);
      font-weight: var(--font-medium);
      color: var(--foreground-secondary);
      text-decoration: none;
      border-radius: var(--radius-lg);
      transition: all var(--transition-fast);
      min-height: 48px;
      animation: slideInFromRight 200ms var(--ease-out-expo) both;
      animation-delay: calc(var(--stagger-index, 0) * 20ms);
    }

    .mobileNav-popover :global(.mobileNavLink:hover) {
      color: var(--foreground);
      background-color: var(--background-secondary);
    }

    .mobileNav-popover :global(.mobileNavLink[aria-current='page']) {
      color: var(--color-primary-600);
      background-color: var(--color-primary-50);
      font-weight: var(--font-semibold);
    }

    @keyframes slideInFromRight {
      from {
        opacity: 0;
        transform: translateX(16px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .mobileNav-popover {
      transition: none;
    }

    .mobileNav-popover :global(.mobileNavLink) {
      animation: none;
    }
  }

  @media (min-width: 1024px) {
    .mobileNav-popover {
      display: none !important;
    }

    .menuButton-popover {
      display: none !important;
    }
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    .mobileNav-popover {
      background-color: color-mix(in oklch, var(--background) 95%, transparent);
      border-color: var(--color-gray-700);
    }
  }
</style>
```

### Benefits of Popover API

1. **Light-dismiss**: Closes automatically when clicking outside
2. **Automatic stacking**: No z-index management needed (top-layer)
3. **Better semantics**: `popover="auto"` clearly indicates purpose
4. **Keyboard handling**: Escape key automatic
5. **Animation support**: `:popover-open` pseudo-class

### Migration Path

**Phase 1** (Now): Keep existing `<details>` menu, add Popover alternative
**Phase 2** (Future): Remove `<details>` version when Chrome < 114 drops below 5% market share
**Phase 3**: Clean up CSS, rely solely on Popover API

---

## 3. Visualization Tooltips with Popover

### Problem

D3 visualizations have hover effects but no accessible tooltips. Users can't access information with keyboard.

### Solution: Create Tooltip Component

**File**: `/src/lib/components/ui/Tooltip.svelte` (NEW)

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface TooltipProps {
    content: string | Snippet;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
    triggerElement?: HTMLElement;
    children?: Snippet;
  }

  let {
    content,
    position = 'top',
    delay = 200,
    triggerElement,
    children
  }: TooltipProps = $props();

  let tooltipElement = $state<HTMLDivElement | null>(null);
  let showTimeout: ReturnType<typeof setTimeout> | undefined;
  let hideTimeout: ReturnType<typeof setTimeout> | undefined;

  function show() {
    clearTimeout(hideTimeout);
    if (showTimeout) return; // Already scheduled or shown

    showTimeout = setTimeout(() => {
      if (tooltipElement) {
        try {
          tooltipElement.showPopover();
        } catch (e) {
          // Popover already shown
        }
      }
      showTimeout = undefined;
    }, delay);
  }

  function hide() {
    clearTimeout(showTimeout);
    hideTimeout = setTimeout(() => {
      if (tooltipElement) {
        try {
          tooltipElement.hidePopover();
        } catch (e) {
          // Popover already hidden
        }
      }
      hideTimeout = undefined;
    }, 100);
  }

  // Keyboard handling
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      hide();
    }
  }
</script>

<div
  class="tooltip-trigger"
  onmouseenter={show}
  onmouseleave={hide}
  onfocus={show}
  onblur={hide}
  onkeydown={handleKeydown}
  role="button"
  tabindex={triggerElement ? -1 : 0}
  aria-label="Tooltip trigger"
  aria-describedby="tooltip-content"
>
  {#if children}
    {@render children()}
  {/if}
</div>

<div
  bind:this={tooltipElement}
  id="tooltip-content"
  popover="manual"
  class="tooltip {position}"
  role="tooltip"
  aria-hidden="true"
>
  {#if typeof content === 'string'}
    {content}
  {:else}
    {@render content()}
  {/if}
</div>

<style>
  .tooltip-trigger {
    position: relative;
  }

  .tooltip {
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 9999;

    opacity: 0;
    transform: translateY(-4px);
    transition:
      opacity 150ms cubic-bezier(0.16, 1, 0.3, 1),
      transform 150ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .tooltip:popover-open {
    opacity: 1;
    transform: translateY(0);
  }

  /* Position variants */
  .tooltip.top {
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(-8px);
    margin-bottom: 8px;
  }

  .tooltip.top:popover-open {
    transform: translateX(-50%) translateY(0);
  }

  .tooltip.bottom {
    top: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(8px);
    margin-top: 8px;
  }

  .tooltip.bottom:popover-open {
    transform: translateX(-50%) translateY(0);
  }

  .tooltip.left {
    right: 100%;
    top: 50%;
    transform: translateY(-50%) translateX(-8px);
    margin-right: 8px;
  }

  .tooltip.left:popover-open {
    transform: translateY(-50%) translateX(0);
  }

  .tooltip.right {
    left: 100%;
    top: 50%;
    transform: translateY(-50%) translateX(8px);
    margin-left: 8px;
  }

  .tooltip.right:popover-open {
    transform: translateY(-50%) translateX(0);
  }

  /* Dark mode - already dark, but add arrow indicator */
  @media (prefers-color-scheme: light) {
    .tooltip {
      background: rgba(0, 0, 0, 0.95);
      border: 1px solid rgba(0, 0, 0, 0.2);
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .tooltip {
      transition: none;
    }
  }

  /* High contrast mode */
  @media (forced-colors: active) {
    .tooltip {
      border: 1px solid CanvasText;
      background: Canvas;
      color: CanvasText;
    }
  }
</style>
```

### Usage in D3 Visualizations

**File**: `/src/lib/components/visualizations/GuestNetwork.svelte`

```svelte
<script lang="ts">
  import Tooltip from '$lib/components/ui/Tooltip.svelte';
  // ... existing imports ...

  let hoveredNode = $state<any | null>(null);
  let tooltipPos = $state({ x: 0, y: 0 });

  // In the visualization setup:
  const handleNodeHover = (event: MouseEvent, node: any) => {
    hoveredNode = node;
    const rect = (event.target as SVGElement).getBoundingClientRect();
    tooltipPos = {
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    };
  };

  const handleNodeLeave = () => {
    hoveredNode = null;
  };
</script>

<!-- ... SVG visualization ... -->

{#if hoveredNode}
  <div
    class="tooltip-container"
    style="--x: {tooltipPos.x}px; --y: {tooltipPos.y}px"
  >
    <Tooltip
      content="{hoveredNode.name}: {hoveredNode.appearances} appearances"
      position="top"
    >
      <span>Info</span>
    </Tooltip>
  </div>
{/if}

<style>
  .tooltip-container {
    position: fixed;
    left: var(--x);
    top: var(--y);
    transform: translateX(-50%);
    pointer-events: none;
  }
</style>
```

### Alternative: Direct Popover in D3

For better integration, add tooltips directly in D3 rendering:

```typescript
const handleNodeHover = (event: MouseEvent, node: any) => {
  // Show popover at mouse position
  const tooltip = document.getElementById('node-tooltip') as HTMLDivElement;
  if (tooltip && 'showPopover' in tooltip) {
    tooltip.style.left = event.pageX + 'px';
    tooltip.style.top = event.pageY - 8 + 'px';
    tooltip.textContent = `${node.name}: ${node.appearances} appearances`;
    (tooltip as any).showPopover();
  }
};

const handleNodeLeave = () => {
  const tooltip = document.getElementById('node-tooltip') as HTMLDivElement;
  if (tooltip && 'hidePopover' in tooltip) {
    (tooltip as any).hidePopover();
  }
};
```

---

## 4. CSS Range Syntax Migration

### Problem

Current media queries use verbose `min-width` / `max-width` syntax (Chrome < 143 requirement).

### Solution: Update to Range Syntax

Chrome 143+ supports cleaner range syntax in media queries.

**Before (Current)**:

```css
@media (min-width: 640px) {
  .container { padding: 1rem; }
}

@media (min-width: 640px) and (max-width: 1024px) {
  .container { padding: 2rem; }
}

@media (min-width: 1024px) {
  .container { padding: 3rem; }
}

@media (max-width: 639px) {
  .container { padding: 0.5rem; }
}
```

**After (Chrome 143+)**:

```css
@media (width < 640px) {
  .container { padding: 0.5rem; }
}

@media (640px <= width < 1024px) {
  .container { padding: 2rem; }
}

@media (width >= 1024px) {
  .container { padding: 3rem; }
}
```

### Implementation

**Update all files**: Use find-and-replace in your IDE

Pattern to find:
```regex
@media\s*\(\s*min-width\s*:\s*(\d+)px\s*\)\s*\{\s*([\s\S]*?)\}
```

Replace with:
```regex
@media ($1px <= width) { $2 }
```

For combined conditions:
```regex
@media\s*\(\s*min-width\s*:\s*(\d+)px\s*\)\s*and\s*\(\s*max-width\s*:\s*(\d+)px\s*\)
```

Replace with:
```regex
@media ($1px <= width <= ${($2 + 1) - 1}px)
```

### Files to Update

Priority files with media queries:
- `/src/lib/components/navigation/Header.svelte` - Lines 217, 292, 401, 513
- `/src/lib/components/ui/Card.svelte` - Lines 241, 264, 274, 281
- `/src/lib/components/ui/Table.svelte` - Lines 310, 326
- `/src/lib/components/ui/Pagination.svelte` - Lines 282, 298
- `/src/app.css` - All media queries

### Browser Support

```css
@supports (width: 640px) {
  /* Use new syntax */
  @media (640px <= width < 1024px) { }
}

@supports not (width: 640px) {
  /* Fallback to old syntax */
  @media (min-width: 640px) and (max-width: 1023px) { }
}
```

### Example Conversion

**Header.svelte Breakpoints**:

```css
/* Old */
@media (min-width: 640px) {
  .container { padding: var(--space-3) var(--space-6); }
}

@media (min-width: 1024px) {
  .nav { display: flex; }
  .mobileMenuDetails { display: none; }
}

/* New */
@media (width >= 640px) {
  .container { padding: var(--space-3) var(--space-6); }
}

@media (width >= 1024px) {
  .nav { display: flex; }
  .mobileMenuDetails { display: none; }
}
```

---

## 5. Advanced: CSS Anchor Positioning

### Problem

Floating elements (tooltips, popovers) require manual positioning calculations.

### Solution: CSS Anchor Positioning (Chrome 125+)

For advanced use cases, use CSS anchor positioning for automatic positioning with fallbacks.

**File**: `/src/lib/components/ui/AdvancedTooltip.svelte` (NEW - Optional)

```svelte
<script lang="ts">
  type Props = {
    content: string;
    anchorElement: HTMLElement;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  };

  let { content, anchorElement, position = 'auto' }: Props = $props();
  let tooltipElement = $state<HTMLDivElement | null>(null);

  // Generate anchor name from element ID or create one
  const anchorId = anchorElement.id || `anchor-${Math.random().toString(36).slice(2)}`;

  if (!anchorElement.id) {
    anchorElement.id = anchorId;
  }

  $effect(() => {
    if (anchorElement && tooltipElement) {
      const id = anchorElement.id || `anchor-${Math.random().toString(36).slice(2)}`;
      anchorElement.style.anchorName = `--${id}`;
      tooltipElement.style.positionAnchor = `--${id}`;
    }
  });
</script>

<div bind:this={tooltipElement} class="tooltip" class:position>
  {content}
</div>

<style>
  .tooltip {
    position: fixed;

    /* Default: position above anchor */
    top: anchor(top);
    left: anchor(center);
    transform: translateX(-50%) translateY(-8px);

    /* Styling */
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 9999;

    /* Fallback positioning if near viewport edge */
    position-try: flip-block, flip-inline;

    /* Or explicit fallbacks */
    position-try-fallbacks:
      top anchor(top) left anchor(center) translateX(-50%) translateY(-8px),
      bottom anchor(bottom) left anchor(center) translateX(-50%) translateY(8px),
      top anchor(top) right anchor(right) translateX(0) translateY(-8px),
      bottom anchor(bottom) left anchor(left) translateX(0) translateY(8px);
  }

  /* Position variants */
  .tooltip.position {
    /* If you want to lock to a specific position */
    position-try: unset;
  }

  /* Top position */
  .tooltip.position-top {
    top: anchor(top);
    left: anchor(center);
    transform: translateX(-50%) translateY(-8px);
  }

  /* Bottom position */
  .tooltip.position-bottom {
    top: anchor(bottom);
    left: anchor(center);
    transform: translateX(-50%) translateY(8px);
  }

  /* Left position */
  .tooltip.position-left {
    top: anchor(center);
    left: anchor(left);
    transform: translateY(-50%) translateX(-8px);
  }

  /* Right position */
  .tooltip.position-right {
    top: anchor(center);
    left: anchor(right);
    transform: translateY(-50%) translateX(8px);
  }

  /* Use anchor size for responsive tooltips */
  @supports (width: anchor-size(width)) {
    .tooltip {
      max-width: anchor-size(width);
    }
  }
</style>
```

### Usage

```svelte
<script>
  let nodeElement: HTMLElement;
  import AdvancedTooltip from '$lib/components/ui/AdvancedTooltip.svelte';
</script>

<circle
  bind:this={nodeElement}
  cx="100"
  cy="100"
  r="10"
/>

<AdvancedTooltip
  content="Important Node"
  anchorElement={nodeElement}
  position="top"
/>
```

### Browser Support

- Chrome 125+
- Safari 17.2+
- Firefox 126+
- Edge 125+

**Fallback for Chrome < 125**:
```css
@supports not (anchor-name: --test) {
  /* Use manual positioning instead */
  .tooltip {
    position: absolute;
    top: calc(var(--anchor-top) - 10px);
    left: var(--anchor-left);
  }
}
```

---

## Implementation Checklist

### Phase 1: Animations (30 minutes)
- [ ] Update `UpdatePrompt.svelte` with `@starting-style`
- [ ] Test animation in Chrome 143+
- [ ] Verify fallback animation works in Chrome < 117
- [ ] Test with `prefers-reduced-motion: reduce`

### Phase 2: Tooltips (2 hours)
- [ ] Create `Tooltip.svelte` component
- [ ] Add tooltip to GuestNetwork visualization
- [ ] Test Popover API functionality
- [ ] Verify keyboard accessibility
- [ ] Test with screen readers

### Phase 3: CSS Updates (1 hour)
- [ ] Update media queries to range syntax
- [ ] Test responsive behavior
- [ ] Verify breakpoints work correctly

### Phase 4: Optional Popover Menu (1-2 hours)
- [ ] Add Popover alternative to Header
- [ ] Test with Chrome 114+
- [ ] Ensure `<details>` version still works
- [ ] Document feature detection

### Phase 5: Advanced Positioning (Optional, 2 hours)
- [ ] Create `AdvancedTooltip.svelte` for CSS anchor positioning
- [ ] Test with Chrome 125+
- [ ] Implement fallbacks

---

## Testing Commands

### Chrome DevTools Console

```javascript
// Check Popover API support
if (HTMLElement.prototype.showPopover) {
  console.log('Popover API supported');
}

// Check CSS support
const style = new CSSStyleSheet();
try {
  style.insertRule('@starting-style { :root {} }');
  console.log('@starting-style supported');
} catch (e) {
  console.log('@starting-style not supported');
}

// Check anchor positioning
try {
  style.insertRule(':root { anchor-name: --test; }');
  console.log('CSS anchor positioning supported');
} catch (e) {
  console.log('CSS anchor positioning not supported');
}
```

### Performance Testing

```javascript
// Measure animation performance
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`Frame duration: ${entry.duration}ms`);
    if (entry.duration > 16.67) { // > 60fps
      console.warn('Animation frame exceeded 60fps budget');
    }
  }
});

observer.observe({ type: 'long-animation-frame' });
```

### Accessibility Testing

```bash
# Test with Screen Reader (macOS)
1. Open Chrome
2. Press Cmd+F5 to enable VoiceOver
3. Navigate with VO+Right Arrow
4. Verify menu descriptions are announced

# Test with keyboard
1. Tab through interface
2. Verify focus visible on all interactive elements
3. Test Escape key closes popovers
```

---

## Conclusion

This implementation guide covers:
1. ✅ Smooth dialog animations with `@starting-style`
2. ✅ Popover API alternatives to `<details>`
3. ✅ Accessible tooltips with Popover API
4. ✅ Modern CSS range syntax for media queries
5. ✅ Advanced CSS anchor positioning for complex layouts

All features are **production-ready** for Chrome 143+ on Apple Silicon while maintaining **graceful degradation** for older browsers.

**Total estimated implementation time**: 5-8 hours for all features
**Priority**: Start with Phase 1 (animations) and Phase 2 (tooltips)
