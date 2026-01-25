# Skill: Service Worker Debugging Checklist

**ID**: `sw-debugging-checklist`
**Category**: PWA / Debugging
**Agent**: PWA Specialist

---

## When to Use

- Service Worker registration failures
- Update detection not working
- Offline functionality broken
- Cache issues or stale content
- Event listener memory leaks
- Silent precache failures
- Service Worker not updating
- MessageChannel port leaks

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| project_path | string | Yes | Path to project root |
| sw_location | string | Yes | Path to Service Worker file (e.g., `/static/sw.js` or `/public/sw.js`) |
| issue_type | enum | No | `registration`, `update`, `cache`, `offline`, `memory`, `performance` |
| debug_mode | boolean | No | Enable verbose logging (default: true) |

---

## Steps

### Step 1: Pre-Work Verification

Create a diagnostic report by collecting these files:

```bash
# 1. Check key files exist
ls -la {sw_location}
ls -la src/lib/sw* src/lib/stores/pwa* 2>/dev/null || echo "Not found"
ls -la src/routes/+layout.svelte vite.config.ts package.json

# 2. Check for manifest
ls -la static/manifest.json public/manifest.json 2>/dev/null

# 3. Count lines in SW
wc -l {sw_location}

# 4. Search for critical patterns
grep -n "addEventListener\|client.postMessage\|fetch\|cache" {sw_location} | head -20
```

Create documentation:
- `SW_ANALYSIS.md` - Structure and patterns found
- `CACHE_CONFIG.md` - Current caching strategy
- `DEBUG_FINDINGS.md` - Issues identified

---

### Step 2: Diagnose Registration Issues

**Priority: CRITICAL**

Check DevTools: Application > Service Workers

```javascript
// Test in browser console
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    console.log('Registrations:', regs.length);
    regs.forEach(reg => {
      console.log('Scope:', reg.scope);
      console.log('Installing:', reg.installing?.scriptURL);
      console.log('Waiting:', reg.waiting?.scriptURL);
      console.log('Active:', reg.active?.scriptURL);
      console.log('State:', reg.active?.state);
    });
  });
} else {
  console.log('Service Workers not supported');
}
```

**Common Issues:**

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Failed to register: TypeError` | SW file not found or returns error | Check SW file exists and is valid JavaScript |
| `Multiple registrations` | Race condition in initialization code | Add guard flag to prevent duplicate registration |
| `Scope mismatch` | Registration scope differs from manifest | Ensure `scope: '/'` in register() call |
| `HTTPS required` | Attempting to register over HTTP | Use HTTPS or localhost only |
| `Script returned error` | SW file has syntax errors | Check console for script errors |

**Fix: Guard Against Duplicate Registration**

```typescript
// In your initialization code (e.g., pwa.ts store)
let initialized = false;

export async function initializeServiceWorker() {
  if (initialized) return;
  initialized = true;

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('SW registered once:', registration.scope);
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  }
}
```

---

### Step 3: Diagnose Update Issues

**Priority: CRITICAL**

When a new SW is deployed, users should get update notifications.

Check DevTools: Sources tab, find sw.js, look for version or cache name

```javascript
// In browser console, test update detection
navigator.serviceWorker.ready.then(registration => {
  console.log('Current SW:', registration.active?.scriptURL);

  // Manually check for updates
  registration.update().then(() => {
    console.log('Update check complete');
    console.log('Active:', registration.active?.state);
    console.log('Waiting:', registration.waiting?.state);
  });
});
```

**Common Issues:**

| Symptom | Cause | Fix |
|---------|-------|-----|
| Browser cache prevents update check | HTTP cache expires before 24h | Add `Cache-Control: max-age=0` to sw.js |
| New SW installs but doesn't activate | Missing clients.claim() in activate | Broadcast SW_UPDATED message after claim() |
| Users see old content after update | Stale cache not invalidated | Increment CACHE_VERSION and delete old caches |
| No "Update available" notification | SW_UPDATED message not sent | Add message broadcast in activate event |

**Fix: Send Update Notification**

```javascript
// In sw.js - activate event
self.addEventListener('activate', (event) => {
  // ... clean old caches ...

  event.waitUntil(
    (async () => {
      // ... cleanup ...

      // After cleanup, notify all clients of update
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SW_UPDATED',
          version: CACHE_VERSION
        });
      });
    })()
  );
});
```

```typescript
// In registration code
navigator.serviceWorker.addEventListener('message', (event) => {
  if (event.data.type === 'SW_UPDATED') {
    console.log('Update available, show UI');
    // Show update prompt to user
  }
});
```

---

### Step 4: Diagnose Cache Issues

**Priority: HIGH**

Check DevTools: Application > Cache Storage

```javascript
// In browser console, inspect caches
caches.keys().then(cacheNames => {
  console.log('Caches:', cacheNames);

  cacheNames.forEach(name => {
    caches.open(name).then(cache => {
      cache.keys().then(requests => {
        console.log(`\nCache: ${name} (${requests.length} entries)`);
        requests.forEach(req => {
          console.log('  -', req.url);
        });
      });
    });
  });
});
```

**Common Issues:**

| Symptom | Cause | Fix |
|---------|-------|-----|
| Precache URLs missing | cache.addAll() fails silently | Use individual addAll() loops with error handling |
| Cache name format wrong | Multiple SW versions confused | Use versioned cache names (e.g., `shell-v1`) |
| Old caches persist | activate event doesn't cleanup | Filter old caches correctly in activate |
| Offline page not cached | Fallback URL not in precache | Add `/offline` to PRECACHE_URLS array |

**Fix: Resilient Precaching**

```javascript
// In sw.js - install event
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/styles.css',
  '/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Add each URL individually instead of cache.addAll()
      const failed = [];
      for (const url of PRECACHE_URLS) {
        try {
          await cache.add(url);
          console.log('✓ Cached:', url);
        } catch (error) {
          console.warn('✗ Failed to cache:', url, error);
          failed.push(url);
        }
      }

      // Still install even if some URLs fail
      if (failed.length > 0) {
        console.warn('Precache warnings:', failed);
      }
    })()
  );
  self.skipWaiting();
});
```

---

### Step 5: Diagnose Offline Functionality

**Priority: HIGH**

Test by going offline in DevTools: Network > Offline checkbox

```javascript
// In browser console
// 1. Check if online status correct
console.log('Online:', navigator.onLine);

