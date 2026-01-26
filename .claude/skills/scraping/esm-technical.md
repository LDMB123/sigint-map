---
name: esm-technical
version: 1.0.0
description: **Comprehensive technical analysis of module system configuration**
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: scraping
complexity: advanced
tags:
  - scraping
  - chromium-143
  - apple-silicon

target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2

philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."

prerequisites: []
related_skills: []
see_also: []

minimum_example_count: 3
requires_testing: true
performance_critical: false

# Migration metadata
migrated_from: projects/dmb-almanac/app/docs/analysis/misc/ESM_TECHNICAL_REFERENCE.md
migration_date: 2026-01-25
---

# ESM/CJS Technical Reference - DMB Almanac

**Comprehensive technical analysis of module system configuration**

---

## Module Resolution Chain

### 1. Package.json Configuration

**File:** `package.json`

```json
{
  "type": "module",
  "engines": {
    "node": ">=20"
  }
}
```

**What this means:**
- All `.js` and `.ts` files are parsed as ESM
- `import`/`export` syntax is native
- No CJS file extensions (`.cjs`) needed for ESM
- `require()` function is NOT available by default

**Resolution Order (Node.js):**
1. Check `package.json` `type: "module"`
2. All `.js` files → ESM
3. All `.ts` files → ESM (via tsx/TypeScript)
4. Dynamic imports resolve with ESM semantics

---

### 2. TypeScript Configuration

**File:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "module": "ES2020",           // Output ES modules
    "target": "ES2022",            // Use modern JS features
    "moduleResolution": "bundler", // Vite/Webpack style resolution
    "esModuleInterop": true,       // Safe CJS interop if needed
    "resolveJsonModule": true      // Allow JSON imports
  }
}
```

**Important Settings:**

| Setting | Value | Meaning |
|---------|-------|---------|
| `module` | ES2020 | Output actual ESM (import/export) |
| `moduleResolution` | bundler | Use Vite's resolution algorithm |
| `esModuleInterop` | true | Can import from CJS packages safely |
| `resolveJsonModule` | true | `import data from './data.json'` works |

---

### 3. Vite/SvelteKit Resolution

**Priority order when resolving imports:**

```
1. @alias/path  → Check svelte.config.js aliases
2. $alias/path  → Check SvelteKit built-in aliases
3. ./relative   → Local files
4. ./file.js    → Explicit extension
5. ./file       → Auto-resolve extension
6. package-name → node_modules lookup
```

**Aliases defined in svelte.config.js:**

```javascript
alias: {
  $components: 'src/lib/components',
  $stores: 'src/lib/stores',
  $db: 'src/lib/db',
  $wasm: 'src/lib/wasm'
}
```

---

## Import/Export Patterns

### Pattern 1: Named Imports (Recommended)

```typescript
// Good - specific imports
import { getDb } from '$db/dexie/db';
import type { DexieSong } from '$db/dexie/schema';

// Usage
const database = getDb();
```

**Why it's good:**
- Tree-shakeable (unused exports removed)
- Type-safe with TypeScript
- Clear dependencies
- Works with hot-module-reload (HMR)

---

### Pattern 2: Default Exports

```typescript
// In dmb_transform/index.ts
export default {
  calculateStats: () => { ... },
  analyzeData: () => { ... }
};

// Import it
import transformModule from '$wasm/dmb-transform';
const stats = transformModule.calculateStats();
```

**Better alternative - use named exports:**

```typescript
// In dmb_transform/index.ts
export const calculateStats = () => { ... };
export const analyzeData = () => { ... };

// Import specific functions
import { calculateStats, analyzeData } from '$wasm/dmb-transform';
const stats = calculateStats();
```

---

### Pattern 3: Namespace Imports

```typescript
// Import entire module as namespace
import * as wasmModule from '$wasm/dmb-transform/pkg/dmb_transform';

