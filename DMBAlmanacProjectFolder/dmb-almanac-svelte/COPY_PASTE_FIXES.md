# Copy-Paste Accessibility Fixes
## Ready-to-use code snippets for all issues

**Time to implement**: 2-3 hours
**No breaking changes**: All fixes are backward-compatible

---

## Fix 1: UpdatePrompt Modal Focus Management

**File**: `/src/lib/components/pwa/UpdatePrompt.svelte`
**Time**: 30 minutes

### Replace Entire File With:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let updateAvailable: boolean = $state(false);
  let dialogRef: HTMLDialogElement | null = $state(null);
  let previousFocusedElement: HTMLElement | null = $state(null);

  onMount(() => {
    if (!('serviceWorker' in navigator)) return;

    const cleanupFunctions: (() => void)[] = [];

    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;

        const handleUpdateFound = () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          const handleStateChange = () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              updateAvailable = true;
            }
          };

          newWorker.addEventListener('statechange', handleStateChange);
          cleanupFunctions.push(() => {
            newWorker.removeEventListener('statechange', handleStateChange);
          });
        };

        registration.addEventListener('updatefound', handleUpdateFound);
        cleanupFunctions.push(() => {
          registration.removeEventListener('updatefound', handleUpdateFound);
        });
      } catch (error) {
        console.error('[UpdatePrompt] Failed to check for updates:', error);
      }
    };

    checkForUpdates();

    return () => {
      cleanupFunctions.forEach((fn) => fn());
    };
  });

  // Control dialog open/close state WITH focus management
  $effect(() => {
    if (updateAvailable && dialogRef) {
      // Store currently focused element to return focus later
      previousFocusedElement = document.activeElement as HTMLElement;

      // Show modal - browser auto-focuses first focusable element
      dialogRef.showModal();

      // Announce to screen readers that dialog opened
      announceToScreenReader('Update available dialog opened');
    } else if (!updateAvailable && dialogRef) {
      // Close dialog
      dialogRef.close();

      // Return focus to previously focused element
      if (previousFocusedElement && document.body.contains(previousFocusedElement)) {
        setTimeout(() => {
          previousFocusedElement?.focus({ preventScroll: true });
        }, 0);
      }
    }
  });

  function handleUpdate() {
    navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }

  function handleDismiss() {
    updateAvailable = false;
  }

  function handleDialogClose() {
    handleDismiss();
  }

  /**
   * Announce message to screen readers using aria-live region
   */
  function announceToScreenReader(message: string) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);

    setTimeout(() => {
      announcement.remove();
    }, 1000);
  }
</script>

<dialog
  bind:this={dialogRef}
  class="update-dialog"
  aria-labelledby="update-prompt-title"
  aria-describedby="update-prompt-description"
  aria-modal="true"
  onclose={handleDialogClose}
>
  <div class="update-content">
    <p id="update-prompt-title" class="update-title">
      A new version of DMB Almanac is available!
    </p>
    <p id="update-prompt-description" class="update-description">
      The new version includes bug fixes and performance improvements.
      You can update now or continue using the current version.
    </p>
    <div class="actions">
      <button
        type="button"
        onclick={handleUpdate}
        class="update-btn"
        aria-label="Update to latest version now"
      >
        Update Now
      </button>
      <button
        type="button"
        onclick={handleDismiss}
        class="dismiss-btn"
        aria-label="Dismiss update notification"
      >
        Later
      </button>
    </div>
  </div>
</dialog>

