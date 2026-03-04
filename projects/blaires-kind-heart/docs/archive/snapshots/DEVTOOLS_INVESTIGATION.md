# Service Worker Investigation Guide - Safari 26.2

- Archive Path: `docs/archive/snapshots/DEVTOOLS_INVESTIGATION.md`
- Normalized On: `2026-03-04`
- Source Title: `Service Worker Investigation Guide - Safari 26.2`

## Summary
```

## Context
### How to Verify Bugs on iPad

### Step 1: Connect iPad to Mac

```
Mac: Safari Menu → Develop → [Your iPad Name] → [Blaire's Kind Heart]
```

This opens Web Inspector on Mac with iPad's JavaScript context.

### Step 2: Navigate to Application Tab

In Web Inspector:
```
Console → Select "Debugger" tab → Navigate to Application (may be under tabs)
```

On iPad, open the app normally. Switch to Mac Inspector.

---

### Bug #1: Verify Missing Assets

### Check if assets/companions/ and assets/gardens/ exist

**In Console (Mac Inspector):**

```javascript
// Check if companion images are in cache
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW Scope:', reg.scope);
  console.log('SW State:', reg.active?.state);

  caches.keys().then(keys => {
    console.log('Cache names:', keys);

    // List kindheart-v3 cache contents
    caches.open('kindheart-v3').then(cache => {
      cache.keys().then(requests => {
        console.log('Total cached items:', requests.length);

        // Filter for companion assets
        const companions = requests.filter(r => r.url.includes('companions'));
        console.log('Companions cached:', companions.length);
        companions.forEach(r => console.log('  ✓', r.url));

        // Filter for garden assets
        const gardens = requests.filter(r => r.url.includes('gardens'));
        console.log('Gardens cached:', gardens.length);
        gardens.forEach(r => console.log('  ✓', r.url));
      });
```

**Expected Output (CURRENT - BROKEN):**
```
Cache names: ["kindheart-v3"]
Total cached items: 90 (should be 168)
Companions cached: 0
Gardens cached: 0
```

**Expected Output (AFTER FIX):**
```
Cache names: ["kindheart-v3"]
Total cached items: 168
Companions cached: 18
  ✓ https://your-domain/assets/companions/default_happy.webp
  ✓ https://your-domain/assets/companions/default_celebrate.webp
  ... (16 more)
Gardens cached: 60
  ✓ https://your-domain/assets/gardens/bunny_stage_1.webp
  ✓ https://your-domain/assets/gardens/bunny_stage_2.webp
  ... (58 more)
```

---

### Bug #2: Verify Cache Installation Failure

### Check Service Worker Install Event

**In Console:**

```javascript
// Request a companion image to see if it's cached
fetch('/assets/companions/unicorn_happy.webp')
  .then(r => {
    console.log('Network request status:', r.status);
    console.log('URL:', r.url);
    return r.blob();
  })
  .then(blob => console.log('Blob size:', blob.size))
  .catch(e => console.error('Fetch failed:', e.message));
```

**Expected (CURRENT - BROKEN):**
```
Network request status: 404
URL: https://your-domain/assets/companions/unicorn_happy.webp
Fetch failed: Body used
```

**Expected (AFTER FIX):**
```
Network request status: 200 (from cache)
URL: https://your-domain/assets/companions/unicorn_happy.webp
Blob size: 33656
```

---

### Bug #3: Check CSS in Cache

### Verify all CSS files precached

**In Console:**

```javascript
caches.open('kindheart-v3').then(cache => {
  cache.keys().then(requests => {
    const cssFiles = requests.filter(r => r.url.includes('.css'));
    console.log('CSS files cached:', cssFiles.length);

    const expectedCSS = [
      '/tokens.css',
      '/app.css',
      '/home.css',
      '/tracker.css',
      '/quests.css',
      '/stories.css',
      '/rewards.css',
      '/games.css',
      '/gardens.css',
      '/mom.css',
      '/progress.css',
      '/particles.css',
      '/animations.css',
      '/scroll-effects.css',  // ← Missing
      '/particle-effects.css'  // ← Missing
    ];

    expectedCSS.forEach(css => {
      const found = cssFiles.some(r => r.url.includes(css));
      console.log(found ? '✓' : '✗', css);
    });
```

**Expected (CURRENT - BROKEN):**
```
CSS files cached: 13
✓ /tokens.css
✓ /app.css
✓ /home.css
✓ /tracker.css
✓ /quests.css
✓ /stories.css
✓ /rewards.css
✓ /games.css
✓ /gardens.css
✓ /mom.css
✓ /progress.css
✓ /particles.css
✓ /animations.css
✗ /scroll-effects.css
✗ /particle-effects.css
```

---

## Actions
_No actions recorded._

## Validation
### Simulate offline and check image loading

**On iPad:**
1. Settings → Wifi → Disconnect
2. Or: DevTools → Network tab → Offline checkbox

**In Console (while offline):**

```javascript
// Try to load a companion image
const img = document.createElement('img');
img.src = '/assets/companions/unicorn_happy.webp';
img.onload = () => console.log('✓ Image loaded (cached)');
img.onerror = () => console.error('✗ Image failed (not in cache)');
document.body.appendChild(img);

// Wait 2 seconds
setTimeout(() => {
  console.log('Image loaded successfully:', img.complete && img.naturalWidth > 0);
}, 2000);
```

**Expected (CURRENT - BROKEN):**
```
✗ Image failed (not in cache)
Image loaded successfully: false
```

**Expected (AFTER FIX):**
```
✓ Image loaded (cached)
Image loaded successfully: true
```

---

### Bug #5: Check Service Worker Registration

### Verify SW registered and active

**In Console:**

```javascript
// Check registration
navigator.serviceWorker.ready.then(reg => {
  console.log('=== SERVICE WORKER STATUS ===');
  console.log('Registered:', !!reg);
  console.log('Scope:', reg.scope);

  console.log('\nActive SW:');
  if (reg.active) {
    console.log('  State:', reg.active.state);
    console.log('  URL:', reg.active.scriptURL);
  } else {
    console.log('  NONE');
  }

  console.log('\nWaiting SW:');
  if (reg.waiting) {
    console.log('  State:', reg.waiting.state);
    console.log('  → User should see update prompt');
  } else {
    console.log('  NONE');
  }

  console.log('\nInstalling SW:');
  if (reg.installing) {
    console.log('  State:', reg.installing.state);
  } else {
    console.log('  NONE');
  }
});
```

**Expected (CURRENT):**
```
=== SERVICE WORKER STATUS ===
Registered: true
Scope: https://your-domain/

Active SW:
  State: activated
  URL: https://your-domain/sw.js

Waiting SW: NONE
Installing SW: NONE
```

---

### Bug #6: Check Network Tab

### Monitor what's actually being loaded

**Steps:**
1. Open DevTools on Mac
2. Click Network tab
3. Reload iPad app
4. Look at requests

**Expected to see:**
- index.html → 200 (from cache)
- blaires-kind-heart.js → 200 (from cache)
- blaires-kind-heart_bg.wasm → 200 (from cache)
- app.css, home.css, etc. → 200 (from cache)
- **assets/companions/*.webp → 200 (from cache)** ← Should see these
- **assets/gardens/*.webp → 200 (from cache)** ← Should see these

**Currently seeing:**
- Missing .webp files in network tab
- Or 404 errors for companions/gardens

---

### Bug #7: Check Cache Storage UI

### Visual inspection in Safari DevTools

**Steps:**
1. On Mac: Web Inspector → Application tab
2. Left sidebar → Cache Storage
3. Click "kindheart-v3"
4. Scroll through list

**Look for:**
```
Expected 168 entries:
  ✓ /index.html
  ✓ /offline.html
  ✓ /manifest.webmanifest
  ✓ /blaires-kind-heart.js
  ✓ /blaires-kind-heart_bg.wasm
  ✓ /app.css, /home.css, /tracker.css, etc.
  ✓ /illustrations/backgrounds/*.png (7)
  ✓ /illustrations/stickers/*.png (22)
  ✓ /illustrations/stories/*.png (15)
  ✓ /illustrations/acts/*.png (6)
  ✓ /illustrations/games/*.png (4)
  ✓ /illustrations/blaire/*.png (2)
  ✓ /icons/*.png (7)
  ✓ /sqlite/*.js, /*.wasm (3)
  ✗ /assets/companions/*.webp (0 - should be 18)
  ✗ /assets/gardens/*.webp (0 - should be 60)
```

**Count total entries:**
- Currently: ~90
- Should be: 168

**Difference: 78 missing** (18 companions + 60 gardens)

---

### Debug Companion Loading

### Check if Rust is trying to load companions

**In Console (iPad):**

```javascript
// Add a hook to see what images the app tries to load
const origAppend = Element.prototype.appendChild;
Element.prototype.appendChild = function(child) {
  if (child.tagName === 'IMG') {
    console.log('App loading image:', child.src);
  }
  return origAppend.call(this, child);
};

// Now click on a companion or garden feature
// Watch console for image load attempts
```

**Expected output:**
```
App loading image: https://your-domain/assets/companions/unicorn_happy.webp
App loading image: https://your-domain/assets/gardens/bunny_stage_1.webp
... (more image loads)
```

---

### Check Console for Errors

### Look for error messages

**Expected (CURRENT - might see errors like):**
```
[pwa] SW registered ✓

Failed to load image: /assets/companions/unicorn_happy.webp
Failed to load image: /assets/gardens/bunny_stage_1.webp
... (many image 404 errors)
```

**Expected (AFTER FIX):**
```
[pwa] SW registered ✓
(no image errors)
```

---

Copy this to Console to run full diagnostic:

```javascript
async function diagnosePWA() {
  console.log('=== PWA DIAGNOSTIC ===\n');

  // 1. Check SW
  const reg = await navigator.serviceWorker.getRegistration();
  console.log('1. SW Registered:', !!reg);
  console.log('   Active state:', reg?.active?.state);

  // 2. Check cache
  const cacheNames = await caches.keys();
  console.log('\n2. Caches:', cacheNames);

  // 3. Check cache contents
  if (cacheNames.includes('kindheart-v3')) {
    const cache = await caches.open('kindheart-v3');
    const requests = await cache.keys();
    console.log('\n3. Cache contents:');
    console.log('   Total items:', requests.length);

    const companions = requests.filter(r => r.url.includes('companions'));
    const gardens = requests.filter(r => r.url.includes('gardens'));
    const css = requests.filter(r => r.url.includes('.css'));

    console.log('   - Companions:', companions.length);
    console.log('   - Gardens:', gardens.length);
    console.log('   - CSS files:', css.length);

    console.log('\n4. Missing files:');
    if (companions.length === 0) console.log('   ✗ No companions cached');
    if (gardens.length === 0) console.log('   ✗ No gardens cached');
    if (css.length < 15) console.log('   ✗ Missing CSS files');
  }

  // 5. Test offline fetch
  console.log('\n5. Testing offline image fetch...');
  try {
    const response = await fetch('/assets/companions/unicorn_happy.webp');
    console.log('   Status:', response.status, response.ok ? '✓' : '✗');
  } catch (e) {
    console.log('   ✗ Fetch failed:', e.message);
  }

  console.log('\n=== END DIAGNOSTIC ===');
}

diagnosePWA();
```

---

### After Fixes: Expected Output

```javascript
diagnosePWA();

// Should output:
=== PWA DIAGNOSTIC ===

1. SW Registered: true
   Active state: activated

2. Caches: ["kindheart-v3"]

3. Cache contents:
   Total items: 168
   - Companions: 18
   - Gardens: 60
   - CSS files: 15

4. Missing files:
   (nothing - all files present)

5. Testing offline image fetch...
   Status: 200 ✓

=== END DIAGNOSTIC ===
```

---

### Simulate slow network and verify caching works

**In DevTools Network tab:**
1. Click throttling dropdown (usually says "No throttling")
2. Select "Slow 4G"
3. Reload page
4. Watch Network tab

**Expected:**
- First load: images take 2-5 seconds
- Reload: images load instantly (from cache)
- Third load: still instant

**If broken:**
- Even second load is slow
- Images show as loading every time
- Suggests cache not working

---

```bash
trunk build --release

```

**Expected:**
- New SW installs cleanly
- Cache populates with all 168 items
- No 404 errors in console

## References
_No references recorded._

