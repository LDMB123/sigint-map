<script lang="ts">
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';
  import { errorLogger } from '$lib/errors/logger';
  import { ComponentLoadError, TimeoutError } from '$lib/errors/types';

  // Universal lazy-loading wrapper for all D3 visualization components
  // This defers loading D3 libraries until the component is actually rendered
  // Includes comprehensive error handling and retry mechanisms

  // Properly typed props for better type safety and performance
  interface VisualizationData {
    [key: string]: unknown;
  }

  interface VisualizationLinks {
    source: number | string;
    target: number | string;
    value?: number;
    [key: string]: unknown;
  }

  interface TopoData {
    [key: string]: unknown;
  }

  type Props = {
    componentPath: 'TransitionFlow' | 'GuestNetwork' | 'TourMap' | 'GapTimeline' | 'SongHeatmap' | 'RarityScorecard' | 'LazyTransitionFlow';
    data?: VisualizationData;
    links?: VisualizationLinks[];
    topoData?: TopoData;
    width?: number;
    height?: number;
    limit?: number;
    colorScheme?: string;
    class?: string;
    onError?: (error: Error) => void;
    maxRetries?: number;
  };

  let {
    componentPath,
    data,
    links,
    topoData,
    width,
    height,
    limit,
    colorScheme,
    class: className = '',
    onError,
    maxRetries = 2
  }: Props = $props();

  let VisualizationComponent: Component<Record<string, unknown>> | null = $state(null);
  let isLoading = $state(true);
  let error: string | null = $state(null);
  let errorCode: string | null = $state(null);
  let retryCount = $state(0);

  // Use $derived for prop memoization - prevents unnecessary re-renders
  // Only recompute when actual values change, not on every parent render
  const componentProps = $derived({
    data,
    links,
    topoData,
    width,
    height,
    limit,
    colorScheme,
    class: className
  });

  // Track stable identity for expensive props to minimize D3 re-renders
  const stableData = $derived.by(() => data);

  const stableLinks = $derived.by(() => links);

  // Map of available visualization components
  const COMPONENT_MAP: Record<string, () => Promise<any>> = {
    TransitionFlow: () => import('./TransitionFlow.svelte'),
    GuestNetwork: () => import('./GuestNetwork.svelte'),
    TourMap: () => import('./TourMap.svelte'),
    GapTimeline: () => import('./GapTimeline.svelte'),
    SongHeatmap: () => import('./SongHeatmap.svelte'),
    RarityScorecard: () => import('./RarityScorecard.svelte'),
    LazyTransitionFlow: () => import('./LazyTransitionFlow.svelte')
  };

  /**
   * Load visualization component with timeout and retry logic
   */
  async function loadVisualizationComponent(
    path: string,
    attemptNumber: number = 1
  ): Promise<void> {
    try {
      // Validate component exists
      if (!(path in COMPONENT_MAP)) {
        const err = new Error(`Unknown visualization component: ${path}`);
        throw new ComponentLoadError(path, err, {
          availableComponents: Object.keys(COMPONENT_MAP),
          attemptNumber
        });
      }

      // Create timeout promise
      const LOAD_TIMEOUT_MS = 10000;
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new TimeoutError(`load:${path}`, LOAD_TIMEOUT_MS)),
          LOAD_TIMEOUT_MS
        )
      );

      // Race between import and timeout
      const importFn = COMPONENT_MAP[path];
      const module = await Promise.race([
        importFn(),
        timeoutPromise
      ]);

      // Validate module has default export
      if (!module.default) {
        throw new Error(`Module ${path} has no default export`);
      }

      VisualizationComponent = module.default;
      error = null;
      errorCode = null;
      retryCount = 0;

      errorLogger.info(`Loaded visualization component: ${path}`, {
        componentPath: path,
        attemptNumber
      });
    } catch (err) {
      const appError =
        err instanceof ComponentLoadError
          ? err
          : new ComponentLoadError(path, err instanceof Error ? err : new Error(String(err)), {
              attemptNumber
            });

      errorLogger.error(
        `Failed to load visualization: ${path}`,
        appError,
        {
          componentPath: path,
          attemptNumber,
          maxRetries
        }
      );

      // Only retry on specific errors (not validation errors)
      if (
        attemptNumber < maxRetries &&
        (appError.code === 'TIMEOUT_ERROR' ||
          appError.code === 'COMPONENT_LOAD_ERROR')
      ) {
        error = `Loading failed. Retrying (${attemptNumber}/${maxRetries})...`;
        errorCode = 'RETRYING';
        retryCount = attemptNumber;

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attemptNumber - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));

        return loadVisualizationComponent(path, attemptNumber + 1);
      }

      // Store error state
      error = appError.message;
      errorCode = appError.code;
      VisualizationComponent = null;
      retryCount = attemptNumber;

      // Call error callback
      onError?.(appError);
    } finally {
      isLoading = false;
    }
  }

  /**
   * Retry loading the visualization
   */
  async function retry(): Promise<void> {
    isLoading = true;
    error = null;
    errorCode = null;
    VisualizationComponent = null;

    errorLogger.info(`Retrying component load: ${componentPath}`, {
      componentPath,
      previousAttempts: retryCount
    });

    await loadVisualizationComponent(componentPath, 1);
  }

  // Load component on mount
  onMount(() => {
    loadVisualizationComponent(componentPath);
  });

  // Reactive effect for component path changes
  $effect(() => {
    if (componentPath) {
      isLoading = true;
      error = null;
      errorCode = null;
      VisualizationComponent = null;
      loadVisualizationComponent(componentPath);
    }
  });