// Access via namespace
const result = wasmModule.transform_songs(jsonData);
```

**Useful for:**
- Large modules with many exports
- Avoiding naming conflicts
- Type namespacing

---

### Pattern 4: Dynamic Imports

```typescript
// Lazy-load module when needed
async function loadDataLoader() {
  try {
    const { loadInitialData } = await import('$db/dexie/data-loader');
    return loadInitialData;
  } catch (error) {
    console.error('Failed to load data loader:', error);
    return null;
  }
}

// Usage - load only when called
const fn = await loadDataLoader();
if (fn) {
  await fn();
}
```

**Benefits:**
- Reduces initial bundle size
- Loads only when needed
- Supports code splitting

**Current issues in project:**
- 6 dynamic imports missing error handling
- Should wrap in try-catch

---

## ESM-Specific Features Used

### 1. import.meta

```typescript
// Get current file path
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(__dirname); // '/Users/louisherman/.../scraper'
```

**import.meta properties:**
- `import.meta.url` - Current module's file URL
- `import.meta.env` - Environment variables (Vite)

---

### 2. Top-Level Await

```typescript
// In vite.config.ts - topLevelAwait plugin enabled
// Allows await at module root level

// Example: Initialize WASM at module load
await initializeWasmModule();
console.log('WASM ready');
```

**Configured in vite.config.ts:**
```typescript
plugins: [
  topLevelAwait(),
  // ...
]
```

---

### 3. Dynamic Import with Type Inference

```typescript
// TypeScript knows the type
const mod = await import('$db/dexie/db');
// mod has type: typeof import('$db/dexie/db')

// Safe destructuring
const { getDb } = mod;
```

---

## WASM Module Patterns

### WASM Module Loading Pattern

```typescript
// Pattern: Lazy-load WASM with fallback

let wasmModule: WasmExports | null = null;
let wasmLoadPromise: Promise<WasmExports | null> | null = null;
let wasmLoadFailed = false;

async function loadWasmModule(): Promise<WasmExports | null> {
  // Return cached if already loaded
  if (wasmModule) return wasmModule;

  // Return null if previous load failed (don't retry)
  if (wasmLoadFailed) return null;

  // Return existing promise if load in progress
  if (wasmLoadPromise) return wasmLoadPromise;

  // Start loading
  wasmLoadPromise = (async () => {
    try {
      // Check support
      if (typeof WebAssembly === 'undefined') {
        console.warn('WASM not supported');
        wasmLoadFailed = true;
        return null;
      }

      // Dynamic import
      const wasm = await import('$wasm/dmb-transform/pkg/dmb_transform.js');

      // Initialize memory
      await wasm.default();

      wasmModule = wasm as WasmExports;
      return wasmModule;
    } catch (error) {
      console.warn('WASM load failed, using JS fallback:', error);
      wasmLoadFailed = true;
      return null;
    }
  })();

  return wasmLoadPromise;
}
```

**Key points:**
- Lazy loads only when needed
- Caches result to avoid reloads
- Handles failures gracefully
- Returns null on failure (doesn't throw)

---

## Database Module Pattern

### Dexie IndexedDB Pattern

```typescript
// File: src/lib/stores/dexie.ts

let dbPromise: Promise<typeof import('$db/dexie/db')> | null = null;

async function getDb() {
  // Check we're in browser
  if (!isBrowser) throw new Error('Cannot access db on server');

  // Lazy-load database module
  if (!dbPromise) {
    dbPromise = import('$db/dexie/db');
  }

  const { getDb: getDbInstance } = await dbPromise;
  return getDbInstance();
}

// Usage in components
const db = await getDb();
const shows = await db.shows.toArray();
```

**Why this pattern:**
- Database only loads in browser (checked with `isBrowser`)
- Deferred loading reduces initial bundle
- Safe to call multiple times (cached)
- Type-safe with TypeScript

---

## Service Worker ESM Handling

### Service Worker Registration

```typescript
// File: src/lib/sw/register.ts

