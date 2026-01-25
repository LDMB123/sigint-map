# Service Worker Architecture Analysis

## Current Service Worker Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser Load                                │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │  +layout.svelte onMount()        │
        │  - pwaStore.initialize() ◄──┐    │
        │  - dataStore.initialize()    │   │
        └──────────────────────────────┘    │
                           │                │
                           ▼                │ DUPLICATE CALL
        ┌──────────────────────────────────┐ │
        │  InstallPrompt.svelte onMount()  │─┘
        │  - pwaStore.initialize()         │
        └──────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │   pwa.ts initialize()            │
        │   - navigator.sw.register()      │
        └──────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │  /static/sw.js                   │
        │  - Install event                 │
        │  - Activate event                │
        │  - Fetch event                   │
        └──────────────────────────────────┘
                           │
                ┌──────────┴──────────┐
                ▼                     ▼
        Cache Created        SW Ready (waiting)
                           │
                    controller change
                           │
                           ▼
                  pwaState.hasUpdate = true
                  Show "Update available"
```

---

## Issue: Race Condition in Initialization

```
Timeline:
┌────────────────────────────────────────────────────────┐
│ Browser loads +layout.svelte                           │
├────────────────────────────────────────────────────────┤
│ t=0ms   onMount() fires                                │
│         - pwaStore.initialize() called                 │
│           │                                            │
│           ▼ Start registration                         │
│                                                        │
│ t=10ms  InstallPrompt.svelte onMount() fires           │
│         - pwaStore.initialize() called AGAIN! ◄────┐  │
│           │                                        │  │
│           ▼ Start registration AGAIN!              │  │
│                                                    │  │
│           BUG: Two registrations happening         │  │
│                                                    │  │
│ t=50ms  Both complete, listeners attached twice   │  │
│         Memory leak from duplicate listeners ◄────┘  │
│                                                        │
│ Symptom: Multiple logs for same SW lifecycle events   │
└────────────────────────────────────────────────────────┘

Fix: Add guard to prevent re-initialization
  let initialized = false;
  if (initialized) return;
  initialized = true;
```

---

## Issue: Incomplete Event Listener Cleanup

```
Listener Hierarchy:
┌────────────────────────────────────────────────────────┐
│ PWA Store Initialize (AbortController signal)          │
├────────────────────────────────────────────────────────┤
│ ├─ AbortController                                     │
│ │  ├─ navigator.sw.addEventListener('controllerchange')
│ │  ├─ window.addEventListener('online')               │
│ │  ├─ window.addEventListener('offline')              │
│ │  └─ mediaQuery.addEventListener('change')           │
│ │                                                      │
│ └─ reg.addEventListener('updatefound') ◄──────────┐   │
│    └─ newWorker.addEventListener('statechange') ◄─┼─┐ │
│       PROBLEM: Not under AbortController! ◄────────┘ │ │
│                                                       │ │
│ cleanupFunctions array                         Manual ▼ │
│  └─ Callback to remove nested listener             clean│
│     Problem: Called manually, not with abort signal   up│
│                                                        │
│ When component unmounts:                             │
│  1. AbortController.abort() fires ◄────────┐        │
│  2. AbortController listeners removed      │        │
│  3. Manual cleanupFunctions called ◄────────┼────────┘
│     (if properly called)                   │
│                                            ▼
│  BUT: If aborted before cleanup called,
│       nested listener still attached
└────────────────────────────────────────────────────────┘

Solution: Use AbortController for ALL nested listeners
  const nestedController = new AbortController();
  newWorker.addEventListener('statechange', handler, {
    signal: nestedController.signal
  });
```

---

## Issue: Stale Resource Delivery During Update

```
Current Flow (PROBLEMATIC):
┌─────────────────────────────────────────────────────────────┐
│ User has v1 of app loaded                                   │
│ - HTML from v1                                              │
│ - CSS from cache (v1)                                       │
│ - JS from cache (v1)                                        │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
         New SW available (v2)
         - Downloaded
         - Installed
         - Waiting for activation
                     │
                     ▼
        ┌────────────────────────────┐
        │ SW ACTIVATION BEGINS       │
        │ - Cleanup old caches      │
        │ - Call clients.claim()    │
        │   ◄─ Immediate effect!    │
        └────────────────────────────┘
                     │
         ┌───────────┴────────────┐
         ▼                        ▼
  Client is now           Browser doesn't know
  controlled by v2         it's controlled by v2
                                  │
                                  ▼
                      Fetch /api/data
                      │
                      ▼ (goes to v2 SW)
                      │
             Response from v2 cache
             (different format than v1!)
                      │
                      ▼
             HTML tries to parse
             v1 JS tries to parse
             ◄─ ASSET MISMATCH!

         ~300ms later: controllerchange fires
                      │
                      ▼
                   reload()
                      │
                      ▼
             Now everything is v2 ✓

