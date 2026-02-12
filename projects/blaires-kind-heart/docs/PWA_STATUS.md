# PWA & Service Worker Status

Quick reference for PWA offline functionality, Service Worker bugs, and caching system.

---

## Current Status

**Offline Mode**: BROKEN (Critical bugs prevent caching)
**Service Worker**: Registered but cache install fails
**Asset Coverage**: 90/168 assets missing from build

---

## Critical Issues

### Issue #1: Missing 78 WebP Assets in Build Output

**Problem**: Companion/garden WebP files NOT copied to `dist/` by Trunk

```bash
# Assets exist in source:
ls assets/companions/ | wc -l  # → 18 files ✓
ls assets/gardens/ | wc -l     # → 60 files ✓

# But missing in build:
ls dist/assets/companions/     # → directory doesn't exist ✗
ls dist/assets/gardens/        # → directory doesn't exist ✗
```

**Impact**:
- Gardens panel shows broken images offline
- Companion animations unavailable
- Rewards panel non-functional offline

**Fix**:
```bash
# Option A: Move to public/ (Trunk auto-copies)
mv assets/companions public/assets/
mv assets/gardens public/assets/

# Option B: Add to Trunk.toml
[[hooks]]
stage = "pre_build"
command = "sh"
command_arguments = ["-c", "cp -r assets/companions dist/assets/ && cp -r assets/gardens dist/assets/"]
```

**Fix Time**: 5 minutes

---

### Issue #2: Service Worker cache.addAll() Fails Atomically

**Problem**: SW tries to precache 168 assets, 78 don't exist → entire cache fails

```javascript
// public/sw.js:11-19
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);  // Atomic operation
    })
  );
});
```

**Why It Fails**:
- `addAll()` is atomic: if ANY file 404s, entire operation fails
- Missing companion/garden WebPs cause 404s
- Cache remains empty or partially populated

**Fix**: First fix Issue #1, then add graceful fallback:
```javascript
// Use Promise.allSettled for graceful degradation
const results = await Promise.allSettled(
  PRECACHE_ASSETS.map(url => cache.add(url))
);
const failed = results.filter(r => r.status === 'rejected');
if (failed.length > 0) console.warn('Failed to cache:', failed);
```

**Fix Time**: 10 minutes

---

## High Priority Issues

### Issue #3: No Image Fallback in Service Worker

**Problem**: SW fetch handler only provides offline fallback for HTML, not images

```javascript
.catch(() => {
  if (event.request.headers.get('Accept')?.includes('text/html')) {
    return caches.match('/offline.html');
  }
  // Images/WebP? No fallback → broken image icon
})
```

**Fix**: Add image fallback strategy:
```javascript
.catch(() => {
  const accept = event.request.headers.get('Accept') || '';
  if (accept.includes('text/html')) {
    return caches.match('/offline.html');
  }
  if (accept.includes('image/')) {
    // Return placeholder or emoji fallback
    return new Response('<svg>...</svg>', {
      headers: { 'Content-Type': 'image/svg+xml' }
    });
  }
})
```

**Fix Time**: 15 minutes

---

### Issue #4: Missing CSS Files from Precache

**Problem**: 3 CSS files used but not in `sw-assets.js` precache manifest

```
Missing from precache:
- /styles/companion.css
- /styles/gardens.css
- /styles/rewards.css
```

**Fix**: Update `public/sw-assets.js`:
```javascript
// Add to PRECACHE_ASSETS array
'/styles/companion.css',
'/styles/gardens.css',
'/styles/rewards.css',
```

**Fix Time**: 2 minutes

---

## Medium Priority Issues

### Issue #5: No Cache Version Invalidation Strategy

**Problem**: `CACHE_NAME = 'blaires-kind-heart-v1'` never changes, old assets linger

**Fix**: Version based on build timestamp or content hash
```javascript
const CACHE_NAME = `blaires-kind-heart-${BUILD_TIMESTAMP}`;
```

