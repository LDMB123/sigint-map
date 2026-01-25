# PWA Architecture & Components Diagram

**Reference:** Visual overview of DMB Almanac PWA components and their interactions

---

## 1. Service Worker Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     Service Worker Lifecycle                     │
└─────────────────────────────────────────────────────────────────┘

                            Browser
                              │
                              ▼
                    ┌──────────────────┐
                    │  Installation    │
                    │  Event (install) │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
         ✓ PASS        ⚠ FAIL        ℹ️ CACHE
    (skipWaiting)  (throw error)  (precache)
         │              │              │
         │              ▼              │
         │         ❌ Installation    │
         │            Failed          │
         │                            │
         └────────────┬───────────────┘
                      │
                      ▼
            ┌──────────────────────┐
            │  Activation Event    │
            │   (activate)         │
            └─────────┬────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
         ▼            ▼            ▼
    Cleanup Old  Clean Expired  Claim Clients
    Cache Vers.  Cache Entries
         │            │            │
         └────────────┼────────────┘
                      │
                      ▼
           ┌─────────────────────┐
           │ ACTIVE & CONTROLLING│
           │  Ready for Requests │
           └─────────┬───────────┘
                     │
          ┌──────────┼──────────┐
          │          │          │
          ▼          ▼          ▼
       Fetch      Message    Push/Sync
       Events    Handlers    Events
```

**Current Status:** ✓ Proper implementation with skipWaiting()

---

## 2. Request Routing & Caching Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│              Service Worker Fetch Event Routing                 │
└─────────────────────────────────────────────────────────────────┘

                    fetch(request)
                         │
                         ▼
                  ┌────────────────┐
                  │  GET request?  │
                  └────┬───────┬──┬┘
                    Yes│       No
                       ▼        └──→ Pass through

           Is it static asset?
           (/.*\.(js|css)$/)
                  ┌─ YES ────────────────────┐
                  │                          │
                  ▼                          │
            ┌──────────────┐                │
            │ CacheFirst   │                │
            ├──────────────┤                │
            │1. Check cache├────────────────┼──→ Hit? Return cached
            │2. Return if  │                │
            │   found      │                │
            │3. Fetch if   ├──────────────┐ │
            │   missing    │              │ │
            │4. Cache on   ├──────────────┼─┼──→ Store in cache
            │   return     │              │ │
            └──────────────┘              │ │
                  │                       │ │
                  └───────────────────────┘ │
                                            │
           Is it API route?                 │
           (/\/api\/.*)                     │
                  ┌─ YES ────────────────────┤
                  │                          │
                  ▼                          │
            ┌──────────────────┐            │
            │ NetworkFirst     │            │
            │ (1 hour expiry)  │            │
            ├──────────────────┤            │
            │1. Try network    ├──┐         │
            │   with timeout   │  │         │
            │   (3 seconds)    │  │         │
            │2. If success:    │  │         │
            │   cache + return │  │         │
            │3. If fail:       │  ├────────┼──→ Check cache
            │   check cache    │  │ NO     │
            │4. Return cached  │  │ TIMEOUT│
            │   or offline page│  │        │
            └──────────────────┘  │        │
                  │                │        │
                  ▼                │        │
            Is image?              │        │
            (/\.(png|jpg|...)/)    │        │
                  ┌─ YES ──────────┤        │
                  │                │        │
                  ▼                │        │
            ┌──────────────────┐   │        │
            │StaleWhileRevalue │   │        │
            │(30 day expiry)   │   │        │
            ├──────────────────┤   │        │
            │1. Return cached  ├───┼───────┼──→ Return immediately
            │   immediately    │   │       │
            │2. Update in bg   │   │       │
            └──────────────────┘   │       │
                                   │       │
            Other content?         │       │
            (/songs|/venues/etc)   │       │
                  ┌─ YES ──────────┘       │
                  │                        │
                  ▼                        │
            ┌──────────────────┐           │
            │ NetworkFirst     │           │
            │ (15 min expiry)  │           │
            ├──────────────────┤           │
            │ Same as API      │           │
            └──────────────────┘           │
                                           │
            Default fallback               │
                  │                        │
                  └─ YES ──────────────────┘
```

