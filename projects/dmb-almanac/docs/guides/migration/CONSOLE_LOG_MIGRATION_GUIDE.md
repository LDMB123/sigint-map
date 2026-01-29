# Console.log Migration Guide

## Problem

**Found**: 292+ console.log statements across 57 files
**Impact**: Production performance degradation, bundle size bloat, security information leakage

## Solution

Created `/src/lib/utils/logger.js` - conditional logging utility that gets dead-code-eliminated in production builds.

---

## Quick Migration

### Before (Problematic)
```javascript
console.log('[Component] Mounted');
console.warn('[API] Rate limit:', remaining);
console.error('[DB] Query failed:', error);
console.debug('[Perf] Duration:', ms);
```

### After (Conditional)
```javascript
import { log, warn, error, debug } from '$lib/utils/logger';

log('[Component] Mounted');
warn('[API] Rate limit:', remaining);
error('[DB] Query failed:', error);
debug('[Perf] Duration:', ms);
```

---

## API Reference

### `log(...args)` - General logging
**Stripped in production**: Yes ✅
**Use for**: Info messages, state changes, flow tracking

```javascript
log('[Auth] User logged in:', userId);
log('[Navigation] Route changed to:', route);
```

### `warn(...args)` - Warning messages
**Stripped in production**: Yes ✅
**Use for**: Non-critical issues, deprecation warnings, fallback usage

```javascript
warn('[Cache] Failed to cache resource:', url);
warn('[Sync] Incremental sync unavailable, using full sync');
```

### `error(...args)` - Error logging
**Stripped in production**: NO - Always logged ❌
**Use for**: Exceptions, failures, critical errors

```javascript
error('[DB] Transaction failed:', transactionError);
error('[Network] Fetch timeout:', endpoint);
```

### `debug(...args)` - Debug messages
**Stripped in production**: Yes ✅
**Use for**: Verbose debugging, detailed traces, development-only info

```javascript
debug('[WASM] Module loaded:', moduleName);
debug('[Query] Execution plan:', plan);
```

### `table(data)` - Table display
**Stripped in production**: Yes ✅
**Use for**: Structured data display

```javascript
table(users);
table({ id: 1, name: 'Test', status: 'active' });
```

### `time(label)` / `timeEnd(label)` - Performance timing
**Stripped in production**: Yes ✅
**Use for**: Performance measurement

```javascript
time('database-query');
const results = await db.query();
timeEnd('database-query');
```

---

## Migration Patterns

### Pattern 1: Direct Replacement
```javascript
// Before
console.log('[Component] Data loaded');

// After
import { log } from '$lib/utils/logger';
log('[Component] Data loaded');
```

### Pattern 2: Error Handling
```javascript
// Before
try {
  await operation();
} catch (err) {
  console.error('[Operation] Failed:', err);
}

// After
import { error } from '$lib/utils/logger';
try {
  await operation();
} catch (err) {
  error('[Operation] Failed:', err); // Still logs in production!
}
```

### Pattern 3: Debug Tracing
```javascript
// Before
console.log('[Debug] Entering function with:', params);
performOperation(params);
console.log('[Debug] Operation complete');

// After
import { debug } from '$lib/utils/logger';
debug('[Debug] Entering function with:', params);
performOperation(params);
debug('[Debug] Operation complete');
```

### Pattern 4: Performance Measurement
```javascript
// Before
const start = Date.now();
await heavyOperation();
console.log('Duration:', Date.now() - start, 'ms');

// After
import { time, timeEnd } from '$lib/utils/logger';
time('heavy-operation');
await heavyOperation();
timeEnd('heavy-operation');
```

---

## Automated Migration

### Step 1: Find all console.log files
```bash
grep -r "console\." src --include="*.js" --include="*.svelte" -l > console-log-files.txt
```

### Step 2: Replace console.log with logger (Example)
```bash
# For .js files
sed -i '' 's/console\.log(/log(/g' src/lib/utils/example.js
sed -i '' "1i\\
import { log } from '\$lib/utils/logger';
" src/lib/utils/example.js
```

