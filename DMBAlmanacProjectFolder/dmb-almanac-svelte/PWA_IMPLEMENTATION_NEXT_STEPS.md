# PWA Implementation Next Steps

## Priority 1: iOS Installation Guide (High Priority)

### Location: `src/lib/components/pwa/IOSInstallGuide.svelte` (NEW)

```svelte
<script>
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  let isIOSSafari = false;
  let isStandalone = false;

  onMount(() => {
    if (!browser) return;
    
    // Detect iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isStandaloneMode = (window.navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    
    isIOSSafari = isIOS && isSafari;
    isStandalone = isStandaloneMode;
  });
</script>

{#if isIOSSafari && !isStandalone}
  <div class="ios-install-guide" role="region" aria-label="Installation instructions for iOS">
    <h3>Add DMB Almanac to Home Screen</h3>
    <ol>
      <li>Tap the <strong>Share</strong> button at bottom of Safari</li>
      <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
      <li>Confirm the name and tap <strong>Add</strong></li>
      <li>App will appear on your home screen</li>
    </ol>
    <p class="note">Note: iOS version 16.4+ supports push notifications and background sync</p>
  </div>
{/if}

<style>
  .ios-install-guide {
    padding: 16px;
    background: var(--background-secondary);
    border-radius: var(--radius-lg);
    border-left: 4px solid var(--color-primary-500);
  }
  
  h3 {
    margin-top: 0;
    color: var(--color-primary-500);
  }
  
  ol {
    margin: 12px 0;
    padding-left: 20px;
  }
  
  li {
    margin-bottom: 8px;
    line-height: 1.6;
  }
  
  .note {
    margin-top: 12px;
    font-size: var(--text-sm);
    color: var(--foreground-secondary);
    font-style: italic;
  }
</style>
```

### Integration: Update `src/lib/components/navigation/Header.svelte`

```svelte
<script>
  import IOSInstallGuide from '$lib/components/pwa/IOSInstallGuide.svelte';
  // ... existing imports
</script>

<header>
  <!-- ... existing header content ... -->
  <IOSInstallGuide />
</header>
```

---

## Priority 2: Cache Expiration Indicator (High Priority)

### Location: Enhance `src/lib/components/pwa/DataFreshnessIndicator.svelte`

```svelte
<script>
  import { dataStore, dataState } from '$stores/data';
  import { derived } from 'svelte/store';

  // Calculate if cache is stale (older than 15 minutes)
  const isCacheStale = derived(dataState, ($state) => {
    if (!$state.lastCacheTime) return false;
    const age = Date.now() - $state.lastCacheTime;
    return age > 15 * 60 * 1000; // 15 minutes
  });

  const formattedTime = derived(dataState, ($state) => {
    if (!$state.lastCacheTime) return 'Unknown';
    const date = new Date($state.lastCacheTime);
    return date.toLocaleTimeString();
  });
</script>

<div class="freshness-indicator">
  {#if $isCacheStale}
    <div class="stale-warning" role="alert">
      <span class="icon">⚠️</span>
      <div>
        <p>Cached content (updated {$formattedTime})</p>
        <p class="hint">Go online to refresh with latest data</p>
      </div>
      <button onclick={() => dataStore.refresh()}>
        Refresh Now
      </button>
    </div>
  {/if}
</div>

<style>
  .freshness-indicator {
    position: fixed;
    top: 60px;
    right: 16px;
    z-index: 1000;
  }

  .stale-warning {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--color-warning-500);
    color: white;
    border-radius: var(--radius-md);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  p {
    margin: 0;
    font-size: var(--text-sm);
  }

  .hint {
    opacity: 0.9;
    font-size: var(--text-xs);
  }

  button {
    padding: 6px 12px;
    background: white;
    color: var(--color-warning-500);
    border: none;
    border-radius: var(--radius-md);
    font-weight: var(--font-medium);
    cursor: pointer;
    flex-shrink: 0;
  }

  button:hover {
    background: rgba(255, 255, 255, 0.9);
  }

  @media (max-width: 640px) {
    .freshness-indicator {
      top: auto;
      bottom: 80px;
      left: 16px;
      right: 16px;
    }

    .stale-warning {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
```

---

## Priority 3: Enhanced Update Notification UX (Medium Priority)

### Location: Create `src/lib/components/pwa/UpdateBanner.svelte`

```svelte
<script>
  import { pwaStore, pwaState } from '$stores/pwa';
  import { onMount } from 'svelte';

  let changelogVisible = false;
  let snoozeTime = null;

  const changelog = [
    { version: '0.2.0', changes: ['Improved offline caching', 'Enhanced search'] },
    { version: '0.1.0', changes: ['Initial PWA release'] }
  ];

  async function handleUpdate() {
    pwaStore.updateServiceWorker();
  }

  function handleSnooze() {
    snoozeTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hour snooze
    sessionStorage.setItem('pwa-update-snooze', String(snoozeTime));
  }

  onMount(() => {
    const snoozed = sessionStorage.getItem('pwa-update-snooze');
    if (snoozed && Date.now() < parseInt(snoozed)) {
      snoozeTime = parseInt(snoozed);
    }
  });
</script>

{#if $pwaState.hasUpdate && !snoozeTime}
  <div class="update-banner" role="alert">
    <div class="banner-content">
      <div class="message">
        <h3>Update Available</h3>
        <p>A new version of DMB Almanac is ready to install</p>
        {#if changelogVisible}
          <details>
            <summary>What's New</summary>
            <ul>
              {#each changelog[0].changes as change}
                <li>{change}</li>
              {/each}
            </ul>
          </details>
        {/if}
      </div>
      <div class="actions">
        <button class="primary" onclick={handleUpdate}>
          Update Now
        </button>
        <button class="secondary" onclick={handleSnooze}>
          Later
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .update-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    padding: 16px;
    background: linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700));
    color: white;
    z-index: 9999;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .banner-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .message {
    flex: 1;
  }

  .message h3 {
    margin: 0 0 4px 0;
    font-size: var(--text-lg);
  }

  .message p {
    margin: 0;
    opacity: 0.95;
    font-size: var(--text-sm);
  }

  details {
    margin-top: 8px;
  }

  details summary {
    cursor: pointer;
    opacity: 0.9;
    font-size: var(--text-sm);
  }

  details ul {
    margin: 8px 0 0 16px;
    padding-left: 16px;
    font-size: var(--text-sm);
  }

  details li {
    opacity: 0.9;
  }

  .actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  button {
    padding: 8px 16px;
    border: none;
    border-radius: var(--radius-md);
    font-weight: var(--font-medium);
    cursor: pointer;
    font-size: var(--text-sm);
  }

  .primary {
    background: white;
    color: var(--color-primary-600);
  }

  .primary:hover {
    background: rgba(255, 255, 255, 0.9);
  }

  .secondary {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .secondary:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  @media (max-width: 640px) {
    .banner-content {
      flex-direction: column;
      align-items: stretch;
    }

    .actions {
      width: 100%;
    }

    button {
      flex: 1;
    }
  }
</style>
```