**Current Status:** ✓ Properly implemented with all 4 strategies

---

## 3. Cache Management

```
┌─────────────────────────────────────────────────────────────────┐
│                 Cache Storage Architecture                       │
└─────────────────────────────────────────────────────────────────┘

indexedDB (Client-side)
  └─ dmb-almanac-db
      ├─ shows
      ├─ songs
      ├─ venues
      ├─ favorites
      ├─ attended
      ├─ syncQueue          ◄──── Background Sync
      └─ syncMeta

Browser Cache API (Static)
  ├─ dmb-shell-v-20250122-1430
  │   ├─ /
  │   ├─ /songs
  │   ├─ /venues
  │   ├─ /stats
  │   ├─ /tours
  │   ├─ /shows
  │   ├─ /guests
  │   ├─ /liberation
  │   ├─ /search
  │   └─ /offline
  │
  ├─ dmb-assets-v-20250122-1430
  │   ├─ app.js (with hash)
  │   ├─ chunk1.js
  │   ├─ chunk2.js
  │   └─ ...
  │
  ├─ dmb-api-v-20250122-1430     ◄──── 1 hour expiry
  │   ├─ /api/shows
  │   ├─ /api/songs
  │   ├─ /api/venues
  │   └─ ... (max 50 entries)    ◄──── ⚠️ No size limit (FIX)
  │
  ├─ dmb-pages-v-20250122-1430   ◄──── 15 min expiry
  │   ├─ /songs
  │   ├─ /venues
  │   ├─ /shows/123
  │   └─ ... (max 50 entries)    ◄──── ⚠️ No size limit (FIX)
  │
  ├─ dmb-images-v-20250122-1430  ◄──── 30 day expiry
  │   ├─ /images/band.jpg
  │   ├─ /images/venue.jpg
  │   └─ ... (max 100 entries)
  │
  ├─ dmb-fonts-stylesheets-v-20250122-1430
  │   └─ https://fonts.googleapis.com/css2?...
  │
  ├─ dmb-fonts-webfonts-v-20250122-1430
  │   ├─ https://fonts.gstatic.com/roboto.woff2
  │   └─ ...
  │
  └─ dmb-wasm-v-20250122-1430
      └─ /wasm/dmb-transform.wasm


Storage Quota Monitoring
┌──────────────────────────────┐
│ navigator.storage.estimate() │
├──────────────────────────────┤
│ usage: bytes used            │
│ quota: bytes available       │
│ percentage: usage/quota * 100│
└──────────────────────────────┘
    │
    └──► ⚠️ NO ENFORCEMENT      ◄──── FIX: Add limits


Cache Cleanup Timeline
┌────────────────┐         ┌──────────────┐        ┌──────────────┐
│ SW Activation  │         │ Periodic     │        │ User Trigger │
│ (on update)    │         │ Cleanup      │        │ (manual)     │
└────────┬───────┘         └──────┬───────┘        └──────┬───────┘
         │                        │                        │
         ▼                        ▼                        ▼
    Delete old           ⚠️ NEVER RUNS    Already has handler
    cache versions       (NO SCHEDULE)     (triggerCacheCleanup)
         │                        │                        │
         └────────────┬───────────┴────────────────────────┘
                      │
                      ▼
        ┌────────────────────────────┐
        │ Clean expired entries      │
        │ Remove by X-Cache-Time     │
        └────────────────────────────┘
             │
             └──► ✓ Works on activate
                  ⚠️ Needs periodic trigger
```

**Issues Found:**
- ⚠️ No cache size limits enforced per cache
- ⚠️ Periodic cleanup never triggered
- ⚠️ Manual cleanup function exists but unused

**Fixes Needed:**
- ✓ Add `limitCacheSize()` function
- ✓ Add periodic cleanup scheduler
- ✓ Add size limit configuration

---

## 4. Service Worker Message Channel

