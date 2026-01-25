# Browser APIs Type Declarations Guide

This document explains the TypeScript type declarations for modern browser APIs in the DMB Almanac project.

## Overview

The project uses several experimental and emerging browser APIs that are not yet fully represented in the standard TypeScript `lib.dom.d.ts` type definitions. To ensure type safety and proper IDE support, we've created comprehensive type declarations in:

- **`browser-apis.d.ts`** - Declarations for Scheduler, Navigation, Long Animation Frames APIs
- **`wasm-helpers.d.ts`** - Utilities for safe WASM module interaction
- **`scheduler.ts`** - Type definitions for scheduler options and monitoring

## Browser APIs Declarations (`browser-apis.d.ts`)

### Scheduler API (Chrome 129+)

The Scheduler API provides `globalThis.scheduler` for task scheduling and yielding.

#### Usage Example

```typescript
// Check if scheduler.yield() is available
if ('scheduler' in globalThis && 'yield' in globalThis.scheduler) {
  // Yield to allow browser to process user input
  await globalThis.scheduler.yield();
}

// Schedule a task with priority
const result = await globalThis.scheduler.postTask(
  () => expensiveComputation(),
  { priority: 'background' }
);
```

#### What's Typed

```typescript
interface Scheduler {
  yield(options?: YieldOptions): Promise<void>;
  postTask<T>(
    callback: () => T | Promise<T>,
    options?: PostTaskOptions
  ): Promise<T>;
}

interface YieldOptions {
  priority?: 'user-blocking' | 'user-visible' | 'background';
}

interface PostTaskOptions {
  priority?: 'user-blocking' | 'user-visible' | 'background';
  delay?: number;
  signal?: AbortSignal;
}
```

### Navigator Extensions (Experimental APIs)

#### `navigator.isInputPending()` (Experimental)

Requires flag: `--enable-features=ExperimentalIsInputPending`

```typescript
// Check if user is attempting input
if ('isInputPending' in navigator && typeof navigator.isInputPending === 'function') {
  if (navigator.isInputPending()) {
    // User is interacting - yield to avoid jank
    await scheduler.yield();
  }
}
```

### Document Extensions

#### `document.prerendering` (Chrome 109+)

Check if page was prerendered:

```typescript
// Defer analytics until page becomes visible
if (document.prerendering) {
  document.addEventListener('prerenderingchange', () => {
    // Page is now visible - initialize analytics
    gtag('event', 'page_view');
  });
} else {
  // Page is visible - initialize now
  gtag('event', 'page_view');
}
```

#### `document.startViewTransition()` (Chrome 111+)

Animate navigation with View Transitions API:

```typescript
if (document.startViewTransition) {
  const transition = document.startViewTransition(async () => {
    // Update DOM here
    await fetch('/new-page');
  });
  await transition.finished;
} else {
  // Fallback
  window.location.href = '/new-page';
}
```

### Long Animation Frames API (Chrome 123+)

Monitor for frames that block user input:

```typescript
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'long-animation-frame') {
      const loaf = entry as PerformanceEntryWithLongAnimationFrame;
      console.log('Blocking frame:', {
        duration: loaf.duration,
        blocking: loaf.blockingDuration,
        scripts: loaf.scripts
      });
    }
  }
});

observer.observe({ type: 'long-animation-frame', buffered: true });
```

### Speculation Rules API (Chrome 121+)

Prerender or prefetch navigation targets:

```typescript
if ('speculationrules' in document) {
  const script = document.createElement('script');
  script.type = 'speculationrules';
  script.textContent = JSON.stringify({
    prerender: [
      { urls: ['/next-page'], eagerness: 'eager' }
    ]
  });
  document.head.appendChild(script);
}
```

## WASM Helpers (`wasm-helpers.d.ts`)

Provides type-safe utilities for accessing WASM module functions without unsafe casts.

### WasmFunctionAccessor Class

Safely access typed WASM functions:

```typescript
import { WasmFunctionAccessor, isWasmTypedArrayReturn } from '@/lib/types/wasm-helpers';

const accessor = new WasmFunctionAccessor(wasmModule);

// Safe access with proper typing
const yearsReturn = accessor.extractYearsTyped(showsJson);
if (yearsReturn && isWasmTypedArrayReturn(yearsReturn)) {
  const { ptr, len } = yearsReturn;
  const typedArray = viewTypedArrayFromWasm(memory, ptr, len, Int32Array);
}
```

### Type Guards

```typescript
import {
  isWasmTypedArrayReturn,
  isWasmParallelArraysReturn,
  hasWasmFunction
} from '@/lib/types/wasm-helpers';

// Check if function returns properly formatted data
if (isWasmTypedArrayReturn(result)) {
  const { ptr, len } = result;
  // Safe to access ptr and len
}

// Check if WASM module has a function
if (hasWasmFunction(wasmModule, 'extractYearsTyped')) {
  const result = wasmModule.extractYearsTyped(json);
}
```

