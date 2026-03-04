# PWA Quick Fixes — Immediate Action Items

- Archive Path: `docs/archive/root-docs/PWA_QUICK_FIXES.md`
- Normalized On: `2026-03-04`
- Source Title: `PWA Quick Fixes — Immediate Action Items`

## Summary
Apply these 3 fixes before next release to eliminate all CRITICAL issues.

## Context
Apply these 3 fixes before next release to eliminate all CRITICAL issues.

---

### Fix #1: Add CSP to offline.html

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/public/offline.html`

**Before (lines 1-10):**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Blaire's Kind Heart - Offline</title>
```

**After:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#FFB7C5">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'self'; form-action 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; object-src 'none';">
  <title>Blaire's Kind Heart - Offline</title>
```

**Why:** Safari may apply default CSP rules; explicit declaration prevents style/content blocking.

---

### Fix #2: Strengthen SW Message Handler

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/public/sw.js`

**Before (lines 21-26):**
```javascript
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

**After:**
```javascript
self.addEventListener('message', (event) => {
  try {
    if (event.data && typeof event.data === 'object' && event.data.type === 'SKIP_WAITING') {
      console.log('[sw] SKIP_WAITING received, activating new SW');
      self.skipWaiting();
    }
  } catch (err) {
    console.error('[sw] Message handler error:', err);
  }
});
```

**Why:** Prevents silent failures and adds defensive validation.

---

### Fix #3: Remove '/' from Precache List

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/public/sw-assets.js`

**Before (lines 7-14):**
```javascript
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/wasm-init.js',
  '/db-worker.js',
```

**After:**
```javascript
const PRECACHE_ASSETS = [
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/wasm-init.js',
  '/db-worker.js',
```

**Why:** Root path is handled by navigation fallback (line 50-57 in sw.js); precaching it separately is redundant and creates fragility. Navigation requests explicitly serve `/index.html` from cache, so '/' is never needed.

---

## Actions
_No actions recorded._

## Validation
After applying fixes:

1. **Build:** `trunk build --release`
2. **Test offline:** Open DevTools (Safari Web Inspector), go offline, reload page
3. **Check console:** No errors in console, `[sw] SKIP_WAITING received` should appear on update
4. **Cache size:** Should remain ~56.7 MB (1 file saved by removing '/')
5. **Test install:** Try installing app to home screen—install prompt should work smoothly

---

### Expected Impact

- **Security:** CSP now protects offline.html against potential edge cases
- **Robustness:** Message handler won't silently fail on malformed data
- **Performance:** Slightly faster installation (one fewer file to fetch during precache.addAll)

**Total fix time:** ~5 minutes
**Risk level:** Very low—all changes are defensive improvements

---

### Apply via Git

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart

git add public/offline.html public/sw.js public/sw-assets.js
git commit -m "PWA: Fix critical security & robustness issues

- Add CSP meta tag to offline.html for consistent security policy
- Strengthen SW message handler with type validation & error handling
- Remove redundant '/' from precache manifest (handled by nav fallback)

Fixes CRITICAL #1, #2, #3 from audit report."

trunk build --release

git push
```

---

### High Priority Fixes (Week 1)

After the 3 critical fixes above, prioritize:

4. **Manifest icon paths** (MEDIUM #7) — 2 min fix, prevents install issues on some iOS versions
5. **Add CSP + viewport to offline.html** — already covered in Fix #1
6. **Periodic SW update** (HIGH #8) — ~30 min, improves UX significantly

See full audit report for details.

---

**Next review:** Test on device after applying, then schedule remaining HIGH/MEDIUM fixes for next sprint.

## References
_No references recorded._