```
┌────────────────────────────────────────────────────────────────┐
│             Client ←→ Service Worker Communication             │
└────────────────────────────────────────────────────────────────┘

CLIENT (Browser Tab)                   SERVICE WORKER
    │                                         │
    ├─ register('/sw.js') ─────────────────→ Install event
    │                                         │
    ├─ listen(updatefound) ←──────────────── New version found
    │                                         │
    ├─ postMessage({                         │
    │   type: 'SKIP_WAITING'      ──────────→ Activate immediately
    │ })                                      │
    │                                         │
    ├─ postMessage({                         │
    │   type: 'GET_CACHE_STATUS' ──────────→ Collect cache info
    │ }) ← [MessageChannel]                   │
    │                              ←──────── Cache summary
    │                              [channel]
    │
    ├─ postMessage({                         │
    │   type: 'CLEANUP_CACHES'  ──────────→ Start cleanup
    │ }) ← [MessageChannel]                   │
    │                              ←──────── Cleanup result
    │                              [channel]
    │
    ├─ postMessage({                         │
    │   type: 'CHECK_CRITICAL_  ──────────→ Check version
    │          UPDATE'                        │
    │ }) ← [MessageChannel]                   │
    │                              ←──────── Version info
    │                              [channel]
    │
    └─ listen(controllerchange) ←────────── New SW activated
                                            (page reload)

✓ Implemented: MessageChannel for safe async communication
✓ Implemented: Bi-directional messaging
⚠️ Issue: Cache cleanup handler never called
```

**Current Status:** Excellent implementation with MessageChannel API

---

## 5. Offline Data Sync

```
┌────────────────────────────────────────────────────────────────┐
│                  Offline Data Synchronization                  │
└────────────────────────────────────────────────────────────────┘

USER OFFLINE
    │
    ├─ User action (favorite show, mark attended)
    │   │
    │   └──→ Store in IndexedDB.syncQueue
    │        {
    │          id: uuid,
    │          endpoint: '/api/favorites',
    │          method: 'POST',
    │          payload: {...},
    │          timestamp: now
    │        }
    │
    └─ App shows visual indicator
       "Changes not synced"

USER COMES BACK ONLINE
    │
    ├─ 'online' event fires
    │   │
    │   └──→ pwaStore.initialize() detects change
    │        │
    │        └──→ isOffline = false
    │             │
    │             └──→ UI updates (remove indicator)
    │
    └─ Background Sync triggers
       (manual via registerSync)
           │
           └──→ SW sync event
               │
               └──→ processSyncQueue()
                   │
                   └──→ For each item:
                       ├─ fetch(endpoint, {
                       │   method: item.method,
                       │   body: item.payload
                       │ })
                       │
                       ├─ If success: delete from syncQueue
                       │
                       └─ If fail: keep for retry


PERIODIC BACKGROUND SYNC
(Optional - requires permission)
    │
    ├─ Registration request
    │  (registerPeriodicSync)
    │
    ├─ SW periodicsync event
    │   │
    │   └──→ checkDataFreshness()
    │        ├─ fetch('/api/data-version')
    │        └─ Notify clients if update available
    │
    └─ Client loads fresh data


✓ Infrastructure ready
⚠️ Needs API endpoint implementation
✓ IndexedDB schema defined
```

---

## 6. Manifest & Installation

