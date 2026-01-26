---
name: pwa-api
version: 1.0.0
description: ---
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: pwa
complexity: advanced
tags:
  - pwa
  - chromium-143
  - apple-silicon

target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2

philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."

prerequisites: []
related_skills: []
see_also: []

minimum_example_count: 3
requires_testing: true
performance_critical: false

# Migration metadata
migrated_from: projects/dmb-almanac/docs/implementation-guides/PWA_API_REFERENCE.md
migration_date: 2026-01-25
---

# PWA API Implementation Reference
## DMB Almanac - Quick Lookup Guide

---

## FILE HANDLING API

### Manifest Entry
```json
{
  "file_handlers": [
    {
      "action": "/open-file",
      "accept": {
        "application/json": [".json"],
        "application/x-dmb": [".dmb"],
        "application/x-setlist": [".setlist"],
        "text/plain": [".txt"]
      },
      "launch_type": "single-client"
    }
  ]
}
```

### Browser Support
- Chrome 102+
- Edge 102+
- Samsung Browser 16+
- Firefox (planned)
- Safari: ❌ Not supported

### Detection
```typescript
export function isFileHandlingSupported(): boolean {
  return 'launchQueue' in window;
}
```

### Implementation
**File:** `/src/lib/utils/fileHandler.ts`
- `getFilesFromLaunchQueue(callback)` - Register handler
- `validateFileMetadata(file)` - Security check
- `validateJsonSchema(data, type)` - Schema validation
- `detectFileType(data, filename)` - Type detection
- `processSetlistFile(file)` - Full processing

### Usage
```typescript
import { getFilesFromLaunchQueue } from '$lib/utils/fileHandler';

getFilesFromLaunchQueue(async (files) => {
  for (const { file, name } of files) {
    const data = await processSetlistFile(file);
    if ('error' in data) {
      console.error(data.error);
    } else {
      console.log('Loaded:', data.data);
    }
  }
});
```

### Quick Win: Enable File Save-Back
```typescript
// NEW: src/lib/pwa/file-handles.ts
export async function saveToOriginalFile(
  fileHandle: FileSystemFileHandle,
  content: string
): Promise<void> {
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}
```

---

## PROTOCOL HANDLERS

### Manifest Entry
```json
{
  "protocol_handlers": [
    {
      "protocol": "web+dmb",
      "url": "/protocol?uri=%s"
    }
  ]
}
```

### Browser Support
- Chrome 96+
- Edge 96+
- Samsung Browser 17+
- Firefox (limited)
- Safari: ❌ Not supported

### Detection
```typescript
export function isProtocolHandlerSupported(): boolean {
  return 'registerProtocolHandler' in navigator;
}
```

### URI Format
```
web+dmb://show/2024-12-31
web+dmb://song/slug-name
web+dmb://venue/12345
web+dmb://share?data=...
```

### Implementation Needed
```typescript
// NEW: src/lib/utils/protocolHandler.ts
export function parseProtocolUri(uri: string) {
  const url = new URL(uri);
  return {
    action: url.hostname,
    params: Object.fromEntries(url.searchParams)
  };
}

// In route handler:
const encoded = $page.url.searchParams.get('uri');
if (encoded) {
  const action = parseProtocolUri(decodeURIComponent(encoded));
  // Route based on action.action and action.params
}
```

---

## WEB PUSH NOTIFICATIONS

### Manifest Entry
```json
{
  "name": "DMB Almanac",
  "short_name": "DMB Almanac"
}
```

### Browser Support
- Chrome 50+
- Edge 17+
- Firefox 48+
- Safari: 16+ (partial)
- Android: Full support

### Detection
```typescript
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator &&
         'PushManager' in window &&
         'Notification' in window;
}
```

### Permission Levels
```
"default"  - Not requested yet
"granted"  - User allowed notifications
"denied"   - User blocked notifications
```

### Implementation
**File:** `/src/lib/pwa/push-manager.ts`

