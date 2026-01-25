<script lang="ts">
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';

  // Component type for dynamic rendering
  let TransitionComponent: Component<any> | null = $state(null);
  let isLoading = $state(true);
  let error: string | null = $state(null);

  type Props = {
    data?: Array<{
      source: string;
      target: string;
      value: number;
    }>;
    width?: number;
    height?: number;
    class?: string;
  };

  let { data = [], width = 960, height = 600, class: className = '' }: Props = $props();

  onMount(async () => {
    try {
      // Dynamically import the actual visualization component
      // This defers D3 library loading until the component is needed
      const module = await import('./TransitionFlow.svelte');
      TransitionComponent = module.default;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load visualization';
      console.error('Error loading TransitionFlow:', err);
    } finally {
      isLoading = false;
    }
  });
</script>

{#if isLoading}
  <div class="loading-container">
    <div class="spinner"></div>
    <p>Loading visualization...</p>
  </div>
{:else if error}
  <div class="error-container">
    <p>Error: {error}</p>
  </div>
{:else if TransitionComponent}
  <TransitionComponent {data} {width} {height} class={className} />
{/if}

<style>
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    gap: 1rem;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 2px solid var(--border-color);
    border-top-color: var(--color-primary-500);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: var(--background-secondary);
    border-radius: var(--radius-md);
  }

  .error-container p {
    color: var(--color-error-500);
    margin: 0;
  }

  .loading-container p {
    color: var(--foreground-secondary);
    font-size: 0.875rem;
  }
</style>
