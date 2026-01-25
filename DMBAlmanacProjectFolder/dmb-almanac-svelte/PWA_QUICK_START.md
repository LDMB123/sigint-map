# PWA Components - Quick Start Guide

Fast reference for using the migrated Svelte 5 PWA components in your app.

## Installation

Components are already created in `/src/lib/components/pwa/`. No installation needed.

## Import

```svelte
<script>
  import {
    InstallPrompt,
    UpdatePrompt,
    DownloadForOffline,
    LoadingScreen
  } from '$components/pwa';
</script>
```

## Basic Setup

### 1. Initialize PWA in Layout

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { onMount } from 'svelte';
  import {
    InstallPrompt,
    UpdatePrompt,
    LoadingScreen
  } from '$components/pwa';
  import { pwaStore } from '$stores/pwa';
  import { dataStore, dataState } from '$stores/data';

  onMount(() => {
    pwaStore.initialize();
    dataStore.initialize();
  });
</script>

{#if $dataState.status === 'loading'}
  <LoadingScreen progress={$dataState.progress} />
{:else if $dataState.status === 'error'}
  <div class="error">
    Failed to load data.
    <button onclick={() => dataStore.retry()}>Retry</button>
  </div>
{:else}
  <slot />
  <InstallPrompt minTimeOnSite={20000} />
  <UpdatePrompt />
{/if}
```

## Component Usage

### InstallPrompt

Show PWA install prompt after user engagement:

```svelte
<!-- Auto-show after scroll + 30s time -->
<InstallPrompt />

<!-- Custom timing: show after 15 seconds -->
<InstallPrompt minTimeOnSite={15000} />

<!-- Manual trigger (don't auto-show) -->
<InstallPrompt manualTrigger={true} />

<!-- No scroll requirement -->
<InstallPrompt requireScroll={false} />
```

**Props:**
- `minTimeOnSite` (number): Milliseconds before showing (default: 30000)
- `requireScroll` (boolean): Require user scroll before showing (default: true)
- `manualTrigger` (boolean): Manual control instead of auto (default: false)

---

### UpdatePrompt

Show notification when service worker update available:

```svelte
<!-- Just drop it in your layout -->
<UpdatePrompt />

<!-- That's it! It handles everything automatically -->
```

No props - fully automatic. Shows modal when update detected, reloads on confirmation.

---

### DownloadForOffline

Let users download content for offline access:

```svelte
<!-- Full component on tour page -->
<DownloadForOffline
  type="tour"
  identifier="summer-2024"
  label="Summer 2024 Tour"
/>

<!-- Compact button version on list items -->
<DownloadForOffline
  type="venue"
  identifier="red-rocks"
  label="Red Rocks"
  compact={true}
/>

<!-- With custom styling -->
<DownloadForOffline
  type="dateRange"
  identifier="2024-01-01_2024-12-31"
  label="Full Year 2024"
  className="custom-download-style"
/>
```

**Props:**
- `type` (required): `'tour'` | `'venue'` | `'dateRange'`
- `identifier` (required): Unique ID for this item
- `label` (required): Display name (e.g., "Summer 2024 Tour")
- `compact` (optional): Show compact button only (default: false)
- `className` (optional): Custom CSS class for styling

**States:**
- **Idle**: Shows storage info and download button
- **Downloading**: Progress bar with cancel button
- **Completed**: Shows cache size and delete option

---

### LoadingScreen

Show branded loading screen while initializing:

```svelte
{#if $dataState.status === 'loading'}
  <LoadingScreen progress={$dataState.progress} />
{/if}
```

**Props:**
- `progress` (required): LoadProgress object from dataStore

**Progress Object:**
```typescript
{
  phase: 'checking' | 'fetching' | 'loading' | 'complete' | 'error';
  entity?: string;    // "songs", "venues", etc.
  loaded: number;     // Records loaded
  total: number;      // Total records
  percentage: number; // 0-100
  error?: string;     // Error message if failed
}
```

---

## Example: Complete Tour Page

```svelte
<!-- src/routes/tours/[tourId]/+page.svelte -->
<script>
  import { DownloadForOffline } from '$components/pwa';

  export let data;
</script>

<div class="tour-container">
  <header class="tour-header">
    <h1>{data.tour.name}</h1>
    <div class="actions">
      <DownloadForOffline
        type="tour"
        identifier={data.tour.id}
        label={data.tour.name}
        compact={true}
      />
    </div>
  </header>

  <div class="tour-content">
    <!-- Tour shows, venues, stats -->
    {#each data.shows as show (show.id)}
      <div class="show-card">
        <h3>{show.date}</h3>
        <p>{show.venue}</p>
        <DownloadForOffline
          type="dateRange"
          identifier={show.id}
          label="{show.date} - {show.venue}"
          compact={true}
        />
      </div>
    {/each}
  </div>
</div>

<style>
  .tour-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .actions {
    display: flex;
    gap: 1rem;
  }

  .show-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    margin-bottom: 1rem;
  }
</style>
```

---

## Common Patterns

### Conditional Rendering Based on PWA Status

```svelte
<script>
  import { pwaState } from '$stores/pwa';
</script>

{#if $pwaState.isInstalled}
  <!-- Show installed-app-only features -->
  <div class="app-features">Offline mode enabled</div>
{:else}
  <!-- Show web-only features -->
  <div class="web-features">Some features unavailable offline</div>
{/if}

{#if $pwaState.isOffline}
  <div class="offline-indicator">Working offline</div>
{/if}
```

### Manual Install Trigger

```svelte
<script>
  import { InstallPrompt } from '$components/pwa';

  let showManualPrompt = false;
</script>

<button onclick={() => (showManualPrompt = true)}>
  Install App
</button>

{#if showManualPrompt}
  <InstallPrompt manualTrigger={true} />
{/if}
```

### Show Download Progress

```svelte
<script>
  // Download component automatically handles progress
  // But you can track it externally if needed
</script>

<DownloadForOffline
  type="venue"
  identifier="red-rocks"
  label="Red Rocks"
/>

<!-- The component shows:
  - Storage quota
  - Download progress (0-100%)
  - Cache count
  - File size
-->
```

---

## Styling Customization

### Override Component Styles

```svelte
<div class="custom-install">
  <InstallPrompt />
</div>

<style>
  :global(.custom-install dialog) {
    background-color: #1a1822;
    color: #fff;
    max-width: 300px;
  }

  :global(.custom-install .primary-button) {
    background-color: #f39c12;
    color: #030712;
  }
</style>
```

### CSS Custom Properties

Components use CSS custom properties for some values:

```svelte
<div class="custom-download">
  <DownloadForOffline
    type="tour"
    identifier="summer-2024"
    label="Summer 2024"
  />
</div>

<style>
  :global(.custom-download .progress-bar-fill) {
    /* --progress is updated by component */
    background: linear-gradient(90deg, #030712, #f39c12);
  }

  :global(.custom-download .storage-bar) {
    height: 8px; /* Make it taller */
  }
</style>
```

---

## Accessibility

All components follow WCAG 2.1 AA:

- **Keyboard navigation**: Full support
- **Screen readers**: Proper ARIA labels and live regions
- **Focus management**: Proper focus trapping in dialogs
- **Color contrast**: WCAG AA compliant
- **Reduced motion**: Respected with `prefers-reduced-motion`

### Testing Accessibility

```bash
# Lighthouse audit (includes PWA checks)
npm run build
npm run preview
# Open Chrome DevTools > Lighthouse

# Manual testing
# 1. Test with Tab key navigation
# 2. Test with screen reader (NVDA, JAWS, VoiceOver)
# 3. Test offline with DevTools Network tab
# 4. Test with reduced motion enabled
```

---

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 51+ | Full | Complete PWA support |
| Firefox 44+ | Full | Complete PWA support |
| Safari 11.1+ | Good | Service Workers work, limited PWA UI |
| iOS Safari 11.3+ | Limited | Service Workers work, minimal PWA UI |
| Edge 17+ | Full | Complete PWA support |

---

## Performance Tips

### Lazy Load Components

```svelte
<script>
  import { browser } from '$app/environment';
  let InstallPrompt;

  onMount(async () => {
    if (browser) {
      // Lazy load PWA component only on client
      const module = await import('$components/pwa');
      InstallPrompt = module.InstallPrompt;
    }
  });
</script>

{#if InstallPrompt}
  <svelte:component this={InstallPrompt} />
{/if}
```

### Conditional Component Loading

```svelte
{#if 'serviceWorker' in navigator}
  <!-- Only load if SW supported -->
  <UpdatePrompt />
{/if}

{#if 'caches' in window}
  <!-- Only load if Cache API available -->
  <DownloadForOffline type="tour" ... />
{/if}
```

---

## Debugging

### Check PWA Status

```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('SW registrations:', regs);
});

navigator.storage.estimate().then(est => {
  console.log('Storage:', {
    usage: est.usage,
    quota: est.quota,
    percent: (est.usage / est.quota * 100).toFixed(1) + '%'
  });
});
```

### Check Stores

```svelte
<!-- In a debug component -->
<script>
  import { pwaState } from '$stores/pwa';
  import { dataState } from '$stores/data';
</script>

<div class="debug">
  <h3>PWA State</h3>
  <pre>{JSON.stringify($pwaState, null, 2)}</pre>
  <h3>Data State</h3>
  <pre>{JSON.stringify($dataState, null, 2)}</pre>
</div>
```

### Service Worker Debugging

```javascript
// Monitor SW lifecycle
navigator.serviceWorker.ready.then(reg => {
  reg.addEventListener('updatefound', () => {
    console.log('Update found!');
    const newWorker = reg.installing;
    newWorker?.addEventListener('statechange', () => {
      console.log('New state:', newWorker.state);
    });
  });
});
```

---

## Troubleshooting

### InstallPrompt doesn't show
- [ ] App is served over HTTPS (or localhost)
- [ ] manifest.json is valid and linked
- [ ] App isn't already installed
- [ ] Service Worker is registered
- [ ] User hasn't dismissed it this session

**Debug:**
```javascript
// Check beforeinstallprompt
window.addEventListener('beforeinstallprompt', e => {
  console.log('beforeinstallprompt fired:', e);
  // If this doesn't log, PWA criteria not met
});
```

### UpdatePrompt doesn't trigger
- [ ] Service Worker has new version deployed
- [ ] Previous controller exists (not first install)
- [ ] `updateViaCache: 'none'` is set in registration options

**Debug:**
```javascript
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Current SW state:', reg?.active?.state);
  console.log('Installing SW:', reg?.installing?.state);
  console.log('Waiting SW:', reg?.waiting?.state);
});
```

### DownloadForOffline shows but doesn't work
- [ ] Cache API available
- [ ] Sufficient storage quota
- [ ] Network requests are successful

**Debug:**
```javascript
// Check storage
navigator.storage.estimate().then(console.log);

// Check caches
caches.keys().then(names => console.log('Caches:', names));

// Check specific cache
caches.open('offline-tour-summer-2024').then(cache => {
  cache.keys().then(console.log);
});
```

---

## File Locations

```
src/lib/components/pwa/
├── InstallPrompt.svelte       # Install prompt dialog
├── UpdatePrompt.svelte        # Update notification
├── DownloadForOffline.svelte  # Offline download manager
├── LoadingScreen.svelte       # Data loading screen
├── index.ts                   # Exports
└── README.md                  # Full documentation

src/lib/stores/
├── pwa.ts                     # PWA state & methods
└── data.ts                    # Data loading state
```

---

## Next Steps

1. **Add to layout**: Copy the layout example above to your `+layout.svelte`
2. **Test in browser**: Check DevTools > Application > Manifest & Service Workers
3. **Lighthouse audit**: Run Lighthouse in DevTools
4. **Mobile test**: Test on real device or use DevTools device emulation
5. **Test offline**: DevTools > Network > Offline
6. **Add custom styling**: Override component styles as needed

---

## More Help

- Full documentation: See [README.md](./README.md)
- Migration details: See [PWA_MIGRATION_GUIDE.md](./PWA_MIGRATION_GUIDE.md)
- Store documentation: See source files in `/src/lib/stores/`
- PWA Guide: https://web.dev/progressive-web-apps/
