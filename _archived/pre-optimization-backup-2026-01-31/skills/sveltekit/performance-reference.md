# SvelteKit Performance Reference

## Bundle Analysis
- Run: `npx vite-bundle-visualizer`
- Check for duplicate dependencies in vendor chunk
- Verify route-level code splitting
- Target: < 200KB initial JS (compressed)

## Cache Debugging
- Check `Cache-Control` headers in Network tab
- Verify SW cache entries in Application > Cache Storage
- Debug stale data: clear cache, reload, compare
- Use `?nocache=1` query param to bypass during development

## Unnecessary JS Inventory
- Audit `<script>` tags for unused libraries
- Check for polyfills targeting already-supported browsers (Chromium 143+)
- Remove jQuery if present (use native DOM APIs)
- Replace moment.js with Intl.DateTimeFormat or date-fns

## Performance Trace Capture
- Chrome DevTools > Performance > Record
- Enable "Screenshots" and "Web Vitals" tracks
- Throttle to 4x slowdown for representative results
- Export trace as JSON for sharing

## Visual Regression
- Playwright screenshot comparison
- `toHaveScreenshot()` assertion with threshold
- Separate tests for light/dark mode
- Mobile viewport testing (375px, 768px, 1440px)