---

## Priority 4: Storage Quota Monitoring (Medium Priority)

### Location: Enhance `src/lib/components/pwa/StorageQuotaMonitor.svelte`

```svelte
<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { browser } from '$app/environment';

  let storageStatus = writable({
    usage: 0,
    quota: 0,
    percentage: 0,
    showWarning: false
  });

  onMount(async () => {
    if (!browser || !navigator.storage?.estimate) return;

    // Check storage quota periodically
    const checkQuota = async () => {
      try {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 1;
        const percentage = (usage / quota) * 100;

        storageStatus.set({
          usage,
          quota,
          percentage,
          showWarning: percentage > 80
        });
      } catch (error) {
        console.warn('[StorageQuota] Failed to estimate:', error);
      }
    };

    // Initial check
    await checkQuota();

    // Check every 5 minutes
    const interval = setInterval(checkQuota, 5 * 60 * 1000);

    return () => clearInterval(interval);
  });

  function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)}${units[unitIndex]}`;
  }
</script>

<div class="storage-monitor">
  {#if $storageStatus.showWarning}
    <div class="warning" role="alert">
      <span class="icon">⚠️</span>
      <div class="content">
        <p class="title">Storage Almost Full</p>
        <p class="usage">
          Using {formatBytes($storageStatus.usage)} of {formatBytes($storageStatus.quota)}
          ({$storageStatus.percentage.toFixed(0)}%)
        </p>
        <div class="progress-bar">
          <div class="progress" style="width: {$storageStatus.percentage}%"></div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .storage-monitor {
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 999;
    max-width: 300px;
  }

  .warning {
    display: flex;
    gap: 12px;
    padding: 12px 16px;
    background: var(--color-warning-500);
    color: white;
    border-radius: var(--radius-md);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .content {
    flex: 1;
  }

  .title {
    margin: 0 0 4px 0;
    font-weight: var(--font-medium);
    font-size: var(--text-sm);
  }

  .usage {
    margin: 0 0 8px 0;
    font-size: var(--text-xs);
    opacity: 0.9;
  }

  .progress-bar {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress {
    height: 100%;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  @media (max-width: 640px) {
    .storage-monitor {
      left: 16px;
      right: 16px;
      max-width: none;
    }
  }
</style>
```

---

## Integration Points

### Update `src/routes/+layout.svelte`

Replace the old update banner (Lines 245-250) with:

```svelte
<script>
  import UpdateBanner from '$lib/components/pwa/UpdateBanner.svelte';
  // ... existing imports
</script>

<!-- Add to component section -->
<UpdateBanner />
```

---

## Testing These Implementations

### Manual Tests:

1. **iOS Guide**:
   - Open on iPhone Safari
   - Verify guide appears
   - Follow instructions to install
   - Verify offline access

2. **Cache Expiration**:
   - Go online to load fresh data
   - Simulate offline after 15+ minutes
   - Verify stale warning appears
   - Click "Refresh" when online

3. **Update Banner**:
   - Deploy new SW version
   - Verify banner appears
   - Click "Update Now"
   - Verify page reloads with new version
   - Click "Later"
   - Verify snooze works (24 hours)

4. **Storage Monitor**:
   - Fill cache until 80% quota
   - Verify warning appears
   - Check quota calculation
   - Verify updates every 5 minutes

---

## Performance Considerations

### Priority 1 Items (High Impact):
- iOS Guide: Zero performance impact, pure UX
- Cache Expiration: Minimal (simple date comparison)
- Stale indication: Very lightweight

### Recommended Lazy Loading:
- UpdateBanner: Load on first SW registration
- StorageQuotaMonitor: Load on mount
- IOSInstallGuide: Load always (small component)

---

## Accessibility Requirements

All new components include:
- ARIA labels and roles
- Semantic HTML (button, details)
- Color contrast compliance
- Keyboard navigation
- Screen reader support

---

## Next Implementation Phases

### Phase 2 (After Priority 1-3):
- Push notification permission flow
- User notification preferences
- Background sync status indicator
- File import handler UI

### Phase 3 (Polish):
- Dynamic speculation rules
- Cache analytics dashboard
- Usage statistics
- Performance monitoring

---

## References

- Service Worker: `/static/sw.js` (1776 lines)
- PWA Store: `/src/lib/stores/pwa.ts` (227 lines)
- Install Manager: `/src/lib/pwa/install-manager.ts` (367 lines)
- Existing Components: `/src/lib/components/pwa/`