```
┌────────────────────────────────────────────────────────────────┐
│           Web Manifest & App Installation Flow                 │
└────────────────────────────────────────────────────────────────┘

BROWSER LOAD
    │
    ├─ Parse app.html
    │   │
    │   └─→ Find <link rel="manifest" href="/manifest.json">
    │       │
    │       └─→ Fetch and validate manifest
    │           │
    │           ├─ Check required fields
    │           │   ✓ name
    │           │   ✓ short_name
    │           │   ✓ start_url
    │           │   ✓ display: standalone
    │           │   ✓ icons (192x192, 512x512)
    │           │
    │           └─ Cache manifest in memory
    │
    ├─ Service Worker ready?
    │   └─ YES → Show install prompt
    │       (beforeinstallprompt event)
    │
    ├─ HTTPS or localhost?
    │   └─ YES → Eligible for installation
    │
    └─ User engagement?
        └─ YES (30+ seconds) → Ready to install


INSTALL PROMPT
    │
    ├─ beforeinstallprompt event fires
    │   │
    │   └─→ InstallPrompt.svelte
    │       ├─ Shows custom install button
    │       ├─ Prevents default browser prompt
    │       └─ Stores deferred prompt
    │
    ├─ User clicks "Install"
    │   │
    │   └─→ deferredPrompt.prompt()
    │       ├─ Browser shows installation dialog
    │       ├─ User selects location
    │       └─ App installed with icon


POST-INSTALL
    │
    ├─ appinstalled event fires
    │
    ├─ App launches in standalone mode
    │   ├─ display: standalone
    │   ├─ No address bar
    │   ├─ No browser UI
    │   └─ Full screen
    │
    ├─ Service Worker loads
    │
    ├─ Caches precache URLs
    │
    └─ Ready for offline use


MANIFEST CONFIGURATION
┌─────────────────────────┐
│ name (160+ chars recommended)
│ short_name (12 chars)
│ start_url (/?source=pwa)
│ display (standalone)
│ display_override: [
│   "window-controls-overlay",
│   "standalone",
│   "minimal-ui"
│ ]
│ icons (14 total)
│   ├─ Standard: 16-512px
│   ├─ Maskable: 192px, 512px
│   └─ All type: "image/png"
│ screenshots
│   ├─ Desktop (1920x1080)
│   ├─ Mobile (750x1334)
│   └─ Tablet (optional - missing)
│ shortcuts (5 configured)
│ share_target (configured)
│ file_handlers (configured)
│ protocol_handlers (configured)
└─────────────────────────┘

✓ Complete manifest
✓ Proper icon coverage
⚠️ Missing tablet screenshots
⚠️ Manifest not preloaded

Status: 9/10
```

---

## 7. Platform Compatibility

```
┌────────────────────────────────────────────────────────────────┐
│              Platform-Specific PWA Features                    │
└────────────────────────────────────────────────────────────────┘

CHROME / CHROMIUM (Desktop & Android)
✓ Service Workers        Full support
✓ Web App Manifest       Full support
✓ Cache API              Full support
✓ Push Notifications     Full support
✓ Background Sync        Full support
✓ Periodic Sync          Full support
✓ File Handling API      Full support (Chrome 80+)
✓ Protocol Handling      Full support (Chrome 71+)
✓ Content Indexing       Full support (Chrome 84+)
✓ Window Controls        Full support (Chrome 86+)
✓ Shortcuts              Full support (Chrome 96+)

Storage: 50-100MB (varies by device)
Status: ✓ EXCELLENT


FIREFOX (Desktop & Android)
✓ Service Workers        Full support
✓ Web App Manifest       Full support
✓ Cache API              Full support
✓ Push Notifications     Full support
✓ Background Sync        Full support
✗ File Handling          Not supported
✗ Protocol Handling      Limited
✗ Window Controls        Not supported

Storage: Varies (typically 50MB+)
Status: ✓ GOOD


SAFARI iOS (iPhone/iPad)
✗ beforeinstallprompt    Not supported
  → Manual "Add to Home Screen" needed
✓ Web App Manifest       Partial support
✓ Service Workers        Limited (iOS 16.4+)
✗ Push Notifications     iOS 16.4+ only
✗ Background Sync        Not supported
✗ File Handling          Not supported
✗ Window Controls        Not supported

Storage: 50MB max
Cache Lifetime: 7 days inactive
Status: ⚠️ LIMITED

⚠️ Missing: iOS limitation documentation


SAFARI macOS
✓ beforeinstallprompt    Full support
✓ Service Workers        Full support
✓ Web App Manifest       Full support
✓ Cache API              Full support
✗ Push Notifications     Not supported
✗ Background Sync        Not supported

Status: ✓ GOOD


EDGE (Desktop)
Same as Chromium
✓ Full support

Status: ✓ EXCELLENT
```

---

## 8. Update & Versioning