## Migration from `as any` Casts

### Before (Unsafe)

```typescript
// Unsafe cast - loses type information
const wasmFn = (this.wasmModule as unknown as Record<string, unknown>)['extractYearsTyped'] as
  | ((json: string) => { ptr: number; len: number })
  | undefined;
```

### After (Type-Safe)

```typescript
import { WasmFunctionAccessor, isWasmTypedArrayReturn } from '@/lib/types/wasm-helpers';

const accessor = new WasmFunctionAccessor(this.wasmModule);
const wasmReturn = accessor.extractYearsTyped(inputJson);

if (wasmReturn && isWasmTypedArrayReturn(wasmReturn)) {
  const { ptr, len } = wasmReturn;
  // TypeScript knows ptr and len are numbers
}
```

## Performance.ts Updates

All `as any` casts have been replaced with proper type narrowing:

### scheduler.yield()

```typescript
// Before
schedulerYield: 'scheduler' in globalThis && 'yield' in (globalThis as any).scheduler

// After
const hasSchedulerYield =
  typeof globalThis !== 'undefined' &&
  'scheduler' in globalThis &&
  typeof globalThis.scheduler !== 'undefined' &&
  'yield' in globalThis.scheduler;
schedulerYield: hasSchedulerYield
```

### navigator.isInputPending()

```typescript
// Before
return (navigator as any).isInputPending?.();

// After
if (
  'isInputPending' in navigator &&
  typeof navigator.isInputPending === 'function'
) {
  return navigator.isInputPending();
}
return false;
```

### Long Animation Frames

```typescript
// Before
const loaf = entry as any;

// After
if (entry.entryType === 'long-animation-frame') {
  const loaf = entry as unknown as {
    duration: number;
    blockingDuration: number;
    renderStart: number;
    scripts?: Array<...>;
  };
  // Now properly typed
}
```

## Best Practices

### 1. Always Check for Feature Support

```typescript
// Good: Check availability before use
if ('scheduler' in globalThis && typeof globalThis.scheduler !== 'undefined') {
  await globalThis.scheduler.yield();
} else {
  // Fallback
  await new Promise(resolve => setTimeout(resolve, 0));
}

// Bad: Assume always available
await globalThis.scheduler.yield(); // Can crash
```

### 2. Use Type Guards

```typescript
import { isWasmTypedArrayReturn } from '@/lib/types/wasm-helpers';

// Good: Check before accessing properties
if (isWasmTypedArrayReturn(result)) {
  const { ptr, len } = result;
}

// Bad: Assume structure
const { ptr, len } = result; // Might be undefined
```

### 3. Prefer Typed Access

```typescript
// Good: Use proper types
const accessor = new WasmFunctionAccessor(module);
const result = accessor.getPlayCountsPerSong(json);

// Bad: Double cast
const fn = (module as unknown as Record<string, unknown>)['func'];
```

### 4. Document Requirements

```typescript
/**
 * Yield to main thread
 * Requires: Chrome 129+ with scheduler.yield() API
 * Fallback: setTimeout(0)
 */
export async function yieldToMain(): Promise<void> {
  if ('scheduler' in globalThis && typeof globalThis.scheduler !== 'undefined') {
    await globalThis.scheduler.yield();
  } else {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

## Browser Support

| API | Chrome | Chrome on iOS | Firefox | Safari |
|-----|--------|---------------|---------|--------|
| scheduler.yield() | 129+ | ❌ | ❌ | ❌ |
| scheduler.postTask() | 94+ | ❌ | ❌ | ❌ |
| navigator.isInputPending() | 98+ (flag) | ❌ | ❌ | ❌ |
| document.prerendering | 109+ | ❌ | ❌ | ❌ |
| document.startViewTransition() | 111+ | ❌ | 114+ | ❌ |
| Speculation Rules | 121+ | ❌ | ❌ | ❌ |
| Long Animation Frames | 123+ | ❌ | ❌ | ❌ |

## Related Files

- `/src/lib/utils/performance.ts` - Uses these APIs for performance optimization
- `/src/lib/wasm/bridge.ts` - Uses WASM helpers for type-safe function access
- `/src/lib/types/scheduler.ts` - Scheduler option types
- `/src/lib/types/background-sync.d.ts` - Background Sync API types (similar pattern)

## TypeScript Configuration

These declarations are automatically picked up by TypeScript due to the `.d.ts` extension and proper type declaration syntax. No additional configuration needed beyond standard SvelteKit setup.

## IDE Support

Most modern IDEs will provide:
- ✅ Autocomplete for scheduler API
- ✅ Type checking for function calls
- ✅ Hover documentation from JSDoc comments
- ✅ Go-to-definition support
- ✅ Refactoring support for safe renames

## Contributing

When adding new browser APIs:

1. Add type declarations to `browser-apis.d.ts`
2. Include JSDoc comments with examples
3. Document browser support
4. Add type guards if needed
5. Update this guide
6. Remove any `as any` casts that reference the new types
