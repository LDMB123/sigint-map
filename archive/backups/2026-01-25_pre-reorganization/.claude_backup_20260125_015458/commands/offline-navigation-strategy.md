# Offline Navigation Strategy

## Usage

```
/offline-navigation-strategy [fallback-type] [cache-scope]
```

## Instructions

You are an expert in Progressive Web App offline capabilities with deep knowledge of SvelteKit routing, navigation guards, and graceful degradation patterns. You understand how to detect network status, intercept navigation failures, and provide meaningful offline experiences without disrupting user flow.

Implement or audit offline navigation handling that gracefully degrades when network is unavailable.

## Offline Strategy Comparison

| Strategy | User Experience | Complexity | Cache Size |
|----------|-----------------|------------|------------|
| Full offline shell | App always loads | High | Large |
| Route-level fallback | Per-route offline pages | Medium | Medium |
| Single offline page | Generic fallback | Low | Small |
| Cached content only | Shows stale data | Medium | Variable |
| Hybrid approach | Combines strategies | High | Medium |

## Network Status Detection

| Method | Reliability | Browser Support | Use Case |
|--------|-------------|-----------------|----------|
| `navigator.onLine` | Low (false positives) | Universal | Initial check |
| Fetch with timeout | High | Universal | Actual connectivity |
| Navigator Connection API | Medium | Partial | Connection quality |
| Periodic heartbeat | Highest | Universal | Real-time status |

## SvelteKit Network Store

```typescript
// src/lib/stores/network.ts
import { writable, derived, type Readable } from 'svelte/store';
import { browser } from '$app/environment';

export type NetworkStatus = 'online' | 'offline' | 'slow';

interface NetworkState {
  status: NetworkStatus;
  effectiveType: string | null;  // 4g, 3g, 2g, slow-2g
  downlink: number | null;       // Mbps
  rtt: number | null;            // Round-trip time ms
  saveData: boolean;
  lastChecked: Date | null;
}

function createNetworkStore() {
  const { subscribe, set, update } = writable<NetworkState>({
    status: 'online',
    effectiveType: null,
    downlink: null,
    rtt: null,
    saveData: false,
    lastChecked: null
  });

  function checkOnlineStatus(): boolean {
    return browser ? navigator.onLine : true;
  }

  function getConnectionInfo(): Partial<NetworkState> {
    if (!browser) return {};

    const connection = (navigator as any).connection;
    if (!connection) return {};

    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData || false
    };
  }

  async function verifyConnectivity(): Promise<boolean> {
    if (!browser) return true;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Use a small, cacheable request
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  async function refresh() {
    const online = checkOnlineStatus();
    const connectionInfo = getConnectionInfo();

    let status: NetworkStatus = 'offline';

    if (online) {
      const verified = await verifyConnectivity();
      status = verified ? 'online' : 'offline';

      // Check for slow connection
      if (status === 'online' && connectionInfo.effectiveType) {
        if (['slow-2g', '2g'].includes(connectionInfo.effectiveType)) {
          status = 'slow';
        }
      }
    }

    set({
      status,
      ...connectionInfo,
      lastChecked: new Date()
    } as NetworkState);
  }

  function init() {
    if (!browser) return;

    // Initial check
    refresh();

    // Listen for online/offline events
    window.addEventListener('online', () => refresh());
    window.addEventListener('offline', () => {
      update(s => ({ ...s, status: 'offline', lastChecked: new Date() }));
    });

    // Listen for connection changes
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', () => refresh());
    }

    // Periodic verification
    setInterval(refresh, 30000);
  }

  return {
    subscribe,
    refresh,
    init,
    verifyConnectivity
  };
}

export const networkStore = createNetworkStore();

export const isOnline: Readable<boolean> = derived(
  networkStore,
  $network => $network.status === 'online'
);

export const isOffline: Readable<boolean> = derived(
  networkStore,
  $network => $network.status === 'offline'
);

export const isSlow: Readable<boolean> = derived(
  networkStore,
  $network => $network.status === 'slow'
);
```

### Offline Navigation Guard