```
┌────────────────────────────────────────────────────────────────┐
│           Service Worker Update & Versioning                   │
└────────────────────────────────────────────────────────────────┘

BUILD TIME
    │
    └─→ vite.config.ts
        │
        └─→ __BUILD_TIMESTAMP__ = YYYYMMDDHHMM
            (e.g., 202601221430)
            │
            └─→ Injected into sw.js as CACHE_VERSION


SW VERSION TRACKING
┌────────────────────────────────────────┐
│ const CACHE_VERSION = `v-20250122-1430`│
│                                         │
│ CACHES_CONFIG {                        │
│   SHELL: `dmb-shell-${CACHE_VERSION}` │
│   API: `dmb-api-${CACHE_VERSION}`     │
│   PAGES: `dmb-pages-${CACHE_VERSION}` │
│   ...                                  │
│ }                                      │
└────────────────────────────────────────┘

Each build creates new cache names
→ Old versions automatically separated
→ Clean activation of new version


UPDATE DETECTION
USER BROWSER                          SERVER
    │                                    │
    ├─ Get registration ─────────────→ Check sw.js
    │                                    │
    │ Listen for updatefound event       │
    │                                    │
    └─ New version found? ←────────── Hash differs
        │
        └─→ Call registration.update()
            │
            └─→ Downloaded & installed
                │
                └─→ Waiting for activation
                    (skipWaiting if needed)


CACHE INVALIDATION
Old Version (v-20250120-1000)
├─ dmb-shell-v-20250120-1000     ← Will be deleted
├─ dmb-api-v-20250120-1000       ← Will be deleted
├─ dmb-pages-v-20250120-1000     ← Will be deleted
└─ ...

New Version (v-20250122-1430)
├─ dmb-shell-v-20250122-1430     ← Created
├─ dmb-api-v-20250122-1430       ← Created
├─ dmb-pages-v-20250122-1430     ← Created
└─ ...

On activate event:
    ├─ Delete all caches not in CACHES_CONFIG
    ├─ Clean expired entries
    └─ Claim all clients


UPDATE PROMPT
┌────────────────────────────────────────┐
│ UpdatePrompt.svelte                    │
│                                        │
│ Detects waiting worker                 │
│ Shows "Update available" notification  │
│ User clicks → skipWaiting()            │
│ → Immediate activation                 │
│ → Page reload                          │
└────────────────────────────────────────┘

⚠️ Issue: Version detection uses regex
    fetch('/sw.js?cache-bust=' + Date.now())
    text.match(/const CACHE_VERSION = '([^']+)'/)

    Better: Use /api/version endpoint

✓ Update detection works
✓ Automatic cache cleanup
```

---

## 9. Component Interaction Map

```
┌────────────────────────────────────────────────────────────────┐
│          Component Interaction & Data Flow                     │
└────────────────────────────────────────────────────────────────┘

+layout.svelte (Root)
    │
    ├─→ pwaStore.initialize()
    │   ├─→ Register SW
    │   ├─→ Listen for updates
    │   ├─→ Track offline status
    │   └─→ Return cleanup function
    │
    ├─→ pwaStore.startPeriodicCacheCleanup()
    │   └─→ Trigger cleanup hourly
    │
    ├─→ InstallPrompt.svelte
    │   ├─→ Listen for beforeinstallprompt
    │   ├─→ Show install button
    │   └─→ Handle user response
    │
    ├─→ UpdatePrompt.svelte
    │   ├─→ Detect waiting SW
    │   ├─→ Show update notification
    │   └─→ Call skipWaiting()
    │
    ├─→ StorageQuotaMonitor.svelte
    │   ├─→ Check navigator.storage.estimate()
    │   ├─→ Show usage percentage
    │   └─→ Warn if near quota
    │
    ├─→ DataFreshnessIndicator.svelte
    │   ├─→ Show last sync time
    │   ├─→ Indicate if stale
    │   └─→ Timestamp formatting
    │
    └─→ offline/+page.svelte
        ├─→ Listen for online/offline events
        ├─→ Display cached data stats
        ├─→ Show data freshness
        └─→ Provide offline info


DATA FLOW
┌──────────────┐
│ API Response │
└───────┬──────┘
        │
        ▼
    ┌────────────┐     ┌──────────────┐
    │ SW Caching │────→│ Browser Cache│
    └────────┬───┘     └──────────────┘
             │
             ▼
        ┌────────────┐     ┌──────────────┐
        │ Dexie.js   │────→│ IndexedDB    │
        │ (client DB)│     └──────────────┘
        └────────────┘


EVENT FLOW
         Network Down
              │
              ▼
         onoffline event
              │
              ├─→ pwaStore.isOffline = true
              │
              ├─→ Remove data-offline attribute
              │
              └─→ offline/+page.svelte shows


         Network Up
              │
              ▼
         ononline event
              │
              ├─→ pwaStore.isOffline = false
              │
              ├─→ Trigger background sync
              │
              └─→ processSyncQueue()
```

