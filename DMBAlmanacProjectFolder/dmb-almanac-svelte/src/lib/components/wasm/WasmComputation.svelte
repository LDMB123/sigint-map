<!--
  WasmComputation.svelte

  A generic Svelte 5 component for displaying WASM computation results.
  Handles loading, error, and success states with snippets for customization.

  Usage:
  <WasmComputation store={songStatisticsStore}>
    {#snippet loadingContent()}
      Computing statistics...
    {/snippet}

    {#snippet errorContent(error)}
      Failed: {error.message}
    {/snippet}

    {#snippet children({ data, meta })}
      {#each data as stat}
        <StatRow {stat} />
      {/each}
    {/snippet}

    {#snippet metaContent(meta)}
      Computed in {meta.executionTime}ms using {meta.usedWasm ? 'WASM' : 'JS'}
    {/snippet}
  </WasmComputation>
-->
<script lang="ts" generics="T">
  import type { Readable } from 'svelte/store';
  import type { AsyncWasmState } from '$lib/wasm';
  import type { Snippet } from 'svelte';
  import { Skeleton } from '$lib/components/ui';

  interface MetaInfo {
    usedWasm: boolean | null;
    executionTime: number | null;
    lastUpdated: number | null;
    source: string;
  }

  interface Props {
    /** The WASM store to observe */
    store: Readable<AsyncWasmState<T>>;
    /** Whether to show the meta information (execution time, etc.) */
    showMeta?: boolean;
    /** Minimum loading time to prevent flash (ms) */
    minLoadingTime?: number;
    /** Custom loading content snippet */
    loadingContent?: Snippet;
    /** Custom error content snippet */
    errorContent?: Snippet<[Error]>;
    /** Main content snippet with data and meta */
    children?: Snippet<[{ data: T; meta: MetaInfo }]>;
    /** Custom meta content snippet */
    metaContent?: Snippet<[MetaInfo]>;
    /** Custom empty state content snippet */
    emptyContent?: Snippet;
  }

  let {
    store,
    showMeta = true,
    minLoadingTime: _minLoadingTime = 200,
    loadingContent,
    errorContent,
    children,
    metaContent,
    emptyContent,
  }: Props = $props();

  // Subscribe to store
  let state = $derived($store);

  // Derived values for template
  let data = $derived(state.data);
  let isLoading = $derived(state.loading);
  let stateError = $derived(state.error);
  let usedWasm = $derived(state.usedWasm);
  let executionTime = $derived(state.executionTime);
  let lastUpdated = $derived(state.lastUpdated);

  // Meta object for snippets
  let meta: MetaInfo = $derived({
    usedWasm,
    executionTime,
    lastUpdated,
    source: usedWasm ? 'WASM' : 'JavaScript',
  });
</script>

<div class="wasm-computation" class:loading={isLoading} class:error={!!stateError}>
  {#if isLoading}
    <div class="loading-state">
      {#if loadingContent}
        {@render loadingContent()}
      {:else}
        <div class="default-loading">
          <Skeleton width="100%" height="2rem" />
          <Skeleton width="80%" height="1rem" />
          <Skeleton width="60%" height="1rem" />
        </div>
      {/if}
    </div>

  {:else if stateError}
    <div class="error-state" role="alert">
      {#if errorContent}
        {@render errorContent(stateError)}
      {:else}
        <div class="default-error">
          <span class="error-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor" />
            </svg>
          </span>
          <div class="error-content">
            <p class="error-title">Computation Failed</p>
            <p class="error-message">{stateError.message}</p>
          </div>
        </div>
      {/if}
    </div>

  {:else if data !== null}
    <div class="success-state">
      {#if children}
        {@render children({ data, meta })}
      {:else}
        <!-- Default: render data as JSON for debugging -->
        <pre class="default-output">{JSON.stringify(data, null, 2)}</pre>
      {/if}

      {#if showMeta && executionTime !== null}
        <div class="meta-info">
          {#if metaContent}
            {@render metaContent(meta)}
          {:else}
            <span class="meta-text">
              Computed in {executionTime.toFixed(1)}ms using
              <span class="source-badge" class:wasm={usedWasm}>
                {usedWasm ? 'WASM' : 'JavaScript'}
              </span>
            </span>
          {/if}
        </div>
      {/if}
    </div>

  {:else}
    <div class="empty-state">
      {#if emptyContent}
        {@render emptyContent()}
      {:else}
        <p class="empty-text">No data computed yet.</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .wasm-computation {
    position: relative;
  }

  .loading-state {
    opacity: 0.7;
  }

  .default-loading {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .error-state {
    padding: 1rem;
    background-color: oklch(95% 0.03 25);
    border: 1px solid oklch(80% 0.12 25);
    border-radius: 0.5rem;
    color: oklch(40% 0.18 25);
  }

  .default-error {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .error-icon {
    flex-shrink: 0;
    margin-top: 0.125rem;
  }

  .error-content {
    flex: 1;
    min-width: 0;
  }

  .error-title {
    font-weight: 600;
    margin: 0 0 0.25rem 0;
  }

  .error-message {
    margin: 0;
    font-size: 0.875rem;
    opacity: 0.9;
  }

  .success-state {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .default-output {
    font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 0.75rem;
    line-height: 1.5;
    padding: 1rem;
    background-color: oklch(97% 0 0);
    border: 1px solid oklch(90% 0 0);
    border-radius: 0.375rem;
    overflow: auto;
    max-height: 20rem;
    margin: 0;
  }

  .meta-info {
    display: flex;
    justify-content: flex-end;
  }

  .meta-text {
    font-size: 0.75rem;
    color: oklch(50% 0 0);
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .source-badge {
    display: inline-flex;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    background-color: oklch(90% 0.03 85);
    color: oklch(35% 0.1 85);
  }

  .source-badge.wasm {
    background-color: oklch(90% 0.05 145);
    color: oklch(35% 0.15 145);
  }

  .empty-state {
    padding: 2rem;
    text-align: center;
  }

  .empty-text {
    margin: 0;
    color: oklch(50% 0 0);
    font-style: italic;
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    .error-state {
      background-color: oklch(25% 0.03 25);
      border-color: oklch(40% 0.12 25);
      color: oklch(85% 0.12 25);
    }

    .default-output {
      background-color: oklch(15% 0 0);
      border-color: oklch(25% 0 0);
      color: oklch(85% 0 0);
    }

    .meta-text {
      color: oklch(60% 0 0);
    }

    .source-badge {
      background-color: oklch(30% 0.03 85);
      color: oklch(80% 0.1 85);
    }

    .source-badge.wasm {
      background-color: oklch(30% 0.05 145);
      color: oklch(80% 0.15 145);
    }

    .empty-text {
      color: oklch(60% 0 0);
    }
  }
</style>
