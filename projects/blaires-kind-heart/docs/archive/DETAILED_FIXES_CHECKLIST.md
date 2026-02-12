# PWA Caching Bugs - Fix Checklist

## Quick Summary

**Total Bugs Found:** 8
**Critical (Block Offline):** 2
**High (Degrade UX):** 2
**Medium (Polish):** 3
**Low (Minor):** 1

**Time to Fix:** ~30-45 minutes total

---

## CRITICAL FIX #1: Copy WebP Assets to Build Output

### Status: REQUIRED

**The Problem:**
- 78 WebP files (companions + gardens) are in `assets/` but NOT in `dist/`
- Service Worker precache manifest lists them
- SW install fails when it can't find them

### Solution A: Move Files to public/ (RECOMMENDED)

**Time: 5 minutes**

Trunk automatically copies anything in `public/` to `dist/`. This is the simplest fix.

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart

# Create assets directory in public
mkdir -p public/assets

# Copy companion skins
cp -r assets/companions public/assets/

# Copy garden stages
cp -r assets/gardens public/assets/

# Verify copy worked
ls public/assets/companions/ | wc -l
# Should print: 18

ls public/assets/gardens/ | wc -l
# Should print: 60

# Clean build
rm -rf dist
trunk build --release

# Verify assets now in dist
ls dist/assets/companions/ | wc -l
# Should print: 18

ls dist/assets/gardens/ | wc -l
# Should print: 60
```

**Verification:**
```bash
# Should see sw-assets.js with updated assets/ paths
ls -la dist/sw-assets.js

# Compare file size before/after
# After should be larger due to WebP files
```

---

### Solution B: Update Trunk.toml (ALTERNATIVE)

**Time: 10 minutes**

If you want to keep `assets/` in root and configure Trunk to copy it:

```toml
# In Trunk.toml, add:
[hooks.pre_build]
stage = "build"
command = "sh"
command_args = ["-c", "cp -r assets/companions dist/ && cp -r assets/gardens dist/"]
```

However, this requires ensuring the dist/ directory is already created. Solution A is cleaner.

---

## CRITICAL FIX #2: Update Precache Manifest

### Status: REQUIRED (after Fix #1)

**The Problem:**
- `sw-assets.js` lists CSS files that HTML references
- 3 CSS files are missing from PRECACHE_ASSETS
- Offline users get unstyled pages

### Fix: Add Missing CSS Files

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/public/sw-assets.js`

**Current state (lines 24-36):**
```javascript
  // CSS (Trunk copies from src/styles/):
  '/tokens.css',
  '/app.css',
  '/home.css',
  '/tracker.css',
  '/quests.css',
  '/stories.css',
  '/rewards.css',
  '/games.css',
  '/mom.css',
  '/progress.css',
  '/particles.css',
  '/animations.css',
```

**Add after line 36:**
```javascript
  '/scroll-effects.css',
  '/particle-effects.css',
  '/gardens.css',
```

**Exact change:**
```javascript
  // CSS (Trunk copies from src/styles/):
  '/tokens.css',
  '/app.css',
  '/home.css',
  '/tracker.css',
  '/quests.css',
  '/stories.css',
  '/rewards.css',
  '/games.css',
  '/mom.css',
  '/progress.css',
  '/particles.css',
  '/animations.css',
  '/scroll-effects.css',        // ADD THIS
  '/particle-effects.css',       // ADD THIS
  '/gardens.css',                // ADD THIS (verify it's in dist)
```

**Time: 2 minutes**

---

## HIGH PRIORITY FIX #1: Add Image Fallback to Service Worker

### Status: RECOMMENDED

**The Problem:**
- Service Worker only provides HTML fallback for offline
- Missing image requests return undefined (broken image)
- Graceful degradation missing

### Fix: Update Service Worker

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/public/sw.js`

**Current code (lines 73-79):**
```javascript
    }).catch(() => {
      // Offline fallback for HTML
      if (event.request.headers.get('Accept')?.includes('text/html')) {
        return caches.match('/offline.html');
      }
    })
