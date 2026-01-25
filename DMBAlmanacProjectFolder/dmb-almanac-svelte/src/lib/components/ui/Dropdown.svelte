<script lang="ts">
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';

  interface DropdownProps {
    /** Unique identifier for the dropdown popover */
    id: string;
    /** Label for the trigger button */
    label?: string;
    /** CSS class for custom styling */
    class?: string;
    /** Custom trigger button content */
    trigger?: Snippet;
    /** Dropdown menu content (slot) */
    children?: Snippet;
    /** Close dropdown when clicking outside */
    closeOnClickOutside?: boolean;
    /** Close dropdown when item selected */
    closeOnSelect?: boolean;
    /** Aria label for trigger */
    ariaLabel?: string;
    /** Trigger button variant */
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  }

  let {
    id,
    label = 'Menu',
    class: className = '',
    trigger,
    children,
    closeOnClickOutside = true,
    closeOnSelect = true,
    ariaLabel,
    variant = 'secondary'
  }: DropdownProps = $props();

  let dropdownElement = $state<HTMLElement | null>(null);
  let triggerElement = $state<HTMLElement | null>(null);
  let isOpen = $state(false);

  // PERF: Cache focusable elements to avoid querySelectorAll on every keydown
  const FOCUSABLE_SELECTOR = '[role="menuitem"], button, a, [tabindex]:not([tabindex="-1"])';
  let cachedFocusableItems: HTMLElement[] | null = null;

  function getFocusableItems(): HTMLElement[] {
    if (!dropdownElement) return [];
    // Recalculate only if cache is null (cleared on close)
    if (cachedFocusableItems === null) {
      cachedFocusableItems = Array.from(
        dropdownElement.querySelectorAll(FOCUSABLE_SELECTOR)
      ) as HTMLElement[];
    }
    return cachedFocusableItems;
  }

  function clearFocusableCache(): void {
    cachedFocusableItems = null;
  }

  onMount(() => {
    // Native Popover API handles ESC and light dismiss automatically.

    // Listen for popover state changes using native toggle event
    const handlePopoverToggle = (event: ToggleEvent) => {
      isOpen = event.newState === 'open';
      // Clear cache when state changes to ensure fresh list of focusable items
      clearFocusableCache();
    };

    if (dropdownElement) {
      dropdownElement.addEventListener('toggle', handlePopoverToggle);
    }

    return () => {
      if (dropdownElement) {
        dropdownElement.removeEventListener('toggle', handlePopoverToggle);
      }
    };
  });

  function handleItemClick() {
    if (!dropdownElement || !closeOnSelect) return;

    try {
      dropdownElement.hidePopover();
    } catch {
      // Already hidden
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent) {
    if (!dropdownElement) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        // Close the dropdown
        try {
          dropdownElement.hidePopover();
        } catch {
          // Already hidden
        }
        // Return focus to trigger button
        triggerElement?.focus();
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        // Handle selection on current focused item
        const focusedItem = dropdownElement.querySelector(':focus-visible') as HTMLElement;
        if (focusedItem) {
          focusedItem.click();
        }
        break;

      case 'ArrowDown': {
        event.preventDefault();
        // PERF: Use cached focusable items instead of querySelectorAll per keydown
        const focusableItems = getFocusableItems();
        if (focusableItems.length === 0) break;

        const currentIndex = focusableItems.indexOf(
          dropdownElement.querySelector(':focus-visible') as HTMLElement
        );
        const nextIndex = currentIndex < focusableItems.length - 1 ? currentIndex + 1 : 0;
        focusableItems[nextIndex].focus();
        break;
      }

      case 'ArrowUp': {
        event.preventDefault();
        // PERF: Use cached focusable items instead of querySelectorAll per keydown
        const items = getFocusableItems();
        if (items.length === 0) break;

        const currentIdx = items.indexOf(
          dropdownElement.querySelector(':focus-visible') as HTMLElement
        );
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : items.length - 1;
        items[prevIdx].focus();
        break;
      }

      case 'Home': {
        event.preventDefault();
        // PERF: Use cached focusable items instead of querySelector
        const focusableForHome = getFocusableItems();
        if (focusableForHome.length > 0) focusableForHome[0].focus();
        break;
      }

      case 'End': {
        event.preventDefault();
        // PERF: Use cached focusable items instead of querySelectorAll per keydown
        const allItems = getFocusableItems();
        if (allItems.length > 0) {
          allItems[allItems.length - 1].focus();
        }
        break;
      }
    }
  }
