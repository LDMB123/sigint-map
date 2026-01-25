<script lang="ts">
  import { checkAnchorSupport } from "$lib/utils/anchorPositioning";
  import { onMount } from "svelte";

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
    position?: "top" | "bottom";

    /** Unique identifier for this dropdown */
    id?: string;

    /** Callback when menu item is selected */
    onSelect?: (item: MenuItem) => void;

    /** Trigger slot content */
    trigger?: import("svelte").Snippet;
  }

  let {
    items = [],
    position = "bottom",
    id = "dropdown",
    onSelect,
    trigger,
  }: Props = $props();

  let isOpen = $state(false);
  let focusedIndex = $state(-1);
  const anchorName = `--menu-${id}`;
  let menuElement = $state<HTMLElement | null>(null);

  // Sync state via native toggle event for ARIA attributes
  function onToggle(e: ToggleEvent) {
    isOpen = e.newState === "open";
    if (!isOpen) focusedIndex = -1;
  }

  function handleItemClick(item: MenuItem) {
    if (item.disabled) return;

    item.action?.();
    onSelect?.(item);

    // Close popover
    if (menuElement) {
      try {
        menuElement.hidePopover();
      } catch {}
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!isOpen) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusedIndex = Math.min(focusedIndex + 1, items.length - 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusedIndex = Math.max(focusedIndex - 1, 0);
        break;
      case "Home":
        event.preventDefault();
        focusedIndex = 0;
        break;
      case "End":
        event.preventDefault();
        focusedIndex = items.length - 1;
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (focusedIndex >= 0 && items[focusedIndex]) {
          handleItemClick(items[focusedIndex]);
        }
        break;
    }
  }

  onMount(() => {
    if (menuElement) {
      menuElement.addEventListener("toggle", onToggle);
    }
    return () => {
      if (menuElement) {
        menuElement.removeEventListener("toggle", onToggle);
      }
    };
  });
</script>

<!-- Trigger button - defines anchor -->
<button
  class="dropdown-trigger"
  style:anchor-name={anchorName}
  popovertarget={id}
  data-dropdown-trigger={id}
  aria-expanded={isOpen}
  aria-haspopup="menu"
  aria-controls={id}
>
  {#if trigger}
    {@render trigger()}
  {:else}
    Menu
  {/if}
</button>

<!-- Dropdown menu - positioned with CSS anchor positioning -->
<div
  bind:this={menuElement}
  class="dropdown-menu"
  class:position-top={position === "top"}
  class:position-bottom={position === "bottom"}
  style:position-anchor={anchorName}
  data-dropdown-menu={id}
  {id}
  popover="auto"
  role="menu"
>
  {#each items as item, index (item.id)}
    <button
      class="dropdown-item"
      class:disabled={item.disabled}
      class:focused={focusedIndex === index}
      role="menuitem"
      disabled={item.disabled}
      onmouseenter={() => (focusedIndex = index)}
      onmouseleave={() => (focusedIndex = -1)}
      onclick={() => handleItemClick(item)}
    >
      <span class="item-label">{item.label}</span>
    </button>
  {/each}
</div>

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

  /* Native Anchor Positioning (Chromium 143+) */
  .dropdown-menu {
    position: absolute;
    position-anchor: var(--position-anchor);
    min-width: anchor-size(width);
    background: var(--background);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    z-index: var(--z-dropdown);
    overflow: hidden;

    /* Animation using @starting-style */
    opacity: 0;
    transform: translateY(-4px) scale(0.95);
    transition:
      opacity 200ms ease-out,
      transform 200ms ease-out,
      display 200ms allow-discrete;

    /* GPU acceleration */
    transform: translateZ(0);
    will-change: transform, opacity;

    /* Smart fallback positioning */
    position-try-fallbacks: flip-block;

    /* Reset default positioning */
    inset: auto;
  }

  .dropdown-menu:popover-open {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  @starting-style {
    .dropdown-menu:popover-open {
      opacity: 0;
      transform: translateY(-4px) scale(0.95);
    }
  }

  /* Bottom position (default) - below trigger */
  .dropdown-menu.position-bottom {
    inset-area: bottom;
    margin-top: 4px;
  }

  /* Top position - above trigger */
  .dropdown-menu.position-top {
    inset-area: top;
    margin-bottom: 4px;
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

  .dropdown-item.focused:not(.disabled) {
    background-color: var(--background-secondary);
    outline: 2px solid var(--focus-ring-strong);
    outline-offset: -2px;
  }

  .dropdown-item:focus-visible:not(.disabled) {
    outline: 2px solid var(--focus-ring-strong);
    outline-offset: -2px;
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

  /* Fallback for browsers without reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .dropdown-menu {
      transition: none;
    }
  }
</style>