// Register service worker
const registration = await navigator.serviceWorker.register('/sw.js', {
  scope: '/',
  updateViaCache: 'none',
});

// Check environment variables via import.meta.env
const isDev = import.meta.env.DEV;
const VITE_ENABLE_SW_DEV = import.meta.env.VITE_ENABLE_SW_DEV;
```

**Key points:**
- Service worker file must be at `/sw.js` (static root)
- Use `import.meta.env` not `process.env` in browser code
- Works correctly because SvelteKit handles SSR/browser detection

---

## Import Assertion (Experimental)

### JSON Import Pattern

```typescript
// NOT NEEDED in this project, but here's the pattern:

// With import assertion (experimental, not used here)
// import pkg from './package.json' assert { type: 'json' };

// Dynamic import with assertion
// const pkg = await import('./package.json', { assert: { type: 'json' } });

// Alternative: Use fetch API (more compatible)
const response = await fetch('./package.json');
const pkg = await response.json();
```

**Why not used in DMB Almanac:**
- Not needed - JSON data comes from database
- Import assertions are still experimental
- Vite/SvelteKit handle JSON imports automatically

---

## Scraper ESM Configuration

### Scraper Package.json

```json
{
  "type": "module",
  "scripts": {
    "scrape": "tsx src/orchestrator.ts"
  }
}
```

### Scraper __dirname Pattern

```typescript
// File: scraper/scrape-all-urls.ts

import { fileURLToPath } from "url";
import { join, dirname } from "path";

// Get directory of current file
const __dirname = dirname(fileURLToPath(import.meta.url));

// Use it
const OUTPUT_DIR = join(__dirname, "../output");
```

**Works because:**
- `tsx` is TypeScript executor that understands ESM
- `fileURLToPath` converts `file://` URL to path
- `dirname` gets parent directory
- All Node.js standard library modules export ESM

---

## Browser vs Server Detection

### SvelteKit Pattern

```typescript
import { browser } from '$app/environment';

if (browser) {
  // Browser-only code
  const registration = await navigator.serviceWorker.register('/sw.js');
} else {
  // Server-only code
  const data = await db.shows.toArray();
}
```

### Alternative Pattern

```typescript
// Check for window object
if (typeof window !== 'undefined') {
  // Browser code
  window.addEventListener('load', () => {});
}

// Check for document
if (typeof document !== 'undefined') {
  // Browser code
  document.body.style.color = 'blue';
}
```

---

## Common Pitfalls & Solutions

### Pitfall 1: Mixed Extensions in Imports

```typescript
// ❌ Inconsistent
import { foo } from '$lib/utils/helpers';      // No extension
import { bar } from '$lib/utils/types.js';     // With extension

// ✓ Consistent (either both or both)
import { foo } from '$lib/utils/helpers.js';
import { bar } from '$lib/utils/types.js';

// Or (both without - better for Vite)
import { foo } from '$lib/utils/helpers';
import { bar } from '$lib/utils/types';
```

**Current project status:** Mostly consistent, uses both patterns

---

### Pitfall 2: Async Import Without Await

```typescript
// ❌ Wrong - dbPromise is Promise, not the module
const dbPromise = import('$db/dexie/db');
const { getDb } = dbPromise;  // Error!

// ✓ Correct
const dbPromise = import('$db/dexie/db');
const { getDb } = await dbPromise;  // Right!
```

**Current project:** Correctly uses await

---

### Pitfall 3: Undefined import.meta in Old Node

```typescript
// ❌ Fails in Node <14 or CommonJS
const __dirname = dirname(fileURLToPath(import.meta.url));

// ✓ Check Node version or ensure ESM context
// In package.json: "type": "module"
// Or use .mjs extension
```

**Current project:** Uses "type": "module" in all package.jsons

---

### Pitfall 4: Not Handling Import Errors