<style>
  :global(.sr-only) {
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

  :global(dialog.update-dialog) {
    border: none;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    padding: 24px;
    max-width: 400px;
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

  /* Starting state for entry animation */
  @starting-style {
    :global(dialog.update-dialog[open]) {
      opacity: 0;
      transform: translateY(20px);
    }
  }

  /* Exit state - also used for exit animation */
  :global(dialog.update-dialog:not([open])) {
    opacity: 0;
    transform: translateY(20px);
  }

  :global(dialog.update-dialog::backdrop) {
    background-color: rgba(0, 0, 0, 0.5);
    transition: background-color 300ms ease-out, overlay 300ms allow-discrete;
  }

  @starting-style {
    :global(dialog.update-dialog[open]::backdrop) {
      background-color: rgba(0, 0, 0, 0);
    }
  }

  :global(dialog.update-dialog:not([open])::backdrop) {
    background-color: rgba(0, 0, 0, 0);
  }

  @media (prefers-reduced-motion: reduce) {
    :global(dialog.update-dialog) {
      transition: none;
    }
    :global(dialog.update-dialog::backdrop) {
      transition: none;
    }
  }

  .update-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
    container-type: inline-size;
    container-name: update-prompt;
  }

  .update-title {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    color: #030712;
    line-height: 1.4;
  }

  .update-description {
    font-size: 14px;
    color: #565656;
    margin: 0;
    line-height: 1.5;
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
  }

  .update-btn {
    background-color: #030712;
    color: #fff;
  }

  .update-btn:hover {
    background-color: #1a1822;
  }

  .update-btn:active {
    transform: scale(0.98);
  }

  .update-btn:focus-visible {
    outline: 2px solid var(--color-primary-600);
    outline-offset: 2px;
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

  .dismiss-btn:focus-visible {
    outline: 2px solid var(--color-primary-600);
    outline-offset: 2px;
  }

  /* Container query for update prompt layout */
  @supports (container-type: inline-size) {
    @container update-prompt (max-width: 480px) {
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
  }

  /* Fallback for browsers without container query support */
  @supports not (container-type: inline-size) {
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
  }

  /* High contrast mode support */
  @media (forced-colors: active) {
    .update-btn:focus-visible,
    .dismiss-btn:focus-visible {
      outline: 2px solid Highlight;
    }

    .update-btn {
      border: 1px solid CanvasText;
    }

    .dismiss-btn {
      border: 1px solid CanvasText;
    }
  }
</style>
```

---

## Fix 2: Dropdown Menu Keyboard Navigation

**File**: `/src/lib/components/anchored/Dropdown.svelte`
**Time**: 45 minutes

### Replace Entire File With:

```svelte
<script lang="ts">
  import { anchor, anchoredTo } from '$lib/actions/anchor';
  import { checkAnchorSupport } from '$lib/utils/anchorPositioning';

  interface MenuItem {
    id: string;
    label: string;
    action?: () => void;
    disabled?: boolean;
  }

  interface Props {
    /** Menu items to display */
    items: MenuItem[];

    /** Position relative to trigger */
    position?: 'top' | 'bottom';

    /** Unique identifier for this dropdown */
    id?: string;

    /** Callback when menu item is selected */
    onSelect?: (item: MenuItem) => void;

    /** Trigger slot content */
    trigger?: import('svelte').Snippet;
  }

  let {
    items = [],
    position = 'bottom',
    id = 'dropdown',
    onSelect,
    trigger,
  }: Props = $props();

  let isOpen = $state(false);
  let focusedItemIndex = $state(-1);
  let menuRef: HTMLDivElement | null = null;
  let triggerRef: HTMLButtonElement | null = null;
  const anchorName = $derived(`menu-${id}`);
  const supportAnchorPositioning = checkAnchorSupport();

  /**
   * Get all enabled (non-disabled) menu items
   */
  function getEnabledItems(): MenuItem[] {
    return items.filter(item => !item.disabled);
  }

  /**
   * Get the index of a menu item in the full items array
   */
  function getItemIndex(targetItem: MenuItem): number {
    return items.findIndex(item => item.id === targetItem.id);
  }

  /**
   * Focus the menu item button at specified index
   */
  function focusMenuItemButton(index: number) {
    const buttons = menuRef?.querySelectorAll('[role="menuitem"]');
    if (buttons && index >= 0 && index < buttons.length) {
      (buttons[index] as HTMLButtonElement).focus();
    }
  }

  function handleItemClick(item: MenuItem) {
    if (item.disabled) return;

    item.action?.();
    onSelect?.(item);
    isOpen = false;

    // Return focus to trigger after selection
    triggerRef?.focus();
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as Node;
    const trigger = document.querySelector(`[data-dropdown-trigger="${id}"]`);
    const menu = document.querySelector(`[data-dropdown-menu="${id}"]`);

    if (trigger && menu && !trigger.contains(target) && !menu.contains(target)) {
      isOpen = false;
    }
  }

  /**
   * Handle keyboard navigation with ARIA menu pattern
   * Supports: Arrow Up/Down, Home, End, Enter, Space, Escape
   */
  function handleKeydown(event: KeyboardEvent) {
    // If menu is closed, only open on Enter/Space at trigger
    if (!isOpen) {
      if (
        (event.key === 'Enter' || event.key === ' ') &&
        event.target === triggerRef
      ) {
        event.preventDefault();
        isOpen = true;
        focusedItemIndex = 0;
        // Focus first enabled item
        setTimeout(() => {
          focusMenuItemButton(0);
        }, 0);
      }
      return;
    }

    // Menu is open - handle navigation
    const enabledItems = getEnabledItems();
    const currentFocusedItem = items[focusedItemIndex];
    const currentIndex = enabledItems.findIndex(
      item => item.id === currentFocusedItem?.id
    );

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        isOpen = false;
        triggerRef?.focus();
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (currentIndex < enabledItems.length - 1) {
          const nextItem = enabledItems[currentIndex + 1];
          focusedItemIndex = getItemIndex(nextItem);
        } else {
          // Wrap to first item
          focusedItemIndex = getItemIndex(enabledItems[0]);
        }
        focusMenuItemButton(focusedItemIndex);
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (currentIndex > 0) {
          const prevItem = enabledItems[currentIndex - 1];
          focusedItemIndex = getItemIndex(prevItem);
        } else {
          // Wrap to last item
          focusedItemIndex = getItemIndex(enabledItems[enabledItems.length - 1]);
        }
        focusMenuItemButton(focusedItemIndex);
        break;

      case 'Home':
        event.preventDefault();
        focusedItemIndex = getItemIndex(enabledItems[0]);
        focusMenuItemButton(focusedItemIndex);
        break;

      case 'End':
        event.preventDefault();
        focusedItemIndex = getItemIndex(enabledItems[enabledItems.length - 1]);
        focusMenuItemButton(focusedItemIndex);
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        const focused = items[focusedItemIndex];
        if (focused && !focused.disabled) {
          handleItemClick(focused);
        }
        break;

      case 'Tab':
        // Allow Tab to close menu and move focus
        isOpen = false;
        break;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} onmousedown={handleClickOutside} />

<!-- Trigger button -->
<button
  bind:this={triggerRef}
  use:anchor={{ name: anchorName }}
  class="dropdown-trigger"
  data-dropdown-trigger={id}
  onclick={() => {
    isOpen = !isOpen;
    if (isOpen) {
      focusedItemIndex = 0;
      // Focus first item after menu renders
      setTimeout(() => {
        focusMenuItemButton(0);
      }, 0);
    }
  }}
  aria-expanded={isOpen}
  aria-haspopup="menu"
  aria-controls={`dropdown-menu-${id}`}
>
  {#if trigger}
    {@render trigger()}
  {:else}
    Menu
  {/if}
</button>

<!-- Dropdown menu - positioned with anchor -->
{#if supportAnchorPositioning && isOpen}
  <div
    bind:this={menuRef}
    use:anchoredTo={{ anchor: anchorName, position, offset: 4, show: isOpen }}
    class="dropdown-menu"
    id={`dropdown-menu-${id}`}
    data-dropdown-menu={id}
    role="menu"
  >
    {#each items as item, index (item.id)}
      <button
        class="dropdown-item"
        class:disabled={item.disabled}
        class:focused={focusedItemIndex === index}
        role="menuitem"
        disabled={item.disabled}
        aria-disabled={item.disabled}
        onkeydown={handleKeydown}
        onclick={() => handleItemClick(item)}
      >
        <span class="item-label">{item.label}</span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .dropdown-trigger {
    position: relative;
    padding: var(--space-2) var(--space-3);
    background: var(--color-primary-600);
    color: white;
    border: none;
    border-radius: var(--radius-lg);
    cursor: pointer;
    font-weight: var(--font-medium);
    transition: background-color var(--transition-fast);
    /* stylelint-disable-next-line property-no-unknown -- CSS Interop spec draft property */
    touch-target-size: var(--touch-target-min);

    /* GPU acceleration */
    transform: translateZ(0);
  }

  .dropdown-trigger:hover:not([disabled]) {
    background: var(--color-primary-700);
  }

  .dropdown-trigger:active:not([disabled]) {
    background: var(--color-primary-800);
  }

  .dropdown-trigger:focus-visible {
    outline: 2px solid var(--focus-ring-strong);
    outline-offset: 2px;
  }

  .dropdown-menu {
    /* Base positioning handled by use:anchoredTo action */
    min-width: 200px;
    background: var(--background);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    z-index: var(--z-dropdown);
    overflow: hidden;

    /* Animation */
    animation: dropdownFadeIn 200ms ease-out;

    /* GPU acceleration */
    transform: translateZ(0);
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    color: var(--foreground);
    cursor: pointer;
    text-align: left;
    transition: background-color var(--transition-fast);
    font-size: var(--text-sm);

    /* Touch target */
    min-height: var(--touch-target-comfortable);
  }

  .dropdown-item:hover:not(.disabled) {
    background-color: var(--background-secondary);
  }

  .dropdown-item:active:not(.disabled) {
    background-color: var(--background-tertiary);
  }

  /* Keyboard focus indicator */
  .dropdown-item:focus-visible:not(.disabled) {
    outline: 2px solid var(--focus-ring-strong);
    outline-offset: -2px;
    background-color: var(--background-secondary);
  }

  /* Programmatic focus via keyboard navigation */
  .dropdown-item.focused:not(.disabled) {
    outline: 2px solid var(--focus-ring-strong);
    outline-offset: -2px;
    background-color: var(--background-secondary);
  }

  .dropdown-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .item-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @keyframes dropdownFadeIn {
    from {
      opacity: 0;
      transform: translateY(-4px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Fallback for browsers without reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .dropdown-menu {
      animation: none;
    }

    .dropdown-item:focus-visible,
    .dropdown-item.focused {
      outline-offset: 0;
    }
  }

  /* High contrast mode */
  @media (forced-colors: active) {
    .dropdown-trigger:focus-visible {
      outline: 2px solid Highlight;
    }

    .dropdown-item:focus-visible,
    .dropdown-item.focused {
      outline: 2px solid Highlight;
      outline-offset: -2px;
    }
  }
</style>
```

---

## Verification Checklist

After copying the code above, test:

### UpdatePrompt Tests
```bash
□ Modal opens when update available
□ Modal closes with Escape key
□ Focus returns to previous element after close
□ Focus trapped inside modal (Tab stays in modal)
□ Screen reader announces "Update available dialog opened"
□ Buttons have visible focus indicators
□ Focus visible on all keyboard navigation
□ "Later" button dismisses without full reload
```

### Dropdown Tests
```bash
□ Click trigger opens menu
□ Space/Enter opens menu (at trigger)
□ Arrow Down moves focus to next item
□ Arrow Up moves focus to previous item
□ Home moves to first item
□ End moves to last item
□ Enter selects item and closes
□ Space selects item and closes
□ Escape closes menu and returns focus to trigger
□ Tab closes menu and moves focus out
□ Disabled items skipped in navigation
□ All items have visible focus indicator
```

---

## Summary

- **Fix 1**: Copy entire UpdatePrompt.svelte (30 min)
- **Fix 2**: Copy entire Dropdown.svelte (45 min)
- **Total Implementation**: 75 minutes
- **Total with Testing**: 2-3 hours

All code is ready to use - no modifications needed.

