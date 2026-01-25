# Skill: Offline Navigation Shell Strategy

**ID**: `offline-navigation-strategy`
**Category**: PWA / Offline
**Agent**: PWA Engineer

---

## When to Use

- Implementing offline-first navigation
- Debugging offline page behavior
- Setting up app shell architecture
- After Service Worker changes

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| project_path | string | Yes | Path to project root |
| critical_routes | string[] | No | Routes that must work offline |

---

## Steps

### Step 1: Identify Critical Routes

```typescript
// Routes that MUST work offline for DMB Almanac
const CRITICAL_ROUTES = [
  '/',           // Homepage
  '/shows',      // Show list
  '/songs',      // Song database
  '/venues',     // Venue list
  '/my-shows',   // User favorites
  '/offline',    // Offline fallback
];

// Routes that SHOULD work if cached
const SECONDARY_ROUTES = [
  '/tours',
  '/guests',
  '/stats',
  '/liberation',
  '/search',
];
```

### Step 2: Implement Precaching

```javascript
// public/sw.js or lib/sw/sw.ts
const PRECACHE_URLS = [
  '/',
  '/shows',
  '/songs',
  '/venues',
  '/my-shows',
  '/offline',
  // Add critical CSS/JS
  '/_next/static/css/app.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('precache-v1').then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
});
```

### Step 3: Implement Offline Fallback

```javascript
// Fetch handler with offline fallback
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request)
            .then((response) => {
              if (response) return response;
              // Fallback to offline page
              return caches.match('/offline');
            });
        })
    );
  }
});
```

### Step 4: Create Offline Page

```typescript
// app/offline/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function OfflinePage() {
  const [cachedPages, setCachedPages] = useState<string[]>([]);

  useEffect(() => {
    // List cached pages
    caches.open('pages-v1').then((cache) => {
      cache.keys().then((keys) => {
        setCachedPages(keys.map((k) => new URL(k.url).pathname));
      });
    });
  }, []);

  return (
    <div className="offline-page">
      <h1>You're Offline</h1>
      <p>Some features are unavailable without internet.</p>

      {cachedPages.length > 0 && (
        <>
          <h2>Available Offline:</h2>
          <ul>
            {cachedPages.map((page) => (
              <li key={page}>
                <a href={page}>{page}</a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
```

### Step 5: Handle IndexedDB for Data

```typescript
// components/data/OfflineDataProvider.tsx
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/db/dexie';

export function OfflineDataProvider({ children }) {
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    // Check if data exists in IndexedDB
    db.shows.count().then((count) => {
      if (count > 0) {
        setIsDataLoaded(true);
      } else {
        // Trigger sync
        syncData().then(() => setIsDataLoaded(true));
      }
    });
  }, []);

  if (!isDataLoaded) {
    return <LoadingScreen message="Loading offline data..." />;
  }

  return children;
}
```

### Step 6: Test Offline Behavior

```markdown
## Offline Test Protocol

1. Visit app online, navigate to several pages
2. Open DevTools > Application > Service Workers
3. Check "Offline" checkbox
4. Navigate to different pages:
   - [ ] / - Should load from cache
   - [ ] /shows - Should load from cache + IndexedDB
   - [ ] /shows/123 - Should load if visited before
   - [ ] /new-page - Should show offline page
5. Uncheck "Offline"
6. Verify app recovers
```

---

## App Shell Pattern

### What to Precache (Shell)

```
├── index.html (or /)
├── app.css (critical CSS)
├── app.js (critical JS)
├── header component
├── navigation
├── footer
└── loading skeleton
```

### What to Load On-Demand

```
├── Page-specific content
├── Images
├── API responses
└── User data from IndexedDB
```

---

## Artifacts Produced

| Artifact | Path | Description |
|----------|------|-------------|
| offline-strategy.md | `.claude/artifacts/` | Strategy document |
| precache-list.json | `.claude/artifacts/` | URLs to precache |
| offline-test-results.md | `.claude/artifacts/` | Test results |

---

## Output Template

```markdown
## Offline Navigation Strategy Report

### Date: [YYYY-MM-DD]

### Critical Routes
| Route | Precached | IndexedDB | Status |
|-------|-----------|-----------|--------|
| / | Yes | Yes | ✅ Works |
| /shows | Yes | Yes | ✅ Works |
| /songs | Yes | Yes | ✅ Works |
| /my-shows | Yes | Yes | ✅ Works |

### Fallback Behavior
- Uncached pages → `/offline` page
- Uncached API → Cached response or error
- Uncached images → Placeholder

### Implementation Changes

#### Precache List
```javascript
const PRECACHE_URLS = [
  '/',
  '/shows',
  // ...
];
```

#### Fetch Handler
```javascript
// Network-first with offline fallback
```

### Test Results
| Test | Result |
|------|--------|
| Homepage offline | ✅ Pass |
| Navigation offline | ✅ Pass |
| Data access offline | ✅ Pass |
| Offline fallback | ✅ Pass |
| Recovery online | ✅ Pass |

### Recommendations
1. [Recommendation]
2. [Recommendation]
```