```typescript
// src/lib/navigation/offline-guard.ts
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { networkStore, isOffline } from '$lib/stores/network';
import { get } from 'svelte/store';

interface OfflineConfig {
  fallbackRoute: string;
  cachedRoutes: Set<string>;
  alwaysAllowRoutes: Set<string>;
}

const config: OfflineConfig = {
  fallbackRoute: '/offline',
  cachedRoutes: new Set([
    '/',
    '/about',
    '/settings'
  ]),
  alwaysAllowRoutes: new Set([
    '/offline',
    '/login'
  ])
};

export function isRouteCached(path: string): boolean {
  // Check exact match
  if (config.cachedRoutes.has(path)) return true;

  // Check pattern matches (e.g., /posts/*)
  for (const route of config.cachedRoutes) {
    if (route.endsWith('/*')) {
      const prefix = route.slice(0, -1);
      if (path.startsWith(prefix)) return true;
    }
  }

  return false;
}

export async function canNavigateOffline(path: string): Promise<boolean> {
  if (!browser) return true;

  // Always allow certain routes
  if (config.alwaysAllowRoutes.has(path)) return true;

  // Check network status
  const offline = get(isOffline);
  if (!offline) return true;

  // Check if route is cached
  if (isRouteCached(path)) return true;

  // Check if page is in cache
  const cache = await caches.open('pages-cache');
  const cached = await cache.match(path);
  return !!cached;
}

export async function handleOfflineNavigation(path: string): Promise<void> {
  const canNavigate = await canNavigateOffline(path);

  if (!canNavigate) {
    // Store intended destination for later
    if (browser) {
      sessionStorage.setItem('offlineRedirectTarget', path);
    }
    await goto(config.fallbackRoute);
  }
}

// Hook into SvelteKit navigation
export function setupOfflineNavigationGuard() {
  if (!browser) return;

  // Intercept link clicks
  document.addEventListener('click', async (event) => {
    const link = (event.target as HTMLElement).closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#')) return;

    const canNavigate = await canNavigateOffline(href);
    if (!canNavigate) {
      event.preventDefault();
      sessionStorage.setItem('offlineRedirectTarget', href);
      await goto(config.fallbackRoute);
    }
  });
}
```

### Offline Page Component

```svelte
<!-- src/routes/offline/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { networkStore, isOnline } from '$lib/stores/network';
  import { browser } from '$app/environment';

  let targetRoute: string | null = null;
  let checking = false;

  onMount(() => {
    if (browser) {
      targetRoute = sessionStorage.getItem('offlineRedirectTarget');
    }
  });

  // Auto-redirect when back online
  $: if ($isOnline && targetRoute && browser) {
    sessionStorage.removeItem('offlineRedirectTarget');
    goto(targetRoute);
  }

  async function retryConnection() {
    checking = true;
    await networkStore.refresh();
    checking = false;
  }
</script>

<svelte:head>
  <title>Offline</title>
</svelte:head>

<div class="offline-container">
  <div class="offline-content">
    <div class="offline-icon">
      <svg viewBox="0 0 24 24" width="64" height="64">
        <path
          fill="currentColor"
          d="M23.64 7c-.45-.34-4.93-4-11.64-4-1.5 0-2.89.19-4.15.48L18.18 13.8 23.64 7zm-6.6 8.22L3.27 1.44 2 2.72l2.05 2.06C1.91 5.76.59 6.82.36 7L12 21.5l3.07-4.04 3.01 3.01 1.27-1.27-2.31-2.98z"
        />
      </svg>
    </div>

    <h1>You're offline</h1>

    <p>
      {#if targetRoute}
        The page you're trying to reach isn't available offline.
      {:else}
        Check your internet connection and try again.
      {/if}
    </p>

    <div class="actions">
      <button
        class="btn-retry"
        on:click={retryConnection}
        disabled={checking}
      >
        {#if checking}
          Checking...
        {:else}
          Try again
        {/if}
      </button>

      <a href="/" class="btn-home">Go to home</a>
    </div>

    <div class="cached-pages">
      <h2>Available offline:</h2>
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/settings">Settings</a></li>
      </ul>
    </div>
  </div>
</div>

<style>
  .offline-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: var(--surface, #0a0a0f);
  }

  .offline-content {
    text-align: center;
    max-width: 400px;
  }

  .offline-icon {
    color: var(--text-muted, #666);
    margin-bottom: 1.5rem;
  }

  h1 {
    color: var(--text-primary, #fff);
    margin: 0 0 0.5rem;
    font-size: 1.5rem;
  }

  p {
    color: var(--text-secondary, #999);
    margin: 0 0 2rem;
  }

  .actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 2rem;
  }

  .btn-retry {
    background: var(--color-primary, #3b82f6);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-retry:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-home {
    background: transparent;
    color: var(--text-secondary, #999);
    border: 1px solid var(--border-color, #333);
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    text-decoration: none;
  }

  .cached-pages {
    padding-top: 2rem;
    border-top: 1px solid var(--border-color, #333);
  }

  .cached-pages h2 {
    font-size: 0.875rem;
    color: var(--text-muted, #666);
    margin: 0 0 1rem;
    font-weight: normal;
  }

  .cached-pages ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .cached-pages a {
    color: var(--color-primary, #3b82f6);
    text-decoration: none;
  }
</style>
```

