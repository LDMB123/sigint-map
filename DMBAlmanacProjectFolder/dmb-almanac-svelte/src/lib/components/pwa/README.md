# PWA Components

Svelte 5 components for Progressive Web App functionality. These components integrate with the PWA and data stores for comprehensive offline support, installation prompts, and update notifications.

## Components

### InstallPrompt

A customizable install prompt banner that follows PWA UX best practices. Shows at an appropriate time based on user engagement (scroll, time on site).

**Props:**
```typescript
interface InstallPromptProps {
  minTimeOnSite?: number;    // Minimum time (ms) before showing prompt (default: 30000)
  requireScroll?: boolean;   // Show only after user scrolls (default: true)
  manualTrigger?: boolean;   // Custom trigger instead of automatic (default: false)
}
```

**Usage:**
```svelte
<script>
  import { InstallPrompt } from '$components/pwa';
</script>

<InstallPrompt minTimeOnSite={15000} requireScroll={true} />
```

**Features:**
- Captures `beforeinstallprompt` event automatically
- Tracks installation outcome with gtag analytics
- Respects user dismissal for the session
- Detects already-installed apps
- Fully accessible with ARIA labels
- Smooth animations

**Best Practices:**
- Don't prompt immediately on page load
- Wait for user engagement (scroll, click, time on site)
- Provide clear value proposition
- Allow dismissal without negative consequences
- Consider showing after user has explored key content

---

### UpdatePrompt

A notification dialog for when a service worker update is available. Prompts users to update to the latest version.

**Usage:**
```svelte
<script>
  import { UpdatePrompt } from '$components/pwa';
</script>

<UpdatePrompt />
```

**Features:**
- Automatically detects service worker updates
- Shows modal dialog with update options
- Reloads page after update confirmation
- Respects user dismissal
- Clean, minimal interface

**How it works:**
1. Listens for `updatefound` event on service worker registration
2. Monitors the new worker state
3. Shows prompt when new worker is installed and ready
4. Sends `SKIP_WAITING` message to activate immediately
5. Reloads page to load new assets

---

### DownloadForOffline

Component for downloading content to be accessible offline. Supports downloading tours, venues, or date ranges with progress tracking.

**Props:**
```typescript
interface DownloadForOfflineProps {
  type: 'tour' | 'venue' | 'dateRange';
  identifier: string;
  label: string;
  compact?: boolean;       // Show compact button only (default: false)
  className?: string;      // Custom CSS class
}
```

**Usage:**
```svelte
<script>
  import { DownloadForOffline } from '$components/pwa';
</script>

<!-- Full component -->
<DownloadForOffline
  type="tour"
  identifier="summer-2024"
  label="Summer 2024 Tour"
/>

<!-- Compact button version -->
<DownloadForOffline
  type="venue"
  identifier="red-rocks"
  label="Red Rocks"
  compact={true}
/>
```

**Features:**
- Three states: idle, downloading, completed
- Real-time progress tracking
- Storage quota monitoring
- Handles errors gracefully
- Compact button mode for inline use
- Accessibility with ARIA live regions
- Download cancellation support

**States:**
1. **Idle**: Shows storage information and download button
2. **Downloading**: Progress bar, cancel button, item count
3. **Completed**: Shows cached count, file size, delete option

**Storage Monitoring:**
- Checks available storage quota
- Warns when storage is low
- Shows percentage and bytes used
- Color changes when approaching limit

---

### LoadingScreen

A branded loading screen shown during initial IndexedDB data load. Features DMB-inspired design with progress indication.

**Props:**
```typescript
interface LoadingScreenProps {
  progress: LoadProgress;
}

interface LoadProgress {
  phase: 'idle' | 'checking' | 'fetching' | 'loading' | 'complete' | 'error';
  entity?: string;      // Current entity being loaded
  loaded: number;       // Records loaded so far
  total: number;        // Total records to load
  percentage: number;   // Progress percentage
  error?: string;       // Error message if failed
}
```

**Usage:**
```svelte
<script>
  import { LoadingScreen } from '$components/pwa';
  import { dataState } from '$stores/data';
</script>

{#if $dataState.status === 'loading'}
  <LoadingScreen progress={$dataState.progress} />
{/if}
```

**Features:**
- DMB brand aesthetic with fire dancer icon
- Real-time percentage display
- Current entity name display
- Animated progress circle and bar
- Animated dots indicator
- Accessible progress announcements
- 120Hz ProMotion-optimized animations
- Responsive design for all screen sizes

**Phases:**
- **checking**: Verifying if data exists in IndexedDB
- **fetching**: Downloading data from server
- **loading**: Importing data into database
- **complete**: Ready to use
- **error**: Failed to load data

**Accessibility:**
- Screen reader announcements every 10% progress
- Phase changes announced immediately
- Entity name updated in aria-live region
- Progress bar with ARIA attributes

---

## Integration with PWA Store

All components automatically integrate with the Svelte stores:

```typescript
import { pwaStore, pwaState } from '$stores/pwa';
import { dataStore, dataState } from '$stores/data';
```

