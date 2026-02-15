# PWA Deployment Headers

Last updated: 2026-02-14

This app requires cross-origin isolation and update-safe caching behavior in production.

## Required Response Headers (App Responses)
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Resource-Policy: same-origin`
- `Permissions-Policy: microphone=(), camera=(), geolocation=(), payment=()`

## No-Cache Headers (Update-Critical Files)
Apply to:
- `/sw.js`
- `/sw-assets.js`
- `/asset-manifest.js`
- `/manifest.webmanifest`

Recommended:
- `Cache-Control: no-cache, no-store, must-revalidate`

## Long-Lived Caching
For versioned/static assets (`.wasm`, hashed JS/CSS/images):
- `Cache-Control: public, max-age=31536000, immutable`

## MIME Types
- `.js` -> `application/javascript`
- `.webmanifest` -> `application/manifest+json`
- `.wasm` -> `application/wasm`
