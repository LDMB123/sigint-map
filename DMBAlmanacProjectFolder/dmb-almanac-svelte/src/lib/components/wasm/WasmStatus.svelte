<!--
  WasmStatus.svelte

  A Svelte 5 component that displays the current WASM module status.
  Shows loading state, ready state, errors, and performance metrics.

  Usage:
  <WasmStatus />
  <WasmStatus showMetrics />
  <WasmStatus compact />
-->
<script lang="ts">
  import { wasmLoadState, wasmStats } from '$lib/wasm';

  interface Props {
    /** Show performance metrics */
    showMetrics?: boolean;
    /** Compact display mode */
    compact?: boolean;
    /** Show only when there's an issue */
    errorOnly?: boolean;
  }

  let { showMetrics = false, compact = false, errorOnly = false }: Props = $props();

  // Derived state
  let status = $derived($wasmLoadState.status);
  let isLoading = $derived(status === 'loading');
  let isReady = $derived(status === 'ready');
  let isError = $derived(status === 'error');
  let fallbackActive = $derived(isError && ($wasmLoadState as { fallbackActive?: boolean }).fallbackActive);
  let loadTime = $derived(isReady ? ($wasmLoadState as { loadTime: number }).loadTime : null);
  let progress = $derived(isLoading ? ($wasmLoadState as { progress: number }).progress : 0);
  let errorMessage = $derived(isError ? ($wasmLoadState as { error: Error }).error.message : null);

  // Performance stats
  let stats = $derived($wasmStats);
  let wasmRatio = $derived(
    stats.totalCalls > 0
      ? ((stats.wasmCalls / stats.totalCalls) * 100).toFixed(1)
      : '0'
  );

  // Visibility logic
  let shouldShow = $derived(
    errorOnly
      ? (isError && !fallbackActive)
      : true
  );
</script>

{#if shouldShow}
  <div
    class="wasm-status"
    class:compact
    class:loading={isLoading}
    class:ready={isReady}
    class:error={isError && !fallbackActive}
    class:fallback={fallbackActive}
    role="status"
    aria-live="polite"
  >
    {#if isLoading}
      <div class="status-indicator">
        <span class="icon loading-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" opacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
            </path>
          </svg>
        </span>
        {#if !compact}
          <span class="status-text">Loading WASM module ({progress}%)</span>
        {:else}
          <span class="status-text">Loading...</span>
        {/if}
      </div>

    {:else if isReady}
      <div class="status-indicator">
        <span class="icon ready-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor" />
          </svg>
        </span>
        {#if !compact}
          <span class="status-text">WASM Ready {loadTime ? `(${loadTime.toFixed(0)}ms)` : ''}</span>
        {:else}
          <span class="status-text">Ready</span>
        {/if}
      </div>

    {:else if isError}
      <div class="status-indicator">
        {#if fallbackActive}
          <span class="icon warning-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor" />
            </svg>
          </span>
          {#if !compact}
            <span class="status-text">Using JavaScript fallback</span>
          {:else}
            <span class="status-text">Fallback</span>
          {/if}
        {:else}
          <span class="icon error-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor" />
            </svg>
          </span>
          {#if !compact}
            <span class="status-text" title={errorMessage}>WASM Error: {errorMessage}</span>
          {:else}
            <span class="status-text">Error</span>
          {/if}
        {/if}
      </div>
    {/if}

    {#if showMetrics && stats.totalCalls > 0}
      <div class="metrics">
        <span class="metric">
          <span class="metric-label">Calls:</span>
          <span class="metric-value">{stats.totalCalls}</span>
        </span>
        <span class="metric">
          <span class="metric-label">WASM:</span>
          <span class="metric-value">{wasmRatio}%</span>
        </span>
        <span class="metric">
          <span class="metric-label">Avg:</span>
          <span class="metric-value">{stats.averageExecutionTime.toFixed(1)}ms</span>
        </span>
      </div>
    {/if}
  </div>
{/if}

<style>
  .wasm-status {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    transition: background-color 0.2s, border-color 0.2s;
  }

  .wasm-status.compact {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    gap: 0.375rem;
  }

  .wasm-status.loading {
    background-color: oklch(95% 0.03 250);
    border: 1px solid oklch(80% 0.08 250);
    color: oklch(40% 0.15 250);
  }

  .wasm-status.ready {
    background-color: oklch(95% 0.03 145);
    border: 1px solid oklch(80% 0.08 145);
    color: oklch(40% 0.15 145);
  }

  .wasm-status.error {
    background-color: oklch(95% 0.03 25);
    border: 1px solid oklch(80% 0.12 25);
    color: oklch(40% 0.18 25);
  }

  .wasm-status.fallback {
    background-color: oklch(95% 0.03 85);
    border: 1px solid oklch(80% 0.1 85);
    color: oklch(40% 0.15 85);
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .compact .icon {
    width: 14px;
    height: 14px;
  }

  .compact .icon svg {
    width: 14px;
    height: 14px;
  }

  .status-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .metrics {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-left: auto;
    padding-left: 0.75rem;
    border-left: 1px solid currentColor;
    opacity: 0.7;
  }

  .compact .metrics {
    gap: 0.5rem;
    padding-left: 0.5rem;
  }

  .metric {
    display: flex;
    gap: 0.25rem;
  }

  .metric-label {
    opacity: 0.7;
  }

  .metric-value {
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    .wasm-status.loading {
      background-color: oklch(25% 0.03 250);
      border-color: oklch(40% 0.08 250);
      color: oklch(85% 0.08 250);
    }

    .wasm-status.ready {
      background-color: oklch(25% 0.03 145);
      border-color: oklch(40% 0.08 145);
      color: oklch(85% 0.08 145);
    }

    .wasm-status.error {
      background-color: oklch(25% 0.03 25);
      border-color: oklch(40% 0.12 25);
      color: oklch(85% 0.12 25);
    }

    .wasm-status.fallback {
      background-color: oklch(25% 0.03 85);
      border-color: oklch(40% 0.1 85);
      color: oklch(85% 0.1 85);
    }
  }
</style>
