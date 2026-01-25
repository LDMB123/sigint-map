# PWA Components Architecture

Visual architecture and design patterns for the Svelte 5 PWA components.

## Component Hierarchy

```
App Layout (+layout.svelte)
├── PWA Store (pwaStore)
├── Data Store (dataStore)
│
├── LoadingScreen
│   └── Displays during dataState.status === 'loading'
│
├── InstallPrompt
│   ├── Captures: beforeinstallprompt event
│   ├── Uses: PWA Store (isInstalled, isSupported)
│   └── Manages: Dialog state, scroll tracking, timers
│
├── UpdatePrompt
│   ├── Monitors: SW registration.updatefound event
│   ├── Uses: PWA Store (hasUpdate)
│   └── Manages: Dialog state, update activation
│
└── DownloadForOffline (multiple instances)
    ├── Type: tour | venue | dateRange
    ├── Uses: Cache API, Storage API
    └── Manages: Download progress, storage quota
```

---

## Data Flow Diagram

### Initialization Flow

```
App Mount
    │
    ├─→ pwaStore.initialize()
    │   ├─→ Check if app installed
    │   ├─→ Register Service Worker
    │   ├─→ Setup online/offline listeners
    │   ├─→ Listen for SW updates
    │   └─→ Set pwaState (isReady, etc.)
    │
    └─→ dataStore.initialize()
        ├─→ Check if data exists in IndexedDB
        ├─→ Fetch data from API
        ├─→ Load into IndexedDB
        └─→ Update dataState.progress
```

### InstallPrompt Flow

```
Browser loads app
    │
    └─→ beforeinstallprompt event fires
        │
        └─→ InstallPrompt captures & stores event
            │
            ├─→ User scrolls page
            │   └─→ Set hasScrolled = true
            │
            └─→ minTimeOnSite timer elapses
                │
                ├─→ Conditions met:
                │   ├─ canInstall = true
                │   ├─ !isInstalled
                │   ├─ !isDismissed
                │   └─ hasScrolled = true
                │
                └─→ Show dialog (shouldShow = true)
                    │
                    ├─→ User clicks "Install"
                    │   ├─→ Call deferredPrompt.prompt()
                    │   ├─→ Wait for userChoice
                    │   ├─→ If accepted: Hide dialog
                    │   └─→ Track with gtag
                    │
                    └─→ User clicks "Not now" or close
                        ├─→ Set isDismissed = true
                        ├─→ Save to sessionStorage
                        └─→ Hide dialog
```

### UpdatePrompt Flow

```
Service Worker Update Available
    │
    └─→ registration.updatefound event fires
        │
        └─→ New worker enters 'installing' state
            │
            └─→ New worker state changes to 'installed'
                │
                └─→ If (controller exists)
                    │
                    └─→ Set updateAvailable = true
                        │
                        └─→ Show modal dialog
                            │
                            ├─→ User clicks "Update Now"
                            │   ├─→ Post SKIP_WAITING message
                            │   ├─→ New worker activates
                            │   ├─→ Page reloads
                            │   └─→ New version loads
                            │
                            └─→ User clicks "Later"
                                ├─→ Hide dialog
                                └─→ Keep using old version
```

### DownloadForOffline Flow

```
User clicks "Download"
    │
    └─→ handleDownload() called
        │
        ├─→ Create Cache: offline-{type}-{id}
        ├─→ Start progress tracking
        │
        └─→ While downloading:
            │
            ├─→ Simulate progress (0-100%)
            ├─→ Update progress state
            ├─→ Show progress bar
            │
            └─→ Download complete
                │
                ├─→ Set isCompleted = true
                ├─→ Query storage quota
                ├─→ Show cached info
                │
                └─→ User can:
                    ├─→ Download another item
                    └─→ Delete this download
```

### LoadingScreen Flow

```
dataStore.initialize()
    │
    ├─→ Set phase = 'checking'
    │   └─→ LoadingScreen shows "Checking Database"
    │
    ├─→ Set phase = 'fetching'
    │   ├─→ Make API request
    │   └─→ LoadingScreen shows progress (0-100%)
    │
    ├─→ Set phase = 'loading'
    │   ├─→ Import records to IndexedDB
    │   ├─→ Update loaded/total counts
    │   └─→ LoadingScreen shows detailed progress
    │
    └─→ Set phase = 'complete'
        ├─→ Hide LoadingScreen
        ├─→ Set dataState.status = 'ready'
        └─→ Render main app content
```

---

## State Management Architecture

### PWA Store Structure

