<script lang="ts">
  import { checkAnchorSupport } from '$lib/utils/anchorPositioning';

  interface Props {
    /** Content to display in the tooltip */
    content: string;

    /** Position relative to trigger */
    position?: 'top' | 'bottom' | 'left' | 'right';

    /** Offset from trigger in pixels */
    offset?: number;

    /** Unique identifier for this tooltip instance */
    id?: string;

    /** Show the tooltip */
    show?: boolean;

    /** Trigger content */
    children?: import('svelte').Snippet;
  }

  let {
    content = 'Tooltip content',
    position = 'bottom',
    offset = 8,
    id = 'tooltip',
    show = false,
    children,
  }: Props = $props();

  const anchorName = `--trigger-${id}`;

  // Map position to CSS custom properties for arrow positioning
  const positionMap = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left'
  };

  const arrowPosition = $derived(positionMap[position] || 'top');
</script>

<!-- Trigger element - defines anchor -->
<div
  class="tooltip-trigger"
  style:anchor-name={anchorName}
  role="button"
  tabindex="0"
  onmouseenter={() => (show = true)}
  onmouseleave={() => (show = false)}
  onfocus={() => (show = true)}
  onblur={() => (show = false)}
>
  {#if children}
    {@render children()}
  {/if}
</div>

<!-- Tooltip content - positioned with CSS anchor positioning -->
{#if show}
  <div
    class="tooltip-content"
    class:position-top={position === 'top'}
    class:position-bottom={position === 'bottom'}
    class:position-left={position === 'left'}
    class:position-right={position === 'right'}
    style:position-anchor={anchorName}
    style:--arrow-position={arrowPosition}
    style:--tooltip-offset="{offset}px"
    role="tooltip"
    aria-label={content}
  >
    {content}
    <!-- Arrow pointing to trigger -->
    <div class="tooltip-arrow" aria-hidden="true"></div>
  </div>
{/if}

<style>
  .tooltip-trigger {
    /* Anchor positioning target */
    position: relative;
    display: inline-block;
  }

  /* Native Anchor Positioning (Chromium 143+) */
  .tooltip-content {
    position: absolute;
    position-anchor: var(--position-anchor);
    padding: var(--space-2) var(--space-3);
    background: var(--color-gray-900);
    color: var(--color-gray-50);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    white-space: nowrap;
    box-shadow: var(--shadow-md);
    pointer-events: none;
    z-index: var(--z-tooltip);

    /* Animation */
    opacity: 0;
    transform: scale(0.95) translateY(-4px);
    transition:
      opacity 200ms ease-out,
      transform 200ms ease-out,
      display 200ms allow-discrete;

    /* GPU acceleration */
    transform: translateZ(0);
    will-change: transform, opacity;

    /* Fallback positions - smart repositioning if not enough space */
    position-try-fallbacks: flip-block, flip-inline;
    
    /* Reset defaults */
    inset: auto;
  }

  .tooltip-content:popover-open,
  .tooltip-content.visible { /* Support both popover and manual show/hide */
    opacity: 1;
    transform: scale(1) translateY(0);
  }

  @starting-style {
    .tooltip-content:popover-open,
    .tooltip-content.visible {
      opacity: 0;
      transform: scale(0.95) translateY(-4px);
    }
  }

  /* Top position - above trigger */
  .tooltip-content.position-top {
    inset-area: top;
    margin-bottom: var(--tooltip-offset);

    & .tooltip-arrow {
      bottom: calc(-3px - var(--tooltip-offset));
      left: 50%;
      translate: -50% 0;
    }
  }

  /* Bottom position - below trigger */
  .tooltip-content.position-bottom {
    inset-area: bottom;
    margin-top: var(--tooltip-offset);

    & .tooltip-arrow {
      top: calc(-3px - var(--tooltip-offset));
      left: 50%;
      translate: -50% 0;
    }
  }

  /* Left position - left of trigger */
  .tooltip-content.position-left {
    inset-area: left;
    margin-right: var(--tooltip-offset);

    & .tooltip-arrow {
      right: calc(-3px - var(--tooltip-offset));
      top: 50%;
      translate: 0 -50%;
    }
  }

  /* Right position - right of trigger */
  .tooltip-content.position-right {
    inset-area: right;
    margin-left: var(--tooltip-offset);

    & .tooltip-arrow {
      left: calc(-3px - var(--tooltip-offset));
      top: 50%;
      translate: 0 -50%;
    }
  }

  .tooltip-arrow {
    position: absolute;
    width: 6px;
    height: 6px;
    background: var(--color-gray-900);
    transform: rotate(45deg);
    pointer-events: none;
  }

  /* Fallback for browsers without reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .tooltip-content {
      transition: none;
    }
  }
</style>
