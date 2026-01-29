# WASM Quick Reference - DMB Almanac

## Quick Check: Is WASM Working?

### In Browser Console
```javascript
// Check if WASM is loaded
window.getWasmReport?.()

// Print detailed WASM usage report
window.printWasmReport?.()
```

### Expected Output
```javascript
{
  summary: {
    wasmPercentage: 95-100,  // Should be > 95%
    failureRate: 0-1,        // Should be < 1%
    totalCalls: X
  }
}
```

## Common Issues

### "ESM integration proposal for Wasm" Error
**Cause**: Missing or misconfigured `vite-plugin-wasm`

**Fix**: Ensure `vite.config.js` has:
```javascript
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    sveltekit()
  ]
});
```

### WASM Module Not Found
**Cause**: WASM files not built

**Fix**: Run the build script
```bash
cd app
npm run wasm:build
```

### Worker Initialization Timeout
**Cause**: WASM file too large or network slow

**Fix**: Check browser Network tab for `.wasm` file size and load time. Should be < 500KB and < 2s.

## Build Commands

```bash
# Build all WASM modules
npm run wasm:build

# Build specific module (faster for development)
npm run wasm:build:transform
npm run wasm:build:core
npm run wasm:build:date
npm run wasm:build:string
npm run wasm:build:segue
npm run wasm:build:force
npm run wasm:build:visualize

# Compress WASM files
npm run wasm:compress

# Full production build (includes WASM)
npm run build
```

## WASM Module Locations

```
app/wasm/
├── dmb-transform/       # Core transformations (main module)
│   ├── src/lib.rs
│   └── pkg/
│       ├── dmb_transform.js
│       └── dmb_transform_bg.wasm
├── dmb-core/            # Core algorithms
├── dmb-date-utils/      # Date operations
├── dmb-string-utils/    # String utilities
├── dmb-segue-analysis/  # Segue detection
├── dmb-force-simulation/ # Graph layouts
└── dmb-visualize/       # Visualization algorithms
```

## Performance Targets

| Operation | WASM (target) | JS Fallback |
|-----------|---------------|-------------|
| Global search (1000 items) | 10-20ms | 50-100ms |
| Liberation list | 50-80ms | 200-300ms |
| Segue analysis | 100-200ms | 500-800ms |
| Song statistics | 20-40ms | 80-150ms |

## Debugging WASM

### Enable Debug Logging
```javascript
// In browser console
localStorage.setItem('wasm-debug', 'true');
```

### Check WASM Bridge State
```javascript
// Get WASM bridge instance
import { getWasmBridge } from '$lib/wasm/bridge';
const bridge = getWasmBridge();

// Check load state
bridge.getLoadState(); // Should be { status: 'ready' }

// Check if worker is initialized
bridge.getIsReady(); // Should be true

// Get performance metrics
bridge.getStats();
```

### Chrome DevTools
1. Open **Sources** tab
2. Navigate to `app/wasm/dmb-transform/pkg/`
3. Check if `.wasm` files are listed
4. Set breakpoints in `.js` glue code if needed

## Fallback Behavior

If WASM fails to load, the app automatically falls back to JavaScript implementations:
- ✅ No data loss
- ✅ Same functionality
- ⚠️ 3-5x slower performance
- ℹ️ Logged in console: `[WasmBridge] WASM failed, using fallback`

## Browser Support

### WASM Support
- Chrome 80+ ✅
- Firefox 114+ ✅
- Safari 15+ ✅
- Edge 80+ ✅

### ES Module Workers
- Chrome 80+ ✅
- Firefox 114+ ✅
- Safari 15+ ✅

If browser doesn't support workers, WASM loads directly (still faster than JS fallback).

## Configuration Files

```javascript
// vite.config.js - WASM plugin configuration
plugins: [
  wasm(),              // Handles .wasm imports
  topLevelAwait(),     // Enables top-level await for WASM init
  sveltekit()
]

// package.json - Build scripts
"wasm:build": "...",
"prebuild": "npm run wasm:build && npm run compress:data"

// tsconfig.json - WASM type aliases
paths: {
  "$wasm/*": ["../wasm/*"]
}
```

## Troubleshooting Checklist

- [ ] `vite-plugin-wasm` installed? (`npm list vite-plugin-wasm`)
- [ ] Plugin configured in `vite.config.js`?
- [ ] WASM modules built? (check `app/wasm/*/pkg/*.wasm` exist)
- [ ] Dev server restarted after config changes?
- [ ] Browser console shows no WASM errors?
- [ ] Network tab shows `.wasm` files loading?
- [ ] `window.printWasmReport()` shows > 95% usage?

## Additional Resources

- [Vite WASM Guide](https://vite.dev/guide/features.html#webassembly)
- [wasm-bindgen Book](https://rustwasm.github.io/docs/wasm-bindgen/)
- [MDN WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly)