**PWA Store State:**
```typescript
interface PWAState {
  isSupported: boolean;        // Browser supports PWA
  isReady: boolean;            // Service worker registered
  hasUpdate: boolean;          // Update available
  isInstalled: boolean;        // App is installed
  isOffline: boolean;          // No network connection
  registration: ServiceWorkerRegistration | null;
}
```

**Data Store State:**
```typescript
interface DataState {
  status: 'loading' | 'ready' | 'error';
  progress: LoadProgress;
}
```

---

## Usage Examples

### Complete App Layout

```svelte
<script>
  import { InstallPrompt, UpdatePrompt, LoadingScreen } from '$components/pwa';
  import { dataState } from '$stores/data';

  // Initialize PWA and data on app mount
  onMount(() => {
    pwaStore.initialize();
    dataStore.initialize();
  });
</script>

<!-- Show loading screen while data initializes -->
{#if $dataState.status === 'loading'}
  <LoadingScreen progress={$dataState.progress} />
{:else if $dataState.status === 'error'}
  <div class="error">Failed to load data. <button onclick={retry}>Retry</button></div>
{:else}
  <!-- Main app content -->
  <YourAppContent />

  <!-- PWA prompts -->
  <InstallPrompt minTimeOnSite={20000} />
  <UpdatePrompt />
{/if}
```

### Tour Page with Offline Download

```svelte
<script>
  import { DownloadForOffline } from '$components/pwa';

  export let tour = {
    id: 'summer-2024',
    name: 'Summer 2024 Tour'
  };
</script>

<div class="tour-header">
  <h1>{tour.name}</h1>
  <DownloadForOffline
    type="tour"
    identifier={tour.id}
    label={tour.name}
    compact={true}
  />
</div>

<div class="tour-content">
  <!-- Tour details -->
</div>
```

### Settings Page with Downloads List

```svelte
<script>
  import { DownloadForOffline } from '$components/pwa';

  let downloads = [
    { type: 'tour', id: 'summer-2024', label: 'Summer 2024 Tour' },
    { type: 'venue', id: 'red-rocks', label: 'Red Rocks Amphitheatre' }
  ];
</script>

<div class="downloads-section">
  <h2>Offline Downloads</h2>
  <div class="downloads-list">
    {#each downloads as download (download.id)}
      <DownloadForOffline
        type={download.type}
        identifier={download.id}
        label={download.label}
      />
    {/each}
  </div>
</div>
```

---

## Styling

All components use scoped styles with CSS custom properties for theming. Override styles by wrapping components with custom classes:

```svelte
<div class="custom-install-style">
  <InstallPrompt />
</div>

<style>
  :global(.custom-install-style dialog) {
    background-color: #1a1822;
    color: #fff;
  }
</style>
```

---

## Accessibility

All components follow WCAG 2.1 AA standards:

- **InstallPrompt**: Dialog with proper focus management, dismissible
- **UpdatePrompt**: Modal notification with clear action buttons
- **DownloadForOffline**: Progress bars with ARIA attributes, live regions for updates
- **LoadingScreen**: Screen reader announcements, progress tracking, proper heading structure

---

## Browser Support

- Chrome/Edge 51+ (Service Workers, Cache API)
- Firefox 44+ (Service Workers, Cache API)
- Safari 11.1+ (Service Workers, limited)
- iOS Safari 11.3+ (Limited PWA support)

### Feature Detection

Components automatically detect browser support and fail gracefully:

```typescript
if ('serviceWorker' in navigator) {
  // Safe to use UpdatePrompt
}

if ('caches' in window) {
  // Safe to use DownloadForOffline
}
```

---

## Performance

- **InstallPrompt**: Minimal overhead, ~2KB gzipped
- **UpdatePrompt**: ~1KB gzipped
- **DownloadForOffline**: ~4KB gzipped (with utilities)
- **LoadingScreen**: ~3KB gzipped

All components use Svelte 5 runes for optimal reactivity and bundle size.

---

## Troubleshooting

### InstallPrompt not showing
1. Ensure HTTPS (required for PWA)
2. Check `beforeinstallprompt` event listener
3. Verify manifest.json is valid
4. Check installation criteria met (icons, manifest, https, SW)
5. Check if app already installed

### UpdatePrompt not triggering
1. Verify service worker updates are enabled
2. Check that new worker successfully installed
3. Ensure previous controller exists (not first install)

### DownloadForOffline not working
1. Check Storage API availability
2. Verify Cache API support
3. Check quota with `navigator.storage.estimate()`
4. Ensure network requests are cacheable

### LoadingScreen stuck
1. Check data fetch endpoint
2. Verify IndexedDB is available
3. Check browser console for errors
4. Monitor network tab for failed requests

---

## Related Documentation

- [PWA Store](/src/lib/stores/pwa.ts)
- [Data Store](/src/lib/stores/data.ts)
- [Service Worker](/src/lib/sw/)
- [Dexie.js Database](/src/lib/db/dexie/)
