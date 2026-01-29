# PWA Implementation Roadmap

## Phase 1: Critical Gaps (Sprint 1-2)

### 1.1 POST Share Target Implementation

**Why**: Enable file sharing from system share sheets on Android/iOS

**Files to Create**:
- `app/src/routes/receive-share/+page.js` - Load handler
- `app/src/routes/receive-share/+page.svelte` - UI for received shares

**Manifest Update**:
```json
{
  "share_target": {
    "action": "/receive-share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "shared_title",
      "text": "shared_text",
      "url": "shared_url",
      "files": [
        {
          "name": "shared_files",
          "accept": [
            "image/*",
            "application/json",
            "text/csv",
            "text/plain"
          ]
        }
      ]
    }
  }
}
```

**Service Worker Handler** (in `app/static/sw.js`):
```javascript
// Add to fetch event handler
if (url.pathname === '/receive-share' && event.request.method === 'POST') {
  event.respondWith(handleShareTarget(event.request));
}

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();

    const shareData = {
      title: formData.get('shared_title'),
      text: formData.get('shared_text'),
      url: formData.get('shared_url'),
      files: formData.getAll('shared_files'),
      timestamp: Date.now()
    };

    // Store in IndexedDB
    const db = await openDB('dmb-almanac');
    const tx = db.transaction(['shareQueue'], 'readwrite');
    await tx.objectStore('shareQueue').add(shareData);

    // Redirect to process page
    return Response.redirect('/receive-share?id=' + Date.now(), 303);
  } catch (error) {
    return new Response('Failed to process share', { status: 400 });
  }
}
```

**Processing Logic** (`+page.js`):
```javascript
export async function load({ url, parent }) {
  await parent();

  const shareId = url.searchParams.get('id');
  if (!shareId) {
    return { status: 'waiting', shares: [] };
  }

  try {
    const db = await openDB('dmb-almanac');
    const shares = await db.getAll('shareQueue');

    return {
      status: 'success',
      shares: shares.map(share => ({
        ...share,
        suggestedRoute: detectShareType(share)
      }))
    };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

function detectShareType(share) {
  if (share.files?.length) {
    // Detect file type and suggest route
    const file = share.files[0];
    if (file.type.startsWith('image/')) return '/import-image';
    if (file.type === 'application/json') return '/import-json';
    if (file.type === 'text/csv') return '/import-csv';
  }
  if (share.url?.includes('spotify.com')) return '/import-spotify';
  if (share.url?.includes('setlist.fm')) return '/import-setlist';
  return '/search?q=' + encodeURIComponent(share.text || share.title);
}
```

**Effort**: 2-3 days

---

### 1.2 iOS File Upload Fallback

**Why**: iOS doesn't support file_handlers, need form-based upload

**Files to Update**:
- `app/src/routes/open-file/+page.svelte` - Add file input

**Implementation**:
```svelte
<script>
  import { goto } from '$app/navigation';

  function detectOS() {
    const ua = navigator.userAgent;
    return {
      isIOS: /iPad|iPhone|iPod/.test(ua),
      isAndroid: /Android/.test(ua)
    };
  }

  const { isIOS } = detectOS();
  let showManualUpload = isIOS || !('launchQueue' in window);

  async function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const data = JSON.parse(content);

      // Determine type and encode
      const fileType = detectFileType(data, file.name);
      const encoded = btoa(encodeURIComponent(content));

      // Navigate with file data
      await goto(`/open-file?file=${encoded}&type=${fileType}`);
    } catch (error) {
      errorMessage = error.message;
    }
  }

  function detectFileType(data, filename) {
    const ext = filename.split('.').pop()?.toLowerCase();

    if (ext === 'dmb' || ext === 'setlist') {
      if (data.date) return 'show';
      if (Array.isArray(data)) return 'batch';
    }

    if (data.date && data.venue) return 'show';
    if (data.slug && data.title) return 'song';
    if (data.shows && Array.isArray(data.shows)) return 'concert';
    if (Array.isArray(data)) return 'batch';

    return 'unknown';
  }
</script>

{#if showManualUpload}
  <div class="file-input-section">
    <h2>Upload Concert Data</h2>
    <label class="file-input-label">
      <input
        type="file"
        accept=".json,.dmb,.setlist,.txt"
        on:change={handleFileSelect}
        aria-label="Select file to upload"
      />
      <span class="file-input-text">
        Click to select or drag file here
      </span>
    </label>
    <p class="supported-formats">
      Supported: .json, .dmb, .setlist, .txt
    </p>
  </div>
{/if}

<style>
  .file-input-label {
    display: block;
    border: 2px dashed var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--space-8);
    text-align: center;
    cursor: pointer;
    transition: all var(--transition-normal);
  }

  .file-input-label:hover {
    border-color: var(--color-primary-500);
    background: var(--background-secondary);
  }

  .file-input-label input {
    display: none;
  }

  .file-input-text {
    display: block;
    font-size: var(--text-lg);
    font-weight: var(--font-medium);
    color: var(--foreground);
  }

  .supported-formats {
    font-size: var(--text-sm);
    color: var(--foreground-secondary);
    margin-top: var(--space-2);
  }
</style>
```