```typescript
// Request permission
const permission = await Notification.requestPermission();

// Subscribe if granted
if (permission === 'granted') {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidPublicKey
  });

  // Send to server
  await fetch('/api/push-subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription)
  });
}
```

### Service Worker Handler
**File:** `/static/sw.js:1273-1326`

```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      data: data.data
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  clients.openWindow(event.notification.data.url);
});
```

### UI Component
**File:** `/src/lib/components/pwa/PushNotifications.svelte`

Ready-to-use component with:
- Permission request flow
- Subscribe/unsubscribe buttons
- Error messages
- State display

### Enhancement: Notification Actions
```javascript
// In service worker push handler:
const options = {
  body: data.body,
  actions: [
    { action: 'open', title: 'Open' },
    { action: 'snooze', title: 'Snooze' }
  ]
};

// In notificationclick handler:
if (event.action === 'snooze') {
  // Schedule retry after 1 hour
  scheduleNotificationResend(event.notification, 3600000);
}
```

---

## BACKGROUND SYNC

### Manifest Entry
None required (Service Worker API)

### Browser Support
- Chrome 49+
- Edge 79+
- Samsung Browser 5+
- Firefox: ❌ Not supported
- Safari: ❌ Not supported

### Detection
```typescript
export function isBackgroundSyncSupported(): boolean {
  return 'serviceWorker' in navigator &&
         'sync' in ServiceWorkerRegistration.prototype;
}
```

### Implementation
**File:** `/src/lib/services/offlineMutationQueue.ts`

```typescript
// Register for sync
async function registerSync(tag: string = 'sync-queue') {
  const registration = await navigator.serviceWorker.ready;
  if ('sync' in registration) {
    await registration.sync.register(tag);
  }
}

// Service worker handler
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(processSyncQueue());
  }
});
```

### Current Status
✅ Fully implemented and working
- Offline mutations queued in IndexedDB
- Automatic sync on return to online
- Exponential retry backoff
- Called from `/src/routes/+layout.svelte:50`

---

## PERIODIC SYNC

### Manifest Entry
None required (Service Worker API)

### Browser Support
- Chrome 80+
- Edge 80+
- Samsung Browser 12+
- Firefox: ❌ Not supported
- Safari: ❌ Not supported

### Detection
```typescript
export function isPeriodicSyncSupported(): boolean {
  return 'serviceWorker' in navigator &&
         'periodicSync' in ServiceWorkerRegistration.prototype;
}
```

### Implementation
**CRITICAL FIX NEEDED - Add to `/src/routes/+layout.svelte:54`:**

```typescript
// Register periodic sync after background sync setup
if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
  try {
    const registration = await navigator.serviceWorker.ready;

    if ('periodicSync' in registration) {
      await (registration as any).periodicSync.register('check-data-freshness', {
        minInterval: 24 * 60 * 60 * 1000 // 24 hours
      });
      console.log('[Layout] Periodic sync registered');
    }
  } catch (error) {
    console.debug('[Layout] Periodic sync registration failed:', error);
  }
}
```

### Service Worker Handler
**File:** `/static/sw.js:1346-1388`

```javascript
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-data-freshness') {
    event.waitUntil(checkDataFreshness());
  }
});

async function checkDataFreshness() {
  const response = await fetch('/api/data-version');
  if (response.ok) {
    const data = await response.json();
    // Notify clients of new version
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({
        type: 'DATA_UPDATE_AVAILABLE',
        version: data.version
      });
    }
  }
}
```

### Current Status
⚠️ Handler ready but NOT REGISTERED
Service worker ready to go, just needs the 15-min registration call

---

## BADGING API

### Manifest Entry
None required

### Browser Support
- Chrome 81+
- Edge 81+
- Samsung Browser 13+
- Safari 16+
- Firefox: ❌ Not supported

### Detection
```typescript
export function isAppBadgeSupported(): boolean {
  return 'setAppBadge' in navigator;
}
```

### Implementation
**File:** `/src/lib/utils/appBadge.ts`