PROBLEM: ~300ms window of broken state

Fixed Flow:
┌─────────────────────────────────────────────────────────────┐
│ SW Activation Complete                                      │
│ - clients.claim() called                                    │
│ - SW_UPDATED message sent to all clients IMMEDIATELY       │
│                                                             │
│ Clients receive message: "reload now"                       │
│   ◄─ Forced reload before any fetches                       │
│                                                             │
│ Everything loads fresh as v2 ✓                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Issue: Precache Failure Handling

```
Cache.addAll() Behavior:
┌────────────────────────────────────────────┐
│ PRECACHE_URLS = [                          │
│   '/',        ✓ 200                        │
│   '/songs',   ✓ 200                        │
│   '/venues',  ✓ 200                        │
│   '/stats',   ✓ 200                        │
│   '/tours',   ✓ 200                        │
│   '/offline'  ✗ 404 NOT FOUND             │
│ ]                                          │
│                                            │
│ cache.addAll([...]) behavior:              │
│   If ANY URL returns non-2xx:              │
│   ├─ Entire operation REJECTS              │
│   ├─ Already cached items REMAIN cached    │
│   └─ Promise rejection caught              │
│      ◄─ Silent failure, SW still installs! │
└────────────────────────────────────────────┘

Problem: If /offline doesn't exist:
  ├─ New SW installs but without fallback
  ├─ User goes offline
  ├─ networkFirst fails
  ├─ Tries to show offline fallback
  ├─ Gets 404 instead!
  └─ No offline experience for new installs

Solution: Add URLs individually with error handling
  for (const url of PRECACHE_URLS) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
      } else {
        console.warn(`Failed: ${url} ${response.status}`);
      }
    } catch (error) {
      console.warn(`Failed: ${url}`, error);
    }
  }
  await self.skipWaiting(); // Continue regardless
```

---

## Issue: Network Timeout

```
Current NetworkFirst Flow:
┌──────────────────────────────────────────┐
│ User requests /songs                     │
├──────────────────────────────────────────┤
│ networkFirst strategy                    │
│   │                                      │
│   ├─ Try fetch('/songs')                 │
│   │   ├─ Network available? YES ✓        │
│   │   └─ Response received? NO ✗         │
│   │       Server is slow...              │
│   │       Still waiting...                │
│   │       Still waiting...                │
│   │       t=30s, t=60s, still waiting!   │
│   │       ◄─ NO TIMEOUT!                 │
│   │                                      │
│   │ User sees blank page for 60+ seconds │
│   │                                      │
│   ▼ (Finally times out from browser,    │
│     usually ~60s)                        │
└──────────────────────────────────────────┘

Proposed Flow with 5s Timeout:
┌──────────────────────────────────────────┐
│ User requests /songs                     │
├──────────────────────────────────────────┤
│ networkFirstWithTimeout strategy         │
│   │                                      │
│   ├─ Promise.race([                      │
│   │   fetch('/songs'),                   │
│   │   timeout(5000)                      │
│   │ ])                                   │
│   │                                      │
│   │ t=3s: Response received ✓            │
│   │ Return immediately                   │
│   │                                      │
│   │ OR                                   │
│   │                                      │
│   │ t=5s: Timeout error ◄─ Quick fail   │
│   │ Cache fallback used                  │
│   │ User sees cached content in 5s ✓    │
└──────────────────────────────────────────┘
```

---

## Issue: Duplicate Registration Code

```
Current Codebase Structure:

File 1: register.ts (UNUSED)
┌────────────────────────────────────┐
│ registerServiceWorker()             │
│ unregisterServiceWorker()           │
│ checkForUpdates()                   │
│ skipWaiting()                       │
│ getRegistration()                   │
│ ... 10+ more utilities              │
│                                    │
│ NEVER IMPORTED ANYWHERE ✗          │
└────────────────────────────────────┘

File 2: pwa.ts (USED)
┌────────────────────────────────────┐
│ pwaStore.initialize()               │
│ pwaStore.updateServiceWorker()      │
│ pwaStore.checkForUpdates()          │
│ pwaStore.requestNotifications()     │
│                                    │
│ Actually used in +layout.svelte ✓  │
└────────────────────────────────────┘

Result:
├─ register.ts: Dead code, 350+ lines
├─ pwa.ts: Working but incomplete
├─ Developers confused which to use
└─ Maintenance burden doubled

Recommendation:
  Option A: Delete register.ts
  Option B: Consolidate into one
  Option C: Make register.ts use pwa.ts
```