</script>

{#if isLoading}
  <div class="lazy-loading-container scroll-fade-in" role="status" aria-live="polite">
    <div class="spinner" aria-hidden="true"></div>
    <p>Loading {componentPath}...</p>
  </div>
{:else if error}
  <div class="lazy-error-container scroll-fade-in" role="alert" aria-live="assertive">
    <div class="error-content">
      <h3>Visualization Failed to Load</h3>
      <p class="error-message">{error}</p>
      {#if errorCode === 'RETRYING'}
        <p class="error-subtext">Please wait...</p>
      {/if}
      {#if errorCode !== 'RETRYING' && retryCount < maxRetries}
        <button class="retry-button" onclick={retry} type="button">
          Try Again
        </button>
      {/if}
      <details class="error-details">
        <summary>Error Details</summary>
        <pre>{componentPath} - {errorCode || 'UNKNOWN_ERROR'}</pre>
      </details>
    </div>
  </div>
{:else if VisualizationComponent}
  <!-- Use memoized props to prevent unnecessary D3 re-renders -->
  <div class="scroll-slide-up">
    <VisualizationComponent
      data={stableData}
      links={stableLinks}
      {topoData}
      {width}
      {height}
      {limit}
      {colorScheme}
      class={className}
    />
  </div>
{/if}

<style>
  .lazy-loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    gap: 1rem;
    min-height: 300px;
    background: var(--background);
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

  .lazy-error-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    min-height: 300px;
    background: var(--background-secondary);
    border-radius: var(--radius-md);
  }

  .error-content {
    max-width: 500px;
    text-align: center;
  }

  .error-content h3 {
    margin: 0 0 1rem;
    color: var(--color-error-500);
    font-size: 1.125rem;
  }

  .error-message {
    color: var(--color-error-500);
    margin: 0 0 0.75rem;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .error-subtext {
    color: var(--foreground-secondary);
    margin: 0 0 0.75rem;
    font-size: 0.8125rem;
  }

  .retry-button {
    padding: 0.5rem 1rem;
    margin-top: 1rem;
    background: var(--color-primary-500);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 0.875rem;
    transition: background-color 0.2s;
  }

  .retry-button:hover {
    background: var(--color-primary-600);
  }

  .retry-button:active {
    transform: scale(0.98);
  }

  .error-details {
    margin-top: 1rem;
    text-align: left;
  }

  .error-details summary {
    cursor: pointer;
    color: var(--foreground-secondary);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    padding: 0.5rem;
  }

  .error-details pre {
    background: var(--background);
    padding: 0.75rem;
    border-radius: var(--radius-sm);
    overflow-x: auto;
    font-size: 0.75rem;
    margin: 0.5rem 0 0;
    color: var(--foreground-secondary);
  }

  .lazy-loading-container p {
    color: var(--foreground-secondary);
    font-size: 0.875rem;
  }

  /* Scroll-driven animations for lazy-loaded containers */
  @supports (animation-timeline: view()) {
    .scroll-fade-in {
      animation: scrollFadeIn linear both;
      animation-timeline: view();
      animation-range: entry 0% cover 40%;
      will-change: opacity;
    }

    .scroll-slide-up {
      animation: scrollSlideUp linear both;
      animation-timeline: view();
      animation-range: entry 0% cover 50%;
      will-change: opacity, transform;
    }

    @keyframes scrollFadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes scrollSlideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  }

  /* Respect reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .scroll-fade-in,
    .scroll-slide-up {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
  }
</style>
