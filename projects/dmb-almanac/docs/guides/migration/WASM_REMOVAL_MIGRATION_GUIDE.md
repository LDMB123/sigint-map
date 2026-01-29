# WASM Removal Migration Guide

This guide documents how to update any code that previously imported from `$lib/wasm/`. The WASM layer was removed in Phase 1 of the Code Modernization & Slimming Audit because it was already disabled in production (Vite 6 incompatibility) and all functionality was handled by JavaScript fallbacks.

---

## Import Path Changes

| Old Import | New Import | Notes |
|------------|------------|-------|
| `$lib/wasm/forceSimulation` | `$lib/utils/forceSimulation` | Same API, pure JS with Float64Array |
| `$lib/wasm/aggregations` | `$lib/db/dexie/aggregations` | TypedArray-based, O(n) algorithms |
| `$lib/wasm/transform` | `$lib/utils/transform` | Now includes TypedArray ops |
| `$lib/wasm/transform-typed-arrays` | `$lib/utils/transform` | Merged into single module |
| `$lib/wasm/index` | N/A (removed) | Use specific modules directly |
| `$lib/wasm/fallback` | N/A (removed) | Fallback logic is now the only path |
| `$lib/wasm/queries` | `$lib/db/dexie/queries` or inline | See function mapping below |
| `$lib/wasm/search` | `$lib/db/dexie/queries` | Search functions in query module |
| `$lib/wasm/serialization` | N/A (removed) | No longer needed without WASM boundary |
| `$lib/wasm/stores` | `$lib/stores/dexie` | WASM stores merged into main stores |
| `$lib/wasm/validation` | `$lib/db/dexie/validation/` | Validation in DB layer |
| `$lib/wasm/visualize` | `$lib/utils/` (various) | Visualization helpers distributed |
| `$lib/wasm/worker` | N/A (removed) | No off-thread computation needed |

---

## Function Signature Changes

### Aggregation Functions (stores/dexie.js)

These four functions were inlined into `src/lib/stores/dexie.js` as module-private helpers. They are **not** exported. If you need them, call the store-level functions that use them internally.

```javascript
// These are internal to stores/dexie.js -- call the store functions instead:

// Year breakdown for a song
// Old: import { wasmGetYearBreakdownForSong } from '$lib/wasm/queries';
//      const result = await wasmGetYearBreakdownForSong(entries, songId);
// New: Use the derived store or query function that calls it internally

// Tours grouped by decade
// Old: import { wasmGetToursGroupedByDecade } from '$lib/wasm/queries';
//      const grouped = await wasmGetToursGroupedByDecade(tours);
// New: Called internally by the tours store

// Top slot songs (openers/closers/encores)
// Old: import { wasmGetTopSlotSongsCombined } from '$lib/wasm/queries';
//      const result = await wasmGetTopSlotSongsCombined(entries, 5);
// New: Called internally by the stats store

// Shows by year summary
// Old: import { wasmGetShowsByYearSummary } from '$lib/wasm/queries';
//      const summary = await wasmGetShowsByYearSummary(shows);
// New: Called internally by the shows store
```

### queries.js Functions

Functions that previously accepted pre-fetched data arrays now fetch their own data internally:

```diff
- // Old: Caller fetches data, passes to WASM bridge
- const entries = await db.setlistEntries.toArray();
- const result = await wasmGetYearBreakdownForSong(entries, songId);

+ // New: Function fetches its own data
+ const result = await getYearBreakdownForSong(songId);
```

### transform Functions

Data transformation functions are now synchronous (no async WASM bridge overhead):

```diff
- // Old: Async because WASM bridge was async
- const result = await transformSongs(songs);

+ // New: Synchronous -- no WASM boundary crossing
+ const result = transformSongs(songs);
```

### forceSimulation

The force simulation API is unchanged. It was already a pure JavaScript implementation:

```javascript
// This works exactly as before
import { createForceSimulation } from '$lib/utils/forceSimulation';

const simulation = await createForceSimulation({
  nodes: myNodes,
  links: myLinks,
  width: 800,
  height: 600
});
```

---

## FAQ

**Q: Will my existing code break?**
A: No. If you were importing through the WASM barrel export (`$lib/wasm/index.js`), those imports were already being redirected to JavaScript fallbacks. The fallback code is now the canonical implementation in its new location. All import references in the existing codebase have been updated.

**Q: Why were these changes made?**
A: The WASM layer was disabled due to Vite 6 incompatibility (`vite.config.js` aliased all WASM packages to stub modules). All production traffic was already handled by JavaScript fallbacks. Removing the dead WASM wrapper code saves approximately 50-70KB of bundle size and eliminates 14,188 lines of unused code.

**Q: What about performance?**
A: No performance regression. The JavaScript implementations use TypedArrays, single-pass algorithms, and Float64Arrays for cache-efficient computation. For the dataset size in this application (~40K records), the difference between WASM and optimized JavaScript is negligible.

**Q: Can WASM be re-added later?**
A: Yes. The Rust source code is preserved in `/wasm-disabled/` for reference. If future dataset growth makes WASM worthwhile, the same fallback-first pattern can be reintroduced. The JavaScript implementations would become the fallback path again.

**Q: What about the Web Worker?**
A: The WASM Web Worker (`wasm-worker-esm.js`, `worker.js`) was removed. If off-main-thread computation is needed in the future, a standard Web Worker can be created without the WASM bridging complexity.

---

## Rust Source Code Reference

The original Rust/WASM source is preserved at `app/wasm-disabled/` and includes:

- `dmb-core/` -- Core types, aggregation, transform, validation
- `dmb-transform/` -- Data transformation, search, TF-IDF
- `dmb-force-simulation/` -- Force-directed graph with quadtree
- `dmb-date-utils/` -- Date parsing utilities
- `dmb-string-utils/` -- String manipulation
- `dmb-segue-analysis/` -- Segue prediction and similarity
- `dmb-visualize/` -- Heatmap and network visualization data

This code is not compiled or bundled. It exists solely as a reference for potential future use.
