# Skill: Caching Debug Skill

**ID**: `cache-debug`
**Category**: Debugging
**Agent**: Caching Specialist

---

## When to Use

- Stale data appearing in UI
- ISR not revalidating
- Service Worker serving old content
- Mysterious cache behavior

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| url | string | Yes | URL showing stale data |
| expected_data | string | No | Description of expected data |

---

## Steps

### Step 1: Enable Cache Debug Logging

```typescript
// Add to next.config.ts temporarily
const nextConfig = {
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};
```

### Step 2: Check Network Tab

```markdown
1. Open Chrome DevTools > Network
2. Navigate to problematic URL
3. Check response headers:
   - `Cache-Control`
   - `Age`
   - `X-Nextjs-Cache` (HIT/MISS/STALE)
   - `Date`
   - `Last-Modified`
   - `ETag`
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
  }
}
inspectSWCache();
```

### Step 4: Check Data Cache

```bash
# Check .next/cache directory
ls -la .next/cache/fetch-cache/

# View cached fetch data
cat .next/cache/fetch-cache/*.json | jq '.tags, .revalidate'
```

### Step 5: Clear Caches

```javascript
// Clear all SW caches
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
  console.log('SW caches cleared');
});

// Unregister SW
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
  console.log('SW unregistered');
});
```

```bash
# Clear Next.js cache
rm -rf .next/cache

# Rebuild
npm run build
```

### Step 6: Test Fresh Request

```bash
# Bypass all caches
curl -H "Cache-Control: no-cache" \
     -H "Pragma: no-cache" \
     http://localhost:3000/api/sync/full
```

---

## Common Issues

### Issue 1: ISR Not Revalidating

**Symptom**: Data stays stale beyond revalidate time

**Causes**:
1. No traffic to trigger revalidation
2. revalidate set incorrectly
3. Route marked as dynamic

**Debug**:
```bash
# Check route config
grep -E "revalidate|dynamic" app/api/sync/full/route.ts
```

**Fix**:
```typescript
export const revalidate = 60; // Verify correct value
export const dynamic = 'force-static'; // For ISR
```

### Issue 2: Service Worker Serving Stale

**Symptom**: New deployment not reflected

**Causes**:
1. SW not updated
2. Cache version not bumped
3. skipWaiting not called

**Debug**:
```javascript
// Check SW version
navigator.serviceWorker.controller?.scriptURL
// Check SW state
navigator.serviceWorker.ready.then(r => console.log(r.active?.state));
```

**Fix**:
```javascript
// In sw.js, increment version
const CACHE_VERSION = 'v3'; // Was v2
```

### Issue 3: Browser HTTP Cache

**Symptom**: Stale even after SW cache clear

**Causes**:
1. Strong cache headers (max-age)
2. Browser hasn't checked for updates

**Debug**:
```bash
curl -I http://localhost:3000/api/shows/123 | grep -i cache
```

**Fix**:
```typescript
// Add no-cache headers
headers: {
  'Cache-Control': 'no-store, must-revalidate',
}
```

---

## Artifacts Produced

| Artifact | Path | Description |
|----------|------|-------------|
| cache-debug-log.txt | `.claude/artifacts/` | Debug session log |
| cache-state.json | `.claude/artifacts/` | Cache state snapshot |

---

## Output Template

```markdown
## Cache Debug Report

### Issue
[Description of stale data issue]

### URL
`[URL showing issue]`

### Investigation

#### Network Headers
```
Cache-Control: [value]
Age: [value]
X-Nextjs-Cache: [HIT/MISS/STALE]
```

#### Service Worker Cache
- SW Version: [version]
- Cache buckets: [list]
- Relevant entries: [list]

#### Data Cache
- Cache hits: [count]
- Tags: [list]
- Revalidate: [seconds]

### Root Cause
[Identified cause]

### Fix Applied
```typescript
[Code fix]
```

### Verification
- [ ] Fresh data after clear
- [ ] Correct headers returned
- [ ] SW updated properly
- [ ] ISR revalidating as expected
```
