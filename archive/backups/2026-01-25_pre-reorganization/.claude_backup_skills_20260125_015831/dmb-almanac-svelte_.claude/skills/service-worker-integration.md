# Skill: Service Worker Integration Strategy for Next.js

**ID**: `service-worker-integration`
**Category**: PWA / Offline
**Agent**: PWA Engineer

---

## When to Use

- Setting up new Service Worker
- Migrating to Serwist or next-pwa
- Debugging SW registration issues
- Optimizing caching strategies

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| project_path | string | Yes | Path to project root |
| strategy | string | No | "manual", "serwist", or "next-pwa" |

---

## Steps

### Step 1: Assess Current SW Setup

```bash
# Check for existing SW
ls -la public/sw.js public/service-worker.js 2>/dev/null

# Check for Serwist/next-pwa config
grep -r "serwist\|next-pwa" package.json next.config.ts

# Check SW registration
grep -r "serviceWorker.register" lib/ components/
```

### Step 2: Choose Strategy

| Strategy | Pros | Cons | Best For |
|----------|------|------|----------|
| Manual | Full control | Maintenance burden | Complex caching |
| Serwist | Auto Next.js integration | Learning curve | Modern Next.js |
| next-pwa | Easy setup | Less flexible | Quick setup |

### Step 3: Implement Strategy

#### Option A: Manual SW (Current)

```javascript
// public/sw.js
const CACHE_VERSION = 'v2';
const CACHE_NAMES = {
  precache: `dmb-precache-${CACHE_VERSION}`,
  // ...
};

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(handleFetch(event.request));
});
```

#### Option B: Serwist (Recommended)

```bash
npm install @serwist/next serwist
```

```typescript
// next.config.ts
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'lib/sw/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

export default withSerwist(nextConfig);
```

```typescript
// lib/sw/sw.ts
import { defaultCache } from '@serwist/next/worker';
import { Serwist } from 'serwist';

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
```

#### Option C: next-pwa

```bash
npm install next-pwa
```

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA(nextConfig);
```

### Step 4: Configure Registration

```typescript
// lib/sw/register.ts
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

```typescript
// components/pwa/ServiceWorkerProvider.tsx
'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/sw/register';

export function ServiceWorkerProvider({ children }) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return children;
}
```

### Step 5: Test Integration

```bash
# Build production
npm run build

# Start production server
npm run start

# Check SW in DevTools > Application > Service Workers
```

---

## Caching Strategy Recommendations

### For DMB Almanac

```typescript
const runtimeCaching = [
  // Static assets - Cache first
  {
    urlPattern: /\/_next\/static\/.*/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'static-assets',
      expiration: { maxEntries: 100 },
    },
  },
  // API routes - Network first
  {
    urlPattern: /\/api\/.*/i,
    handler: 'NetworkFirst',
    options: {
      cacheName: 'api-cache',
      networkTimeoutSeconds: 2,
      expiration: { maxAgeSeconds: 60 * 15 },
    },
  },
  // Pages - Network first with offline fallback
  {
    urlPattern: ({ request }) => request.mode === 'navigate',
    handler: 'NetworkFirst',
    options: {
      cacheName: 'pages',
      networkTimeoutSeconds: 3,
    },
  },
  // Images - Stale while revalidate
  {
    urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'images',
      expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 },
    },
  },
];
```

---

## Artifacts Produced

| Artifact | Path | Description |
|----------|------|-------------|
| sw-integration-plan.md | `.claude/artifacts/` | Implementation plan |
| caching-strategy.ts | `.claude/artifacts/` | Caching config |

---

## Output Template

```markdown
## Service Worker Integration Report

### Current State
- Strategy: [Manual/Serwist/next-pwa/None]
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
| /_next/static | CacheFirst | static | ∞ |
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
```
