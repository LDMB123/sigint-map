# Service Worker & Caching Bugs - Executive Summary

- Archive Path: `docs/archive/DETAILED_SW_BUGS_SUMMARY.md`
- Normalized On: `2026-03-04`
- Source Title: `Service Worker & Caching Bugs - Executive Summary`

## Summary
Found **8 distinct bugs** in the PWA's Service Worker and asset caching system. 2 CRITICAL bugs prevent offline functionality entirely.

## Context
Found **8 distinct bugs** in the PWA's Service Worker and asset caching system. 2 CRITICAL bugs prevent offline functionality entirely.

---

### Critical Bugs (Prevent Offline)

### Bug #1: Missing 78 WebP Assets in Build

**What's wrong:**
- 78 WebP files (companions + gardens) exist in `assets/` but are NOT copied to `dist/` by Trunk
- Service Worker precache manifest lists these files
- Service Worker install event fails silently when trying to fetch non-existent files
- Device loads NO images offline

**Evidence:**
```bash
ls assets/companions/ | wc -l

ls assets/gardens/ | wc -l

ls dist/assets/companions/ 2>&1

ls dist/assets/gardens/ 2>&1
```

**Impact:**
- All garden scenes show broken images
- All companion states (happy, celebrate, encourage) unavailable
- Makes gardens and rewards panels non-functional offline

**Fix:**
Move `assets/companions/` and `assets/gardens/` to `public/assets/` so Trunk auto-copies them OR add explicit copy rule to Trunk.toml

---

### Bug #2: Service Worker cache.addAll() Fails Atomically

**What's wrong:**
- Service Worker tries: `cache.addAll(PRECACHE_ASSETS)`
- PRECACHE_ASSETS lists 168 items, but 78 don't exist
- `addAll()` is atomic: if ANY file 404s, entire operation fails
- Cache stays empty (or partially from old version)
- App references images that don't exist

**Code (sw.js:11-19):**
```javascript
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);  // ← FAILS HERE
    })
  );
});
```

**Impact:**
- Service Worker appears registered (Rust sees OK response)
- But cache is empty or incomplete
- Offline = completely broken (no assets in cache)
- No error propagated to user or console in some cases

**Fix:**
1. First: fix Bug #1 (get all assets into dist/)
2. Second: use `Promise.allSettled()` for graceful handling of missing assets

---

### High Priority Bugs (Degrade Offline)

### Bug #3: No Image Fallback in Service Worker

**What's wrong:**
- SW fetch handler only provides offline fallback for HTML requests
- Image/WebP requests have NO fallback
- Offline image request → undefined → broken image icon

**Code (sw.js:73-79):**
```javascript
.catch(() => {
  // Offline fallback for HTML ONLY
  if (event.request.headers.get('Accept')?.includes('text/html')) {
    return caches.match('/offline.html');
  }
  // Images? WebP? No fallback → broken
})
```

**Impact:**
- Even if gardens cached, broken image icons appear
- No graceful degradation for missing assets
- User sees "broken image" symbol instead of placeholder

**Fix:**
1. Create 1x1 transparent placeholder.webp
2. Add fallback in SW for image requests
3. Return placeholder for any failed image fetch

---

### Bug #4: Missing CSS in Precache Manifest

**What's wrong:**
- `index.html` references 15 CSS files
- But `sw-assets.js` only lists 12 of them
- 3 CSS files missing from PRECACHE_ASSETS:
  - `/scroll-effects.css`
  - `/particle-effects.css`
  - `/gardens.css`

**Impact:**
- Offline users missing scroll effect styling
- Particles not animated
- Gardens panel may render unstyled
- Page looks broken offline (missing visual polish)

**Fix:**
Add 3 missing CSS files to PRECACHE_ASSETS in `public/sw-assets.js`

---

### Medium Priority Bugs (Polish)

### Bug #5: No Stale-While-Revalidate

**What's wrong:**
- Service Worker uses pure cache-first (serve cache, never revalidate)
- No background refresh of assets
- User sees stale images for days after new version released

**Impact:**
- Old companion images persist after update
- No feedback that fresher version available
- Can cause visual inconsistencies

**Fix:**
Implement stale-while-revalidate pattern (optional, nice-to-have)

---

### Bug #6: SW Update Detection Could Fail Silently

**What's wrong:**
- SW registration can succeed, but precache fails
- Install failure not propagated to main thread
- Update mechanism works (toast shows) but update fails
- Mixed old+new assets on next reload

**Impact:**
- Users click "Update available" but update is incomplete
- May load broken state with partial new assets

**Fix:**
Add error boundary around install event, report back to main thread

---

### Low Priority Bugs (Minor)

### Bug #7: Manifest Icon Maskable Safe Zone

**Status:** Icons exist and referenced correctly, but verify they have safe zone for adaptive icons

**Fix:** Optional - verify icon design

### Bug #8: No Error Logging in Service Worker

**What's wrong:**
- Install/activation errors logged nowhere
- Silent failures make debugging hard

**Fix:** Add console.error() logging in SW lifecycle events

---

### Quick Fix Priority List

### MUST DO (Breaks Offline)
1. **Move assets to public/assets/ (5 min)**
   ```bash
   mkdir -p public/assets/
   cp -r assets/companions public/assets/
   cp -r assets/gardens public/assets/
   ```

2. **Add missing CSS to sw-assets.js (2 min)**
   - Add `/scroll-effects.css`
   - Add `/particle-effects.css`
   - Add `/gardens.css`

### SHOULD DO (Improves UX)
3. **Create placeholder.webp (10 min)**
   - 1x1 transparent
   - Precache it
   - Return from SW for missing images

4. **Add SW error logging (5 min)**
   - Log install/activate failures
   - Send to console

### NICE TO HAVE
5. Implement stale-while-revalidate
6. Better error boundaries in Rust code

---

## Actions
_No actions recorded._

## Validation
```javascript
// In Safari DevTools Console after rebuild:
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW state:', reg.active?.state);
  caches.keys().then(keys => {
    keys.forEach(key => {
      caches.open(key).then(cache => {
        cache.keys().then(reqs => {
          console.log(key, ':', reqs.length, 'items');
          reqs.forEach(r => console.log('  -', r.url));
        });
```

Expected after fix:
- kindheart-v3 cache with 168+ items
- All companions/*.webp present
- All gardens/*.webp present
- All CSS files present

---

### Files Affected

**Read (no changes needed):**
- `public/sw.js` - Logic is correct
- `rust/pwa.rs` - Registration correct
- `rust/companion_skins.rs` - References images correctly
- `dist/manifest.webmanifest` - Config correct

**To Modify:**
1. `public/assets/` (create, move files)
2. `public/sw-assets.js` (add 3 CSS entries)
3. `public/sw.js` (add image fallback)
4. Build process (copy assets/ to dist/)

---

### Root Cause Analysis

**Why did this happen?**
1. Companions/gardens added late (Week 2)
2. Assets generated as separate WebP files
3. Build process wasn't updated to copy them
4. Precache manifest created before assets copied
5. No validation that all precached files exist before install

**Prevention:**
- Add CI/CD check: "verify all PRECACHE_ASSETS exist in dist/"
- Pre-build validation script
- Error in install event if addAll() fails

## References
_No references recorded._

