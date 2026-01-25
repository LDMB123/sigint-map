<script lang="ts">
  /**
   * LoadingState - Standardized loading indicator component
   * Provides consistent loading UI across the application
   */

  interface Props {
    /** Loading message to display */
    message?: string;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Whether to show the spinner */
    showSpinner?: boolean;
    /** Whether to center in container */
    centered?: boolean;
    /** Minimum height for the container */
    minHeight?: string;
    /** Additional CSS class */
    class?: string;
  }

  let {
    message = 'Loading...',
    size = 'md',
    showSpinner = true,
    centered = true,
    minHeight = '200px',
    class: className = ''
  }: Props = $props();

  const spinnerSizes = {
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem'
  };

  const textSizes = {
    sm: 'var(--text-sm)',
    md: 'var(--text-base)',
    lg: 'var(--text-lg)'
  };
</script>

<div
  class="loading-state {className}"
  class:centered
  style:min-height={minHeight}
  role="status"
  aria-busy="true"
  aria-live="polite"
>
  {#if showSpinner}
    <div
      class="spinner"
      style:width={spinnerSizes[size]}
      style:height={spinnerSizes[size]}
      aria-hidden="true"
    ></div>
  {/if}
  {#if message}
    <p class="message" style:font-size={textSizes[size]}>{message}</p>
  {/if}
</div>

<style>
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-4);
  }

  .loading-state.centered {
    width: 100%;
  }

  .spinner {
    border: 2px solid var(--border-color, #e5e7eb);
    border-top-color: var(--color-primary, #f97316);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .message {
    color: var(--foreground-secondary, #6b7280);
    margin: 0;
    text-align: center;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Reduce motion for accessibility */
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation-duration: 1.5s;
    }
  }
</style>
