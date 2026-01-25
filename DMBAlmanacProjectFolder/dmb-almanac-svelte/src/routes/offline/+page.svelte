<script lang="ts">
  import { globalStats, dataFreshness } from '$lib/stores/dexie';
  // allShows, allSongs, allVenues available for detailed offline data

  // Track online status with Svelte 5 runes
  let _isOnline = $state(true);
  let showStats = $state(false);

  // Destructure stats from stores
  let _stats = $state<typeof $globalStats | undefined>();
  let freshness = $state<typeof $dataFreshness | undefined>();
  let showCount = $state(0);
  let songCount = $state(0);
  let venueCount = $state(0);

  // Subscribe to stores and update reactive state
  $effect(() => {
    const unsubscribe = globalStats.subscribe((value) => {
      _stats = value;
      if (value) {
        showCount = value.totalShows ?? 0;
        songCount = value.totalSongs ?? 0;
        venueCount = value.totalVenues ?? 0;
      }
    });
    return unsubscribe;
  });

  $effect(() => {
    const unsubscribe = dataFreshness.subscribe((value) => {
      freshness = value;
    });
    return unsubscribe;
  });

  // Monitor online status
  $effect(() => {
    const handleOnline = () => {
      _isOnline = true;
    };

    const handleOffline = () => {
      _isOnline = false;
    };

    if (typeof window !== 'undefined') {
      // Passive flag: These are information-only events, never prevent default
      window.addEventListener('online', handleOnline, { passive: true });
      window.addEventListener('offline', handleOffline, { passive: true });
      _isOnline = navigator.onLine;

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  });

  function handleRetry() {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  function formatDate(timestamp: number | null): string {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatTimeAgo(ms: number | null): string {
    if (!ms) return 'Never synced';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }

  function hasData(): boolean {
    return showCount > 0 || songCount > 0 || venueCount > 0;
  }
</script>

<svelte:head>
  <title>Offline | DMB Almanac</title>
</svelte:head>

<div class="container">
  <div class="content">
    <div class="icon">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="svg"
        aria-hidden="true"
      >
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
    </div>

    <h1 class="title">You are offline</h1>

    <p class="description">
      It looks like you have lost your internet connection. Some features of DMB Almanac may not
      be available until you reconnect.
    </p>

    <div class="actions">
      <button
        type="button"
        class="retry-button"
        onclick={handleRetry}
      >
        Try Again
      </button>
    </div>

    <!-- Cached Data Statistics Section -->
    {#if hasData()}
      <div class="stats-section">
        <button
          type="button"
          class="stats-toggle"
          onclick={() => (showStats = !showStats)}
          aria-expanded={showStats}
        >
          <span class="toggle-icon">{showStats ? '▼' : '▶'}</span>
          <span class="toggle-text">
            Cached Data Available
          </span>
          <span class="data-summary">
            {showCount} shows • {songCount} songs • {venueCount} venues
          </span>
        </button>

        {#if showStats}
          <div class="stats-content">
            <!-- Statistics Grid -->
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Shows</div>
                <div class="stat-value">{showCount.toLocaleString()}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Songs</div>
                <div class="stat-value">{songCount.toLocaleString()}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Venues</div>
                <div class="stat-value">{venueCount.toLocaleString()}</div>
              </div>
            </div>

            <!-- Data Freshness Info -->
            {#if freshness}
              <div class="freshness-info">
                <h3 class="freshness-title">Data Freshness</h3>
                <div class="freshness-details">
                  <div class="freshness-row">
                    <span class="freshness-label">Last Sync:</span>
                    <span class="freshness-value">
                      {#if freshness.lastSyncTime}
                        {formatDate(freshness.lastSyncTime)}
                        <span class="freshness-ago">({formatTimeAgo(freshness.timeSinceSync)})</span>
                      {:else}
                        Never synced
                      {/if}
                    </span>
                  </div>
                  {#if freshness.isSyncStale}
                    <div class="stale-warning">
                      <svg class="warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 20h20L12 2Z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      Data is older than 24 hours
                    </div>
                  {/if}
                </div>
              </div>
            {/if}

            <!-- Browse Links -->
            <div class="browse-section">
              <h3 class="browse-title">Browse Cached Data</h3>
              <div class="browse-links">
                {#if showCount > 0}
                  <a href="/shows" class="browse-link">
                    <span class="link-icon">📅</span>
                    <span class="link-text">Browse Shows</span>
                    <span class="link-count">{showCount}</span>
                  </a>
                {/if}
                {#if songCount > 0}
                  <a href="/songs" class="browse-link">
                    <span class="link-icon">🎵</span>
                    <span class="link-text">Browse Songs</span>
                    <span class="link-count">{songCount}</span>
                  </a>
                {/if}
                {#if venueCount > 0}
                  <a href="/venues" class="browse-link">
                    <span class="link-icon">📍</span>
                    <span class="link-text">Browse Venues</span>
                    <span class="link-count">{venueCount}</span>
                  </a>
                {/if}
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <div class="tips">
      <h2 class="tips-title">While offline, you can:</h2>
      <ul class="tips-list">
        <li>View previously visited pages</li>
        <li>Browse cached song and venue data</li>
        <li>Check recently viewed setlists</li>
      </ul>
    </div>
  </div>
</div>

<style>
  .container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    padding: var(--space-6);
  }

  .content {
    max-width: 480px;
    text-align: center;
  }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    border-radius: var(--radius-full);
    background-color: var(--background-secondary);
    margin-bottom: var(--space-6);
  }

  .svg {
    width: 40px;
    height: 40px;
    color: var(--color-primary-500);
  }

  .title {
    font-size: var(--text-3xl);
    font-weight: var(--font-bold);
    color: var(--foreground);
    margin-bottom: var(--space-4);
  }

  .description {
    font-size: var(--text-lg);
    color: var(--foreground-secondary);
    line-height: var(--leading-relaxed);
    margin-bottom: var(--space-8);
  }

  .actions {
    margin-bottom: var(--space-8);
  }

  .retry-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-3) var(--space-6);
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    color: var(--color-gray-950);
    background-color: var(--color-primary-500);
    border: none;
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: background-color var(--transition-fast);
  }

  .retry-button:hover {
    background-color: var(--color-primary-600);
  }

  .retry-button:active {
    background-color: var(--color-primary-700);
  }

  /* Stats Section Styles */
  .stats-section {
    margin-bottom: var(--space-8);
  }

  .stats-toggle {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: var(--space-3);
    width: 100%;
    padding: var(--space-4) var(--space-5);
    background-color: var(--background-secondary);
    border: 1px solid var(--border-color, var(--background-tertiary));
    border-radius: var(--radius-lg);
    cursor: pointer;
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    color: var(--foreground);
    transition: background-color var(--transition-fast), border-color var(--transition-fast);
  }

  .stats-toggle:hover {
    background-color: var(--background-tertiary);
  }

  .toggle-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-xs);
    color: var(--foreground-secondary);
    min-width: 12px;
  }

  .toggle-text {
    flex: 1;
    text-align: left;
  }

  .data-summary {
    font-size: var(--text-sm);
    font-weight: var(--font-normal);
    color: var(--foreground-secondary);
    white-space: nowrap;
  }

  .stats-content {
    padding: var(--space-5);
    background-color: var(--background-secondary);
    border: 1px solid var(--border-color, var(--background-tertiary));
    border-top: none;
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    animation: slideDown 200ms ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
    margin-bottom: var(--space-5);
  }

  .stat-card {
    padding: var(--space-4);
    background-color: var(--background);
    border: 1px solid var(--border-color, var(--background-tertiary));
    border-radius: var(--radius-lg);
    text-align: center;
  }

  .stat-label {
    font-size: var(--text-xs);
    font-weight: var(--font-semibold);
    color: var(--foreground-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-2);
  }

  .stat-value {
    font-size: var(--text-2xl);
    font-weight: var(--font-bold);
    color: var(--color-primary-500);
  }

  .freshness-info {
    margin-bottom: var(--space-5);
    padding: var(--space-4);
    background-color: var(--background);
    border-radius: var(--radius-lg);
    text-align: left;
  }

  .freshness-title {
    font-size: var(--text-sm);
    font-weight: var(--font-semibold);
    color: var(--foreground);
    margin-bottom: var(--space-3);
  }

  .freshness-details {
    font-size: var(--text-sm);
  }

  .freshness-row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .freshness-label {
    font-weight: var(--font-semibold);
    color: var(--foreground-secondary);
  }

  .freshness-value {
    color: var(--foreground);
  }

  .freshness-ago {
    display: block;
    font-size: var(--text-xs);
    color: var(--foreground-secondary);
    margin-top: 2px;
  }

  .stale-warning {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-3);
    padding: var(--space-3);
    background-color: oklch(from var(--color-warning, #fbbf24) l c h / 0.1);
    border-left: 3px solid var(--color-warning, #fbbf24);
    border-radius: var(--radius-md);
    font-size: var(--text-xs);
    color: var(--foreground);
  }

  .warning-icon {
    width: 16px;
    height: 16px;
    color: var(--color-warning, #fbbf24);
    flex-shrink: 0;
  }

  .browse-section {
    text-align: left;
  }

  .browse-title {
    font-size: var(--text-sm);
    font-weight: var(--font-semibold);
    color: var(--foreground);
    margin-bottom: var(--space-3);
  }

  .browse-links {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .browse-link {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background-color: var(--background);
    border: 1px solid var(--border-color, var(--background-tertiary));
    border-radius: var(--radius-lg);
    text-decoration: none;
    color: var(--foreground);
    transition: background-color var(--transition-fast), border-color var(--transition-fast);
  }

  .browse-link:hover {
    background-color: var(--background-secondary);
    border-color: var(--color-primary-500);
  }

  .link-icon {
    font-size: var(--text-lg);
  }

  .link-text {
    flex: 1;
    font-weight: var(--font-semibold);
    font-size: var(--text-base);
  }

  .link-count {
    font-size: var(--text-sm);
    color: var(--foreground-secondary);
    background-color: var(--background-secondary);
    padding: 2px 8px;
    border-radius: var(--radius-md);
  }

  .tips {
    padding: var(--space-6);
    background-color: var(--background-secondary);
    border-radius: var(--radius-xl);
    text-align: left;
  }

  .tips-title {
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    color: var(--foreground);
    margin-bottom: var(--space-3);
  }

  .tips-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .tips-list li {
    position: relative;
    padding-left: var(--space-6);
    margin-bottom: var(--space-2);
    font-size: var(--text-sm);
    color: var(--foreground-secondary);
  }

  .tips-list li::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0.5em;
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    background-color: var(--color-primary-500);
  }

  .tips-list li:last-child {
    margin-bottom: 0;
  }
</style>
