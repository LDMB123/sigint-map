<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    label: string;
    value: string | number;
    subtitle?: string;
    icon?: Snippet;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning';
    size?: 'sm' | 'md' | 'lg';
    href?: string;
    class?: string;
  };

  let {
    label,
    value,
    subtitle,
    icon,
    trend,
    trendValue,
    variant = 'default',
    size = 'md',
    href,
    class: className = ''
  }: Props = $props();

  const isLink = $derived(!!href);
  const Tag = $derived(isLink ? 'a' : 'div');
</script>

<svelte:element
  this={Tag}
  href={isLink ? href : undefined}
  class="stat-card {variant} {size} {className}"
  class:interactive={isLink}
  role={isLink ? 'link' : undefined}
>
  {#if icon}
    <div class="icon-container" aria-hidden="true">
      {@render icon()}
    </div>
  {/if}

  <div class="content">
    <div class="header">
      <span class="label">{label}</span>
      {#if trend}
        <span class="trend trend-{trend}" aria-label={trend === 'up' ? 'Trending up' : trend === 'down' ? 'Trending down' : 'No change'}>
          {#if trend === 'up'}
            ↗
          {:else if trend === 'down'}
            ↘
          {:else}
            →
          {/if}
          {#if trendValue}
            <span class="trend-value">{trendValue}</span>
          {/if}
        </span>
      {/if}
    </div>

    <div class="value-container">
      <span class="value">{value}</span>
      {#if subtitle}
        <span class="subtitle">{subtitle}</span>
      {/if}
    </div>
  </div>
</svelte:element>

<style>
  .stat-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4);
    background: var(--background-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    text-decoration: none;
    color: inherit;
    position: relative;
    overflow: hidden;

    /* Subtle gradient background */
    background: linear-gradient(
      to bottom,
      var(--background),
      var(--background-secondary)
    );
    box-shadow: var(--shadow-sm);

    /* GPU acceleration */
    transform: translateZ(0);
    backface-visibility: hidden;

    /* Container query context */
    container: stat-card / inline-size;
  }

  /* Interactive (link) variant */
  .stat-card.interactive {
    cursor: pointer;
    transition:
      transform var(--transition-fast) var(--ease-spring),
      box-shadow var(--transition-fast) var(--ease-smooth),
      border-color var(--transition-fast),
      background var(--transition-fast);
  }

  .stat-card.interactive:hover {
    transform: translate3d(0, -2px, 0);
    box-shadow: var(--shadow-md);
    border-color: var(--color-primary-300);
    background: linear-gradient(
      to bottom,
      var(--background),
      color-mix(in oklch, var(--color-primary-50) 40%, var(--background))
    );
  }

  .stat-card.interactive:active {
    transform: translate3d(0, 0, 0);
    transition-duration: var(--duration-instant);
  }

  /* Icon container */
  .icon-container {
    display: flex;
    place-items: center;
    width: 48px;
    height: 48px;
    background: var(--background-tertiary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
  }

  .icon-container :global(svg) {
    width: 24px;
    height: 24px;
    color: var(--foreground-secondary);
  }

  /* Content */
  .content {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    flex: 1;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .label {
    font-size: var(--text-sm);
    color: var(--foreground-secondary);
    text-transform: uppercase;
    letter-spacing: var(--tracking-wider);
    font-weight: var(--font-medium);
  }

  .value-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .value {
    font-size: var(--text-3xl);
    font-weight: var(--font-extrabold);
    color: var(--foreground);
    line-height: var(--leading-none);
    letter-spacing: var(--tracking-tight);
  }

  .subtitle {
    font-size: var(--text-sm);
    color: var(--foreground-muted);
  }

  /* Trend indicator */
  .trend {
    display: inline-flex;
    place-items: center;
    gap: var(--space-1);
    font-size: var(--text-xs);
    font-weight: var(--font-semibold);
    padding: 2px 6px;
    border-radius: var(--radius-full);
  }

  .trend-up {
    color: var(--color-secondary-700);
    background-color: var(--color-success-bg);
  }

  .trend-down {
    color: var(--color-primary-800);
    background-color: var(--color-error-bg);
  }

  .trend-neutral {
    color: var(--foreground-muted);
    background-color: var(--background-tertiary);
  }

  .trend-value {
    font-weight: var(--font-bold);
  }

  /* Size variants - CSS if() for density-responsive sizing (Chrome 143+) */
  @supports (width: if(style(--x: 1), 10px, 20px)) {
    .sm {
      padding: if(style(--card-density: compact), var(--space-2), var(--space-3));
      gap: if(style(--card-density: compact), var(--space-1), var(--space-2));
    }

    .sm .icon-container {
      width: if(style(--card-density: compact), 32px, 36px);
      height: if(style(--card-density: compact), 32px, 36px);
    }

    .sm .icon-container :global(svg) {
      width: if(style(--card-density: compact), 16px, 18px);
      height: if(style(--card-density: compact), 16px, 18px);
    }

    .sm .value {
      font-size: if(style(--card-density: compact), var(--text-xl), var(--text-2xl));
    }

    .sm .label {
      font-size: if(style(--card-density: compact), 10px, var(--text-xs));
    }

    .md {
      padding: if(style(--card-density: compact), var(--space-3), var(--space-4));
    }

    .lg {
      padding: if(style(--card-density: compact), var(--space-4), var(--space-6));
      gap: if(style(--card-density: compact), var(--space-2), var(--space-4));
    }

    .lg .icon-container {
      width: if(style(--card-density: compact), 48px, 64px);
      height: if(style(--card-density: compact), 48px, 64px);
    }

    .lg .icon-container :global(svg) {
      width: if(style(--card-density: compact), 24px, 32px);
      height: if(style(--card-density: compact), 24px, 32px);
    }

    .lg .value {
      font-size: if(style(--card-density: compact), var(--text-3xl), var(--text-4xl));
    }

    .lg .label {
      font-size: if(style(--card-density: compact), var(--text-sm), var(--text-base));
    }
  }

  /* Fallback for browsers without CSS if() support */
  @supports not (width: if(style(--x: 1), 10px, 20px)) {
    .sm {
      padding: var(--space-3);
      gap: var(--space-2);
    }

    .sm .icon-container {
      width: 36px;
      height: 36px;
    }

    .sm .icon-container :global(svg) {
      width: 18px;
      height: 18px;
    }

    .sm .value {
      font-size: var(--text-2xl);
    }

    .sm .label {
      font-size: var(--text-xs);
    }

    .md {
      padding: var(--space-4);
    }

    .lg {
      padding: var(--space-6);
      gap: var(--space-4);
    }

    .lg .icon-container {
      width: 64px;
      height: 64px;
    }

    .lg .icon-container :global(svg) {
      width: 32px;
      height: 32px;
    }

    .lg .value {
      font-size: var(--text-4xl);
    }

    .lg .label {
      font-size: var(--text-base);
    }
  }

  /* Color variants */
  .primary {
    border-color: var(--color-primary-200);
    background: linear-gradient(
      to bottom,
      color-mix(in oklch, var(--color-primary-50) 60%, var(--background)),
      color-mix(in oklch, var(--color-primary-100) 50%, var(--background))
    );
  }

  .primary .value {
    color: var(--color-primary-700);
  }

  .primary .icon-container {
    background-color: var(--color-primary-100);
    border-color: var(--color-primary-200);
  }

  .primary .icon-container :global(svg) {
    color: var(--color-primary-600);
  }

  .secondary {
    border-color: var(--color-secondary-200);
    background: linear-gradient(
      to bottom,
      color-mix(in oklch, var(--color-secondary-50) 60%, var(--background)),
      color-mix(in oklch, var(--color-secondary-100) 50%, var(--background))
    );
  }

  .secondary .value {
    color: var(--color-secondary-700);
  }

  .secondary .icon-container {
    background-color: var(--color-secondary-100);
    border-color: var(--color-secondary-200);
  }

  .secondary .icon-container :global(svg) {
    color: var(--color-secondary-600);
  }

  .success {
    border-color: var(--color-success);
    background: linear-gradient(
      to bottom,
      var(--color-success-bg),
      color-mix(in oklch, var(--color-success-bg) 80%, var(--background))
    );
  }

  .success .value {
    color: var(--color-success);
  }

  .success .icon-container {
    background-color: var(--color-success-bg);
    border-color: var(--color-success);
  }

  .success .icon-container :global(svg) {
    color: var(--color-success);
  }

  .warning {
    border-color: var(--color-warning);
    background: linear-gradient(
      to bottom,
      var(--color-warning-bg),
      color-mix(in oklch, var(--color-warning-bg) 80%, var(--background))
    );
  }

  .warning .value {
    color: var(--color-warning);
  }

  .warning .icon-container {
    background-color: var(--color-warning-bg);
    border-color: var(--color-warning);
  }

  .warning .icon-container :global(svg) {
    color: var(--color-warning);
  }

  /* Focus state */
  .stat-card.interactive:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    .stat-card {
      background: linear-gradient(
        to bottom,
        var(--color-gray-800),
        var(--color-gray-900)
      );
      border-color: var(--color-gray-700);
    }

    .icon-container {
      background-color: var(--color-gray-800);
      border-color: var(--color-gray-700);
    }

    .primary {
      background: linear-gradient(
        to bottom,
        color-mix(in oklch, var(--color-primary-900) 30%, var(--background)),
        color-mix(in oklch, var(--color-primary-900) 20%, var(--background))
      );
    }

    .primary .value {
      color: var(--color-primary-400);
    }

    .secondary {
      background: linear-gradient(
        to bottom,
        color-mix(in oklch, var(--color-secondary-900) 30%, var(--background)),
        color-mix(in oklch, var(--color-secondary-900) 20%, var(--background))
      );
    }

    .secondary .value {
      color: var(--color-secondary-400);
    }

    .trend-up {
      color: var(--color-secondary-300);
      background-color: color-mix(in oklch, var(--color-success) 20%, transparent);
    }

    .trend-down {
      color: var(--color-primary-300);
      background-color: color-mix(in oklch, var(--color-error) 20%, transparent);
    }
  }

  /* Container query for component-level responsive design */
  @container stat-card (max-width: 200px) {
    .stat-card {
      padding: var(--space-3);
    }

    .value {
      font-size: var(--text-2xl);
    }

    .lg .value {
      font-size: var(--text-3xl);
    }
  }

  /* Fallback for browsers without container queries */
  @supports not (container-type: inline-size) {
    @media (max-width: 640px) {
      .stat-card {
        padding: var(--space-3);
      }

      .value {
        font-size: var(--text-2xl);
      }

      .lg .value {
        font-size: var(--text-3xl);
      }
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .stat-card.interactive {
      transition: none;
    }

    .stat-card.interactive:hover,
    .stat-card.interactive:active {
      transform: none;
    }
  }

  /* High contrast mode */
  @media (forced-colors: active) {
    .stat-card {
      border: 2px solid CanvasText;
    }

    .stat-card.interactive:focus-visible {
      outline: 2px solid Highlight;
    }
  }
</style>