---

## 10. File Structure Overview

```
dmb-almanac-svelte/
│
├── src/
│   ├── lib/
│   │   ├── sw/
│   │   │   └── register.ts           ◄─ Service Worker registration
│   │   │                              (HIGH PRIORITY FIX)
│   │   │
│   │   ├── stores/
│   │   │   ├── pwa.ts                ◄─ PWA state management
│   │   │   └── dexie.ts              ◄─ Database state
│   │   │
│   │   ├── db/
│   │   │   └── dexie/
│   │   │       ├── db.ts             ◄─ IndexedDB instance
│   │   │       ├── schema.ts         ◄─ Dexie schema
│   │   │       └── sync.ts           ◄─ Background sync
│   │   │
│   │   ├── components/
│   │   │   └── pwa/
│   │   │       ├── InstallPrompt.svelte
│   │   │       ├── UpdatePrompt.svelte
│   │   │       ├── StorageQuotaMonitor.svelte
│   │   │       ├── DataFreshnessIndicator.svelte
│   │   │       └── StaleDataWarning.svelte  ◄─ MEDIUM PRIORITY FIX
│   │   │
│   │   └── utils/
│   │       ├── cacheStatus.ts         ◄─ MEDIUM PRIORITY FIX
│   │       └── contentIndex.ts
│   │
│   └── routes/
│       ├── +layout.svelte             ◄─ Initialize PWA
│       └── offline/
│           └── +page.svelte           ◄─ Offline fallback
│
├── static/
│   ├── sw.js                          ◄─ Service Worker
│   │                                   (MEDIUM PRIORITY FIXES)
│   └── manifest.json                  ◄─ Web Manifest
│                                       (LOW PRIORITY FIX)
│
├── src/app.html                       ◄─ App shell
│                                       (LOW PRIORITY FIX)
│
├── svelte.config.js                   ◄─ SvelteKit config
│                                       (serviceWorker: false)
│
├── vite.config.ts                     ◄─ Vite configuration
│                                       (BUILD_TIMESTAMP injection)
│
└── PWA_AUDIT_REPORT.md               ◄─ THIS AUDIT
```

---

## Summary: Component Health

| Component | Status | Score | Issues | Priority |
|-----------|--------|-------|--------|----------|
| SW Registration | ✓ Works | 8/10 | Environment pattern | HIGH |
| SW Lifecycle | ✓ Excellent | 9/10 | None | — |
| Caching Strategy | ✓ Excellent | 9/10 | None | — |
| Cache Cleanup | ⚠ Partial | 6/10 | Never called | MEDIUM |
| Cache Limits | ✗ Missing | 4/10 | No enforcement | MEDIUM |
| Update Detection | ✓ Good | 8/10 | Fragile regex | LOW |
| Stale Indication | ⚠ Partial | 5/10 | Not marked | MEDIUM |
| Web Manifest | ✓ Excellent | 9/10 | Preload missing | LOW |
| Offline UI | ✓ Excellent | 9/10 | None | — |
| Push Notifications | ✓ Good | 8/10 | No validation | LOW |
| iOS Support | ⚠ Limited | 6/10 | Not documented | LOW |
| Overall | ✓ Ready | **8.5/10** | 8 issues | **2-5 hrs** |

---

**For detailed implementation, see: PWA_FIXES_IMPLEMENTATION_GUIDE.md**
