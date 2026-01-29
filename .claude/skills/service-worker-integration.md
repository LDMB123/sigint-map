---
skill: service-worker-integration
description: SvelteKit Service Worker Integration
---

# SvelteKit Service Worker Integration

## Usage

```
/service-worker-integration [integration-type] [caching-strategy]
```

## Instructions

You are an expert in Progressive Web Apps with deep knowledge of SvelteKit's service worker integration patterns, Vite plugin configurations, and workbox strategies. You understand the nuances of `$service-worker` module imports, build-time vs runtime registration, and the SvelteKit adapter ecosystem.

Analyze the SvelteKit project and implement or audit service worker integration with proper caching strategies.

## SvelteKit Service Worker Architecture

### Registration Patterns

| Pattern | Use Case | Pros | Cons |
|---------|----------|------|------|
| `src/service-worker.ts` | Full control | Direct access to SW lifecycle | Manual cache management |
| `vite-plugin-pwa` | Rapid setup | Auto-generates SW, manifest | Less flexibility |
| `workbox-precaching` | Hybrid | SvelteKit + Workbox power | Configuration complexity |
| Custom registration | Edge cases | Maximum control | Most maintenance |

### SvelteKit $service-worker Module

| Export | Type | Description |
|--------|------|-------------|
| `build` | `string[]` | Hashed build assets from Vite |
| `files` | `string[]` | Static files from `static/` directory |
| `version` | `string` | Build timestamp/hash for cache versioning |
| `prerendered` | `string[]` | Prerendered page routes |
| `base` | `string` | Base path from svelte.config.js |

### Basic Service Worker Setup

```typescript
// src/service-worker.ts
/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { build, files, version, prerendered } from '$service-worker';

declare let self: ServiceWorkerGlobalScope;

const CACHE_NAME = `cache-${version}`;

// Assets to cache immediately
const PRECACHE_ASSETS = [
  ...build,      // Vite build output (hashed)
  ...files,      // Static assets
  ...prerendered // Prerendered pages
];

// Install: precache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: stale-while-revalidate for pages, cache-first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and external requests
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Cache-first for build assets (immutable, hashed)
  if (build.includes(url.pathname)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Stale-while-revalidate for pages
  if (event.request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // Network-first for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Default: cache-first
  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw new Error('Network unavailable and no cache');
  }
}

async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  return cached || networkPromise;
}
```

### Client-Side Registration

```typescript
// src/lib/pwa/register.ts
import { browser } from '$app/environment';

export interface ServiceWorkerState {
  supported: boolean;
  registered: boolean;
  controller: ServiceWorker | null;
  updateAvailable: boolean;
  error: Error | null;
}

export function registerServiceWorker(): Promise<ServiceWorkerState> {
  return new Promise((resolve) => {
    if (!browser || !('serviceWorker' in navigator)) {
      resolve({
        supported: false,
        registered: false,
        controller: null,
        updateAvailable: false,
        error: null
      });
      return;
    }

    navigator.serviceWorker
      .register('/service-worker.js', {
        scope: '/',
        type: 'module'
      })
      .then((registration) => {
        // Check for updates periodically
        setInterval(() => registration.update(), 60 * 60 * 1000);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              window.dispatchEvent(new CustomEvent('sw-update-available', {
                detail: { registration }
              }));
            }
          });
        });

        resolve({
          supported: true,
          registered: true,
          controller: navigator.serviceWorker.controller,
          updateAvailable: false,
          error: null
        });
      })
      .catch((error) => {
        resolve({
          supported: true,
          registered: false,
          controller: null,
          updateAvailable: false,
          error
        });
      });
  });
}
```

### SvelteKit Configuration

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      fallback: 'index.html' // SPA fallback for offline
    }),
    serviceWorker: {
      register: false // Manual registration for update control
    },
    files: {
      serviceWorker: 'src/service-worker.ts'
    }
  }
};

export default config;
```

### Vite Plugin PWA Integration

```typescript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      srcDir: 'src',
      filename: 'service-worker.ts',
      strategies: 'injectManifest',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      },
      manifest: {
        name: 'My SvelteKit App',
        short_name: 'MyApp',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ]
});
```

### Response Format

```markdown
## Service Worker Integration Report

### Current State Analysis
- Registration method: [Manual/Vite-PWA/None]
- Caching strategy: [Precache/Runtime/Hybrid]
- Assets coverage: [X/Y files cached]

### Configuration Audit

| Setting | Current | Recommended | Impact |
|---------|---------|-------------|--------|
| [Setting] | [Value] | [Value] | [Description] |

### Implementation Plan

#### 1. Service Worker File
```typescript
// src/service-worker.ts
[Generated code]
```

#### 2. Registration Module
```typescript
// src/lib/pwa/register.ts
[Generated code]
```

#### 3. SvelteKit Configuration
```javascript
// svelte.config.js updates
```

### Caching Strategy Map

| Route Pattern | Strategy | TTL | Offline Fallback |
|---------------|----------|-----|------------------|
| `/` | Stale-while-revalidate | - | /offline |
| `/api/*` | Network-first | 5min | Cached response |
| `/_app/*` | Cache-first | Forever | - |

### Testing Checklist
- [ ] SW registers successfully
- [ ] Assets precached on install
- [ ] Old caches cleaned on activate
- [ ] Offline navigation works
- [ ] Update detection fires
- [ ] Network strategies applied correctly

### Performance Metrics
- Precache size: ~X KB
- Install time: ~Y ms
- Cache hit rate target: >95%
```
