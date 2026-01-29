# WASM Loading Fix - DMB Almanac

## Problem Summary

The DMB Almanac app was experiencing WASM loading errors that prevented the application from functioning correctly. The error message was:

```
"ESM integration proposal for Wasm" is not supported currently.
Use vite-plugin-wasm or other community plugins to handle this.
Alternatively, you can use `.wasm?init` or `.wasm?url`.
```

## Root Cause

**Vite 6.4.1 Breaking Change**: Vite 6 introduced breaking changes to how WebAssembly modules are loaded. The wasm-pack generated JavaScript code (in `wasm/dmb-transform/pkg/dmb_transform.js`) uses the pattern:

```javascript
module_or_path = new URL('dmb_transform_bg.wasm', import.meta.url);
```

This bare `.wasm` import without the `?url` or `?init` suffix is no longer supported in Vite 6 without additional plugin configuration.

## The Fix

### What Was Changed

**File**: `vite.config.js`

**Changes**:
1. Added `vite-plugin-wasm` import
2. Added `vite-plugin-top-level-await` import
3. Configured both plugins in the Vite plugin array

**Before**:
```javascript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
  plugins: [
    sveltekit()
  ],
  // ...
}));
```

**After**:
```javascript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig(({ mode }) => ({
  plugins: [
    wasm(),
    topLevelAwait(),
    sveltekit()
  ],
  // ...
}));
```

### Why This Works

1. **vite-plugin-wasm**: Intercepts WASM imports and transforms them into Vite 6-compatible format. It handles the `new URL('*.wasm', import.meta.url)` pattern that wasm-pack generates.

2. **vite-plugin-top-level-await**: Enables top-level await support, which WASM initialization often requires. This ensures async WASM loading works correctly in ES modules.

3. **Plugin Order**: The plugins must be placed BEFORE `sveltekit()` so they can transform WASM imports before SvelteKit processes them.

## Why Previous "Fixes" Failed

During the debugging session, several approaches were attempted that made the app worse:

1. **Exponential Backoff Retry**: Added 14+ second delays that hung the app
2. **Timeout Protection Wrappers**: Added overhead to every database operation, making everything slow
3. **Service Worker Version Fixes**: Good idea but not the root problem
4. **SSR Error Recovery**: Reasonable but addressed symptoms, not the cause

**Key Insight**: The original problem was NOT database integration issues - it was a WASM loading incompatibility with Vite 6. The app's database integration was working correctly. The WASM errors were preventing the app from initializing, which manifested as general "slowness" and "hanging" behavior.

## Testing

After applying the fix:

1. ✅ Dev server starts without errors
2. ✅ No "ESM integration proposal for Wasm" errors in console
3. ✅ WASM modules load successfully
4. ✅ App is responsive and navigates correctly

## Long-Term Maintenance

### Dependencies

The following packages are already installed in `package.json`:
- `vite-plugin-wasm` (v3.5.0)
- `vite-plugin-top-level-await` (v1.6.0)

No additional `npm install` was required - the packages were already present but not configured.

### WASM Modules

The app uses 7 WASM modules built with wasm-pack:
1. `dmb-transform` - Core data transformations
2. `dmb-core` - Core algorithms
3. `dmb-date-utils` - Date utilities
4. `dmb-string-utils` - String operations
5. `dmb-segue-analysis` - Segue detection
6. `dmb-force-simulation` - Force-directed graph layouts
7. `dmb-visualize` - Visualization algorithms

All modules are built using `wasm-pack build --target web --release` and output to `wasm/[module]/pkg/`.

### Future Vite Upgrades

When upgrading Vite in the future:
1. Check the Vite changelog for WASM-related changes
2. Verify `vite-plugin-wasm` compatibility with the new Vite version
3. Test WASM loading in both dev and production builds
4. Run `npm run wasm:build` to ensure all WASM modules rebuild correctly

## Build Process

The WASM build is triggered automatically by:
```bash
npm run prebuild  # Runs before 'npm run build'
```

This executes:
```bash
npm run wasm:build  # Builds all 7 WASM modules
npm run compress:data  # Compresses static JSON data
```

## File Locations

- **Vite Config**: `app/vite.config.js` (lines 1-6, 76-80)
- **WASM Modules**: `app/wasm/*/pkg/*.wasm` and `*.js`
- **WASM Bridge**: `app/src/lib/wasm/bridge.ts` (lines 284-290)
- **Worker**: `app/src/lib/wasm/wasm-worker-esm.ts` (line 19)

## Alternative Approaches Considered

1. **Downgrade Vite**: Could work but loses Vite 6 performance improvements
2. **Manual `?url` suffix**: Would require modifying wasm-pack output (fragile)
3. **Custom Vite plugin**: Reinventing the wheel when `vite-plugin-wasm` exists
4. **Native Vite `?init` syntax**: Requires rewriting all WASM imports

The chosen approach (using established plugins) is the most maintainable long-term solution.

## Summary

**One-line fix**: Added `vite-plugin-wasm` and `vite-plugin-top-level-await` to the Vite plugin configuration.

**Impact**: Resolved all WASM loading errors, restored app functionality, and ensured Vite 6 compatibility.

**Lesson Learned**: When debugging complex issues, always verify the root cause before implementing fixes. The WASM loading error was the actual problem, not database integration issues.