### Step 3: Replace console.warn with warn
```bash
sed -i '' 's/console\.warn(/warn(/g' src/lib/utils/example.js
```

### Step 4: Replace console.error with error
```bash
sed -i '' 's/console\.error(/error(/g' src/lib/utils/example.js
```

### Step 5: Replace console.debug with debug
```bash
sed -i '' 's/console\.debug(/debug(/g' src/lib/utils/example.js
```

---

## Build-Time Dead Code Elimination

Vite + Terser will automatically strip all dev-only logging in production:

### Development Build
```javascript
import { log } from '$lib/utils/logger';
log('[Component] Mounted');

// Compiles to:
if (dev) {
  console.log('[Component] Mounted');
}
```

### Production Build
```javascript
import { log } from '$lib/utils/logger';
log('[Component] Mounted');

// Compiles to:
// (completely removed - dead code eliminated)
```

**Result**: Zero production bundle impact! 🎉

---

## Priority Files to Migrate (Top 20)

Based on frequency of console.log usage:

1. `/src/lib/db/dexie/sync.js` - Database sync (15+ logs)
2. `/src/lib/db/dexie/data-loader.js` - Data loading (12+ logs)
3. `/src/lib/components/pwa/DownloadForOffline.svelte` - Download manager (10+ logs)
4. `/src/lib/pwa/install-manager.js` - PWA installation (8+ logs)
5. `/src/lib/db/dexie/queries.js` - Database queries (8+ logs)
6. `/src/lib/wasm/bridge.js` - WASM loader (7+ logs)
7. `/src/lib/monitoring/rum.js` - Real user monitoring (6+ logs)
8. `/src/lib/services/telemetryQueue.js` - Telemetry queue (5+ logs)
9. `/src/lib/db/dexie/migrations/index.js` - Database migrations (5+ logs)
10. `/src/routes/+page.server.js` - Homepage server logic (4+ logs)

---

## Testing Strategy

### 1. Verify Development Logging Still Works
```bash
npm run dev
# Open DevTools console - should see logs
```

### 2. Verify Production Build Strips Logs
```bash
npm run build
# Inspect dist/client/*.js - search for console.log (should be ZERO)
```

### 3. Bundle Size Comparison
```bash
# Before migration
npm run build
du -sh .svelte-kit/output/client

# After migration
npm run build
du -sh .svelte-kit/output/client
# Should be smaller!
```

---

## Exceptions (Keep console.*)

Some console statements should NOT be migrated:

### 1. Service Worker (sw-optimized.js)
Service workers already have conditional DEBUG flag:
```javascript
const DEBUG = false; // Production
function debugLog(...args) {
  if (DEBUG) console.log('[SW]', ...args);
}
```
✅ Already optimized - no migration needed

### 2. Critical Error Handlers
Global error boundaries should always log:
```javascript
window.addEventListener('error', (event) => {
  console.error('[Global] Uncaught error:', event.error);
  // Keep this - critical for production debugging
});
```

### 3. Build Scripts
Scripts in `/scripts/` directory run at build time, not in browser:
```javascript
// scripts/build-wasm.js
console.log('Building WASM modules...');
// Keep this - it's a build script
```

---

## Success Metrics

**Target**: Remove 292 console.log statements from production bundle

**Current Status**:
- ✅ Logger utility created
- ⏳ Migration in progress
- ⏳ Build verification pending

**Expected Results**:
- **Bundle Size**: -10KB to -20KB (minified)
- **Performance**: Faster parse/compile time
- **Security**: No leaked debug info in production

---

## Next Steps

1. **Phase 1**: Migrate high-traffic files (top 20 list above)
2. **Phase 2**: Migrate remaining .js files
3. **Phase 3**: Migrate .svelte components
4. **Phase 4**: Test production build
5. **Phase 5**: Verify no regressions

**Estimated Time**: 2-3 hours for full migration

---

**Created**: 2026-01-28
**Status**: Ready for implementation