**Fix Time**: 5 minutes

---

### Issue #6: Service Worker Update Toast Shows Too Often

**Problem**: Toast triggers on every SW state change, not just actual updates

**Fix**: Only show toast when new SW installed:
```rust
// Check if actually new version
if old_version != new_version {
    show_update_toast();
}
```

**Fix Time**: 10 minutes

---

### Issue #7: No Offline.html Fallback Page

**Problem**: SW references `/offline.html` but file doesn't exist in `public/`

**Fix**: Create `public/offline.html`:
```html
<!DOCTYPE html>
<html>
<head><title>Offline - Blaire's Kind Heart</title></head>
<body>
  <h1>💙 You're Offline</h1>
  <p>Blaire's Kind Heart needs internet to load.</p>
</body>
</html>
```

**Fix Time**: 5 minutes

---

## Testing Checklist

### Manual iPad Tests

**Test 1: Offline Installation** (2 min)
1. Clear Safari cache
2. Load app while online
3. Open DevTools → Storage → Cache Storage
4. Verify 168 assets cached (not 90)
5. Enable airplane mode
6. Reload app
7. Expected: App loads fully, no broken images

**Test 2: Asset Fallback** (1 min)
1. Go offline
2. Navigate to gardens panel
3. Expected: Garden images load OR placeholder shows (not broken icon)

**Test 3: SW Update Flow** (2 min)
1. Bump CACHE_NAME version
2. Deploy new SW
3. Reload app
4. Expected: Update toast shows once
5. Click refresh
6. Expected: New SW activates

### DevTools Commands

```javascript
// Check cache contents
caches.open('blaires-kind-heart-v1').then(cache => {
  cache.keys().then(keys => {
    console.log(`Cached: ${keys.length} assets`);
    console.log('Missing:', keys.filter(k => k.url.includes('companions')));
  });
});

// Verify SW registration
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW state:', reg.active?.state);
  console.log('Waiting:', reg.waiting?.state);
});

// Force offline test
self.addEventListener('fetch', e => {
  e.respondWith(new Response('Offline', { status: 503 }));
});
```

---

## Implementation Priority

### Phase 1: Critical Fixes (20 minutes)
1. Copy WebP assets to dist/ - 5 min
2. Update sw-assets.js with missing CSS - 2 min
3. Test cache installation - 3 min
4. Rebuild and verify - 10 min

### Phase 2: High Priority (25 minutes)
5. Add image fallback to SW fetch handler - 15 min
6. Create offline.html fallback page - 5 min
7. Test offline loading - 5 min

### Phase 3: Polish (20 minutes)
8. Implement cache versioning - 5 min
9. Fix update toast logic - 10 min
10. Add graceful cache.addAll fallback - 5 min

**Total**: 65 minutes end-to-end

---

## Expected Outcomes

**Before Fixes**:
- Offline mode: Completely broken
- Cached assets: 90/168 (53%)
- User experience: Broken images, non-functional offline

**After Fixes**:
- Offline mode: Fully functional
- Cached assets: 168/168 (100%)
- User experience: Smooth offline, graceful fallbacks

---

## Files Modified

```
public/sw.js             - Add image fallback, graceful caching
public/sw-assets.js      - Add missing CSS files
public/offline.html      - Create fallback page (new)
Trunk.toml               - Add asset copy rules OR
public/assets/           - Move WebP files here
rust/pwa.rs             - Fix update toast logic
```

---

## Detailed Documentation

For in-depth analysis, see archived docs:
- `docs/archive/DETAILED_PWA_DEBUG_REPORT.md` - Full technical analysis
- `docs/archive/DETAILED_PWA_DEBUG_INDEX.md` - Quick reference index
- `docs/archive/DETAILED_SW_BUGS_SUMMARY.md` - Executive summary

---

**Last Updated**: 2026-02-11
**Status**: Active reference document