```typescript
pwaStore {
  // Individual writable stores
  isSupported    → boolean (read-only from browser check)
  isReady        → boolean (SW registered)
  hasUpdate      → boolean (new version available)
  isInstalled    → boolean (app in standalone mode)
  isOffline      → boolean (no network)
  registration   → ServiceWorkerRegistration | null

  // Derived store (combines above)
  pwaState → PWAState {
    isSupported,
    isReady,
    hasUpdate,
    isInstalled,
    isOffline
  }

  // Methods
  initialize()           → void (setup SW, listeners)
  updateServiceWorker()  → void (activate waiting SW)
  checkForUpdates()      → void (manual check)
  requestNotifications() → Promise<NotificationPermission>
}
```

### Data Store Structure

```typescript
dataStore {
  // Individual writable stores
  status   → 'loading' | 'ready' | 'error'
  progress → LoadProgress {
    phase: 'idle' | 'checking' | 'fetching' | 'loading' | 'complete' | 'error'
    entity?: string      // Current entity (songs, venues, shows)
    loaded: number       // Records loaded
    total: number        // Total records
    percentage: number   // 0-100
    error?: string       // Error message
  }

  // Derived store (combines above)
  dataState → DataState {
    status,
    progress
  }

  // Methods
  initialize() → void (start data loading)
  retry()      → void (retry failed load)
  isReady()    → boolean (check if ready)
}
```

---

## Svelte 5 Runes Pattern

### State Management

```svelte
<script>
  // 1. Reactive state (like useState)
  let dialogOpen = $state(false);
  let progress = $state(0);

  // 2. Effects (like useEffect)
  $effect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  });

  // 3. Derived state (like useMemo)
  let isComplete = $derived(progress === 100);

  // 4. Component props
  let { minTime = 5000 } = $props();
</script>
```

### Comparison with React

```javascript
// React
const [dialogOpen, setDialogOpen] = useState(false);
const [progress, setProgress] = useState(0);

useEffect(() => {
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

const isComplete = useMemo(() => progress === 100, [progress]);

// Svelte 5
let dialogOpen = $state(false);
let progress = $state(0);

$effect(() => {
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
});

let isComplete = $derived(progress === 100);
```

---

## Event Listener Lifecycle

### Setup with $effect()

```svelte
<script>
  $effect(() => {
    const handleClick = (e) => {
      // Handle event
    };

    element.addEventListener('click', handleClick);

    // Cleanup function
    return () => {
      element.removeEventListener('click', handleClick);
    };
  });
</script>
```

### Comparison with React

```javascript
// React
useEffect(() => {
  const handleClick = (e) => {
    // Handle event
  };

  element.addEventListener('click', handleClick);

  // Cleanup function
  return () => {
    element.removeEventListener('click', handleClick);
  };
}, []); // Dependency array needed

// Svelte 5
$effect(() => {
  const handleClick = (e) => {
    // Handle event
  };

  element.addEventListener('click', handleClick);

  // Cleanup function
  return () => {
    element.removeEventListener('click', handleClick);
  };
  // No dependency array - Svelte handles it!
});
```

---

## Component Communication

### Parent → Child (Props)

```svelte
<!-- Parent -->
<DownloadForOffline type="tour" identifier="id" label="Label" />

<!-- Child -->
<script>
  let { type, identifier, label } = $props();
</script>
```

### Child → Parent (Events)

```svelte
<!-- Parent -->
<div onCustomEvent={handleEvent}>
  <Child />
</div>

<!-- Child -->
<button onclick={() => {
  dispatchEvent(new CustomEvent('customEvent', { detail: data }));
}}>
```

### Global State (Stores)

```svelte
<!-- Any component -->
<script>
  import { pwaState } from '$stores/pwa';

  $effect(() => {
    const unsubscribe = pwaState.subscribe((state) => {
      console.log('Updated:', state);
    });
    return unsubscribe;
  });
</script>
```

---

## CSS Scoping Strategy

### Scoped Styles

```svelte
<dialog class="my-dialog">
  <!-- Content -->
</dialog>

<style>
  .my-dialog {
    /* Scoped to this component */
  }

  :global(body) {
    /* Use :global() for global selectors */
  }
</style>
```

### CSS Custom Properties for Theming

```svelte
<div class="progress-bar" style={`--progress: ${progress}%`}>
  <!-- Bar -->
</div>

<style>
  .progress-bar::after {
    width: var(--progress, 0%);
    transition: width 0.3s ease;
  }
</style>
```

### Responsive Design