</script>

<div class="dropdown-wrapper">
  <!-- Trigger Button -->
  <button
    bind:this={triggerElement}
    popovertarget={id}
    popovertargetaction="toggle"
    class="dropdown-trigger dropdown-variant-{variant}"
    aria-label={ariaLabel || label}
    aria-haspopup="menu"
    aria-expanded={isOpen}
    aria-controls={id}
  >
    {#if trigger}
      {@render trigger()}
    {:else}
      <span class="dropdown-label">{label}</span>
      <svg
        class="dropdown-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    {/if}
  </button>

  <!-- Dropdown Menu Popover -->
  <div
    bind:this={dropdownElement}
    {id}
    popover="auto"
    class="dropdown-menu {className}"
    role="menu"
    tabindex="0"
    onclick={handleItemClick}
    onkeydown={handleMenuKeyDown}
  >
    <div class="dropdown-content">
      {#if children}
        {@render children()}
      {/if}
    </div>
  </div>
</div>

<style>
  .dropdown-wrapper {
    display: inline-block;
    position: relative;
  }

  .dropdown-trigger {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-weight: var(--font-medium);
    border-radius: var(--radius-lg);
    cursor: pointer;
    border: 1px solid transparent;
    white-space: nowrap;
    position: relative;
    overflow: hidden;
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-sm);
    height: 40px;
    min-height: 40px;

    /* GPU-optimized transitions */
    transition:
      transform var(--transition-fast) var(--ease-apple),
      background-color var(--transition-fast) var(--ease-smooth),
      border-color var(--transition-fast) var(--ease-smooth),
      box-shadow var(--transition-normal) var(--ease-smooth);

    /* GPU acceleration */
    transform: translateZ(0);
    backface-visibility: hidden;

    /* Hover lift effect */
    &:hover:not(:disabled) {
      transform: translate3d(0, -1px, 0);
    }

    &:active:not(:disabled) {
      transform: translate3d(0, 1px, 0);
      transition-duration: var(--duration-instant);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary-500);
      outline-offset: 2px;
      box-shadow: var(--shadow-focus);
    }

    /* Ripple effect */
    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: translate(-50%, -50%) scale(0);
      opacity: 1;
      pointer-events: none;
    }

    &:active:not(:disabled)::after {
      transform: translate(-50%, -50%) scale(2.5);
      opacity: 0;
      transition: transform 0.4s ease-out, opacity 0.4s ease-out;
    }

    /* High contrast mode */
    @media (forced-colors: active) {
      border: 2px solid CanvasText;

      &:focus-visible {
        outline: 2px solid Highlight;
        box-shadow: none;
      }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      transition: none;

      &:hover:not(:disabled),
      &:active:not(:disabled) {
        transform: none;
      }

      &::after {
        display: none;
      }
    }
  }

  /* Dropdown trigger variants */
  .dropdown-variant-primary {
    background: linear-gradient(
      to bottom,
      var(--color-primary-500),
      var(--color-primary-600)
    );
    color: white;
    border-color: var(--color-primary-600);
    box-shadow: var(--shadow-primary-sm);

    &:hover:not(:disabled) {
      background: linear-gradient(
        to bottom,
        var(--color-primary-600),
        var(--color-primary-700)
      );
      border-color: var(--color-primary-700);
      box-shadow: var(--shadow-primary-md);
    }

    @media (prefers-color-scheme: dark) {
      background: linear-gradient(
        to bottom,
        var(--color-primary-500),
        var(--color-primary-600)
      );

      &:hover:not(:disabled) {
        background: linear-gradient(
          to bottom,
          var(--color-primary-400),
          var(--color-primary-500)
        );
      }
    }
  }

  .dropdown-variant-secondary {
    background: linear-gradient(
      to bottom,
      var(--color-gray-50),
      var(--color-gray-100)
    );
    color: var(--color-gray-700);
    border-color: var(--color-gray-200);
    box-shadow: var(--shadow-sm);

    &:hover:not(:disabled) {
      background: linear-gradient(
        to bottom,
        var(--color-gray-100),
        var(--color-gray-200)
      );
      border-color: var(--color-gray-300);
    }

    @media (prefers-color-scheme: dark) {
      background: linear-gradient(
        to bottom,
        var(--color-gray-700),
        var(--color-gray-800)
      );
      color: var(--color-gray-100);
      border-color: var(--color-gray-600);

      &:hover:not(:disabled) {
        background: linear-gradient(
          to bottom,
          var(--color-gray-600),
          var(--color-gray-700)
        );
        border-color: var(--color-gray-500);
      }
    }
  }

  .dropdown-variant-outline {
    background-color: transparent;
    color: var(--color-primary-600);
    border-color: var(--color-primary-400);

    &:hover:not(:disabled) {
      background-color: var(--color-primary-50);
      border-color: var(--color-primary-500);
    }

    @media (prefers-color-scheme: dark) {
      border-color: var(--color-primary-500);
      color: var(--color-primary-400);

      &:hover:not(:disabled) {
        background-color: oklch(0.7 0.19 82 / 0.1);
        border-color: var(--color-primary-400);
      }
    }
  }

  .dropdown-variant-ghost {
    background-color: transparent;
    color: var(--color-gray-700);
    border-color: transparent;

    &:hover:not(:disabled) {
      background-color: var(--color-gray-100);
    }

    @media (prefers-color-scheme: dark) {
      color: var(--color-gray-300);

      &:hover:not(:disabled) {
        background-color: var(--color-gray-800);
      }
    }
  }

  .dropdown-label {
    display: inline-block;
  }

  .dropdown-icon {
    width: 1.2em;
    height: 1.2em;
    flex-shrink: 0;
    transition: transform var(--transition-fast);

    .dropdown-trigger[aria-expanded='true'] & {
      transform: rotate(180deg);
    }
  }

  /* Native Popover API (Chrome 114+, Safari 17.4+) */
  [popover] {
    /* Reset default popover styles */
    border: none;
    padding: 0;
    margin: 0;
    background: transparent;
    inset: auto;

    /* Animation */
    opacity: 0;
    transform: scale(0.95) translateY(-8px);
    transition:
      opacity 150ms cubic-bezier(0.16, 1, 0.3, 1),
      transform 150ms cubic-bezier(0.16, 1, 0.3, 1),
      display 150ms allow-discrete;

    will-change: transform, opacity;

    z-index: 1000;
  }

  [popover]:popover-open {
    opacity: 1;
    transform: scale(1) translateY(0);
  }

  @starting-style {
    [popover]:popover-open {
      opacity: 0;
      transform: scale(0.95) translateY(-8px);
    }
  }

  /* Popover backdrop for light-dismiss */
  [popover]::backdrop {
    background: transparent;
  }

  .dropdown-menu {
    position: fixed;
  }

  /* Dropdown menu content */
  .dropdown-content {
    background: var(--color-gray-50);
    border: 1px solid var(--color-gray-200);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    min-width: 160px;
    z-index: 1000;

    /* GPU acceleration */
    transform: translateZ(0);
    backface-visibility: hidden;

    @media (prefers-color-scheme: dark) {
      background: var(--color-gray-900);
      border-color: var(--color-gray-700);
    }

    /* Menu items - should have role="menuitem" for accessibility */
    :global(button),
    :global(a),
    :global([role="menuitem"]) {
      display: block;
      width: 100%;
      padding: var(--space-2) var(--space-3);
      border: none;
      background: none;
      color: var(--color-gray-900);
      text-align: left;
      cursor: pointer;
      font-size: var(--text-sm);
      transition: background-color var(--transition-fast);

      @media (prefers-color-scheme: dark) {
        color: var(--color-gray-50);
      }

      &:hover {
        background-color: var(--color-gray-100);

        @media (prefers-color-scheme: dark) {
          background-color: var(--color-gray-800);
        }
      }

      &:active {
        background-color: var(--color-gray-200);

        @media (prefers-color-scheme: dark) {
          background-color: var(--color-gray-700);
        }
      }

      &:focus-visible {
        outline: 2px solid var(--color-primary-500);
        outline-offset: -2px;
      }
    }

    /* Separator */
    :global(hr) {
      margin: var(--space-1) 0;
      border: none;
      border-top: 1px solid var(--color-gray-200);

      @media (prefers-color-scheme: dark) {
        border-top-color: var(--color-gray-700);
      }
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    [popover],
    .dropdown-menu {
      transition: none;
    }

    [popover]:popover-open {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
</style>