```

**Replace with:**
```javascript
    }).catch(() => {
      // Offline fallbacks
      const accept = event.request.headers.get('Accept') || '';

      // HTML pages: show offline screen
      if (accept.includes('text/html')) {
        return caches.match('/offline.html');
      }

      // Images/WebP: return blank 1x1 pixel or placeholder
      if (accept.includes('image/')) {
        // Return a 1x1 transparent WebP if available, else let it 404
        // For now, just let it 404 - should precache a placeholder.webp
        return undefined;
      }

      return undefined;
    })
```

**Better version (with placeholder):**

First, create a placeholder image:

```bash
# Create 1x1 transparent WebP
# Using Python PIL or online tool, save to:
# public/placeholder-1x1.webp

# Then update sw.js to:
    }).catch(() => {
      // Offline fallbacks
      const accept = event.request.headers.get('Accept') || '';

      // HTML pages: show offline screen
      if (accept.includes('text/html')) {
        return caches.match('/offline.html');
      }

      // Images/WebP: return placeholder
      if (accept.includes('image/')) {
        return caches.match('/placeholder-1x1.webp');
      }

      return undefined;
    })

# Add to sw-assets.js:
  '/placeholder-1x1.webp',
```

**Time: 5-10 minutes**

**Current recommendation:** Skip this for now if Fix #1 works. All images should be precached if you move them to public/assets/.

---

## HIGH PRIORITY FIX #2: Verify Build Copies Everything

### Status: REQUIRED (validation)

**Verify all precache items exist:**

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart

# Extract PRECACHE_ASSETS from sw-assets.js and verify each exists in dist/
# Script to check:

cat > /tmp/verify_precache.sh << 'EOF'
#!/bin/bash
cd /Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart

MISSING=0
FOUND=0

# Extract paths from PRECACHE_ASSETS
paths=$(grep -oE "'[^']+'" public/sw-assets.js | sed "s/'//g")

for path in $paths; do
  # Skip root '/'
  if [ "$path" = "/" ]; then
    continue
  fi

  # Check in dist
  if [ -f "dist${path}" ]; then
    ((FOUND++))
  else
    echo "MISSING: dist${path}"
    ((MISSING++))
  fi
done

echo ""
echo "Summary:"
echo "  Found: $FOUND"
echo "  Missing: $MISSING"

if [ $MISSING -eq 0 ]; then
  echo "✓ All precache assets exist!"
  exit 0
else
  echo "✗ Missing assets - build incomplete"
  exit 1
fi
EOF

chmod +x /tmp/verify_precache.sh
/tmp/verify_precache.sh
```

**Expected after Fix #1:**
```
Summary:
  Found: 168
  Missing: 0
✓ All precache assets exist!
```

---

## MEDIUM PRIORITY: Add Error Logging

### Status: OPTIONAL

**The Problem:**
- Service Worker errors happen silently
- No visibility into install failures

