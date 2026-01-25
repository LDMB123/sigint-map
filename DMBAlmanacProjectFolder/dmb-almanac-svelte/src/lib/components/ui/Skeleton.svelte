<script lang="ts">
  type Props = {
    variant?: 'text' | 'title' | 'circle' | 'rect' | 'card';
    width?: string;
    height?: string;
    class?: string;
  };

  let {
    variant = 'text',
    width,
    height,
    class: className = ''
  }: Props = $props();
</script>

<div
  class="skeleton {variant} {className}"
  style:width
  style:height
  role="status"
  aria-label="Loading..."
  aria-live="polite"
  aria-busy="true"
>
  <span class="sr-only">Loading...</span>
</div>

<style>
  .skeleton {
    background: var(--background-tertiary);
    border-radius: var(--radius-md);
    position: relative;
    overflow: hidden;

    /* GPU acceleration for smooth animation on Apple Silicon */
    transform: translateZ(0);
    backface-visibility: hidden;
    will-change: transform;
  }

  /* Shimmer pseudo-element for GPU-accelerated animation */
  .skeleton::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--background-secondary) 50%,
      transparent 100%
    );
    transform: translateX(-100%);
    animation: shimmer 1.5s ease-in-out infinite;
    will-change: transform;
  }

  /* GPU-accelerated shimmer using transform instead of background-position */
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  /* Variant: Text (single line) */
  .text {
    width: 100%;
    height: 1rem;
    max-width: 100%;
  }

  /* Variant: Title (larger text) */
  .title {
    width: 60%;
    height: 1.5rem;
    border-radius: var(--radius-lg);
  }

  /* Variant: Circle (avatar/icon) */
  .circle {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-full);
  }

  /* Variant: Rectangle (image placeholder) */
  .rect {
    width: 100%;
    height: 200px;
    border-radius: var(--radius-lg);
  }

  /* Variant: Card (full card placeholder) */
  .card {
    width: 100%;
    height: 150px;
    border-radius: var(--radius-2xl);
  }

  /* Dark mode adjustments */
  @media (prefers-color-scheme: dark) {
    .skeleton {
      background: linear-gradient(
        90deg,
        var(--color-gray-800) 25%,
        var(--color-gray-700) 50%,
        var(--color-gray-800) 75%
      );
      background-size: 200% 100%;
    }
  }

  /* Reduced motion: disable animation */
  @media (prefers-reduced-motion: reduce) {
    .skeleton {
      animation: none;
      background: var(--background-tertiary);
    }
  }

  /* Screen reader only text */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
</style>
