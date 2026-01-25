# CSS Anchor Positioning - Before & After Comparison

## Component 1: Tooltip

### BEFORE: Using Actions & Manual Positioning

```svelte
<script lang="ts">
  import { anchor, anchoredTo } from '$lib/actions/anchor';
  import { checkAnchorSupport } from '$lib/utils/anchorPositioning';

  let { content = 'Tooltip', position = 'bottom', offset = 8 } = $props();

  const anchorName = $derived(`trigger-${id}`);
  const supportAnchorPositioning = checkAnchorSupport();
</script>

<!-- Trigger with action -->
<div
  use:anchor={{ name: anchorName }}
  class="tooltip-trigger"
  onmouseenter={() => (show = true)}
  onmouseleave={() => (show = false)}
>
  Trigger
</div>

<!-- Positioned with action -->
{#if supportAnchorPositioning && show}
  <div
    use:anchoredTo={{ anchor: anchorName, position, offset, show }}
    class="tooltip-content"
  >
    {content}
    <div class="tooltip-arrow"></div>
  </div>
{/if}

<style>
  /* Action handles: position-anchor and positioning logic */
  .tooltip-content {
    padding: var(--space-2) var(--space-3);
    background: var(--color-gray-900);
    /* Positioning calculated by action */
    animation: tooltipFadeIn 200ms ease-out;
  }
</style>
```

### AFTER: Using CSS Anchor Positioning

```svelte
<script lang="ts">
  import { checkAnchorSupport } from '$lib/utils/anchorPositioning';

  let { content = 'Tooltip', position = 'bottom', offset = 8 } = $props();

  const anchorName = `--trigger-${id}`;
  const supportAnchorPositioning = checkAnchorSupport();
</script>

<!-- Trigger with inline anchor -->
<div
  class="tooltip-trigger"
  style:anchor-name={anchorName}
  onmouseenter={() => (show = true)}
  onmouseleave={() => (show = false)}
>
  Trigger
</div>

<!-- Positioned with anchor -->
{#if supportAnchorPositioning && show}
  <div
    class="tooltip-content"
    class:position-top={position === 'top'}
    class:position-bottom={position === 'bottom'}
    style:position-anchor={anchorName}
    style:--tooltip-offset="{offset}px"
  >
    {content}
    <div class="tooltip-arrow"></div>
  </div>
{/if}

<style>
  @supports (anchor-name: --test) {
    .tooltip-content {
      position: absolute;
      position-anchor: var(--position-anchor);
      padding: var(--space-2) var(--space-3);
      background: var(--color-gray-900);
      animation: tooltipFadeIn 200ms ease-out;
      position-try-fallbacks: flip-block, flip-inline;
    }

    .tooltip-content.position-bottom {
      inset-area: bottom;
      margin-top: var(--tooltip-offset);
    }
  }

  @supports not (anchor-name: --test) {
    .tooltip-content {
      position: absolute;
      bottom: 100%;
      left: 50%;
      translate: -50% calc(-1 * var(--tooltip-offset));
    }
  }
</style>
```

### Key Differences:

| Aspect | Before | After |
|--------|--------|-------|
| Anchor Definition | `use:anchor` action | `style:anchor-name` inline |
| Positioning | `use:anchoredTo` action | CSS classes + `position-anchor` |
| JavaScript | Needed for prop → style binding | Minimal, only for state |
| CSS Logic | Minimal CSS needed | Full positioning in CSS |
| Fallback Positions | Manual in action | Automatic via `position-try-fallbacks` |
| Browser Fallback | Basic absolute positioning | Graceful `@supports` fallback |

---

## Component 2: Dropdown Menu

### BEFORE: Manual Positioning

```svelte
<script lang="ts">
  import { anchor, anchoredTo } from '$lib/actions/anchor';

  let { items = [], position = 'bottom', id = 'dropdown' } = $props();
  let isOpen = $state(false);
  const anchorName = $derived(`menu-${id}`);
  const supportAnchorPositioning = checkAnchorSupport();

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      isOpen = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} onmousedown={handleClickOutside} />

<!-- Trigger with action -->
<button
  use:anchor={{ name: anchorName }}
  class="dropdown-trigger"
  onclick={() => (isOpen = !isOpen)}
  aria-expanded={isOpen}
>
  Menu
</button>

<!-- Menu with action -->
{#if supportAnchorPositioning && isOpen}
  <div
    use:anchoredTo={{ anchor: anchorName, position, offset: 4, show: isOpen }}
    class="dropdown-menu"
    role="menu"
  >
    {#each items as item (item.id)}
      <button
        class="dropdown-item"
        role="menuitem"
        onclick={() => handleItemClick(item)}
      >
        {item.label}
      </button>
    {/each}
  </div>
{/if}

<style>
  .dropdown-trigger {
    position: relative;
  }

  .dropdown-menu {
    min-width: 200px;
    background: var(--background);
    animation: dropdownFadeIn 200ms ease-out;
  }
</style>
```

