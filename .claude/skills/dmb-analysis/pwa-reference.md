# DMB Almanac PWA Reference

## Install Banner
- Triggers native PWA install prompt via `beforeinstallprompt` event
- Button visibility tied to install eligibility
- Post-install detection via `appinstalled` event

## File Handler API
- Register file associations in manifest.json
- Handle `.dmb` files for setlist import/export
- Launch queue processing for file opens

## Service Worker
- Stale-while-revalidate for API responses
- Cache-first for static assets
- Offline fallback page with cached data
- Background sync for offline data submission

## Update UX
- Service worker update detection via `updatefound` event
- Non-intrusive toast notification for updates
- One-click update with `skipWaiting()` + reload
- Version display in app footer

## Offline Navigation Strategy
- Pre-cache critical routes during SW install
- Runtime cache for visited pages
- Offline indicator in navigation bar
- Queue mutations for replay when online