```typescript
// Set badge with count
await navigator.setAppBadge(5);

// Clear badge
await navigator.clearAppBadge();
```

### Integration Needed
Add to `/src/routes/+layout.svelte`:

```typescript
import { setAppBadge, clearAppBadge } from '$lib/utils/appBadge';

// Update badge based on offline queue
$effect(() => {
  if (offlineMutationQueue.length > 0) {
    setAppBadge(offlineMutationQueue.length);
  } else {
    clearAppBadge();
  }
});
```

### Platform Display
| Platform | Appearance |
|----------|-----------|
| macOS | Badge on dock icon |
| Android | Badge in launcher |
| Windows | Badge on taskbar |
| iOS | Badge count (Safari) |
| Web | Generic badge number |

### Current Status
❌ Not integrated
Utilities complete, just needs 20-min connection to mutation queue

---

## LAUNCH HANDLER

### Manifest Entry
```json
{
  "launch_handler": {
    "client_mode": ["navigate-existing", "auto"]
  }
}
```

### Browser Support
- Chrome 110+
- Edge 110+
- Samsung Browser 23+
- Firefox: ❌ Not supported
- Safari: ❌ Not supported

### Client Modes
```
"navigate-existing"  - Navigate URL in existing window
"focus-existing"     - Just focus existing window
"auto"              - Browser chooses (fallback)
```

### Detection
```typescript
export function isLaunchHandlerSupported(): boolean {
  return 'launchQueue' in window;
}
```

### Implementation Needed
Create `/src/lib/pwa/launch-handler.ts`:

```typescript
export const launchHandlerManager = {
  async initialize() {
    if ('launchQueue' in window) {
      (window as any).launchQueue.setConsumer(async (launchParams) => {
        // Handle file launches
        if (launchParams.files?.length) {
          for (const handle of launchParams.files) {
            const file = await handle.getFile();
            // Route to file handler
            goto(`/open-file?file=${encodeURIComponent(file.name)}`);
          }
        }

        // Handle URL launches
        if (launchParams.targetURL) {
          const url = new URL(launchParams.targetURL);
          goto(url.pathname + url.search);
        }
      });
    }
  }
};
```

### Current Status
⚠️ Configured but not implemented
Needs handler code (~45 minutes to implement)

---

## WINDOW CONTROLS OVERLAY

### Manifest Entry
```json
{
  "display_override": ["window-controls-overlay", "standalone", "minimal-ui"]
}
```

### Browser Support
- Chrome 85+
- Edge 85+
- Samsung Browser 14+
- Firefox: ❌ Not supported
- Safari: ❌ Not supported

### CSS Variables
```css
env(titlebar-area-height)    /* Height reserved for title bar */
env(titlebar-area-x)         /* X offset of title bar */
env(titlebar-area-width)     /* Width of title bar area */
env(safe-area-inset-*)       /* Safe insets for notches, etc */
```

### Implementation Needed
Add to `/src/app.css`:

```css
@supports (padding: max(0px)) {
  html {
    padding-top: max(
      env(safe-area-inset-top, 0px),
      env(titlebar-area-height, 0px)
    );
  }
}

.titlebar-area {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: env(titlebar-area-height, 30px);
  background: var(--color-surface);
  -webkit-app-region: drag;  /* Allow window dragging */
  user-select: none;
}

.titlebar-area button,
.titlebar-area a {
  -webkit-app-region: no-drag;  /* Buttons should not drag */
}
```

### Current Status
⚠️ Configured but no CSS
Needs 30 min CSS + component implementation

---

## SHARE TARGET

### Manifest Entry
```json
{
  "share_target": {
    "action": "/search",
    "method": "GET",
    "params": {
      "text": "q"
    }
  }
}
```

### Browser Support
- Chrome 93+
- Edge 93+
- Samsung Browser 17+
- Firefox: ❌ Not supported
- Safari: ❌ Not supported

### Current Implementation
✅ Basic text sharing to /search route
⚠️ Missing file and URL support

