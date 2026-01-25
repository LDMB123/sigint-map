<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?:
      | 'default'
      | 'primary'
      | 'secondary'
      | 'outline'
      | 'opener'
      | 'closer'
      | 'encore'
      | 'release'
      | 'guest'
      | 'tease'
      | 'success'
      | 'warning'
      | 'error';
    size?: 'sm' | 'md' | 'lg';
    class?: string;
    children?: Snippet;
  }

  let {
    variant = 'default',
    size = 'md',
    class: className = '',
    children,
    ...props
  }: BadgeProps = $props();
</script>

<span class="badge {variant} {size} {className}" {...props}>
  {#if children}
    {@render children()}
  {/if}
</span>

<style>
  .badge {
    display: inline-flex;
    place-items: center;
    font-weight: var(--font-medium);
    border-radius: var(--radius-full);
    white-space: nowrap;
    line-height: 1;
    letter-spacing: var(--tracking-wide);
    transition:
      background-color var(--transition-fast),
      color var(--transition-fast),
      transform var(--transition-fast);
  }

  /* Sizes - CSS if() for density-responsive badge sizing (Chrome 143+) */
  @supports (width: if(style(--x: 1), 10px, 20px)) {
    .sm {
      padding: if(style(--use-compact-spacing: true), 1px 6px, 2px 8px);
      font-size: if(style(--use-compact-spacing: true), 9px, 10px);
      letter-spacing: if(style(--use-compact-spacing: true), 0em, var(--tracking-wide));
    }

    .md {
      padding: if(style(--use-compact-spacing: true), 3px 8px, 4px 10px);
      font-size: if(style(--use-compact-spacing: true), 10px, var(--text-xs));
      letter-spacing: if(style(--use-compact-spacing: true), 0em, var(--tracking-wide));
    }

    .lg {
      padding: if(style(--use-compact-spacing: true), 4px 12px, 5px 14px);
      font-size: if(style(--use-compact-spacing: true), var(--text-xs), var(--text-sm));
      letter-spacing: if(style(--use-compact-spacing: true), 0em, var(--tracking-wide));
    }
  }

  /* Fallback for browsers without CSS if() support */
  @supports not (width: if(style(--x: 1), 10px, 20px)) {
    .sm {
      padding: 2px 8px;
      font-size: 10px;
    }

    .md {
      padding: 4px 10px;
      font-size: var(--text-xs);
    }

    .lg {
      padding: 5px 14px;
      font-size: var(--text-sm);
    }
  }

  /* Variants */
  .default {
    background-color: var(--color-gray-100);
    color: var(--color-gray-700);
    border: 1px solid var(--color-gray-200);
  }

  .primary {
    background: linear-gradient(
      to bottom,
      var(--color-primary-100),
      color-mix(in oklch, var(--color-primary-100) 80%, var(--color-primary-200))
    );
    color: var(--color-primary-800);
    border: 1px solid var(--color-primary-200);
  }

  .secondary {
    background: linear-gradient(
      to bottom,
      var(--color-secondary-100),
      color-mix(in oklch, var(--color-secondary-100) 80%, var(--color-secondary-200))
    );
    color: var(--color-secondary-800);
    border: 1px solid var(--color-secondary-200);
  }

  .outline {
    background-color: transparent;
    border: 1px solid var(--border-color-strong);
    color: var(--foreground-secondary);
  }

  /* Setlist slot variants */
  .opener {
    background-color: var(--color-opener-bg);
    color: var(--color-opener);
    font-weight: var(--font-bold);
    letter-spacing: 0.5px;
  }

  .closer {
    background-color: var(--color-closer-bg);
    color: var(--color-closer);
    font-weight: var(--font-bold);
    letter-spacing: 0.5px;
  }

  .encore {
    background-color: var(--color-encore-bg);
    color: var(--color-encore);
    font-weight: var(--font-bold);
    letter-spacing: 0.5px;
  }

  /* Special variants */
  .release {
    background-color: var(--color-primary-100);
    color: var(--color-primary-700);
  }

  .guest {
    background: linear-gradient(
      to bottom,
      color-mix(in oklch, var(--color-secondary-100) 50%, var(--color-primary-100)),
      color-mix(in oklch, var(--color-secondary-100) 40%, var(--color-primary-100))
    );
    color: var(--color-secondary-600);
    border: 1px solid color-mix(in oklch, var(--color-secondary-200) 60%, transparent);
  }

  .tease {
    background: linear-gradient(
      to bottom,
      var(--color-primary-100),
      color-mix(in oklch, var(--color-primary-100) 90%, var(--color-primary-200))
    );
    color: var(--color-primary-700);
    border: 1px solid var(--color-primary-200);
    font-style: italic;
  }

  /* Semantic variants */
  .success {
    background-color: var(--color-success-bg);
    color: var(--color-secondary-700);
  }

  .warning {
    background-color: var(--color-warning-bg);
    color: var(--color-primary-800);
  }

  .error {
    background-color: var(--color-error-bg);
    color: var(--color-primary-900);
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    .default {
      background-color: var(--color-gray-800);
      color: var(--color-gray-300);
    }

    .primary {
      background-color: oklch(0.7 0.2 60 / 0.2);
      color: var(--color-primary-400);
    }

    .secondary {
      background-color: oklch(0.52 0.18 190 / 0.2);
      color: var(--color-secondary-400);
    }

    .guest {
      background-color: oklch(0.52 0.18 190 / 0.2);
      color: color-mix(in oklch, var(--color-secondary-300) 120%, transparent);
    }

    .tease {
      background-color: oklch(0.7 0.2 60 / 0.2);
      color: var(--color-primary-300);
    }

    .success {
      background-color: oklch(0.52 0.16 155 / 0.2);
      color: color-mix(in oklch, var(--color-secondary-200) 120%, transparent);
    }

    .warning {
      background-color: oklch(0.7 0.2 60 / 0.2);
      color: var(--color-primary-300);
    }

    .error {
      background-color: oklch(0.55 0.2 25 / 0.2);
      color: color-mix(in oklch, var(--color-primary-300) 120%, transparent);
    }
  }
</style>
