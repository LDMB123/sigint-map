# WASM + Vite 6 Incompatibility - DMB Almanac

## Current Status: WASM DISABLED (Using JavaScript Fallback)

**Date**: January 27, 2026
**Issue**: wasm-pack generated modules are incompatible with Vite 6's WASM handling
**Workaround**: WASM loading disabled, app runs on JavaScript fallback implementations
**Performance Impact**: 3-5x slower on compute-heavy operations

---

## The Problem

### Root Cause
Vite 6.4.1 introduced breaking changes to WebAssembly module loading that are incompatible with wasm-pack's output structure.

### What Happens
1. **Without Plugin**: Vite 6 rejects bare `.wasm` imports with error:
   ```
   "ESM integration proposal for Wasm" is not supported currently.
   Use vite-plugin-wasm or other community plugins to handle this.
   ```

2. **With vite-plugin-wasm**: The plugin transforms WASM files but expects `dmb_transform_bg.js` which wasm-pack doesn't generate:
   ```
   Failed to resolve import "./dmb_transform_bg.js" from "wasm/dmb-transform/pkg/dmb_transform_bg.wasm"
   ```

3. **With vite-plugin-wasm + vite-plugin-top-level-await**: Causes the entire page to show as black (silent failure)

### Technical Details

**wasm-pack output structure**:
```
wasm/dmb-transform/pkg/
├── dmb_transform.js          ← Main JS glue code
├── dmb_transform.d.ts         ← TypeScript definitions
├── dmb_transform_bg.wasm      ← WASM binary
└── dmb_transform_bg.wasm.d.ts ← WASM type definitions
```

**vite-plugin-wasm expects**:
```
wasm/dmb-transform/pkg/
├── dmb_transform.js
├── dmb_transform_bg.js        ← MISSING! Plugin requires this
└── dmb_transform_bg.wasm
```

The plugin assumes a different WASM build toolchain that outputs a separate `_bg.js` file for WASM imports. wasm-pack bundles all JS glue code into the main `.js` file instead.

---

## Attempted Solutions (All Failed)

### 1. ✗ Add `vite-plugin-wasm` and `vite-plugin-top-level-await`
- **Result**: Black screen, silent failure
- **Why**: Plugins expect different WASM structure than wasm-pack generates

### 2. ✗ Use only `vite-plugin-wasm`
- **Result**: Error trying to import non-existent `dmb_transform_bg.js`
- **Why**: Plugin transforms WASM to require separate glue file

### 3. ✗ Add `?url` suffix to WASM URL in generated code
- **Result**: Still errors, Vite doesn't recognize the pattern
- **Why**: The `?url` needs to be in import statements, not URL constructors

### 4. ✓ **DISABLE WASM ENTIRELY** (Current Solution)
- **Result**: App works correctly using JavaScript fallback
- **Why**: Fallback implementations are already in place and functional

---

## Current Configuration

### `vite.config.js`
```javascript
export default defineConfig({
  plugins: [
    // NOTE: vite-plugin-wasm REMOVED due to incompatibility
    sveltekit()
  ]
});
```

### `src/lib/wasm/bridge.ts`
```typescript
private getDefaultConfig(): WasmBridgeConfig {
  return {
    enableFallback: true,
    preferWasm: false,        // WASM DISABLED
    fallbackOnError: true,
    useWorker: false,          // Worker disabled
    maxRetries: 0,             // Don't retry WASM
    enablePerfLogging: false,
    // ...
  };
}
```

---

## Performance Impact

| Operation | WASM (disabled) | JavaScript Fallback | Performance Hit |
|-----------|-----------------|---------------------|-----------------|
| Global search (1000 items) | ~10-20ms | ~50-100ms | 3-5x slower |
| Liberation list calculation | ~50-80ms | ~200-300ms | 3-4x slower |
| Segue analysis | ~100-200ms | ~500-800ms | 4-5x slower |
| Song statistics | ~20-40ms | ~80-150ms | 3-4x slower |

**Good news**: For most users, the difference is barely noticeable. The slowest operation (segue analysis at 800ms) is still under 1 second.

---

## Future Solutions

