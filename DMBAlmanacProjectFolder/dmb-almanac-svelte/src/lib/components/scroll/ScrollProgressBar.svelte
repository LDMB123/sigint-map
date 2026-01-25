
<script lang="ts">
  // Props
  let {
    variant = 'solid',
    color = 'primary',
    height = 4,
    showLabel = false,
  }: {
    variant?: 'solid' | 'gradient' | 'glowing';
    color?: 'primary' | 'secondary' | 'success' | 'warning';
    height?: number;
    showLabel?: boolean;
  } = $props();

  // No JS state needed - purely CSS driven
</script>

<div
  class="scroll-progress-container"
  data-variant={variant}
  style="--height: {height}px;"
>
  <!-- Native scroll-driven animation (Chromium 115+) -->
  <div class="scroll-progress-bar {variant}" class:bg-primary={color === 'primary'} class:bg-secondary={color === 'secondary'} class:bg-success={color === 'success'} class:bg-warning={color === 'warning'}></div>
</div>

<style>
  .scroll-progress-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: var(--height);
    background: transparent;
    z-index: var(--z-sticky);
  }

  /* Native scroll-driven animation */
  @supports (animation-timeline: scroll()) {
    .scroll-progress-bar {
      width: 100%;
      height: 100%;
      transform-origin: left;
      background-color: var(--color-primary-600);

      /* Tied to document scroll progress */
      animation: scrollProgress linear;
      animation-timeline: scroll(root block);
      will-change: transform;
    }

    @keyframes scrollProgress {
      from {
        transform: scaleX(0);
      }
      to {
        transform: scaleX(1);
      }
    }

    /* Variants */
    .scroll-progress-bar.gradient {
      background: linear-gradient(
        90deg,
        var(--color-primary-500),
        var(--color-primary-600),
        var(--color-accent-orange)
      );
      background-size: 200% 100%;
    }

    .scroll-progress-bar.glowing {
      background: var(--color-primary-600);
      filter: drop-shadow(0 0 8px var(--color-primary-500));
      box-shadow: inset 0 0 10px var(--color-primary-500);
    }
  }

  /* Fallback: JavaScript-powered progress bar */
  .scroll-progress-bar.fallback {
    width: var(--progress-width, 0%);
    height: 100%;
    background: var(--bar-color);
    transition: width 0.1s ease-out;
    will-change: width;
  }

  .scroll-progress-bar.fallback.gradient {
    background: var(--bar-gradient);
  }

  .scroll-progress-bar.fallback.glowing {
    box-shadow: 0 0 12px var(--bar-glow);
    filter: drop-shadow(0 0 6px var(--bar-glow));
  }

  /* Progress label */
  .scroll-progress-label {
    position: absolute;
    bottom: -24px;
    right: var(--space-4);
    font-size: var(--text-xs);
    font-weight: var(--font-semibold);
    color: var(--foreground-muted);
    pointer-events: none;
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .scroll-progress-bar {
      animation: none !important;
    }

    .scroll-progress-bar.fallback {
      transition: none;
    }
  }
</style>
