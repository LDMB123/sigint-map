# ESM/CJS Compatibility - Quick Fix Guide

**Project:** DMB Almanac Svelte
**Status:** 2 warnings found, all easily fixable

---

## Issue 1: Missing Error Handling on Dynamic Imports

### Affected Files (6 locations)

1. **src/lib/stores/data.ts:59**
2. **src/lib/stores/dexie.ts:74**
3. **src/lib/utils/appBadge.ts:59**
4. **src/lib/db/dexie/queries.ts:1292, 1333, 1374, 1401, 1427**

### Quick Fix Template

**Before:**
```typescript
const { loadInitialData } = await import('$db/dexie/data-loader');
```

**After:**
```typescript
let loadInitialData: any;
try {
  const mod = await import('$db/dexie/data-loader');
  loadInitialData = mod.loadInitialData;
} catch (error) {
  console.error('[DataLoader] Failed to load module:', error);
  throw error;
}
```

**Or with fallback:**
```typescript
try {
  const { loadInitialData } = await import('$db/dexie/data-loader');
  // Use loadInitialData
} catch (error) {
  console.error('[Module] Import failed, using fallback:', error);
  // Provide fallback implementation
}
```

---

## Issue 2: Inconsistent WASM Import Paths

### Problem

**File:** `src/lib/wasm/transform.ts:102`

```typescript
// Uses relative path
const wasm = await import('../../../wasm/dmb-transform/pkg/dmb_transform.js');
```

**File:** `src/lib/wasm/advanced-modules.ts:246`

```typescript
// Uses alias
const module = await import('$wasm/dmb-transform/pkg/dmb_transform');
```

### Fix

Update `transform.ts` to use the `$wasm` alias:

```typescript
// Before
const wasm = await import('../../../wasm/dmb-transform/pkg/dmb_transform.js');

// After
const wasm = await import('$wasm/dmb-transform/pkg/dmb_transform.js');
```

Benefits:
- Consistent with rest of codebase
- More maintainable if directory structure changes
- Shorter, cleaner code

---

## Verification Checklist

- [x] No `require()` statements in src/ (ESM-only)
- [x] No mixed import/require patterns
- [x] All server imports are ESM
- [x] `__dirname` properly handled with `import.meta.url`
- [x] Path aliases configured in `svelte.config.js`
- [x] TypeScript `moduleResolution: "bundler"`
- [x] Package.json has `"type": "module"`
- [ ] **TODO:** Add error handling to 6 dynamic imports
- [ ] **TODO:** Standardize WASM import paths

---

## One-Liner Summary

**The project is ESM-configured correctly. Fix 2 small warnings: add try-catch to 6 dynamic imports and standardize 1 WASM import path.**

---

## Testing Commands

```bash
# Build and verify no errors
npm run build

# Test development mode
npm run dev

# Type check
npm run check

# Scraper ESM test
cd scraper && npm install && npm run scrape:all
```

All tests should pass after applying fixes.

---

## File Locations for Fixes

Absolute paths for your reference:

1. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/data.ts` - Line 59
2. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts` - Line 74
3. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/utils/appBadge.ts` - Line 59
4. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/wasm/transform.ts` - Line 102
5. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/queries.ts` - Lines 1292, 1333, 1374, 1401, 1427

---

## Impact Analysis

- **Breaking Changes:** None
- **Performance Impact:** Negligible (error handling has minimal overhead)
- **Compatibility:** Improves robustness with no downsides
- **Testing Required:** Unit tests for error paths

---

## Next Steps

1. Apply error handling to dynamic imports (5-10 minutes)
2. Standardize WASM import paths (2-3 minutes)
3. Run `npm run build` to verify
4. Run `npm run check` for type checking
5. Commit changes

**Total estimated time:** 10-15 minutes