### Enhanced Configuration (Needed)
```json
{
  "share_target": {
    "action": "/receive-share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url",
      "files": [
        {
          "name": "files",
          "accept": ["application/json", ".dmb", ".setlist"]
        }
      ]
    }
  }
}
```

### Handler Implementation
```typescript
// /src/routes/receive-share/+server.ts
export async function POST({ request }) {
  const formData = await request.formData();

  const title = formData.get('title') as string;
  const text = formData.get('text') as string;
  const url = formData.get('url') as string;
  const files = formData.getAll('files') as File[];

  // Process shared content
  // Store in IndexedDB for retrieval
  // Redirect to app

  return new Response(null, { status: 303, headers: { location: '/shared' } });
}
```

### Current Status
⚠️ Partially implemented
Basic text sharing works, needs file/URL support

---

## SCOPE EXTENSIONS

### Manifest Entry
```json
{
  "scope_extensions": [
    { "origin": "https://dmbalmanac.com" }
  ]
}
```

### Browser Support
- Chrome 123+
- Edge 123+
- Samsung Browser 26+
- Firefox: ❌ Not supported
- Safari: ❌ Not supported

### Use Cases
Extend service worker scope to additional origins:
- CDN domains for assets
- API subdomains
- Related domains

### Enhanced Configuration (Recommended)
```json
{
  "scope_extensions": [
    { "origin": "https://dmbalmanac.com" },
    { "origin": "https://cdn.dmbalmanac.com" },
    { "origin": "https://api.dmbalmanac.com" }
  ]
}
```

### Current Status
✅ Configured, ready to expand

---

## SERVICE WORKER EVENTS

### Install Event
```javascript
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
});
```

**File:** `/static/sw.js:157-188`
**Status:** ✅ Production-ready with error handling

### Activate Event
```javascript
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      );
    })
  );
});
```

**File:** `/static/sw.js:194-242`
**Status:** ✅ Cleanup + clients.claim()

### Fetch Event
```javascript
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Route to strategy based on URL pattern
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithExpiration(request, 3600));
  } else if (/\.(js|css)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
  // ... more routes
});
```

**File:** `/static/sw.js:248-333`
**Status:** ✅ Comprehensive routing with multiple strategies

### Sync Event
```javascript
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(processSyncQueue());
  }
});
```

**File:** `/static/sw.js:1331-1339`
**Status:** ✅ Registered and working

### Periodic Sync Event
```javascript
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-data-freshness') {
    event.waitUntil(checkDataFreshness());
  }
});
```

**File:** `/static/sw.js:1346-1354`
**Status:** ⚠️ Handler ready, registration needed

### Push Event
```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, { /* ... */ })
  );
});
```

**File:** `/static/sw.js:1273-1294`
**Status:** ✅ Complete with notification click handler

---

## CACHING STRATEGIES

### CacheFirst
Returns cached version if available, fetches from network otherwise.

```javascript
function cacheFirst(request) {
  return caches.match(request)
    .then((response) => {
      if (response) return response;
      return fetch(request).then((response) => {
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response.clone());
          });
        }
        return response;
      });
    });
}
```

**Use:** Static assets (JS, CSS, images)
**File:** `/static/sw.js:501-572`
**Status:** ✅ Implemented with expiration

### NetworkFirst
Tries network first, falls back to cache on timeout.

```javascript
function networkFirstWithExpiration(request, maxAgeSeconds) {
  // Deduplication to prevent duplicate requests
  // Timeout and retry logic
  // Cache with TTL metadata
  // Fallback to offline page
}
```

**Use:** API calls, pages
**File:** `/static/sw.js:581-705`
**Status:** ✅ Production-grade with deduplication

### StaleWhileRevalidate
Returns cached version immediately, updates in background.

```javascript
function staleWhileRevalidate(request, maxAgeSeconds) {
  // Return cached if available
  // Fetch in background to update cache
  // Check age and show staleness indicator if needed
}
```

**Use:** Images, fonts
**File:** `/static/sw.js:712-787`
**Status:** ✅ Complete implementation

