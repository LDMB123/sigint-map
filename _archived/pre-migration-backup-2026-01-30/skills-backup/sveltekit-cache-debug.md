---
name: sveltekit-cache-debug
description: "sveltekit cache debug for DMB Almanac project"
tags: ['project-specific', 'dmb-almanac']
---

# Skill: Cache Debug

**ID**: `cache-debug`
**Category**: Debugging
**Agent**: Caching Specialist / Performance Optimizer

## When to Use

- Stale data appearing in UI
- Service Worker serving outdated content
- Browser cache not respecting headers
- Development changes not reflected
- Production deployment not updating
- Mysterious cache behavior after updates

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| url | string | Yes | URL showing stale data or cache issue |
| expected_data | string | No | Description of expected fresh data |
| cache_type | string | No | Type of cache: 'browser', 'sw', 'server', 'all' |

---

## Steps

### Step 1: Enable Cache Debug Logging

For SvelteKit projects:

```typescript
// vite.config.ts - Add during debugging
export default defineConfig({
  server: {
    headers: {
      'Cache-Control': 'no-store', // Disable caching in dev
    },
  },
  logLevel: 'info',
});
```

### Step 2: Check Network Tab

```markdown
1. Open Chrome DevTools > Network
2. Check "Disable cache" for testing
3. Navigate to problematic URL
4. Click on the request and check Response Headers:
   - `Cache-Control` - Cache directives
   - `Age` - How old the cached response is
   - `Date` - When response was generated
   - `Last-Modified` - Last modification time
   - `ETag` - Entity tag for cache validation
   - `Expires` - Absolute expiration time
5. Check "Size" column:
   - "(disk cache)" - Served from browser disk cache
   - "(memory cache)" - Served from browser memory cache
   - "Service Worker" - Served from service worker cache
```

### Step 3: Check Service Worker Cache

```javascript
// In DevTools Console
async function inspectSWCache() {
  const cacheNames = await caches.keys();
  console.log('Cache buckets:', cacheNames);

  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    console.log(`\n${name}:`, keys.map(k => k.url));

    // Check specific resource
    const response = await cache.match('/path/to/resource');
    if (response) {
      console.log('Cached response:', {
        status: response.status,
        headers: Object.fromEntries(response.headers),
      });
    }
  }
}
inspectSWCache();
```

Alternative: Use DevTools Application tab:
```markdown
1. Chrome DevTools > Application
2. Expand "Cache Storage" in left sidebar
3. Click each cache to view contents
4. Right-click entries to delete or inspect
```

### Step 4: Check Browser HTTP Cache

```bash
# Check headers with curl
curl -I http://localhost:5173/path/to/resource

# Check with cache-busting
curl -I -H "Cache-Control: no-cache" http://localhost:5173/path/to/resource

# Check with specific browser cache directives
curl -I -H "Pragma: no-cache" http://localhost:5173/path/to/resource
```

### Step 5: Clear Caches Systematically

```javascript
// Clear all Service Worker caches
async function clearAllSWCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  console.log('All SW caches cleared:', cacheNames);
}
clearAllSWCaches();

// Unregister Service Worker
async function unregisterSW() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map(reg => reg.unregister()));
  console.log('Service Workers unregistered');
}
unregisterSW();
```

```bash
# Clear SvelteKit build cache
rm -rf .svelte-kit

# Clear node_modules cache (if needed)
rm -rf node_modules/.vite

# Rebuild
npm run build
```

### Step 6: Test Fresh Request

```bash
# Test with all caches bypassed
curl -H "Cache-Control: no-cache, no-store, must-revalidate" \
     -H "Pragma: no-cache" \
     -H "Expires: 0" \
     http://localhost:5173/api/data

# Test with timestamp to bust cache
curl "http://localhost:5173/api/data?t=$(date +%s)"
```

---

## Common Issues

### Issue 1: Service Worker Serving Stale

**Symptom**: New deployment not reflected in browser

**Causes**:
1. Service Worker not updated
2. Cache version not incremented
3. `skipWaiting` not called
4. User hasn't refreshed or closed all tabs

**Debug**:
```javascript
// Check Service Worker version
navigator.serviceWorker.controller?.scriptURL;

// Check SW state
navigator.serviceWorker.ready.then(r => {
  console.log('SW state:', r.active?.state);
  console.log('SW script:', r.active?.scriptURL);
});

// Check for waiting SW
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Waiting SW:', reg?.waiting);
  console.log('Installing SW:', reg?.installing);
});
```