**Effort**: 1-2 days

---

### 1.3 iOS Limitations Documentation

**File to Create**: `app/src/lib/pwa/iOS_LIMITATIONS.md`

**Content**:
```markdown
# iOS PWA Limitations & Workarounds

## What Doesn't Work on iOS Safari

### 1. File Handlers API
**Limitation**: iOS Safari doesn't support File Handlers API

**Workaround**: Use file input form
```html
<input type="file" accept=".json,.dmb" />
```

**Status**: Fallback implemented in `/open-file` route

### 2. Protocol Handlers
**Limitation**: `web+dmb://` protocol links don't work

**Workaround**: Use HTTP deep links
- `web+dmb://show/1991-03-23` → `/open/show/1991-03-23`
- `web+dmb://song/ants-marching` → `/open/song/ants-marching`

**Status**: Not yet implemented, planned for Phase 2

### 3. Share Target (POST)
**Limitation**: POST multipart/form-data not fully supported

**Workaround**: Use GET method (already implemented)
- Sharing text: ✅ Works
- Sharing URLs: ✅ Works
- Sharing files: ❌ Not supported

### 4. Background Sync
**Limitation**: Service Worker doesn't run in background

**Workaround**: Sync on app focus
```javascript
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && navigator.onLine) {
    syncQueue();
  }
});
```

### 5. Periodic Background Sync
**Limitation**: Not supported on iOS

**Workaround**: Manual refresh button or timed polling

### 6. Push Notifications
**Limitation**: Only works in installed PWA mode (iOS 16.4+)

**Workaround**:
- Users must "Add to Home Screen" first
- Limited to installed PWA, not Safari
- Requires HTTPS

### Detection Code
```javascript
const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isPWA = window.navigator.standalone === true ||
              window.matchMedia('(display-mode: standalone)').matches;

if (iOS && !isPWA) {
  // Show install prompt
  showInstallPrompt();
}
```

## Feature Comparison

| Feature | iOS Safari | Workaround |
|---------|------------|-----------|
| File Handlers | ❌ | Form input |
| Protocol Handlers | ❌ | HTTP deep links |
| Share Target (POST) | ❌ | GET only |
| Background Sync | ❌ | Focus-based sync |
| Badging API | ❌ | Manual counter |
| Push Notifications | ⚠️ | Requires installation |

## Best Practices

1. **Always provide fallbacks** for advanced APIs
2. **Detect capabilities** before using them
3. **Test on real iOS devices** (not just Safari on Mac)
4. **Guide users** to install PWA on iOS
5. **Document limitations** clearly in app
```

**Effort**: 1 day

---

## Phase 2: High-Value Enhancements (Sprint 3-4)

### 2.1 HTTP Deep Links (iOS Protocol Handler Alternative)

**Why**: iOS doesn't support `web+dmb://` protocol, need HTTP alternative

**Files to Create**:
- `app/src/routes/open/+page.js` - Unified deep link handler
- `app/src/routes/open/[type]/[id]/+page.js` - Dynamic routes