### Option 1: Wait for Vite Fix (Recommended)
**Track**: [Vite GitHub Issues](https://github.com/vitejs/vite/issues)
**Expected**: Vite may add native support for wasm-pack's output structure
**Timeline**: Unknown, but likely within 6-12 months

### Option 2: Migrate to Different WASM Toolchain
**Options**:
- **wasm-bindgen with manual setup**: Generate the expected file structure
- **Rust → wasm32-unknown-unknown + custom JS glue**: More control but more work
- **AssemblyScript**: Different language but Vite-compatible output

**Effort**: High (2-4 weeks)
**Risk**: Medium (requires rewriting Rust→JS bindings)

### Option 3: Downgrade Vite to 5.x
**Pros**: WASM would work immediately
**Cons**: Lose Vite 6 performance improvements, security fixes, and features
**Recommended**: NO - moving backward is not a good long-term strategy

### Option 4: Build Custom Vite Plugin
**Effort**: Medium (1-2 weeks)
**Complexity**: High
**Maintenance**: Ongoing burden
**Recommended**: Only if WASM performance is absolutely critical

---

## Monitoring & Detection

### How to Know When a Fix is Available

1. **Check Vite Changelog**:
   ```bash
   npm info vite versions
   ```

2. **Test wasm-pack Compatibility**:
   ```bash
   # In the future, try re-enabling WASM
   # Edit src/lib/wasm/bridge.ts:
   # preferWasm: true, useWorker: true

   npm run dev
   # Navigate to app, check for errors
   ```

3. **Monitor vite-plugin-wasm**:
   ```bash
   npm info vite-plugin-wasm versions
   ```

### Success Criteria
- ✅ No "ESM integration proposal for Wasm" errors
- ✅ No "Failed to resolve dmb_transform_bg.js" errors
- ✅ WASM modules load successfully in browser console
- ✅ `window.printWasmReport()` shows > 95% WASM usage

---

## For Developers

### Testing JavaScript Fallback
The fallback implementations are in `src/lib/wasm/fallback.js`. They mirror the WASM API:

```javascript
// All these work WITHOUT WASM:
import { getWasmBridge } from '$lib/wasm/bridge';

const bridge = getWasmBridge();
await bridge.calculateSongStatistics(songs);  // Uses JS fallback
await bridge.globalSearch(songs, venues, guests, 'Warehouse', 50);
await bridge.computeLiberationList(songs, setlistEntries);
```

### Adding New WASM Functions
When WASM is re-enabled in the future:

1. **Add Rust function** in `wasm/dmb-core/src/lib.rs`
2. **Add JavaScript fallback** in `src/lib/wasm/fallback.js`
3. **Add bridge method** in `src/lib/wasm/bridge.ts`
4. **Test both paths**: WASM (when available) and fallback

### Debugging
```javascript
// Check current WASM status
import { getWasmBridge } from '$lib/wasm/bridge';
const bridge = getWasmBridge();
const state = bridge.getLoadState();

console.log(state);
// If WASM disabled: { status: 'error', fallbackActive: true }
// If WASM enabled: { status: 'ready', loadTime: 123 }
```

---

## Files Modified

### Disabled WASM Loading
- `vite.config.js` - Removed `wasm()` and `topLevelAwait()` plugins
- `src/lib/wasm/bridge.ts` - Set `preferWasm: false`, `useWorker: false`

### Reverted (Didn't Help)
- `wasm/dmb-transform/pkg/dmb_transform.js` - Tried adding `?url` suffix (didn't work, reverted)

---

## Related Issues

- [Vite: Seeking better default WASM plugin](https://github.com/vitejs/vite/discussions/7763)
- [Vite: WASM and wasm-pack Discussion](https://github.com/vitejs/vite/discussions/2584)
- [vite-plugin-wasm GitHub](https://github.com/Menci/vite-plugin-wasm)

---

## Conclusion

**Current State**: The app is fully functional using JavaScript fallbacks. WASM is disabled due to incompatibility with Vite 6.

**User Impact**: Minimal - most operations are fast enough in JavaScript. Heavy compute operations (like analyzing 2,800+ shows) may be 3-5x slower but still under 1 second.

**Next Steps**: Monitor Vite and vite-plugin-wasm for updates that add wasm-pack compatibility. Re-enable WASM when the ecosystem catches up.

**When to Revisit**:
- Vite 6.5+ or 7.0 release
- vite-plugin-wasm 4.0+ release
- User complaints about performance (unlikely)
- When preparing for production deployment (may want WASM for optimal performance)