**Fix**:
```javascript
// In service worker (sw.js or service-worker.ts)
const CACHE_VERSION = 'v2'; // Increment version

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Activate immediately
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.filter(name => name !== CACHE_VERSION)
          .map(name => caches.delete(name))
      );
    })
  );
  return self.clients.claim(); // Take control immediately
});
```

### Issue 2: Browser HTTP Cache Not Respecting Headers

**Symptom**: Resources cached despite `no-cache` headers

**Causes**:
1. Incorrect `Cache-Control` syntax
2. Conflicting cache directives
3. Browser heuristic caching
4. Reverse proxy/CDN caching

**Debug**:
```bash
# Check actual headers sent
curl -I http://localhost:5173/path/to/resource | grep -i cache

# Check for conflicting headers
curl -I http://localhost:5173/path/to/resource | grep -iE 'cache|expires|pragma'
```

**Fix**:
```typescript
// SvelteKit hooks.server.ts
export async function handle({ event, resolve }) {
  const response = await resolve(event);

  // Set appropriate cache headers
  if (event.url.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
  } else if (event.url.pathname.startsWith('/_app/')) {
    // Immutable assets
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    // HTML pages
    response.headers.set('Cache-Control', 'no-cache');
  }

  return response;
}
```

### Issue 3: SvelteKit Development Server Caching

**Symptom**: Changes not reflected in development

**Causes**:
1. Vite module cache
2. Browser cache enabled
3. Service Worker active in development

**Debug**:
```bash
# Check for active service workers
# DevTools > Application > Service Workers

# Check Vite cache
ls -la node_modules/.vite/
```

**Fix**:
```bash
# Disable service worker in development
# Or clear Vite cache
rm -rf node_modules/.vite

# Hard refresh in browser
# Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
```

---

## Debugging Checklist

- [ ] Checked Network tab for cache source
- [ ] Inspected response headers
- [ ] Checked Service Worker cache contents
- [ ] Verified Service Worker version/state
- [ ] Tested with all caches disabled
- [ ] Cleared browser HTTP cache
- [ ] Cleared Service Worker caches
- [ ] Tested fresh request with curl
- [ ] Verified headers on server response
- [ ] Checked for CDN/proxy caching

---

## Artifacts Produced

| Artifact | Path | Description |
|----------|------|-------------|
| cache-debug-log.txt | `.claude/artifacts/` | Debug session log |
| cache-state.json | `.claude/artifacts/` | Cache state snapshot |
| cache-headers.txt | `.claude/artifacts/` | HTTP headers analysis |

---

## Output Template

```markdown
## Cache Debug Report

### Issue
[Description of stale data or cache issue]

### URL
`[URL showing issue]`

### Investigation

#### Network Headers
```
Cache-Control: [value]
Age: [value]
Date: [value]
Last-Modified: [value]
ETag: [value]
Expires: [value]
```

#### Service Worker Status
- Registered: [Yes/No]
- State: [activated/waiting/installing]
- Script URL: [url]
- Version: [version]
- Cache buckets: [list]
- Relevant cached URLs: [list]

#### Browser Cache
- Memory cache entries: [count]
- Disk cache entries: [count]
- Cache source: [Service Worker/disk cache/memory cache/network]

#### Server Configuration
- Framework: SvelteKit [version]
- Server headers: [configured/default]
- Static asset handling: [description]

### Root Cause
[Identified cause of cache issue]

### Fix Applied
```typescript
[Code fix or configuration change]
```

### Verification Steps
- [ ] Cleared all caches
- [ ] Confirmed fresh data on network request
- [ ] Verified correct headers returned
- [ ] Tested Service Worker update flow
- [ ] Confirmed cache behavior matches expectations

### Prevention
[Steps to prevent similar issues in future]
```

---

## Cache Strategy Recommendations

### Static Assets (JS, CSS, Images)
```
Cache-Control: public, max-age=31536000, immutable
```

### HTML Pages
```
Cache-Control: no-cache
```

### API Responses (Dynamic Data)
```
Cache-Control: no-store, must-revalidate
```

### API Responses (Cacheable Data)
```
Cache-Control: public, max-age=60, s-maxage=300
```

---

## Success Criteria

- Root cause of cache issue identified
- Appropriate fix applied and verified
- Fresh data served correctly
- Cache headers configured appropriately
- Cache behavior documented and predictable
