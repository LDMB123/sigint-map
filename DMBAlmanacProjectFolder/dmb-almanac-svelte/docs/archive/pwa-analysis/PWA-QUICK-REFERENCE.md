# DMB Almanac PWA - Quick Reference Guide

## Critical Issues at a Glance

### 🔴 CRITICAL (Fix Today)

| Issue | File | Line | Impact | Fix Time |
|-------|------|------|--------|----------|
| Missing cleanupExpiredCaches() | /public/sw.js | 90 | SW crashes on activate | 15 min |
| No skipWaiting() on install | /public/sw.js | 57 | Delayed SW activation | 5 min |
| Event listener leak | /lib/storage/offline-download.ts | 375 | Memory leak | 20 min |
| IndexedDB not initialized | /lib/storage/offline-db.ts | 264 | No offline data | 30 min |

### 🟠 HIGH (Fix This Week)

| Issue | File | Line | Impact | Fix Time |
|-------|------|------|--------|----------|
| iOS detection wrong order | /lib/sw/register.ts | 228 | iOS detection fails | 5 min |
| Network timeout too short | /lib/sw/serwist.config.ts | 143 | Timeout on slow networks | 10 min |
| Polling too frequent | /lib/storage/offline-download.ts | 369 | Battery drain | 10 min |

---

## Files to Check/Fix

### Most Critical
```
/public/sw.js
├── Line 90: cleanupExpiredCaches() undefined ← FIX #1
└── Line 57: Add self.skipWaiting() ← FIX #2

/lib/storage/offline-download.ts
├── Line 375: Remove listener in timeout ← FIX #3
└── Line 369: Increase polling to 2000ms ← FIX #7

/lib/storage/offline-db.ts
├── Line 264: Auto-init database ← FIX #4 (provider needed)

/lib/sw/register.ts
├── Line 228: Reorder iOS detection ← FIX #5

/lib/sw/serwist.config.ts
├── Line 143: Increase timeout 3s → 8s ← FIX #6
```

### Good (No Changes Needed)
```
/public/manifest.json - ✅ Perfect
/lib/db/dexie/db.ts - ✅ Good design
/components/pwa/InstallPrompt.tsx - ✅ Working
```

---

## Quick Testing

### Test SW Registration
```javascript
// In DevTools console
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => {
    console.log({
      scope: reg.scope,
      installing: reg.installing?.state,
      waiting: reg.waiting?.state,
      active: reg.active?.state
    });
  });
});
```

### Test IndexedDB
```javascript
// In DevTools console
indexedDB.databases().then(dbs => {
  dbs.forEach(db => console.log(db.name));
});

// Or in DevTools Application tab > IndexedDB
```

### Test Offline
1. DevTools > Network > Offline
2. Reload page
3. Should show offline page or cached content
4. Navigate to /offline manually

### Test Cache Size
```javascript
// In DevTools console
async function getCacheSize() {
  const cacheNames = await caches.keys();
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    console.log(`${name}: ${keys.length} entries`);
  }
}
getCacheSize();
```

---

## Deployment Steps

### Phase 1 (Critical - 45 min)
1. Apply FIX #1, #2, #3 to `/public/sw.js` and `/lib/storage/offline-download.ts`
2. Test in Chrome offline mode
3. Verify no console errors on SW activation
4. Deploy to production

### Phase 2 (Data - 30 min)
1. Create `OfflineDataProvider` component
2. Wire into app layout
3. Call data-loader on init
4. Deploy to production

### Phase 3 (Performance - 30 min)
1. Apply FIX #5, #6, #7
2. Test on throttled 4G network
3. Monitor battery usage on mobile
4. Deploy to production

---

## Verification Commands

```bash
# Check build succeeds
npm run build

# Lint check
npm run lint

# Type check
npx tsc --noEmit

# Start dev server
npm run dev

# Check manifest validity
curl http://localhost:3000/manifest.json | jq '.'

# Check service worker
curl http://localhost:3000/sw.js | head -20
```

---

## Key File Locations

```
PWA Core Files:
  /public/sw.js                          - Service Worker
  /public/manifest.json                  - PWA Manifest
  /lib/sw/                               - SW utilities
  /lib/storage/                          - Offline storage
  /lib/db/dexie/                         - IndexedDB layer
  /components/pwa/                       - PWA UI components

Configuration:
  /next.config.ts                        - HTTP headers, caching
  /app/layout.tsx                        - Root layout with providers

Tests & Docs:
  /lib/sw/PWA_CACHE_MANAGEMENT.md
  /lib/db/dexie/DATA_LOADER.md
```

---

## Common Issues & Solutions

### "Service Worker blocked by browser"
**Cause:** Not HTTPS or not on localhost
**Fix:** Deploy to HTTPS or access via localhost:3000

### "Cache not updating"
**Cause:** Old CACHE_VERSION in sw.js
**Fix:** Increment CACHE_VERSION, deploy new SW

### "IndexedDB empty"
**Cause:** Not initialized on app start
**Fix:** Apply FIX #4 (create OfflineDataProvider)

### "Offline page shows immediately"
**Cause:** Network timeout too short
**Fix:** Apply FIX #6 (increase to 5-8s)

### "Battery drain on iOS"
**Cause:** Polling every 500ms
**Fix:** Apply FIX #7 (increase to 2000ms)

### "SW not activating"
**Cause:** No skipWaiting() called
**Fix:** Apply FIX #2 (add self.skipWaiting())

---

## Monitoring Checklist

After each deployment:

- [ ] DevTools > Application > Service Workers shows "Active and running"
- [ ] DevTools > Application > Cache Storage has expected caches
- [ ] DevTools > Application > IndexedDB shows tables with data
- [ ] No errors in console on page load
- [ ] Offline mode works (Network > Offline)
- [ ] Update notification appears on new version
- [ ] iOS app installs and launches from home screen
- [ ] No memory leaks (DevTools > Memory profiler)

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| LCP | < 1.0s | With SW caching |
| INP | < 100ms | Main thread responsive |
| CLS | < 0.05 | No layout shift |
| FCP | < 1.0s | Visible content |
| TTI | < 2.0s | Interactive |

---

## Storage Limits

| Platform | Limit | Alert |
|----------|-------|-------|
| Chrome (Desktop) | 50% of disk | None by default |
| Chrome (Mobile) | 6-10% of disk | Browser handles |
| iOS Safari | 50MB | Hard limit |
| Firefox | Unlimited | None |

---

## Resources

- [PWA Debugging Report](/Users/louisherman/Documents/dmb-almanac-pwa-debug-report.md)
- [Detailed Fixes](/Users/louisherman/Documents/dmb-almanac-pwa-fixes.md)
- [Issue Summary](/Users/louisherman/Documents/dmb-almanac-pwa-issues-summary.txt)

---

## Status

- **Analysis Date:** 2026-01-20
- **Framework:** Next.js 16.1.1, React 19.2.3
- **Target:** Chromium 143, Apple Silicon
- **Total Issues Found:** 10
- **Critical Issues:** 4
- **High Priority:** 3
- **Estimated Fix Time:** 2-3 hours total