**Implementation**:
```javascript
// app/src/routes/open/+page.js
export async function load({ url, parent }) {
  await parent();

  const type = url.searchParams.get('type');
  const id = url.searchParams.get('id');

  if (!type || !id) {
    return { status: 'waiting' };
  }

  const routes = {
    'show': `/shows/${id}`,
    'song': `/songs/${id}`,
    'venue': `/venues/${id}`,
    'guest': `/guests/${id}`,
    'tour': `/tours/${id}`,
    'search': `/search?q=${encodeURIComponent(id)}`
  };

  const target = routes[type];
  if (!target) {
    return { status: 'error', error: 'Invalid type' };
  }

  redirect(302, target);
}
```

**Usage**:
- `https://dmbalmanac.com/open?type=show&id=1991-03-23`
- `https://dmbalmanac.com/open?type=song&id=ants-marching`
- `https://dmbalmanac.com/open?type=search&id=phish`

**Advantage**: Works on all platforms including iOS

**Effort**: 1-2 days

---

### 2.2 Badging API Implementation

**Why**: Show notification counts on app icon

**Files to Update**:
- Notification/sync handlers
- App initialization

**Implementation**:
```javascript
// In notification handler
async function handleNotification(data) {
  // ... existing code ...

  // Update badge
  if ('setAppBadge' in navigator) {
    const count = await getUnreadCount();
    if (count > 0) {
      navigator.setAppBadge(count);
    } else {
      navigator.clearAppBadge();
    }
  }
}

// In settings when user clears notifications
function clearNotifications() {
  // ... existing code ...

  // Clear badge
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge();
  }
}

// In service worker periodic sync
async function checkDataFreshness() {
  // ... existing code ...

  // Notify clients to update badge
  const unreadCount = await getUnreadCount();
  for (const client of clients) {
    client.postMessage({
      type: 'UPDATE_BADGE',
      count: unreadCount
    });
  }
}
```

**Effort**: 1-2 days

---

### 2.3 Window Controls Overlay (Desktop Enhancement)

**Why**: Better desktop UX with custom title bar

**Files to Update**:
- `app/static/manifest.json` - Already has `window-controls-overlay`
- `app/src/app.svelte` - Add title bar area
- `app/src/app.css` - Style title bar

**Implementation**:
```javascript
// Detect window controls overlay
export function initializeWindowControlsOverlay() {
  if (!navigator.windowControlsOverlay) return;

  const overlay = navigator.windowControlsOverlay;

  // Check if overlay is visible
  if (overlay.visible) {
    const rect = overlay.getTitlebarAreaRect();

    // Position custom title bar
    const titleBar = document.querySelector('.title-bar');
    if (titleBar) {
      titleBar.style.marginInlineEnd = `${rect.width}px`;
    }
  }

  // Listen for visibility changes
  overlay.addEventListener('geometrychange', () => {
    const rect = overlay.getTitlebarAreaRect();
    const titleBar = document.querySelector('.title-bar');
    if (titleBar) {
      titleBar.style.marginInlineEnd = `${rect.width}px`;
    }
  });
}
```

**CSS**:
```css
.title-bar {
  height: var(--title-bar-height, 40px);
  display: flex;
  align-items: center;
  padding: 0 var(--space-4);
  background: var(--background);
  border-bottom: 1px solid var(--border-color);
  app-region: drag; /* Allow drag to move window */
  user-select: none;
}

.title-bar-content {
  app-region: no-drag; /* Allow interaction */
  flex: 1;
}

.title-bar-buttons {
  app-region: no-drag;
  display: flex;
  gap: var(--space-2);
}
```

**Effort**: 2-3 days

---

## Phase 3: Nice-to-Have Features (Sprint 5+)

### 3.1 Periodic Analytics Sync

**Why**: Queue analytics offline, sync periodically