```typescript
// ❌ Unhandled error propagation
const { loader } = await import('$lib/data-loader');

// ✓ Handled gracefully
try {
  const { loader } = await import('$lib/data-loader');
  // Use loader
} catch (error) {
  console.error('Failed to load:', error);
  // Use fallback
}
```

**Current project issue:** 6 dynamic imports missing error handling

---

### Pitfall 5: Relative Path Depth Errors

```typescript
// ❌ Easy to break if files move
import { fn } from '../../../lib/utils/helpers';

// ✓ Use alias
import { fn } from '$lib/utils/helpers';
```

**Current project:** Mixes both, but aliases are preferred

---

## Performance Considerations

### Code Splitting Strategy

```typescript
// Browser bundles default behavior:
// - Main bundle: Essential code
// - Dynamic imports: Lazy-loaded at route change

// Example: Don't load WASM until needed
const wasm = await import('$wasm/dmb-transform');
```

**Configured in vite.config.ts:**
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks(id) {
        if (id.includes('d3-selection') || id.includes('d3-scale')) {
          return 'd3-core';  // Separate chunk
        }
      }
    }
  }
}
```

---

## Build Verification

### ESM Compliance Check

```bash
# Verify no CommonJS
grep -r "require(" src/ || echo "✓ No require() found"

# Verify imports
grep -r "import" src/ | head -5

# Check module type
grep '"type"' package.json
# Output: "type": "module"
```

### Output Format Check

```bash
# After build
npm run build

# Check output is ESM
file dist/index.html
# Should be HTML with .js references (not .cjs)

# Check no CommonJS output
grep "require" dist/* 2>/dev/null || echo "✓ No CommonJS in output"
```

---

## TypeScript Module Compilation

### TypeScript to JavaScript

```typescript
// Input: TypeScript with imports
import { getDb } from '$db/dexie/db';
const db = getDb();

// Compiled: JavaScript with imports (unchanged)
import { getDb } from '$db/dexie/db';
const db = getDb();

// Why: target is ES2022 which supports import natively
```

**Config:**
```json
{
  "compilerOptions": {
    "module": "ES2020",
    "target": "ES2022"
  }
}
```

---

## Migration Checklist

If moving from CommonJS to ESM:

- [x] Add `"type": "module"` to package.json
- [x] Change `require()` to `import`
- [x] Change `module.exports` to `export`
- [x] Update `__dirname` to use `import.meta.url`
- [x] Update `__filename` to use `import.meta.url`
- [x] Check dynamic requires - use `import()`
- [x] Add `.js` extension to relative imports (optional)
- [x] Update build tool config (Vite, TypeScript)
- [x] Test in browser and Node.js

**DMB Almanac status:** Already fully migrated

---

## Recommended Reading

1. **Node.js ESM Documentation**
   - https://nodejs.org/api/esm.html

2. **TC39 ES Modules Specification**
   - https://tc39.es/ecma262/#sec-modules

3. **Vite Module Resolution**
   - https://vitejs.dev/guide/ssr.html#module-resolution

4. **SvelteKit Import Aliases**
   - https://kit.svelte.dev/docs/modules#$app

---

## Summary Table

| Feature | Status | Notes |
|---------|--------|-------|
| ESM configured | ✓ | `"type": "module"` in package.json |
| TypeScript ESM target | ✓ | `module: "ES2020"` |
| Path aliases | ✓ | $components, $stores, $db, $wasm |
| Dynamic imports | ⚠️ | 6 missing error handling |
| WASM loading | ✓ | Proper lazy-load with fallback |
| Database access | ✓ | Singleton pattern with lazy load |
| Service worker | ✓ | ESM registration working |
| Scraper ESM | ✓ | Both root and scraper ESM |
| Error handling | ⚠️ | Missing on some dynamic imports |
| Import consistency | ⚠️ | Mix of alias and relative paths for WASM |

---

**Document Version:** 1.0
**Last Updated:** January 22, 2026
**Author:** ESM/CJS Compatibility Debugger
