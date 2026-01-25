<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    variant?: 'default' | 'outlined' | 'elevated' | 'glass' | 'gradient';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    interactive?: boolean;
    class?: string;
    children?: Snippet;
  };

  let {
    variant = 'default',
    padding = 'md',
    interactive = false,
    class: className = '',
    children
  }: Props = $props();
</script>

<div
  class="card {variant} padding-{padding} {className}"
  data-interactive={interactive || undefined}
>
  {@render children?.()}
</div>

<style>
  .card {
    background-color: var(--background);
    border-radius: var(--radius-2xl);
    overflow: hidden;
    position: relative;
    container-type: inline-size;
    container-name: card;
    transform: translateZ(0);
    backface-visibility: hidden;
    contain: content;
  }

  /* Variants */
  .default {
    border: 1px solid var(--border-color);
    background: linear-gradient(
      to bottom,
      var(--background),
      color-mix(in oklch, var(--background) 97%, var(--color-gray-100))
    );
    box-shadow:
      var(--shadow-sm),
      inset 0 1px 0 0 oklch(1 0 0 / 0.06);
  }

  .outlined {
    border: 1px solid var(--border-color-strong);
    background-color: transparent;
  }

  .elevated {
    border: 1px solid var(--glass-border);
    box-shadow:
      var(--shadow-lg),
      inset 0 1px 0 0 oklch(1 0 0 / 0.1);
    background: linear-gradient(
      to bottom,
      var(--background),
      color-mix(in oklch, var(--background) 96%, var(--color-gray-100))
    );
  }

  .glass {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur) var(--glass-saturation);
    -webkit-backdrop-filter: var(--glass-blur) var(--glass-saturation);
    border: 1px solid var(--glass-border-strong);
    box-shadow:
      var(--shadow-md),
      inset 0 1px 0 0 oklch(1 0 0 / 0.15),
      inset 0 -1px 0 0 oklch(0 0 0 / 0.05);
  }

  .gradient {
    border: 1px solid var(--color-primary-200);
    background: linear-gradient(
      135deg,
      var(--background) 0%,
      color-mix(in oklch, var(--color-primary-50) 60%, var(--background)) 50%,
      color-mix(in oklch, var(--color-secondary-50) 40%, var(--background)) 100%
    );
    box-shadow:
      var(--shadow-sm),
      inset 0 1px 0 0 oklch(1 0 0 / 0.1);
  }

  /* Interactive */
  .card[data-interactive="true"] {
    cursor: pointer;
    position: relative;
    transition:
      transform 250ms var(--ease-spring),
      box-shadow 250ms var(--ease-smooth),
      border-color 200ms var(--ease-smooth),
      background 200ms var(--ease-smooth);
    will-change: transform, box-shadow;
  }

  .card[data-interactive="true"]::after {
    content: "";
    position: absolute;
    inset: 0;
    background: var(--gradient-card-shine);
    background-size: 200% 100%;
    opacity: 0;
    transition: opacity 250ms ease;
    pointer-events: none;
    border-radius: inherit;
  }

  .card[data-interactive="true"]:hover::after {
    opacity: 1;
    animation: interactiveShine 700ms ease;
  }

  @keyframes interactiveShine {
    from { background-position: 200% 0; }
    to { background-position: -200% 0; }
  }

  .card[data-interactive="true"]:hover {
    border-color: var(--color-primary-300);
    background: linear-gradient(
      to bottom,
      var(--background),
      color-mix(in oklch, var(--color-primary-50) 40%, var(--background))
    );
  }

  .card[data-interactive="true"].default:hover {
    box-shadow:
      var(--shadow-md),
      var(--glow-primary-subtle);
    transform: translate3d(0, -4px, 0);
  }

  .card[data-interactive="true"].elevated:hover {
    box-shadow:
      var(--shadow-xl),
      var(--glow-primary);
    transform: translate3d(0, -6px, 0) scale(1.01);
  }

  .card[data-interactive="true"].glass:hover {
    border-color: var(--color-primary-400);
    box-shadow:
      var(--shadow-lg),
      var(--glow-primary),
      inset 0 1px 0 0 oklch(1 0 0 / 0.2);
    transform: translate3d(0, -5px, 0);
  }

  .card[data-interactive="true"]:active {
    transform: translate3d(0, -1px, 0) scale(0.99);
    transition-duration: 100ms;
  }

  .card[data-interactive="true"]:not(:hover) {
    will-change: auto;
  }

  .card[data-interactive="true"]:focus-within {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
    border-color: var(--color-primary-500);
    box-shadow:
      var(--shadow-focus-ring),
      var(--glow-primary-subtle);
  }

  /* Padding - CSS if() for density-responsive padding (Chrome 143+) */
  @supports (width: if(style(--x: 1), 10px, 20px)) {
    .padding-none {
      padding: if(style(--card-density: compact), var(--space-1), 0);
    }

    .padding-sm {
      padding: if(style(--card-density: compact), var(--space-2), var(--space-3));
    }

    .padding-md {
      padding: if(style(--card-density: compact), var(--space-3), var(--space-4));
    }

    .padding-lg {
      padding: if(style(--card-density: compact), var(--space-4), var(--space-6));
    }
  }

  /* Fallback for browsers without CSS if() support */
  @supports not (width: if(style(--x: 1), 10px, 20px)) {
    .padding-none {
      padding: 0;
    }

    .padding-sm {
      padding: var(--space-3);
    }

    .padding-md {
      padding: var(--space-4);
    }

    .padding-lg {
      padding: var(--space-6);
    }
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    .default {
      background: linear-gradient(
        to bottom,
        var(--background),
        color-mix(in oklch, var(--background) 95%, var(--color-gray-800))
      );
      border-color: var(--color-gray-700);
    }

    .elevated {
      background: linear-gradient(
        to bottom,
        var(--color-gray-800),
        color-mix(in oklch, var(--color-gray-800) 90%, var(--color-gray-900))
      );
      box-shadow: var(--shadow-md);
      border: 1px solid var(--color-gray-700);
    }

    .gradient {
      background: linear-gradient(
        135deg,
        var(--background) 0%,
        color-mix(in oklch, var(--color-primary-900) 20%, var(--background)) 100%
      );
      border-color: var(--color-gray-700);
    }

    .card[data-interactive="true"]:hover {
      border-color: var(--color-primary-500);
      background: linear-gradient(
        to bottom,
        var(--background),
        color-mix(in oklch, var(--color-primary-900) 25%, var(--background))
      );
    }

    .card[data-interactive="true"].elevated:hover {
      box-shadow: var(--shadow-primary-md);
    }
  }

  /* Container Queries */
  @container card (max-width: 280px) {
    .card :global(.header) {
      gap: var(--space-0);
      margin-bottom: var(--space-2);
    }

    .card :global(.title) {
      font-size: var(--text-sm);
    }

    .card :global(.description) {
      font-size: var(--text-xs);
    }

    .card :global(.footer) {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-2);
      margin-top: var(--space-2);
      padding-top: var(--space-2);
    }
  }

  @container card (min-width: 281px) and (max-width: 400px) {
    .card :global(.header) {
      margin-bottom: var(--space-3);
    }

    .card :global(.title) {
      font-size: var(--text-base);
    }
  }

  @container card (min-width: 401px) {
    .card :global(.title) {
      font-size: var(--text-lg);
    }
  }

  /* Fallback for browsers without container queries */
  @supports not (container-type: inline-size) {
    @media (max-width: 320px) {
      .card :global(.header) {
        gap: var(--space-0);
        margin-bottom: var(--space-2);
      }

      .card :global(.title) {
        font-size: var(--text-sm);
      }

      .card :global(.footer) {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  }

  /* High contrast mode */
  @media (forced-colors: active) {
    .card[data-interactive="true"]:focus-within {
      outline: 2px solid Highlight;
    }
  }
</style>