```svelte
<style>
  .container {
    /* Desktop first */
    display: grid;
    gap: 24px;
  }

  @media (max-width: 768px) {
    .container {
      gap: 16px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .animation {
      animation: none;
    }
  }
</style>
```

---

## Error Handling Pattern

### Try-Catch with State Management

```svelte
<script>
  let error = $state(null);
  let isLoading = $state(false);

  async function handleAction() {
    isLoading = true;
    error = null;

    try {
      const result = await someAsyncAction();
      // Handle success
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      isLoading = false;
    }
  }
</script>

{#if error}
  <div class="error-message" role="alert">{error}</div>
{/if}
```

---

## Accessibility Architecture

### ARIA Attributes

```svelte
<!-- Dialog -->
<dialog aria-labelledby="dialog-title" aria-describedby="dialog-desc">
  <h2 id="dialog-title">Title</h2>
  <p id="dialog-desc">Description</p>
</dialog>

<!-- Progress Bar -->
<div
  role="progressbar"
  aria-valuenow={progress}
  aria-valuemin={0}
  aria-valuemax={100}
/>

<!-- Live Region -->
<div aria-live="polite" aria-atomic="true">
  {progress}% complete
</div>
```

### Keyboard Navigation

```svelte
<script>
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      dialogOpen = false;
    }
    if (e.key === 'Enter') {
      handleConfirm();
    }
  }
</script>

<dialog onkeydown={handleKeydown}>
  <!-- Content -->
</dialog>
```

---

## Performance Optimization

### Lazy Props

```svelte
<script>
  // Only recalculate when prop changes
  let { data } = $props();

  let sorted = $derived(data.sort((a, b) => a - b));
</script>
```

### Event Delegation

```svelte
<div onclick={(e) => {
  if (e.target.matches('[data-action]')) {
    const action = e.target.dataset.action;
    handleAction(action);
  }
}}>
  <button data-action="edit">Edit</button>
  <button data-action="delete">Delete</button>
</div>
```

### Animation Performance

```svelte
<style>
  @media (prefers-reduced-motion: reduce) {
    .animation {
      animation: none;
      transition: none;
    }
  }

  /* Use transform for smooth animations */
  .moving {
    transform: translateX(var(--x));
    will-change: transform;
  }
</style>
```

---

## Testing Architecture

### Unit Test Structure

```typescript
import { render, screen } from '@testing-library/svelte';
import Component from './Component.svelte';

describe('Component', () => {
  it('should render', () => {
    const { container } = render(Component);
    expect(container).toBeTruthy();
  });

  it('should handle user interaction', async () => {
    render(Component);
    const button = screen.getByRole('button');
    await userEvent.click(button);
    // Assert state changed
  });
});
```

### Integration Test Structure

```typescript
import { render, waitFor } from '@testing-library/svelte';
import App from './App.svelte';
import { pwaStore } from '$stores/pwa';

describe('App Integration', () => {
  it('should load data on mount', async () => {
    render(App);
    await waitFor(() => {
      expect(screen.getByText('Ready')).toBeTruthy();
    });
  });
});
```

---

## Browser API Compatibility Check

### Progressive Enhancement Pattern

```svelte
<script>
  onMount(() => {
    // Check feature support
    if ('serviceWorker' in navigator) {
      // Safe to use SW features
    }

    if ('caches' in window) {
      // Safe to use Cache API
    }

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      // Safe to use Storage API
    }
  });
</script>

{#if isSupported}
  <!-- Show feature -->
{:else}
  <!-- Show fallback or nothing -->
{/if}
```

---

## Deployment Checklist

- [ ] All components tested in development
- [ ] Lighthouse audit passing (PWA checklist)
- [ ] Service Worker registered and functional
- [ ] Manifest.json valid and linked
- [ ] Icons provided (192x192, 512x512)
- [ ] HTTPS enabled (required for SW)
- [ ] Offline page configured
- [ ] Analytics tracking integrated
- [ ] Error logging configured
- [ ] Performance monitoring enabled

---

## Summary

This architecture provides:

✅ **Clear separation of concerns** - Components, stores, utilities
✅ **Type safety** - Full TypeScript support
✅ **Accessibility** - WCAG 2.1 AA compliant
✅ **Performance** - Optimized rendering and animations
✅ **Maintainability** - Clean, documented code
✅ **Extensibility** - Easy to add new components or features
✅ **Testing** - Test-friendly patterns
✅ **Browser compatibility** - Progressive enhancement strategy

The Svelte 5 architecture is simpler and more efficient than the previous React implementation while maintaining all functionality and improving developer experience.