// 2. Test fetch with offline fallback
fetch('/api/data')
  .then(r => r.json())
  .then(data => console.log('Network:', data))
  .catch(() => console.log('Network failed, should use cache'));

// 3. Check offline page exists
caches.open('shell-v1').then(cache => {
  cache.match('/offline').then(response => {
    console.log('Offline page cached:', !!response);
  });
});
```

**Common Issues:**

| Symptom | Cause | Fix |
|---------|-------|-----|
| Blank page when offline | Navigation doesn't match cached route | Implement Network-first with offline fallback |
| API call hangs indefinitely | No fetch timeout | Add Promise.race() with 5s timeout |
| Wrong offline page shown | Fallback URL not matching | Use consistent fallback URL |

**Fix: Network Timeout with Fallback**

```javascript
// In sw.js
function fetchWithTimeout(request, timeout = 5000) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
  ]);
}

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetchWithTimeout(event.request)
        .catch(async () => {
          const cached = await caches.match(event.request);
          return cached || (await caches.match('/offline'));
        })
    );
  }
});
```

---

### Step 6: Diagnose Memory Leaks

**Priority: HIGH**

Check DevTools: Memory tab

```javascript
// Step 1: Take heap snapshot before
// Memory tab > Take snapshot #1

// Step 2: Interact with page
// - Navigate multiple times
// - Trigger SW updates
// - Toggle offline mode
// - Reload page 5 times

// Step 3: Take heap snapshot after
// Memory tab > Take snapshot #2

// Step 4: Compare
// Filter by "detached" nodes
// Look for event listeners in closure
```

**Common Issues:**

| Symptom | Cause | Fix |
|---------|-------|-----|
| Memory grows 50MB+ | Event listeners not cleaned up | Use AbortController with signal cleanup |
| MessageChannel ports not freed | port.close() not called | Close ports after use in timeout/handlers |
| Closures holding references | Nested listener functions | Create separate cleanup functions |

**Fix: Proper Event Listener Cleanup**

```typescript
// In pwa.ts store
const listeners: Array<() => void> = [];
const controllers = new Map();

$effect(() => {
  // Create controller for this effect
  const controller = new AbortController();
  controllers.set('registration', controller);

  navigator.serviceWorker.addEventListener(
    'controllerchange',
    handleControllerChange,
    { signal: controller.signal }
  );

  // Cleanup function
  const cleanup = () => {
    controller.abort();
    listeners.forEach(fn => fn());
    listeners.length = 0;
  };

  return cleanup;
});
```

---

### Step 7: Diagnose MessageChannel Leaks

**Priority: MEDIUM**

```javascript
// In browser console
// Check for pending ports
navigator.serviceWorker.controller?.postMessage({
  type: 'GET_PORT_COUNT'
});

