<script lang="ts">
  import { onMount } from "svelte";
  import type { Snippet } from "svelte";
  // Legacy popover utils removed - native support in Chromium 143 is guaranteed

  interface TooltipProps {
    /** Unique identifier for the tooltip popover */
    id: string;
    /** Content to display in the tooltip */
    content?: string;
    /** Tooltip position relative to trigger - used for CSS styling hints */
    position?: "top" | "bottom" | "left" | "right";
    /** CSS class for custom styling */
    class?: string;
    /** Custom trigger button content */
    trigger?: Snippet;
    /** Tooltip body content (slot) */
    children?: Snippet;
    /** Aria label for trigger */
    ariaLabel?: string;
    /** Disable keyboard interactions */
    noKeyboard?: boolean;
  }

  let {
    id,
    content,
    position = "top",
    class: className = "",
    trigger,
    children,
    ariaLabel,
    noKeyboard = false,
  }: TooltipProps = $props();

  /* State bindings removed for JS reduction */

  onMount(() => {
    // Native Popover API handles ESC and light dismiss automatically.
  });
</script>

<div class="tooltip-wrapper">
  <!-- Trigger Button -->
  <button
    popovertarget={id}
    popovertargetaction="toggle"
    class="tooltip-trigger"
    aria-label={ariaLabel || content}
    aria-describedby={id}
  >
    {#if trigger}
      {@render trigger()}
    {/if}
  </button>

  <!-- Tooltip Popover -->
  <div
    {id}
    popover="hint"
    class="tooltip-popover {position} {className}"
    role="tooltip"
    data-position={position}
  >
    <div class="tooltip-content">
      {#if content}
        <p>{content}</p>
      {/if}
      {#if children}
        {@render children()}
      {/if}
    </div>

    <!-- Arrow indicator -->
    <div class="tooltip-arrow" aria-hidden="true"></div>
  </div>
</div>

<style>
  .tooltip-wrapper {
    display: inline-block;
    position: relative;
  }

  .tooltip-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    color: inherit;
    font-size: inherit;

    /* Light touch target */
    min-width: 32px;
    min-height: 32px;

    /* GPU acceleration */
    transform: translateZ(0);

    /* Focus indicator */
    &:focus-visible {
      outline: 2px solid var(--color-primary-500);
      outline-offset: 2px;
      border-radius: 4px;
    }

    /* High contrast mode */
    @media (forced-colors: active) {
      border: 2px solid CanvasText;

      &:focus-visible {
        outline: 2px solid Highlight;
      }
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

    /* Position-specific anchoring */
    position-anchor: none;

    /* Animation from @starting-style */
    opacity: 0;
    transform: scale(0.95) translateY(-4px);
    transition:
      opacity 150ms cubic-bezier(0.16, 1, 0.3, 1),
      transform 150ms cubic-bezier(0.16, 1, 0.3, 1),
      display 150ms allow-discrete;

    will-change: transform, opacity;
  }

  [popover]:popover-open {
    opacity: 1;
    transform: scale(1) translateY(0);
  }

  @starting-style {
    [popover]:popover-open {
      opacity: 0;
      transform: scale(0.95) translateY(-4px);
    }
  }

  /* Popover backdrop */
  [popover]::backdrop {
    /* Transparent backdrop for hints - no light dismiss */
    background: transparent;
  }

  .tooltip-popover {
    position: fixed;
    padding: 0;
    border: none;

    /* Distance from trigger */
    --tooltip-offset: 8px;
  }

  /* Tooltip content styles */
  .tooltip-content {
    background: var(--color-gray-900);
    color: var(--color-gray-50);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
    white-space: nowrap;
    box-shadow: var(--shadow-lg);
    backdrop-filter: var(--glass-blur);
    z-index: 1000;

    & p {
      margin: 0;
      line-height: 1.4;
    }

    @media (prefers-color-scheme: dark) {
      background: var(--color-gray-100);
      color: var(--color-gray-900);
    }
  }

  /* Arrow indicator */
  .tooltip-arrow {
    position: absolute;
    width: 6px;
    height: 6px;
    background: inherit;
    border-radius: 1px;
    pointer-events: none;
  }

  /* Position variants */
  .tooltip-popover.top {
    & .tooltip-content {
      margin-bottom: var(--tooltip-offset);
    }

    & .tooltip-arrow {
      bottom: -3px;
      left: 50%;
      transform: translateX(-50%) rotate(45deg);
    }
  }

  .tooltip-popover.bottom {
    & .tooltip-content {
      margin-top: var(--tooltip-offset);
    }

    & .tooltip-arrow {
      top: -3px;
      left: 50%;
      transform: translateX(-50%) rotate(45deg);
    }
  }

  .tooltip-popover.left {
    & .tooltip-content {
      margin-right: var(--tooltip-offset);
    }

    & .tooltip-arrow {
      right: -3px;
      top: 50%;
      transform: translateY(-50%) rotate(45deg);
    }
  }

  .tooltip-popover.right {
    & .tooltip-content {
      margin-left: var(--tooltip-offset);
    }

    & .tooltip-arrow {
      left: -3px;
      top: 50%;
      transform: translateY(-50%) rotate(45deg);
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    [popover],
    .tooltip-popover {
      transition: none;
    }

    [popover]:popover-open {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
</style>
