# PWA Components Usage Examples

This document provides practical examples for using the DMB Almanac PWA components.

## DataStalenessIndicator

### 1. In a Header/Navigation Bar (Compact Variant)

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { DataStalenessIndicator } from '$lib/components/pwa';
  import { syncAllData } from '$lib/db/dexie/sync';
  import { toast } from '$lib/stores/toast';

  async function handleSync() {
    try {
      await syncAllData();
      toast.success('Data synced successfully');
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Failed to sync data');
    }
  }
</script>

<header class="app-header">
  <nav>
    <a href="/">DMB Almanac</a>
    <div class="nav-actions">
      <DataStalenessIndicator
        variant="compact"
        onRefresh={handleSync}
        class="sync-indicator"
      />
    </div>
  </nav>
</header>

<style>
  .app-header {
    display: flex;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
</style>
```

### 2. In Settings Page (Full Variant)

```svelte
<!-- src/routes/settings/+page.svelte -->
<script lang="ts">
  import { DataStalenessIndicator } from '$lib/components/pwa';
  import { fullDataSync } from '$lib/db/dexie/sync';

  let isSyncing = $state(false);

  async function handleFullSync() {
    if (isSyncing) return;

    isSyncing = true;
    try {
      await fullDataSync();
      console.log('Full sync completed');
    } catch (error) {
      console.error('Full sync failed:', error);
    } finally {
      isSyncing = false;
    }
  }
</script>

<div class="settings-page">
  <h1>Settings</h1>

  <section class="settings-section">
    <h2>Data Sync</h2>
    <DataStalenessIndicator
      variant="full"
      onRefresh={handleFullSync}
      class="sync-status"
    />
  </section>

  <!-- Other settings sections -->
</div>

<style>
  .settings-section {
    margin-bottom: 2rem;
    padding: 1rem;
    background: var(--background-secondary);
    border-radius: 0.5rem;
  }

  .sync-status {
    margin-top: 1rem;
  }
</style>
```

### 3. As a Badge in List Items

```svelte
<!-- src/routes/shows/+page.svelte -->
<script lang="ts">
  import { DataStalenessIndicator } from '$lib/components/pwa';
  import { dataFreshness } from '$lib/stores/dexie';

  const freshness = $derived($dataFreshness);
</script>

<div class="shows-header">
  <h1>Shows</h1>
  {#if freshness.isSyncStale}
    <DataStalenessIndicator variant="badge" />
  {/if}
</div>

<style>
  .shows-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
</style>
```

### 4. Conditional Display Based on Offline Status

```svelte
<script lang="ts">
  import { DataStalenessIndicator } from '$lib/components/pwa';
  import { online } from '$lib/stores/network';

  async function handleSync() {
    if (!$online) {
      alert('Cannot sync while offline');
      return;
    }
    // Sync logic
  }
</script>

{#if !$online}
  <div class="offline-banner">
    <span>You are offline</span>
    <DataStalenessIndicator variant="badge" />
  </div>
{:else}
  <DataStalenessIndicator
    variant="compact"
    onRefresh={handleSync}
  />
{/if}
```

### 5. With Custom Styling

```svelte
<script lang="ts">
  import { DataStalenessIndicator } from '$lib/components/pwa';
</script>

<DataStalenessIndicator
  variant="compact"
  onRefresh={handleSync}
  class="custom-staleness"
/>

<style>
  :global(.custom-staleness) {
    padding: 0.5rem 1rem;
    background: var(--background-tertiary);
    border-radius: 9999px;
  }
</style>
```

## Using the dataFreshness Store Directly

If you need more control, you can use the `dataFreshness` store directly:

```svelte
<script lang="ts">
  import { dataFreshness } from '$lib/stores/dexie';

  const freshness = $derived($dataFreshness);
  const timeSinceSync = $derived.by(() => {
    if (!freshness.timeSinceSync) return 'Never';

    const hours = Math.floor(freshness.timeSinceSync / (1000 * 60 * 60));
    return `${hours} hours ago`;
  });
</script>

<div class="custom-indicator">
  {#if freshness.isSyncStale}
    <span class="warning">⚠️ Data is {timeSinceSync}</span>
  {:else}
    <span class="ok">✓ Up to date</span>
  {/if}

  {#if freshness.syncStatus === 'syncing'}
    <span class="syncing">Syncing...</span>
  {/if}
</div>
```

## Integration with Other PWA Components

### Combined with DownloadForOffline

```svelte
<script lang="ts">
  import { DataStalenessIndicator, DownloadForOffline } from '$lib/components/pwa';
</script>

<div class="pwa-controls">
  <DataStalenessIndicator
    variant="compact"
    onRefresh={handleSync}
  />

  <DownloadForOffline
    type="tour"
    identifier="2024"
    label="2024 Tour"
    compact
  />
</div>

<style>
  .pwa-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
</style>
```

### With Loading States

```svelte
<script lang="ts">
  import { DataStalenessIndicator } from '$lib/components/pwa';
  import { LoadingScreen } from '$lib/components/pwa';

  let isInitialLoad = $state(true);
  let syncMeta = $state(null);

  onMount(async () => {
    const db = await getDb();
    syncMeta = await db.getSyncMeta();
    isInitialLoad = false;
  });
</script>

{#if isInitialLoad}
  <LoadingScreen />
{:else}
  <DataStalenessIndicator onRefresh={handleSync} />
{/if}
```

## Best Practices

1. **Place compact variant in persistent UI** (navigation, header)
2. **Use full variant in settings/about pages** for detailed information
3. **Show badge variant conditionally** when data is stale
4. **Handle sync errors gracefully** with toast notifications
5. **Disable refresh during sync** to prevent concurrent operations
6. **Test offline behavior** to ensure proper UX
7. **Consider network status** before triggering sync
8. **Update syncMeta after successful sync** to keep indicator accurate

## Accessibility Considerations

- All variants include proper ARIA labels
- Spinner animations respect `prefers-reduced-motion`
- Status changes are announced to screen readers
- Keyboard navigation is fully supported
- Color is not the only indicator (icons + text)