---

## OFFLINE MUTATION QUEUE

### Location
**File:** `/src/lib/services/offlineMutationQueue.ts`

### Usage
```typescript
import { initializeQueue, addToQueue } from '$lib/services/offlineMutationQueue';

// Initialize in layout
initializeQueue();

// Add mutation when offline
if (!navigator.onLine) {
  await addToQueue({
    endpoint: '/api/favorites',
    method: 'POST',
    body: { showId: 123 }
  });
}

// Syncs automatically when online
// Or manually via registerSync('sync-queue')
```

### Status
✅ Fully implemented and integrated

---

## QUICK REFERENCE TABLE

| API | Version | Status | Priority | Time |
|-----|---------|--------|----------|------|
| File Handling | 102+ | Partial | HIGH | 1 hr |
| Protocol Handlers | 96+ | Partial | MEDIUM | 2 hr |
| Web Push | 50+ | Complete | - | - |
| Background Sync | 49+ | Complete | - | - |
| Periodic Sync | 80+ | Partial | CRITICAL | 15 min |
| Badging API | 81+ | Partial | HIGH | 20 min |
| Launch Handler | 110+ | Partial | HIGH | 45 min |
| Window Controls | 85+ | Partial | MEDIUM | 30 min |
| Share Target | 93+ | Basic | LOW | - |
| Scope Extensions | 123+ | Ready | LOW | - |

---

## UTILITY FUNCTIONS

### Supported Features Check
```typescript
export const pwaFeatures = {
  fileHandling: 'launchQueue' in window,
  protocolHandlers: 'registerProtocolHandler' in navigator,
  webPush: 'PushManager' in window,
  backgroundSync: 'sync' in ServiceWorkerRegistration.prototype,
  periodicSync: 'periodicSync' in ServiceWorkerRegistration.prototype,
  badging: 'setAppBadge' in navigator,
  launchHandler: 'launchQueue' in window,
  windowControls: navigator.windowControlsOverlay !== undefined,
  shareTarget: 'share' in navigator
};
```

### Platform Detection
```typescript
export function getPlatform() {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Windows/.test(ua)) return 'windows';
  if (/Mac/.test(ua)) return 'macos';
  if (/Linux/.test(ua)) return 'linux';
  return 'unknown';
}

export function isIosSafari() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) &&
         /Safari/.test(navigator.userAgent) &&
         !/Chrome/.test(navigator.userAgent);
}
```

---

## RELATED FILES

### Core Implementation
- `/static/manifest.json` - PWA configuration
- `/static/sw.js` - Service worker (1,475 lines)
- `/src/routes/+layout.svelte` - App initialization

### PWA Modules
- `/src/lib/pwa/` - Core PWA services
  - `push-manager.ts` - Web Push
  - `install-manager.ts` - Install prompts
  - `file-handles.ts` - File persistence (needed)
  - `launch-handler.ts` - Launch handling (needed)

### Utils
- `/src/lib/utils/fileHandler.ts` - File handling
- `/src/lib/utils/appBadge.ts` - Badging API
- `/src/lib/utils/protocolHandler.ts` - Protocol handling (needed)

### Components
- `/src/lib/components/pwa/` - Ready-to-use components
  - `PushNotifications.svelte`
  - `InstallPrompt.svelte`
  - `UpdatePrompt.svelte`

### Stores
- `/src/lib/stores/pwa.ts` - Reactive PWA state

---

## DEPLOYMENT CHECKLIST

- [ ] All manifest fields present and valid
- [ ] Service worker cache versioning updated
- [ ] VAPID keys configured for push
- [ ] HTTPS enabled (required for PWA)
- [ ] Icons provided in all sizes
- [ ] Offline fallback page ready
- [ ] Background sync queue persistent
- [ ] Tests pass on Chrome 143+
- [ ] iOS fallback behavior verified
- [ ] Performance targets met

---

**Last Updated:** January 23, 2026
**Status:** Ready for Implementation
**Next Step:** Review Quick Wins Guide