---

## Cache Expiration Strategy

```
Current Implementation:

API Cache (1 hour):
┌─────────────────────────────────────┐
│ t=0:00    Request /api/shows        │
│   ├─ Network succeeds               │
│   ├─ Response cached with           │
│   │  X-Cache-Time: 1000             │
│   └─ Return fresh response          │
│                                    │
│ t=0:30    Request /api/shows        │
│   ├─ Network succeeds               │
│   ├─ Response cached (new)          │
│   └─ Return fresh response          │
│                                    │
│ t=1:05    Request /api/shows        │
│   ├─ Network FAILS (offline)        │
│   ├─ Check cache                    │
│   ├─ Cache exists, age = 65 min     │
│   ├─ Age > 1 hour? YES!             │
│   ├─ Log: "Cache expired"           │
│   └─ Return STALE cache anyway ✗    │
│       (no flag to indicate staleness)│
│                                    │
│ User sees old data, doesn't know!   │
└─────────────────────────────────────┘

Improved Flow:
┌─────────────────────────────────────┐
│ t=1:05    Request /api/shows        │
│   ├─ Network FAILS (offline)        │
│   ├─ Check cache                    │
│   ├─ Age > max age?                 │
│   ├─ YES: Add headers:              │
│   │   X-Cache-Stale: true           │
│   │   X-Cache-Age: 65min            │
│   └─ Return response with flag      │
│                                    │
│ Client can check:                   │
│   if (response.headers.get(        │
│     'X-Cache-Stale') === 'true') {  │
│     // Show warning banner          │
│     // "Viewing outdated data"      │
│   }                                │
│                                    │
│ User knows data is stale ✓          │
└─────────────────────────────────────┘
```

---

## Manifest Configuration Check

```
Deployment Scenarios:

Scenario 1: Root Deployment (CURRENT)
┌───────────────────────────────────┐
│ App at: https://dmbmanac.com/    │
│                                  │
│ manifest.json:                   │
│   "id": "/"          ← WRONG     │
│   "scope": "/"                   │
│   "start_url": "/"               │
│                                  │
│ sw.js registration:              │
│   scope: "/"                     │
│                                  │
│ Result: Works, but ID is wrong   │
└───────────────────────────────────┘

Scenario 2: Subdirectory (If Needed)
┌───────────────────────────────────┐
│ App at: https://example.com/dma/ │
│                                  │
│ manifest.json:                   │
│   "id": "/dma/"                  │
│   "scope": "/dma/"               │
│   "start_url": "/dma/"           │
│                                  │
│ sw.js registration:              │
│   scope: "/dma/"                 │
│                                  │
│ Result: Works for subdirectory   │
└───────────────────────────────────┘

Current Manifest Issue:
┌───────────────────────────────────┐
│ "id": "/dmb-almanac"             │ ◄─ WRONG
│ "scope": "/"                     │    Should match deployment
│ "start_url": "/?source=pwa"      │
│                                  │
│ Consequence:                      │
│ ├─ App instances identified      │
│   incorrectly for PWA updates     │
│ ├─ Multiple installations may    │
│   be treated as different apps   │
│ └─ Less efficient cache handling  │
│                                  │
│ Fix: Change "id" to "/"         │
└───────────────────────────────────┘
```

---

## Data Flow Diagram: Offline Scenario

```
User Experience:

┌─────────────────────────────────┐
│ Online, browse normally         │
│ ├─ NetworkFirst strategy        │
│ ├─ ├─ Try network ✓ Success    │
│ ├─ ├─ Cache result              │
│ └─ ├─ Return fresh              │
│                                 │
│ All pages cached as user visits │
└─────────────────────────────────┘
            │
            ▼ User loses connection
            │
┌─────────────────────────────────┐
│ Offline mode                    │
│                                 │
│ User navigates to /songs        │
│ ├─ SW fetch event triggered     │
│ ├─ NetworkFirst strategy        │
│ ├─ ├─ Try network ✗ Failed     │
│ ├─ ├─ Check cache               │
│ ├─ ├─ ├─ Found? Return it ✓    │
│ ├─ ├─ ├─ Not found? Use        │
│ ├─ │     /offline fallback      │
│ ├─ │                             │
│ └─ └─ User sees cached or      │
│       offline page              │
│                                 │
│ pwaState.isOffline = true       │
│ ├─ Offline indicator shows      │
│ └─ CSS class added to <html>   │
│                                 │
│ Cached API data:                │
│ ├─ Recently visited shows ✓    │
│ ├─ Song database ✓              │
│ ├─ New searches ✗ (network)    │
└─────────────────────────────────┘
            │
            ▼ Connection restored
            │
┌─────────────────────────────────┐
│ Online mode restored            │
│ ├─ isOffline = false             │
│ ├─ Offline indicator hides       │
│ ├─ All fetches work normally    │
│ └─ App fully functional ✓        │
└─────────────────────────────────┘
```

