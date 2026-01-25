# DataStalenessIndicator Component

A Svelte 5 component that displays data freshness status and provides a manual sync trigger for offline-first PWAs.

## Features

- **Real-time staleness tracking**: Shows when data was last synced
- **24-hour staleness threshold**: Displays warning badge if data is older than 24 hours
- **Manual refresh trigger**: Provides a "Refresh Now" button to trigger sync
- **Multiple display variants**: Badge, compact, and full layouts
- **Live updates**: Time updates every minute for accurate display
- **Reactive to sync status**: Shows syncing state in real-time

## Usage

### Basic Usage (Full Variant)

```svelte
<script>
  import { DataStalenessIndicator } from '$lib/components/pwa';

  async function handleRefresh() {
    // Trigger your sync logic here
    await syncDataFromServer();
  }
</script>

<DataStalenessIndicator onRefresh={handleRefresh} />
```

### Compact Variant

```svelte
<DataStalenessIndicator variant="compact" onRefresh={handleRefresh} />
```

### Badge Variant

```svelte
<DataStalenessIndicator variant="badge" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'full' \| 'compact' \| 'badge'` | `'full'` | Display variant |
| `class` | `string` | `''` | Additional CSS classes |
| `onRefresh` | `() => void \| Promise<void>` | `undefined` | Callback when refresh button is clicked |

## Variants

### Full Variant

The full variant displays:
- Status icon and text
- Last synced timestamp
- Time elapsed since last sync
- Number of cached shows (if available)
- Refresh button
- Warning box if data is stale (>24 hours)

### Compact Variant

The compact variant displays:
- Status icon
- Time elapsed text
- Refresh icon button

### Badge Variant

The badge variant displays:
- Status icon
- Status text ("Up to date", "Data may be outdated", or "Syncing...")
- Color-coded background (green, amber, or blue)

## Integration with Dexie

The component automatically reads sync metadata from the Dexie database:

```typescript
// In your sync logic, update the syncMeta table:
await db.updateSyncMeta({
  lastFullSync: Date.now(),
  syncStatus: 'idle'
});
```

## Data Freshness Store

The component uses the `dataFreshness` store from `$lib/stores/dexie.ts`:

```typescript
export const dataFreshness = createLiveQueryStore<DataFreshnessStatus>(async () => {
  const db = await getDb();
  const syncMeta = await db.getSyncMeta();

  // Returns:
  // - lastSyncTime: number | null
  // - isSyncStale: boolean (>24 hours)
  // - timeSinceSync: number | null
  // - syncStatus: 'idle' | 'syncing' | 'error'
  // - lastError: string | null
});
```

## Styling

The component uses CSS custom properties for theming:

- `--color-green-*`: Success states
- `--color-amber-*`: Warning states
- `--color-blue-*`: Syncing states
- `--color-primary-*`: Action buttons
- Dark mode support via `@media (prefers-color-scheme: dark)`

## Accessibility

- Proper ARIA labels on interactive elements
- Color-blind friendly status indicators (icons + text)
- Screen reader announcements for progress updates
- Keyboard navigation support

## Performance

- Updates time every 60 seconds (not every second)
- Uses Svelte 5 runes for optimal reactivity
- Minimal re-renders with derived values
- GPU-accelerated spinner animations
- Respects `prefers-reduced-motion`

## Example Implementation

```svelte
<!-- In your layout or navigation -->
<script>
  import { DataStalenessIndicator } from '$lib/components/pwa';
  import { syncAllData } from '$lib/db/dexie/sync';

  async function handleDataRefresh() {
    try {
      await syncAllData();
      // Show success toast
    } catch (error) {
      // Show error toast
      console.error('Sync failed:', error);
    }
  }
</script>

<nav>
  <div class="nav-header">
    <h1>DMB Almanac</h1>
    <DataStalenessIndicator
      variant="compact"
      onRefresh={handleDataRefresh}
      class="nav-sync-status"
    />
  </div>
</nav>
```

## Related

- `DownloadForOffline` - Download specific content for offline access
- `UpdatePrompt` - Notify users of PWA updates
- `dataFreshness` store - Reactive data freshness state
