# Testing Checklist

## Pre-Testing Setup

### Environment
```bash
cd app
[ -f .env ] && echo "ok" || echo "Create .env from .env.example"
grep -q "VITE_VAPID_PUBLIC_KEY=" .env   # VAPID public key
grep -q "VAPID_PRIVATE_KEY=" .env       # VAPID private key
grep -q "PUSH_API_KEY=" .env            # Push API key
grep -q "^\.env$" .gitignore            # .env gitignored
```

### Build
```bash
npm install
npm run check    # type check
npm run lint     # linting
npm run test     # unit tests
npm run build    # production build
```

## E2E Test Coverage (122 tests)

- [ ] **PWA** (22): SW registers/activates, offline works, install prompt, share target, protocol handlers
- [ ] **Search** (20): results return, debounce works, <100ms render, empty states, screen reader announcements
- [ ] **Navigation** (25): all pages accessible, detail pages load, back/forward, 404s, speculation rules
- [ ] **Accessibility** (30): zero axe-core violations, keyboard nav, screen reader labels, touch targets >=44x44px, WCAG AA contrast
- [ ] **Performance** (25): FCP <1.5s, LCP <2.5s, CLS <0.1, INP <200ms, TTFB <800ms, JS <150KB, CSS <50KB

## Cross-Browser Testing

- [ ] **Chrome 143+ Desktop**: all tests pass, PWA installable, SW active
- [ ] **Safari 17.2+ Desktop**: core functionality, graceful degradation
- [ ] **Chrome Mobile**: responsive layout, touch targets, PWA installable
- [ ] **Safari Mobile/iOS**: install instructions show, touch gestures, viewport correct

## PWA Validation

### Installation
- [ ] Desktop Chrome/Edge: wait 5s + scroll 200px -> install banner -> Install -> standalone window
- [ ] Mobile Chrome: wait 5s + scroll -> Add to Home Screen -> fullscreen
- [ ] Mobile Safari: "How to Install" button -> Share -> Add to Home Screen
- [ ] Dismissal: "Not now" -> `pwa-install-prompt-dismissed` in localStorage -> no reprompt

### Service Worker
- [ ] DevTools > Application > Service Workers: `/sw.js` registered, activated, scope `/`
- [ ] Console: `[SW] Cache version: v<version>-<git-hash>` matches package.json
- [ ] Update: bump version -> rebuild -> refresh -> update banner -> "Update Now" -> reloads
- [ ] Offline: Network offline -> cached pages load -> "You're offline" banner

### Manifest
- [ ] Valid JSON at /manifest.json, all required fields
- [ ] Icons include maskable variants, screenshots provided

## Push Notifications

### Subscription
- [ ] VAPID keys configured, `Notification.requestPermission()` -> "granted"

### Security
```bash
# Should succeed (200 OK)
curl -X POST http://localhost:5173/api/push-send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PUSH_API_KEY" \
  -d '{"title":"Test","body":"Test","subscriptionIds":[]}'

# Should fail (403 Forbidden)
curl -X POST http://localhost:5173/api/push-send \
  -H "Content-Type: application/json" \
  -d '{"title":"Hack","body":"Test"}'
```

## Accessibility

- [ ] Color contrast >= 4.5:1 (light ~5.1:1, dark ~7.2:1)
- [ ] Screen reader: banner announced as "alert", buttons labeled
- [ ] Keyboard: Tab through interactive elements, Enter activates, Escape clears search
- [ ] Focus indicators visible, no keyboard traps, skip links present
- [ ] Heading hierarchy (single h1), ARIA labels, live regions

## Performance Validation

### Lighthouse (Production Build)
- [ ] Performance >= 90, Accessibility >= 95, Best Practices >= 90, SEO >= 90, PWA installable

### Bundle Analysis
- [ ] Initial JS < 150KB, CSS < 50KB, WASM lazy loaded, D3 chunks lazy loaded

## Security
- [ ] CSP headers configured, no inline scripts (except allowed), no eval()
- [ ] No critical dependency vulnerabilities (`npm audit`)
- [ ] No API keys in code, .env not committed

## Data Validation
- [ ] IndexedDB schema migrations work, data seeding successful
- [ ] All API endpoints functional, error handling correct, loading states show

## CI/CD Pipeline
- [ ] E2E: all browsers tested, sharded, reports uploaded
- [ ] Accessibility: axe-core passes, zero violations
- [ ] Performance: budgets enforced, metrics collected
- [ ] Lighthouse CI: scores meet targets

## Deployment
- [ ] **Pre-deploy**: all CI green, no failing tests, build successful
- [ ] **Post-deploy**: site loads, SW updates, analytics tracking
- [ ] **Smoke tests**: home page, search, detail pages, PWA installable

## Manual Testing (Recommended)

### User Journeys
- [ ] First-time: home -> stats -> songs list -> song detail -> search
- [ ] Returning: install PWA -> home screen -> offline mode -> favorites sync
- [ ] Power user: advanced search -> visualizations -> statistics -> keyboard nav

### Edge Cases
- [ ] Offline mode, slow 3G, connection recovery
- [ ] Private/incognito, ad blockers, JS disabled
- [ ] Small screens (<375px), large (>1920px), landscape/portrait

## Release
- [ ] package.json version bumped, CHANGELOG updated
- [ ] Previous version tagged, rollback procedure tested
- [ ] Post-release: no new errors, Core Web Vitals stable, user feedback monitored

## Quick Reference

```bash
npm run check       # Type check
npm run lint        # Lint
npm run test        # Unit tests
npm run test:e2e    # E2E tests
npm run build       # Build
npm run preview     # Preview production (localhost:4173)
```

## Known Issues

- **Install prompt missing**: uninstall app first, clear localStorage dismissal, need HTTPS (except localhost), must scroll 200px + wait 5s
- **Push fails**: check VAPID key (86+ base64url chars), SW must be active, needs secure context
- **Build fails**: need Node >=18, run `npm install`, check `npm run check`