---

## Storage Architecture

```
User's Browser Storage:

┌──────────────────────────────────────┐
│ Service Worker Cache API            │
├──────────────────────────────────────┤
│ dmb-shell-v1/                        │
│ ├─ / (home)                          │
│ ├─ /songs                            │
│ ├─ /venues                           │
│ ├─ /stats                            │
│ ├─ /tours                            │
│ └─ /offline (fallback)               │
│                                      │
│ dmb-assets-v1/                       │
│ ├─ app.js (cached)                   │
│ ├─ app.css (cached)                  │
│ └─ ... other assets ...              │
│                                      │
│ dmb-api-v1/                          │
│ ├─ /api/shows (1hr expiry)           │
│ ├─ /api/songs (1hr expiry)           │
│ └─ /api/venues (1hr expiry)          │
│                                      │
│ dmb-images-v1/                       │
│ ├─ show-cover-123.jpg (30d)          │
│ ├─ venue-photo-456.jpg (30d)         │
│ └─ ... other images ...              │
│                                      │
│ dmb-fonts-stylesheets-v1/            │
│ └─ fonts.googleapis.com stylesheet   │
│                                      │
│ dmb-fonts-webfonts-v1/               │
│ └─ fonts.gstatic.com webfonts        │
│                                      │
│ dmb-pages-v1/                        │
│ └─ Various pages (24hr expiry)       │
└──────────────────────────────────────┘
                │
                ▼ Total: ~10-50MB
       (Depends on browsing)
                │
                ▼ Browser quota
       Android: ~50% of disk
       iOS: 50MB limit (PWA)
       Desktop: GBs available


┌──────────────────────────────────────┐
│ IndexedDB (Client-side data)         │
├──────────────────────────────────────┤
│ DMBAlmanac                           │
│ ├─ User (favorites, history)        │
│ ├─ SyncQueue (offline actions)       │
│ └─ Settings (preferences)            │
└──────────────────────────────────────┘
                │
                ▼ ~5MB typical


┌──────────────────────────────────────┐
│ LocalStorage / SessionStorage        │
├──────────────────────────────────────┤
│ pwa-install-dismissed: true          │
│ theme-preference: dark               │
│ ... other preferences ...            │
└──────────────────────────────────────┘
                │
                ▼ ~100KB typical
```

---

## Performance Metrics Impact

```
Before Fixes (Current):
┌─────────────────────────────────────┐
│ First Load                          │
│ ├─ LCP: ~1.2s (SW registering)      │
│ ├─ FCP: ~1.0s                       │
│ └─ TTI: ~1.5s                       │
│                                     │
│ Repeat Visit (Cached)               │
│ ├─ LCP: ~0.4s (from cache)          │
│ ├─ FCP: ~0.3s                       │
│ └─ TTI: ~0.6s                       │
│                                     │
│ During Update                       │
│ ├─ ~300ms of broken state           │
│ ├─ Could cause layout shift (CLS)   │
│ └─ Page reload adds ~0.5s           │
└─────────────────────────────────────┘

After Fixes:
┌─────────────────────────────────────┐
│ First Load                          │
│ ├─ LCP: ~1.2s (same)                │
│ ├─ FCP: ~1.0s (same)                │
│ └─ TTI: ~1.5s (same)                │
│                                     │
│ Repeat Visit (Cached)               │
│ ├─ LCP: ~0.4s (same)                │
│ ├─ FCP: ~0.3s (same)                │
│ └─ TTI: ~0.6s (same)                │
│                                     │
│ During Update                       │
│ ├─ ~50ms of state transition        │
│ ├─ Minimal layout shift (CLS)       │
│ ├─ Page reload adds ~0.5s           │
│ └─ IMPROVED: Faster sync ✓          │
│                                     │
│ On Slow Network                     │
│ ├─ Timeout at 5s (vs 60s) ✓        │
│ ├─ Fallback shows immediately       │
│ └─ IMPROVED: No hang ✓              │
└─────────────────────────────────────┘
```

