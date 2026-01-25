# Skill: Service Worker Integration Strategy for SvelteKit

**ID**: `service-worker-integration`
**Category**: PWA / Offline
**Agent**: PWA Engineer

---

## When to Use

- Setting up new Service Worker for SvelteKit PWA
- Migrating to vite-plugin-pwa or Workbox
- Debugging SW registration issues
- Optimizing caching strategies
- Implementing offline-first functionality

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| project_path | string | Yes | Path to SvelteKit project root |
| strategy | string | No | "manual", "vite-plugin-pwa", or "workbox" |

---

## Steps

### Step 1: Assess Current SW Setup

```bash
# Check for existing SW
ls -la static/sw.js static/service-worker.js 2>/dev/null

# Check for vite-plugin-pwa
grep -r "vite-plugin-pwa\|workbox" package.json vite.config.ts

# Check SW registration
grep -r "serviceWorker.register" src/lib/ src/routes/
```

### Step 2: Choose Strategy

| Strategy | Pros | Cons | Best For |
|----------|------|------|----------|
| Manual | Full control, custom logic | Maintenance burden | Complex caching needs |
| vite-plugin-pwa | Auto SvelteKit integration, easy setup | Less granular control | Most projects |
| Workbox | Flexible, well-documented | More configuration | Advanced use cases |

### Step 3: Implement Strategy

#### Option A: vite-plugin-pwa (Recommended)

```bash
npm install -D vite-plugin-pwa
```

```typescript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    sveltekit(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Your App Name',
        short_name: 'App',
        description: 'Your app description',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.example\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 15 // 15 minutes
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false // Enable for testing in dev
      }
    })
  ]
});
```

#### Option B: Manual SW

```javascript
// static/sw.js
const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  precache: `app-precache-${CACHE_VERSION}`,
  runtime: `app-runtime-${CACHE_VERSION}`,
  images: `app-images-${CACHE_VERSION}`,
};

const PRECACHE_URLS = [
  '/',
  '/app.css',
  '/offline'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.precache).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !Object.values(CACHE_NAMES).includes(name))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(handleFetch(event.request));
});

async function handleFetch(request) {
  // Network first for navigation
  if (request.mode === 'navigate') {
    try {
      const response = await fetch(request);
      return response;
    } catch (error) {
      const cache = await caches.open(CACHE_NAMES.precache);
      return (await cache.match(request)) || cache.match('/offline');
    }
  }

  // Cache first for static assets
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAMES.runtime);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}
```

#### Option C: Workbox

```bash
npm install -D workbox-cli workbox-build
```

```javascript
// workbox-config.js
module.exports = {
  globDirectory: 'build/',
  globPatterns: [
    '**/*.{js,css,html,png,svg,woff2}'
  ],
  swDest: 'build/sw.js',
  runtimeCaching: [
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    }
  ]
};
```

### Step 4: Configure Registration

```typescript
// src/lib/sw/register.ts
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('SW registered:', registration.scope);
      return registration;
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  }
}
```

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { onMount } from 'svelte';
  import { registerServiceWorker } from '$lib/sw/register';

  onMount(() => {
    registerServiceWorker();
  });
</script>

<slot />
```

### Step 5: Test Integration

```bash
# Build production
npm run build

# Preview production build
npm run preview

# Check SW in DevTools > Application > Service Workers
```

---

## Caching Strategy Recommendations

### Static Assets - Cache First

```typescript
{
  urlPattern: /\/_app\/immutable\/.*/i,
  handler: 'CacheFirst',
  options: {
    cacheName: 'static-assets',
    expiration: {
      maxEntries: 100,
      maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
    }
  }
}
```

### API Routes - Network First

```typescript
{
  urlPattern: /\/api\/.*/i,
  handler: 'NetworkFirst',
  options: {
    cacheName: 'api-cache',
    networkTimeoutSeconds: 2,
    expiration: {
      maxAgeSeconds: 60 * 15 // 15 minutes
    }
  }
}
```

### Pages - Network First with Offline Fallback

```typescript
{
  urlPattern: ({ request }) => request.mode === 'navigate',
  handler: 'NetworkFirst',
  options: {
    cacheName: 'pages',
    networkTimeoutSeconds: 3
  }
}
```

### Images - Stale While Revalidate

```typescript
{
  urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
  handler: 'StaleWhileRevalidate',
  options: {
    cacheName: 'images',
    expiration: {
      maxEntries: 60,
      maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
    }
  }
}
```

---

## Artifacts Produced

| Artifact | Path | Description |
|----------|------|-------------|
| sw-integration-plan.md | `.claude/artifacts/` | Implementation plan |
| caching-strategy.ts | `.claude/artifacts/` | Caching configuration |

---

## Output Template

```markdown
## Service Worker Integration Report

### Current State
- Strategy: [Manual/vite-plugin-pwa/Workbox/None]
- SW Location: [path]
- Registration: [Working/Broken/Not registered]

### Recommended Strategy
[Strategy] because [reason]

### Implementation Plan

#### Step 1: [Action]
```bash
[Command]
```

#### Step 2: [Action]
```typescript
[Code]
```

### Caching Configuration
| Route Pattern | Strategy | Cache Name | TTL |
|---------------|----------|------------|-----|
| /_app/immutable | CacheFirst | static | 1 year |
| /api/* | NetworkFirst | api | 15min |
| Pages | NetworkFirst | pages | - |

### Migration Steps (if changing strategy)
1. [Step]
2. [Step]
3. [Step]

### Verification
- [ ] SW registers on first visit
- [ ] SW updates on new deployment
- [ ] Offline pages load
- [ ] API cache works
- [ ] Static assets cache correctly
```
