<script lang="ts">
  import { onMount, tick } from 'svelte';

  interface Props {
    /** Title of the popover */
    title?: string;
    /** Position relative to trigger */
    position?: 'top' | 'bottom' | 'left' | 'right';
    /** Offset from trigger in pixels */
    offset?: number;
    /** Unique identifier for this popover instance */
    id?: string;
    /** Show the popover (controlled) */
    show?: boolean;
    /** Close button text */
    closeButtonText?: string;
    /** Callback when popover is closed */
    onClose?: () => void;
    /** Trigger slot content */
    trigger?: import('svelte').Snippet;
    /** Body content */
    children?: import('svelte').Snippet;
  }

  let {
    title = 'Popover',
    position = 'bottom',
    offset = 8,
    id = 'popover',
    show = $bindable(false),
    closeButtonText = 'Close',
    onClose,
    trigger,
    children,
  }: Props = $props();

  const anchorName = `--popover-trigger-${id}`;
  let popoverElement = $state<HTMLElement | null>(null);

  function close() {
    if (popoverElement) {
      try {
        popoverElement.hidePopover();
      } catch { /* ignore */ }
    }
    // State sync will happen via toggle event
  }

  // Sync internal popover state with `show` prop
  $effect(() => {
    if (!popoverElement) return;
    
    // Check actual state to avoid loops
    const isOpen = popoverElement.matches(':popover-open');
    if (show && !isOpen) {
      popoverElement.showPopover();
    } else if (!show && isOpen) {
      popoverElement.hidePopover();
    }
  });

  onMount(() => {
    const handleToggle = (e: ToggleEvent) => {
      const newState = e.newState === 'open';
      if (newState !== show) {
        show = newState;
        if (!newState) onClose?.();
      }
    };

    if (popoverElement) {
      popoverElement.addEventListener('toggle', handleToggle);
    }

    return () => {
      if (popoverElement) {
        popoverElement.removeEventListener('toggle', handleToggle);
      }
    };
  });
</script>

<!-- No window listeners needed - popover API handles light dismiss and ESC -->

<!-- Trigger element - defines anchor -->
<button
  class="popover-trigger"
  style:anchor-name={anchorName}
  popovertarget={id}
  data-popover-trigger={id}
  aria-haspopup="dialog"
  aria-controls={id}
>
  {#if trigger}
    {@render trigger()}
  {:else}
    Open Popover
  {/if}
</button>

<!-- Popover content - positioned with CSS anchor positioning -->
<div
  bind:this={popoverElement}
  class="popover-content"
  class:position-top={position === 'top'}
  class:position-bottom={position === 'bottom'}
  class:position-left={position === 'left'}
  class:position-right={position === 'right'}
  style:position-anchor={anchorName}
  style:--popover-offset="{offset}px"
  data-popover-content={id}
  {id}
  popover="auto"
  role="dialog"
  aria-label={title}
>
  <!-- Header with close button -->
  <div class="popover-header">
    <h3 class="popover-title">{title}</h3>
    <button
      class="close-button"
      onclick={close}
      aria-label={closeButtonText}
      title={closeButtonText}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path
          d="M12.207 4.793a1 1 0 010 1.414L9.414 8l2.793 2.793a1 1 0 01-1.414 1.414L8 9.414l-2.793 2.793a1 1 0 01-1.414-1.414L6.586 8 3.793 5.207a1 1 0 011.414-1.414L8 6.586l2.793-2.793a1 1 0 011.414 0z"
        />
      </svg>
    </button>
  </div>

  <!-- Content -->
  <div class="popover-body">
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>

<style>
  .popover-trigger {
    position: relative;
    padding: var(--space-2) var(--space-3);
    background: var(--color-primary-600);
    color: white;
    border: none;
    border-radius: var(--radius-lg);
    cursor: pointer;
    font-weight: var(--font-medium);
    transition: background-color var(--transition-fast);

    /* GPU acceleration */
    transform: translateZ(0);
  }

  .popover-trigger:hover:not([disabled]) {
    background: var(--color-primary-700);
  }

  .popover-trigger:focus-visible {
    outline: 2px solid var(--focus-ring-strong);
    outline-offset: 2px;
  }

  @supports (anchor-name: --test) {
    .popover-content {
      position: absolute;
      position-anchor: var(--position-anchor);
      width: max-content;
      max-width: 340px;
      background: var(--background);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-xl);
      z-index: var(--z-popover);
      overflow: hidden;

      /* Animation */
      animation: popoverFadeIn 250ms ease-out;

      /* GPU acceleration */
      transform: translateZ(0);

      /* Smart fallback positioning */
      position-try-fallbacks: top, left, right;
    }

    /* Bottom position (default) - below trigger */
    .popover-content.position-bottom {
      inset-area: bottom;
      margin-top: var(--popover-offset);
    }

    /* Top position - above trigger */
    .popover-content.position-top {
      inset-area: top;
      margin-bottom: var(--popover-offset);
    }

    /* Left position - left of trigger */
    .popover-content.position-left {
      inset-area: left;
      margin-right: var(--popover-offset);
    }

    /* Right position - right of trigger */
    .popover-content.position-right {
      inset-area: right;
      margin-left: var(--popover-offset);
    }
  }

  /* Fallback for browsers without anchor positioning */
  @supports not (anchor-name: --test) {
    .popover-content {
      position: absolute;
      top: 100%;
      left: 50%;
      translate: -50% 0;
      margin-top: var(--popover-offset);
      width: max-content;
      max-width: 340px;
      background: var(--background);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-xl);
      z-index: var(--z-popover);
      overflow: hidden;
      animation: popoverFadeIn 250ms ease-out;
      transform: translateZ(0);
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

  .popover-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--border-color);
    background: var(--background-secondary);
  }

  .popover-title {
    margin: 0;
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    color: var(--foreground);
  }

  .close-button {
    padding: var(--space-0-5);
    background: transparent;
    border: none;
    color: var(--foreground-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    transition: background-color var(--transition-fast);

    /* Touch target */
    min-width: var(--touch-target-min);
    min-height: var(--touch-target-min);
  }

  .close-button:hover {
    background-color: var(--background-tertiary);
    color: var(--foreground);
  }

  .close-button:focus-visible {
    outline: 2px solid var(--focus-ring-strong);
    outline-offset: -2px;
  }

  .popover-body {
    padding: var(--space-4);
    color: var(--foreground);
    font-size: var(--text-sm);
    line-height: var(--leading-relaxed);
  }

  /* Fallback for browsers without reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .popover-content {
      transition: none;
    }
    
    .popover-content:popover-open {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
</style>