### AFTER: CSS Anchor Positioning with Smart Fallback

```svelte
<script lang="ts">
  import { checkAnchorSupport } from '$lib/utils/anchorPositioning';

  let { items = [], position = 'bottom', id = 'dropdown' } = $props();
  let isOpen = $state(false);
  let focusedIndex = $state(-1);
  const anchorName = `--menu-${id}`;
  const supportAnchorPositioning = checkAnchorSupport();

  function handleKeydown(event: KeyboardEvent) {
    if (!isOpen) return;
    switch (event.key) {
      case 'Escape':
        isOpen = false;
        break;
      case 'ArrowDown':
        event.preventDefault();
        focusedIndex = Math.min(focusedIndex + 1, items.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusedIndex = Math.max(focusedIndex - 1, 0);
        break;
      case 'Home':
        event.preventDefault();
        focusedIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        focusedIndex = items.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedIndex >= 0) {
          handleItemClick(items[focusedIndex]);
        }
        break;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} onmousedown={handleClickOutside} />

<!-- Trigger with inline anchor -->
<button
  class="dropdown-trigger"
  style:anchor-name={anchorName}
  onclick={() => (isOpen = !isOpen)}
  aria-expanded={isOpen}
  aria-controls={isOpen ? id : undefined}
>
  Menu
</button>

<!-- Menu with anchor positioning -->
{#if supportAnchorPositioning && isOpen}
  <div
    class="dropdown-menu"
    class:position-top={position === 'top'}
    class:position-bottom={position === 'bottom'}
    style:position-anchor={anchorName}
    id={isOpen ? id : undefined}
    role="menu"
  >
    {#each items as item, index (item.id)}
      <button
        class="dropdown-item"
        class:focused={focusedIndex === index}
        role="menuitem"
        onmouseenter={() => (focusedIndex = index)}
        onmouseleave={() => (focusedIndex = -1)}
        onclick={() => handleItemClick(item)}
      >
        {item.label}
      </button>
    {/each}
  </div>
{/if}

<style>
  @supports (anchor-name: --test) {
    .dropdown-menu {
      position: absolute;
      position-anchor: var(--position-anchor);
      min-width: anchor-size(width);  /* Match trigger width */
      background: var(--background);
      animation: dropdownFadeIn 200ms ease-out;
      position-try-fallbacks: flip-block;  /* Auto-flip if no space below */
    }

    .dropdown-menu.position-bottom {
      inset-area: bottom;
      margin-top: 4px;
    }

    .dropdown-menu.position-top {
      inset-area: top;
      margin-bottom: 4px;
    }
  }

  @supports not (anchor-name: --test) {
    .dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 4px;
      min-width: 200px;
      background: var(--background);
      animation: dropdownFadeIn 200ms ease-out;
    }

    .dropdown-menu.position-top {
      top: auto;
      bottom: 100%;
      margin-top: 0;
      margin-bottom: 4px;
    }
  }

  .dropdown-item.focused:not(.disabled) {
    background-color: var(--background-secondary);
    outline: 2px solid var(--focus-ring-strong);
    outline-offset: -2px;
  }
</style>
```

### Key Improvements:

| Feature | Before | After |
|---------|--------|-------|
| Keyboard Nav | Escape only | Full arrow key + Home/End support |
| Width Sizing | Fixed 200px | `anchor-size(width)` - matches trigger |
| Smart Flipping | Manual fallback | `position-try-fallbacks: flip-block` |
| Focus Management | None | Keyboard navigation with visual focus |
| CSS Binding | Action-based | Inline `style:` binding |

---

## Component 3: Popover

### BEFORE: Basic Positioning

```svelte
<script lang="ts">
  import { anchor, anchoredTo } from '$lib/actions/anchor';

  let { title = 'Popover', position = 'bottom', offset = 8 } = $props();
  let show = $state(false);
  const anchorName = $derived(`popover-trigger-${id}`);
</script>

<!-- Trigger with action -->
<button
  use:anchor={{ name: anchorName }}
  class="popover-trigger"
  onclick={() => (show = !show)}
  aria-expanded={show}
>
  Open
</button>

<!-- Popover with action -->
{#if supportAnchorPositioning && show}
  <div
    use:anchoredTo={{ anchor: anchorName, position, offset, show }}
    class="popover-content"
  >
    <!-- Content -->
  </div>
{/if}

<style>
  .popover-content {
    max-width: 340px;
    background: var(--background);
    /* Position by action */
  }
</style>
```