// Listen for response
navigator.serviceWorker.addEventListener('message', (event) => {
  if (event.data.type === 'PORT_COUNT') {
    console.log('Open ports:', event.data.count);
  }
});
```

**Common Issues:**

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Port.postMessage failed" errors | Port closed without message listener | Check port.onmessage set before timeout |
| Memory leak from MessageChannel | port.close() never called | Close port in both success and timeout paths |

**Fix: Proper Port Management**

```typescript
// In pwa.ts
async function checkCacheStatus() {
  const port = new MessageChannel();
  const controller = navigator.serviceWorker.controller;

  if (!controller) return null;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      port.port1.close(); // Always close on timeout
      resolve(null);
    }, 2000);

    port.port1.onmessage = (event) => {
      clearTimeout(timeout);
      port.port1.close(); // Close after receiving message
      resolve(event.data);
    };

    controller.postMessage({ type: 'CACHE_STATUS' }, [port.port2]);
  });
}
```

---

### Step 8: Test Manifest Configuration

**Priority: MEDIUM**

```bash
# Check manifest exists and is valid
curl -s http://localhost:5173/manifest.json | jq .

# Key fields to verify
jq '.{
  id,
  name,
  short_name,
  start_url,
  scope,
  display,
  icons,
  theme_color,
  background_color
}' manifest.json
```

**Validation Checklist:**

- [ ] `id` matches deployment path (root = `/`)
- [ ] `scope` matches registration scope
- [ ] `start_url` responds while offline
- [ ] Icons are 192px and 512px minimum
- [ ] `display` is `standalone` or `minimal-ui`
- [ ] Theme color matches app primary color
- [ ] No URLs relative to manifest

---

### Step 9: Create Comprehensive Debug Report

Document findings in structured format:

**SW_DEBUG_REPORT.md:**
```markdown
# Service Worker Debug Report

## Environment
- Framework: SvelteKit / Next.js / Custom
- SW Location: /static/sw.js
- Manifest: /manifest.json
- HTTPS: Yes / No
- Localhost: Yes / No

## Registration Status
- Supported: Yes / No
- Registered: Yes / No
- Active SW: [URL and version]
- Waiting SW: [URL and version]
- Errors: [List any errors]

## Issue #1: [Issue Name]
**Symptom:** [What user sees]
**Root Cause:** [Why it happens]
**Fix Applied:** [Code change]
**Verification:** [How to test fix]

## Cache Configuration
| Cache Name | Version | Max Age | Max Entries |
|-----------|---------|---------|-------------|
| app-shell | v1 | - | - |
| api-cache | v1 | 15min | 50 |

## Test Results
- [ ] Registration works
- [ ] Update detection works
- [ ] Offline mode works
- [ ] Cache expires correctly
- [ ] No memory leaks
- [ ] Lighthouse PWA check: 90+
```

---

## Expected Output

### Success Case
```markdown
## Service Worker Debugging Complete

### Status: RESOLVED ✓

**Registration:** Working
- Single registration detected
- Scope: /
- Active SW version: v2

**Update:** Working
- SW_UPDATED message broadcasts
- Users notified of updates

**Offline:** Working
- Precache: 6 URLs cached successfully
- Fallback: /offline page available
- Network timeout: 5s configured

**Memory:** Clean
- Heap snapshot diff: +2MB (normal)
- Event listeners: Properly cleaned
- No port leaks detected

**Lighthouse Score:** 97 (PWA category)
```

### Problem Cases
```markdown
## Issues Requiring Fix

### Issue 1: Race Condition (CRITICAL)
- Multiple SW registrations detected
- Fix: Add initialization guard
- Effort: 5 minutes

### Issue 2: Memory Leak (HIGH)
- Event listeners accumulating
- Fix: Wrap in AbortController
- Effort: 10 minutes
```

---

## Artifacts Produced

| Artifact | Path | Description |
|----------|------|-------------|
| SW_DEBUG_REPORT.md | `.claude/artifacts/` | Full diagnostic report |
| sw-fixes.ts | `.claude/artifacts/` | Code fixes to apply |
| cache-config.md | `.claude/artifacts/` | Cache strategy documentation |
| test-checklist.md | `.claude/artifacts/` | Test cases to verify fixes |

---

## Common Patterns in The Wild

### Pattern 1: Initialization Race Condition
**Symptom:** Console shows "SW registered" multiple times
**Root Cause:** initialize() called from multiple components
**Fix:** Use module-level flag or store initialization guard

### Pattern 2: Forgotten Cleanup
**Symptom:** Memory grows 100MB over 1 hour
**Root Cause:** Event listeners never unsubscribed
**Fix:** Use AbortController and clean up in $effect() return

### Pattern 3: Stale Cache Silent Delivery
**Symptom:** Users see old content after update
**Root Cause:** Cache version not incremented
**Fix:** Change CACHE_VERSION, old caches cleaned in activate event

### Pattern 4: Precache Failure
**Symptom:** /offline page not available offline
**Root Cause:** cache.addAll() fails, SW doesn't install
**Fix:** Use individual add() calls, always skipWaiting()

---

## References

- [MDN: Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Chrome DevTools: SW Debugging](https://developer.chrome.com/docs/devtools/progressive-web-apps/)
- [Web.dev: Service Worker Debugging](https://web.dev/service-worker-debugging/)
- [Workbox Debugging](https://developers.google.com/web/tools/workbox/guides/troubleshooting)
