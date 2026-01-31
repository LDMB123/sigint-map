# SvelteKit PWA Patterns Reference

## Service Worker Integration
- Register in `src/service-worker.js` or `src/service-worker.ts`
- SvelteKit provides `$service-worker` module for build info
- Precache manifest auto-generated from build output
- Custom fetch handler for API vs static asset strategies

## Offline Navigation
- Pre-cache all route shells during SW install
- Runtime cache visited pages with stale-while-revalidate
- Offline fallback page for uncached routes
- IndexedDB for offline data access

## Manifest Verification
- `src/app.html` must link to `/manifest.json`
- Verify icons (192x192, 512x512 minimum)
- Check `start_url`, `scope`, `display` fields
- Test installability in Chrome DevTools > Application

## SW Update UX
- Detect updates via `navigator.serviceWorker.addEventListener('controllerchange')`
- Show non-modal toast: "New version available"
- Primary action: "Update now" (skipWaiting + reload)
- Secondary: "Later" (dismiss, apply on next visit)

## Rollback Plan
- Keep previous SW version cached
- Version comparison on activation
- Automatic rollback if critical errors detected
- Manual override via DevTools > Application > Service Workers
