# Blaire's Kind Heart PWA - Debugging Report

- Archive Path: `docs/archive/DETAILED_PWA_DEBUG_REPORT.md`
- Normalized On: `2026-03-04`
- Source Title: `Blaire's Kind Heart PWA - Debugging Report`

## Summary
Widespread Service Worker and asset caching bugs preventing offline functionality. 78 WebP companion and garden assets are referenced in precache manifest but **never copied to dist/**, causing cache installation to fail and all dynamic asset requests to fail offline.

---

### Bug #1: CRITICAL - Missing Companion and Garden Assets in Build

**Severity:** CRITICAL (breaks offline completely)

**Issue:**
- `sw-assets.js` line 121-201 lists 78 WebP assets for companions (18) and gardens (60)
- These files EXIST in `assets/companions/` and `assets/gardens/`
- But they are **NOT copied to `dist/`** by Trunk during build
- Service Worker fails silently trying to precache non-existent files
- When app tries to load these images offline, they 404 and render broken

**Reproduction:**
```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart

ls assets/companions/ | wc -l

ls assets/gardens/ | wc -l

ls dist/assets/companions/ 2>&1

ls dist/assets/gardens/ 2>&1
```

**Files Affected:**
- `public/sw-assets.js` (references non-existent files)
- Missing from dist:
  - 18x companion WebP files
  - 60x garden stage WebP files
  - `assets/` directory structure entirely missing

**Expected in Cache:**
```
Assets (78 total):
  - /assets/companions/default_happy.webp (not in dist)
  - /assets/companions/default_celebrate.webp (not in dist)
  - /assets/companions/default_encourage.webp (not in dist)
  - /assets/companions/unicorn_happy.webp (not in dist)
  ... (15 more companions)
  - /assets/gardens/bunny_stage_1.webp (not in dist)
  - /assets/gardens/bunny_stage_2.webp (not in dist)
  ... (58 more garden stages)
```

**Root Cause:**
Trunk is not configured to copy the `assets/companions/` and `assets/gardens/` directories to dist during build. The `Trunk.toml` file has no explicit copy rules for these dynamic assets.

**Fix Required:**
1. Add asset copy configuration to `Trunk.toml`
2. OR move WebP files to `public/assets/` so Trunk copies them automatically
3. OR update build script to copy assets/ → dist/assets/

---

### Bug #2: Service Worker Cache Installation Incomplete

**Severity:** CRITICAL

**Issue:**
- Service Worker tries to precache 168 assets via `caches.addAll(PRECACHE_ASSETS)` (sw.js:14)
- 78 of these assets don't exist in dist/
- `addAll()` fails atomically if ANY asset is missing
- Entire cache installation fails silently
- Device loads NO assets into Service Worker cache

**Service Worker Code:**
```javascript
// public/sw.js:11-19
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);  // Fails here if ANY asset missing
    })
  );
});
```

**Problem with addAll():**
- `cache.addAll()` is atomic - if ONE request fails, entire operation fails
- Missing companion/garden WebP files cause 404 fetch errors
- Cache remains empty (or only partially populated from previous version)
- App still references these images in companion skins (`rust/companion_skins.rs`)
- Offline mode loads broken image icons

**What's Actually in Cache (Current):**
- index.html ✓
- WASM files ✓
- CSS files ✓
- App JS ✓
- SQLite files ✓
- Illustrations (backgrounds, stickers, stories, acts, games, blaire) ✓
- Icons ✓
- **Missing: all 78 companion/garden WebP files** ✗

**Fix Required:**
Ensure all files in PRECACHE_ASSETS exist in dist/ before Service Worker installation.

---

### Bug #3: Service Worker Update Detection Works, But Update Fails

**Severity:** MEDIUM

**Issue:**
- Rust code correctly detects new Service Worker waiting (pwa.rs:38-63)
- Shows update toast with sparkle emoji (pwa.rs:69)
- User can tap toast to trigger update (pwa.rs:71-83)
- BUT: if new SW's precache fails (Bug #2), update becomes stuck/incomplete
- Next reload may load mixed old+new assets causing visual glitches

**Rust Code (pwa.rs:22-34):**
```rust
match JsFuture::from(promise).await {
    Ok(reg_val) => {
        web_sys::console::log_1(&"[pwa] SW registered".into());
        if let Ok(reg) = reg_val.dyn_into::<web_sys::ServiceWorkerRegistration>() {
            detect_sw_update(&reg);
        }
    Err(e) => web_sys::console::warn_1(&format!("[pwa] SW failed: {:?}", e).into()),
}
```

**Problem:**
- Error message logged to console if registration fails
- But on iPad/Safari, Service Worker registration itself may succeed
- Only during install event does `addAll()` fail
- Install failure is NOT propagated back to main thread
- User sees "offline" but SW actually IS registered

**How to Detect:**
```javascript
// In Safari DevTools Console:
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Installed SW state:', reg.active?.state);
  console.log('Installing SW state:', reg.installing?.state);
  console.log('Waiting SW state:', reg.waiting?.state);
  caches.keys().then(keys => console.log('Cache keys:', keys));
});
```

**Fix Required:**
1. Fix Bug #2 (asset building) first
2. Then gracefully handle partial cache misses with fallback strategy

---

### Bug #4: Cache-First Strategy Assumes All Assets Precached

**Severity:** HIGH

**Issue:**
- Service Worker fetch handler uses cache-first strategy (sw.js:60-72)
- Assumes all same-origin requests are precached
- If asset missing from cache (Bug #2), falls back to fetch
- Offline mode: fetch fails, returns undefined
- App shows broken images silently

**Service Worker Code (sw.js:59-79):**
```javascript
// All other requests: cache-first
event.respondWith(
  caches.match(event.request).then((cached) => {
    if (cached) return cached;
    return fetch(event.request).then((response) => {
      // Cache successful responses for next time
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
      }
      return response;
    });
  }).catch(() => {
    // Offline fallback for HTML
    if (event.request.headers.get('Accept')?.includes('text/html')) {
      return caches.match('/offline.html');
    }
  })
);
```

**Offline Behavior:**
1. App requests `/assets/companions/unicorn_happy.webp`
2. SW checks cache → MISS (never precached due to Bug #2)
3. SW tries fetch → FAILS (offline)
4. SW catch() → no fallback for images
5. Browser shows broken image icon

**Missing Offline Fallbacks:**
- No fallback image for missing companion assets
- No fallback image for missing garden stages
- No placeholder/skeleton for broken images
- User sees broken image icons instead of graceful fallback

**Fix Required:**
1. Generate 1x1 transparent placeholder image
2. Add fallback in SW fetch handler for image types
3. Or: ensure all images are precached (Bug #2)

---

### CRITICAL - Prevents Offline
1. **Add build rule to copy assets/companions/ and assets/gardens/ to dist/**
   - Method 1: Update `Trunk.toml` with asset copy directive
   - Method 2: Move files to `public/assets/` so Trunk copies automatically
   - Method 3: Add shell script to build process

2. **Add missing CSS to PRECACHE_ASSETS**
   - Add `/scroll-effects.css`
   - Add `/particle-effects.css`
   - Add `/gardens.css` (if not already present)

### HIGH - Improves Offline Experience
3. **Create placeholder.webp image**
   - 1x1 transparent WebP for fallback
   - Precache it
   - Return from SW fetch handler for missing images

### MEDIUM - Polish
4. **Implement stale-while-revalidate** (optional)
   - Background fetch + serve stale immediately
   - Better user experience for frequent visitors

5. **Add error boundaries**
   - Catch broken image loads
   - Show placeholder with message

---

### Files to Modify

1. **`Trunk.toml`** - Add asset copy rules
2. **`public/sw-assets.js`** - Add missing CSS files
3. **`public/sw.js`** - Add image fallback handler
4. **Build script** - Ensure assets/ copied to dist/
5. **`rust/companion_skins.rs`** - Handle missing images gracefully

---

## Context
_Context not recorded in source archive document._

## Actions
**Severity:** MEDIUM

**Issue:**
- Service Worker uses pure cache-first (always serve from cache)
- No background revalidation of stale assets
- If App version updates but user has old cache, they see stale images
- No `stale-while-revalidate` pattern (fetch in background, serve stale immediately)

**Current Pattern (sw.js:60-72):**
```javascript
caches.match(event.request).then((cached) => {
  if (cached) return cached;  // Serve immediately, never revalidate
  return fetch(event.request);  // Only fetch if not cached
})
```

**Better Pattern Would Be:**
```javascript
// Return cached immediately, but fetch in background
const cached = await caches.match(request);
if (cached) {
  // Fetch in background without awaiting
  fetch(request).then(response => {
    if (response.ok) caches.open(CACHE_NAME).then(c => c.put(request, response.clone()));
  });
  return cached;  // Serve stale while background fetch happens
}
return fetch(request);
```

**Impact:**
- Users may see old companion images for days after update
- No feedback that fresher version available
- Works offline but serves stale content

**Fix Required:**
Optional: implement stale-while-revalidate for dynamic assets. Not critical if precache works properly.

---

## Validation
- [ ] Run `trunk build --release`
- [ ] Verify `dist/assets/companions/` exists with 18 WebP files
- [ ] Verify `dist/assets/gardens/` exists with 60 WebP files
- [ ] Verify `dist/sw-assets.js` matches `public/sw-assets.js`
- [ ] Verify all CSS files in HTML are in PRECACHE_ASSETS

### Phase 2: Service Worker Registration
- [ ] Open app in Safari 26.2
- [ ] Open DevTools → Application → Service Workers
- [ ] Verify `sw.js` shows "installed"
- [ ] Check console for: `[pwa] SW registered`
- [ ] Verify no errors in console about file loading

### Phase 3: Cache Storage
- [ ] DevTools → Application → Cache Storage
- [ ] Click `kindheart-v3` cache
- [ ] Scroll through list - should see 168 items:
  - [ ] 18 companion WebP files
  - [ ] 60 garden WebP files
  - [ ] 7 background PNGs
  - [ ] 22 sticker PNGs
  - [ ] All CSS files
  - [ ] All JS/WASM files

### Phase 4: Offline Behavior
- [ ] DevTools → Network → toggle "Offline"
- [ ] Reload page
- [ ] Verify home screen loads (index.html cached)
- [ ] Click "My Gardens" → should show garden images (not broken)
- [ ] Companion should render correctly
- [ ] All stickers should load
- [ ] All background images should display

### Phase 5: Update Detection
- [ ] Make a dummy code change
- [ ] Run `trunk build --release` again
- [ ] On iPad: reload in Safari
- [ ] Should show sparkle toast: "Update available! Tap to refresh"
- [ ] Tap toast → page reloads with new version
- [ ] Verify new assets load

---

## References
**Severity:** LOW (iOS only)

**Issue:**
- `dist/manifest.webmanifest` defines 192x192 and 512x512 maskable icons
- Icons DO exist in dist/icons/ directory
- BUT maskable icons should have different visual design (with safe zone)
- Current icons may not render well with adaptive icon masks on Android

**Manifest (lines 34-44):**
```json
{
  "src": "./icons/icon-192-maskable.png",
  "sizes": "192x192",
  "type": "image/png",
  "purpose": "maskable"
}
```

**Status:**
- Icon files exist ✓
- Manifest correctly references them ✓
- Purpose declared correctly ✓
- BUT: verify icons actually have safe zone (transparent center)

**Fix Required:**
Minor: verify maskable icons have proper safe zone for adaptive icon rendering.

---

### Bug #6: CSS Files Mismatch in HTML vs Actually Available

**Severity:** LOW

**Issue:**
- `dist/index.html` references 15 CSS files (lines 43-56)
- Some CSS files exist in dist but may not be built correctly
- Missing CSS file in reference: `/scroll-effects.css` exists but not in sw-assets.js

**HTML References (index.html:43-56):**
```html
<link rel="stylesheet" href="/tokens.css"/>
<link rel="stylesheet" href="/app.css"/>
<link rel="stylesheet" href="/home.css"/>
<link rel="stylesheet" href="/tracker.css"/>
<link rel="stylesheet" href="/quests.css"/>
<link rel="stylesheet" href="/stories.css"/>
<link rel="stylesheet" href="/rewards.css"/>
<link rel="stylesheet" href="/games.css"/>
<link rel="stylesheet" href="/gardens.css"/>        <!-- Present in dist ✓ -->
<link rel="stylesheet" href="/mom.css"/>
<link rel="stylesheet" href="/progress.css"/>
<link rel="stylesheet" href="/particles.css"/>
<link rel="stylesheet" href="/animations.css"/>
<link rel="stylesheet" href="/scroll-effects.css"/> <!-- NOT in sw-assets.js -->
<link rel="stylesheet" href="/particle-effects.css"/> <!-- NOT in sw-assets.js -->
```

**Precache Manifest Missing:**
```
'/scroll-effects.css'     (used in HTML, missing from PRECACHE_ASSETS)
'/particle-effects.css'   (used in HTML, missing from PRECACHE_ASSETS)
'/gardens.css'            (used in HTML, missing from PRECACHE_ASSETS)
```

**Impact:**
- If Service Worker precache worked, these CSS would not be cached
- Offline viewing would miss styling for scroll effects and particle effects
- Page would render unstyled (broken styling offline)

**Fix Required:**
Add missing CSS files to `public/sw-assets.js` PRECACHE_ASSETS list.

---

**Severity:** MEDIUM

**Issue:**
- offline.html is precached (sw-assets.js:10)
- Service Worker returns it for failed navigation requests (sw.js:74-76)
- BUT only for `.includes('text/html')` accept header
- Image/WebP requests to missing companions/gardens return undefined
- No fallback image served for broken image requests

**Service Worker (sw.js:74-78):**
```javascript
.catch(() => {
  // Offline fallback for HTML
  if (event.request.headers.get('Accept')?.includes('text/html')) {
    return caches.match('/offline.html');  // Only HTML gets fallback
  }
  // Images, WebP, other assets: return undefined (broken image)
})
```

**Missing for Offline:**
- No image/webp fallback
- No placeholder.webp for missing companion images
- No skeleton loader state

**Fix Required:**
Create placeholder images and add fallback in SW for all request types.

---

```
Safari Menu → Develop → [Your iPad Name] → [App] → Inspector

Application Tab:
├── Manifest → Check properties loaded
├── Service Workers → Check registration state
└── Cache Storage → Check kindheart-v3 cache contents
```

