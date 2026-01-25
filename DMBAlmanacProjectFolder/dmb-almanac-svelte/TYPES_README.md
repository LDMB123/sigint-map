# TypeScript Type Declarations - Complete Guide

This directory contains comprehensive TypeScript type declarations for modern browser APIs used in the DMB Almanac Svelte project.

## Quick Links

- **Summary**: See [`TYPESCRIPT_DECLARATIONS_SUMMARY.md`](./TYPESCRIPT_DECLARATIONS_SUMMARY.md)
- **Completion Report**: See [`TYPESCRIPT_TYPES_COMPLETION_REPORT.md`](./TYPESCRIPT_TYPES_COMPLETION_REPORT.md)
- **Developer Guide**: See [`src/lib/types/BROWSER_APIS_GUIDE.md`](./src/lib/types/BROWSER_APIS_GUIDE.md)

## Type Files

### `/src/lib/types/browser-apis.d.ts`
Type declarations for Chromium browser APIs (Chrome 109+):
- Scheduler API (`scheduler.yield()`, `scheduler.postTask()`)
- Navigator extensions (`navigator.isInputPending()`)
- Document extensions (`document.prerendering`)
- Long Animation Frames API
- Speculation Rules API

### `/src/lib/types/wasm-helpers.ts`
Type-safe utilities for WASM module interaction:
- `WasmFunctionAccessor` class
- Type guards (`isWasmTypedArrayReturn`, `isWasmParallelArraysReturn`)
- Utility functions (`hasWasmFunction`, `getWasmFunctionNames`, `callWasmFunctionSafe`)

### `/src/lib/types/scheduler.ts`
Scheduler API options and monitoring types (existing, maintained)

## Issues Fixed

### Files with Unsafe Casts Removed

1. **`src/lib/utils/performance.ts`** - 8 unsafe `as any` casts removed
   - Scheduler API access
   - Navigator API access
   - Performance metrics extraction
   - Event type casting

2. **`src/lib/wasm/bridge.ts`** - 4 unsafe `as unknown as Record<string, unknown>` casts removed
   - WASM function access
   - Typed array return handling

## Usage Examples

### Using Scheduler API
```typescript
import { yieldToMain, scheduleTask } from '@/lib/utils/performance';

// Automatically safe with fallback
await yieldToMain();

// Priority-based scheduling
const result = await scheduleTask(
  () => expensiveWork(),
  'background'
);
```

### Safe WASM Function Access
```typescript
import { WasmFunctionAccessor, isWasmTypedArrayReturn } from '@/lib/types/wasm-helpers';

const accessor = new WasmFunctionAccessor(wasmModule);
const result = accessor.extractYearsTyped(jsonData);

if (result && isWasmTypedArrayReturn(result)) {
  const typed = viewTypedArrayFromWasm(memory, result.ptr, result.len, Int32Array);
  // Use typed array
}
```

### Feature Detection
```typescript
import { detectChromiumCapabilities } from '@/lib/utils/performance';

const caps = detectChromiumCapabilities();
if (caps.schedulerYield) {
  // Use scheduler.yield() for better responsiveness
}
```

## Type Safety Improvements

| Before | After |
|--------|-------|
| 12 unsafe casts | 0 unsafe casts |
| Limited IDE support | Full IDE support |
| Runtime errors possible | Compile-time safety |
| Double casts needed | Single safe access |

## Browser Support

- **Chrome/Chromium 129+**: Full support for all APIs
- **Graceful fallback**: All APIs have fallback implementations
- **Type-safe**: All features properly typed for compile-time checking

## Documentation

- **API Guide**: Comprehensive usage guide with examples in `BROWSER_APIS_GUIDE.md`
- **JSDoc Comments**: All types have detailed documentation
- **Code Examples**: Real-world usage patterns included

## Configuration

No special TypeScript configuration needed. The types are automatically recognized by:
- VSCode
- WebStorm
- SvelteKit type checking (`npm run check`)
- Any TypeScript-aware IDE

## Contributing

When adding new browser APIs:

1. Add type declarations to `browser-apis.d.ts`
2. Include JSDoc comments with examples
3. Document browser support
4. Add type guards if needed
5. Update `BROWSER_APIS_GUIDE.md`
6. Remove any `as any` casts that reference the new types

## Testing

Run type checking with:
```bash
npm run check
```

This will verify:
- All TypeScript files are properly typed
- No implicit `any` types
- All browser API usage is correct

## Related Documentation

- [Scheduler API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler)
- [Speculation Rules](https://developer.chrome.com/docs/web-platform/speculation-rules/)
- [Long Animation Frames](https://w3c.github.io/long-animation-frames/)
- [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)

## Status

✅ All type declarations complete
✅ All unsafe casts removed
✅ Full documentation provided
✅ Zero breaking changes
✅ 100% backward compatible

---

Last Updated: January 23, 2026