**Implementation**:
```javascript
// In service worker
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'dmb-analytics-sync') {
    event.waitUntil(syncAnalyticsQueue());
  }
});

async function syncAnalyticsQueue() {
  try {
    const db = await openDB('dmb-almanac');
    const events = await db.getAll('analyticsQueue');

    if (events.length === 0) return;

    // Batch send
    const response = await fetch('/api/analytics/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events })
    });

    if (response.ok) {
      await db.clear('analyticsQueue');
    }
  } catch (error) {
    console.error('Analytics sync failed:', error);
  }
}

// Register from app
export async function registerAnalyticsSync() {
  if (!('periodicSync' in registration)) return;

  try {
    await registration.periodicSync.register('dmb-analytics-sync', {
      minInterval: 24 * 60 * 60 * 1000 // 24 hours
    });
  } catch (error) {
    console.log('Could not register periodic sync:', error);
  }
}
```

**Effort**: 2 days

---

### 3.2 Screen Orientation Lock

**Why**: Better immersive experience for setlist viewing

**Implementation**:
```javascript
// In setlist component
async function lockToLandscape() {
  if (!screen.orientation) return;

  try {
    await screen.orientation.lock('landscape');
  } catch (error) {
    console.log('Could not lock orientation:', error);
  }
}

function unlockOrientation() {
  if (!screen.orientation) return;
  screen.orientation.unlock();
}

// Cleanup
onDestroy(() => {
  unlockOrientation();
});
```

**Effort**: 1-2 days

---

### 3.3 Quota Management

**Why**: Monitor and manage storage quota

**Implementation**:
```javascript
export async function monitorQuota() {
  if (!navigator.storage?.estimate) return;

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percent = (usage / quota) * 100;

    // Warn at 80%
    if (percent > 80) {
      showQuotaWarning(percent);
      await performCacheCleanup();
    }

    // Store in analytics
    analyticsQueue.push({
      type: 'storage_quota',
      usage,
      quota,
      percent,
      timestamp: Date.now()
    });
  } catch (error) {
    console.warn('Quota check failed:', error);
  }
}

async function performCacheCleanup() {
  const cacheNames = await caches.keys();

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    // Delete oldest 20%
    const deleteCount = Math.ceil(keys.length * 0.2);
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
  }
}
```

**Effort**: 1-2 days

---

## Implementation Timeline

```
Week 1-2 (Sprint 1):
├─ POST Share Target Handler
├─ iOS File Upload Fallback
└─ iOS Limitations Documentation
   └─ Ready for beta testing

Week 3-4 (Sprint 2):
├─ HTTP Deep Links
├─ Badging API
└─ Window Controls Overlay
   └─ Enhanced desktop experience

Week 5-6 (Sprint 3):
├─ Periodic Analytics Sync
├─ Screen Orientation Lock
├─ Quota Management
└─ Complete PWA feature set
```

---

## Testing Strategy

### Phase 1 Testing
- [ ] POST share target on Android (stock share sheet)
- [ ] POST share target on Chrome desktop
- [ ] File input fallback on iOS Safari
- [ ] File input drag-drop on desktop
- [ ] File size limits
- [ ] JSON validation errors

### Phase 2 Testing
- [ ] HTTP deep links from external websites
- [ ] HTTP deep links from QR codes
- [ ] Badge updates on various icons
- [ ] Badge clear functionality
- [ ] Window controls overlay on Windows/Linux/Mac
- [ ] Title bar drag to move window

### Phase 3 Testing
- [ ] Periodic analytics sync queue
- [ ] Analytics sending on network restore
- [ ] Orientation lock on tablets
- [ ] Orientation unlock on navigation
- [ ] Quota warnings on low storage
- [ ] Cache cleanup effectiveness

---

## Success Metrics

**Phase 1**:
- ✅ iOS users can upload files via form
- ✅ Android users can share from system apps
- ✅ Post share target reduces friction by 50%

**Phase 2**:
- ✅ HTTP deep links work on iOS
- ✅ Badging shows on home screen (desktop)
- ✅ Window controls overlay improves desktop UX

**Phase 3**:
- ✅ Analytics captures 95% of events
- ✅ Quota never exceeds 90%
- ✅ Orientation lock improves setlist experience

---

## Additional Notes

- All changes should be backward compatible
- Add feature detection before using advanced APIs
- Include fallbacks for unsupported browsers
- Test on real devices, not just emulators
- Document all new features in code and README
- Consider accessibility (WCAG 2.1 AA) for all UI changes