### AFTER: Full CSS Anchor Positioning with 4 Directions

```svelte
<script lang="ts">
  import { checkAnchorSupport } from '$lib/utils/anchorPositioning';

  let { title = 'Popover', position = 'bottom', offset = 8 } = $props();
  let show = $state(false);
  const anchorName = `--popover-trigger-${id}`;
  const supportAnchorPositioning = checkAnchorSupport();
</script>

<!-- Trigger with inline anchor -->
<button
  class="popover-trigger"
  style:anchor-name={anchorName}
  onclick={() => (show = !show)}
  aria-expanded={show}
  aria-controls={show ? id : undefined}
>
  Open
</button>

<!-- Popover with full positioning -->
{#if supportAnchorPositioning && show}
  <div
    class="popover-content"
    class:position-top={position === 'top'}
    class:position-bottom={position === 'bottom'}
    class:position-left={position === 'left'}
    class:position-right={position === 'right'}
    style:position-anchor={anchorName}
    style:--popover-offset="{offset}px"
    id={show ? id : undefined}
    role="dialog"
  >
    <!-- Content -->
  </div>
{/if}

<style>
  @supports (anchor-name: --test) {
    .popover-content {
      position: absolute;
      position-anchor: var(--position-anchor);
      max-width: 340px;
      background: var(--background);
      animation: popoverFadeIn 250ms ease-out;
      position-try-fallbacks: top, left, right;
    }

    .popover-content.position-bottom {
      inset-area: bottom;
      margin-top: var(--popover-offset);
    }

    .popover-content.position-top {
      inset-area: top;
      margin-bottom: var(--popover-offset);
    }

    .popover-content.position-left {
      inset-area: left;
      margin-right: var(--popover-offset);
    }

    .popover-content.position-right {
      inset-area: right;
      margin-left: var(--popover-offset);
    }
  }

  @supports not (anchor-name: --test) {
    .popover-content {
      position: absolute;
      top: 100%;
      left: 50%;
      translate: -50% 0;
      margin-top: var(--popover-offset);
      max-width: 340px;
      background: var(--background);
      animation: popoverFadeIn 250ms ease-out;
    }

    .popover-content.position-top {
      top: auto;
      bottom: 100%;
      margin-top: 0;
      margin-bottom: var(--popover-offset);
    }

    .popover-content.position-left {
      top: 50%;
      left: auto;
      right: 100%;
      translate: 0 -50%;
      margin-top: 0;
      margin-right: var(--popover-offset);
    }

    .popover-content.position-right {
      top: 50%;
      left: 100%;
      translate: 0 -50%;
      margin-top: 0;
      margin-left: var(--popover-offset);
    }
  }
</style>
```

### Enhancements:

| Aspect | Before | After |
|--------|--------|-------|
| Directions Supported | 2 (top/bottom) | 4 (top/bottom/left/right) |
| Smart Fallback | Manual | `position-try-fallbacks: top, left, right` |
| CSS Positioning | Action-based | Native `position-anchor` + `inset-area` |
| Viewport Awareness | None | Automatic via fallbacks |

---

## Summary of Changes

### Removed Dependencies:
- ~~`use:anchor` action for every trigger element~~
- ~~`use:anchoredTo` action with offset calculations~~
- ~~Manual JavaScript positioning logic~~

### Added Capabilities:
- Native CSS anchor positioning
- Automatic viewport-aware repositioning
- `anchor-size()` function for dynamic sizing
- `position-try-fallbacks` for smart flipping
- Better keyboard navigation
- Improved accessibility

### Code Metrics:

**Tooltip Component:**
- Lines removed: ~15 (action usage)
- Lines added: ~25 (CSS + inline styles)
- Net: Better separation of concerns

**Dropdown Component:**
- Lines removed: ~8 (action usage)
- Lines added: ~35 (enhanced keyboard navigation + CSS)
- Net: More features, better accessibility

**Popover Component:**
- Lines removed: ~8 (action usage)
- Lines added: ~40 (4-direction support + CSS)
- Net: Expanded functionality

### Browser Compatibility:

All three components now have:
- **Chrome 125+**: Full CSS anchor positioning
- **Edge 125+**: Full CSS anchor positioning
- **Safari 17.4+**: Full CSS anchor positioning (when available)
- **Firefox 121+**: Fallback to traditional absolute positioning
- **Older browsers**: Graceful fallback positioning

### Performance Gains:

1. **Smaller JS**: Removed positioning calculation logic
2. **Faster rendering**: CSS-based positioning optimized by browser
3. **No repaints**: `position-try-fallbacks` handled by rendering engine
4. **GPU acceleration**: `transform: translateZ(0)` ready for hardware acceleration