### Service Worker Navigation Handler

```typescript
// Add to src/service-worker.ts
import { build, files, prerendered } from '$service-worker';

const OFFLINE_PAGE = '/offline';
const CACHED_PAGES = ['/', '/about', '/settings'];

// Ensure offline page is cached
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        ...build,
        ...files,
        OFFLINE_PAGE,
        ...CACHED_PAGES
      ]);
    })
  );
});

// Handle navigation requests
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    (async () => {
      try {
        // Try network first for navigation
        const preloadResponse = await event.preloadResponse;
        if (preloadResponse) return preloadResponse;

        const networkResponse = await fetch(event.request);

        // Cache successful navigation responses
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }

        return networkResponse;
      } catch (error) {
        // Network failed, try cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;

        // Fall back to offline page
        const offlinePage = await caches.match(OFFLINE_PAGE);
        if (offlinePage) return offlinePage;

        // Last resort: construct offline response
        return new Response(
          '<html><body><h1>Offline</h1></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
    })()
  );
});
```

### Layout Integration

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { networkStore, isOffline } from '$lib/stores/network';
  import { setupOfflineNavigationGuard } from '$lib/navigation/offline-guard';
  import OfflineBanner from '$lib/components/OfflineBanner.svelte';

  onMount(() => {
    networkStore.init();
    setupOfflineNavigationGuard();
  });
</script>

{#if $isOffline}
  <OfflineBanner />
{/if}

<slot />
```

### Offline Banner Component

```svelte
<!-- src/lib/components/OfflineBanner.svelte -->
<script lang="ts">
  import { slide } from 'svelte/transition';
</script>

<div class="offline-banner" transition:slide={{ duration: 200 }}>
  <span>You're currently offline. Some features may be unavailable.</span>
</div>

<style>
  .offline-banner {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--color-warning, #f59e0b);
    color: #000;
    padding: 0.5rem 1rem;
    text-align: center;
    font-size: 0.875rem;
    z-index: 9999;
  }
</style>
```

### Response Format

```markdown
## Offline Navigation Strategy Report

### Current Implementation
- Offline detection: [None/Basic/Advanced]
- Fallback strategy: [None/Single page/Per-route]
- Cached routes: [List]

### Network Detection
| Method | Implemented | Reliability |
|--------|-------------|-------------|
| navigator.onLine | Yes/No | Low |
| Fetch verification | Yes/No | High |
| Connection API | Yes/No | Medium |

### Implementation

#### Network Store
```typescript
// src/lib/stores/network.ts
[Generated code]
```

#### Navigation Guard
```typescript
// src/lib/navigation/offline-guard.ts
[Generated code]
```

#### Offline Page
```svelte
<!-- src/routes/offline/+page.svelte -->
[Generated code]
```

### Route Caching Strategy

| Route | Strategy | Offline Available | Fallback |
|-------|----------|-------------------|----------|
| `/` | Precache | Yes | N/A |
| `/api/*` | Network-first | Cached response | Error |
| `/dashboard` | Stale-while-revalidate | Stale data | /offline |

### Testing Checklist
- [ ] Offline banner appears when offline
- [ ] Navigation to uncached routes redirects to offline page
- [ ] Cached routes work offline
- [ ] Auto-redirect when back online
- [ ] Retry button verifies connectivity
- [ ] Service worker serves offline page as fallback

### User Experience Flow
```
Online -> (Network lost) -> Offline Banner
    |                            |
    v                            v
Navigate                    Navigate
    |                            |
    v                            v
Network fetch              Check cache
    |                            |
    v                            v
Success                   Cached? -> Yes -> Serve
    |                        |
    v                        v
Render                     No -> Offline page
```
```