### Fix: Add console logging to sw.js

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/public/sw.js`

**Update install event (line 11):**
```javascript
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Opening cache:', CACHE_NAME);
      return cache.addAll(PRECACHE_ASSETS)
        .then(() => {
          console.log('[SW] Precached', PRECACHE_ASSETS.length, 'assets');
        })
        .catch(err => {
          console.error('[SW] Precache failed:', err.message);
          throw err;
        });
    })
  );
});
```

**Update activate event (line 29):**
```javascript
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((keys) => {
      console.log('[SW] Found caches:', keys);
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      console.log('[SW] Activated');
      return self.clients.claim();
    })
  );
});
```

**Time: 5 minutes**

---

## Testing Checklist

### After ALL Fixes

- [ ] Run `trunk build --release` (takes ~2 min)
- [ ] Verify no errors in build output
- [ ] Check `dist/assets/companions/` exists with 18 files
- [ ] Check `dist/assets/gardens/` exists with 60 files
- [ ] Check `dist/sw-assets.js` lists all CSS files
- [ ] Run `/tmp/verify_precache.sh` → should show "All precache assets exist!"

### On iPad

- [ ] Open Settings → Safari → Advanced → Website Data → Remove All
- [ ] Clear app from Home Screen
- [ ] Open app fresh
- [ ] Check DevTools → Service Workers → "installed"
- [ ] Check DevTools → Cache Storage → kindheart-v3 → see 168 items
- [ ] Disconnect Wifi
- [ ] Reload app → should work fully offline
- [ ] Click through all panels:
  - [ ] Home → loads instantly
  - [ ] Kind Acts → loads tracker
  - [ ] Gardens → shows garden images (not broken)
  - [ ] Companions → renders correctly
  - [ ] Rewards → shows stickers
  - [ ] All backgrounds visible
- [ ] Reconnect Wifi
- [ ] Make a code change, rebuild
- [ ] Reload iPad → should show sparkle "Update available" toast

---

## Rollback Plan

If anything breaks:

```bash
# Undo public/assets copy
rm -rf public/assets

# Restore original sw-assets.js
git checkout public/sw-assets.js

# Restore original sw.js
git checkout public/sw.js

# Rebuild
rm -rf dist
trunk build --release
```

---

## Fix Timeline

**Phase 1 (5 minutes):**
1. Copy assets/ to public/assets/

**Phase 2 (2 minutes):**
2. Add missing CSS to sw-assets.js

**Phase 3 (2 minutes):**
3. Rebuild with `trunk build --release`

**Phase 4 (5 minutes):**
4. Verify with script

**Phase 5 (10 minutes on iPad):**
5. Test on iPad

**Total: ~25 minutes for basic fixes**

Optional additions (10-15 min):
- Add SW error logging
- Create placeholder image
- Add image fallback handler

---

## Recommended Order

### Must Do (Blocking)
1. Move assets/ to public/assets/
2. Add missing CSS to PRECACHE_ASSETS
3. Rebuild and verify

### Should Do (High Impact)
4. Add SW error logging
5. Test thoroughly on iPad

### Nice to Have
6. Create placeholder image
7. Implement image fallback handler
8. Stale-while-revalidate pattern

---

## Validation Commands

```bash
# After Fix #1:
ls public/assets/companions/ | wc -l
# Output: 18

ls public/assets/gardens/ | wc -l
# Output: 60

ls dist/assets/companions/ | wc -l
# Output: 18 (after rebuild)

# After Fix #2:
grep '/scroll-effects.css' public/sw-assets.js
# Output: (line with it)

grep '/particle-effects.css' public/sw-assets.js
# Output: (line with it)

# After Fix #3:
trunk build --release

# Verify no 404s for WebP files in dist:
find dist -name "*.webp" | wc -l
# Output: 78 (18 companions + 60 gardens)
```

---

## Common Issues & Solutions

### Issue: "cp: cannot open directory `assets/`"
**Solution:** Make sure you're in project root before running copy commands

### Issue: Still missing WebP after copy
**Solution:** Trunk might be caching. Run:
```bash
rm -rf dist target
trunk build --release
```

### Issue: Build fails with "file not found"
**Solution:** Trunk is looking for paths in dist that don't exist yet. Verify your public/sw-assets.js has correct paths starting with `/`

### Issue: iPad still shows broken images after rebuild
**Solution:**
1. Clear Safari data: Settings → Safari → Advanced → Website Data → Remove All
2. Close Safari completely
3. Reopen app (will get fresh SW)
4. Wait for caching to complete (check console for `[SW] Precached` message)

---

## Questions to Answer

After fixes, verify:
- [ ] Do companions render correctly offline?
- [ ] Do gardens show images offline?
- [ ] Do all panels load offline?
- [ ] Does update detection still work?
- [ ] No broken image icons anywhere?
- [ ] Cache contains exactly 168 items?
