# DMB Almanac WASM Bridge

This module provides a seamless bridge layer between Rust/WebAssembly and TypeScript/JavaScript for the DMB Almanac SvelteKit application.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SvelteKit Application                        │
├─────────────────────────────────────────────────────────────────────┤
│  Svelte Components                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │  WasmStatus     │  │ WasmComputation │  │  Custom Views   │    │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘    │
│           │                    │                    │              │
│  ┌────────▼────────────────────▼────────────────────▼───────┐     │
│  │                    WASM Stores (stores.ts)                │     │
│  │  wasmLoadState │ songStatisticsStore │ liberationStore   │     │
│  └────────────────────────────┬──────────────────────────────┘     │
│                               │                                     │
│  ┌────────────────────────────▼──────────────────────────────┐     │
│  │                    WASM Bridge (bridge.ts)                 │     │
│  │  - Lazy loading        - Retry logic                       │     │
│  │  - Worker management   - Error handling                    │     │
│  └────────────────────────────┬──────────────────────────────┘     │
│                               │                                     │
│  ┌────────────────────────────▼──────────────────────────────┐     │
│  │                Main Thread    │    Web Worker              │     │
│  │  ┌─────────────┐             │    ┌─────────────────┐     │     │
│  │  │  Fallback   │             │    │   WASM Module   │     │     │
│  │  │    (JS)     │◄────────────┼────│   (Rust/wasm)   │     │     │
│  │  └─────────────┘             │    └─────────────────┘     │     │
│  └──────────────────────────────┴────────────────────────────┘     │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │                    Dexie.js (IndexedDB)                   │      │
│  │  songs │ shows │ venues │ setlistEntries │ ...           │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Initialize WASM Early

In your root `+layout.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { preloadWasm } from '$lib/wasm';

  onMount(() => {
    // Preload WASM in background for faster operations later
    preloadWasm();
  });
</script>
```

### 2. Use WASM-Powered Stores

```svelte
<script lang="ts">
  import { songStatisticsStore, wasmIsReady } from '$lib/wasm';
  import { allSongs } from '$lib/stores/dexie';

  // Execute computation when data is available
  $: if ($allSongs?.length) {
    songStatisticsStore.execute($allSongs);
  }
</script>

{#if $songStatisticsStore.loading}
  <p>Computing statistics...</p>
{:else if $songStatisticsStore.data}
  {#each $songStatisticsStore.data as stat}
    <div>Song {stat.song_id}: Rarity {stat.rarity_score}</div>
  {/each}
{/if}
```

### 3. Direct Bridge Usage

```typescript
import { getWasmBridge, isWasmResultSuccess } from '$lib/wasm';

async function computeStats(songs: DexieSong[]) {
  const bridge = getWasmBridge();
  await bridge.initialize();

  const result = await bridge.calculateSongStatistics(songs);

  if (isWasmResultSuccess(result)) {
    console.log('Stats:', result.data);
    console.log('Computed in:', result.executionTime, 'ms');
    console.log('Used WASM:', result.usedWasm);
  } else {
    console.error('Failed:', result.error);
  }
}
```

## Module Structure

```
src/lib/wasm/
├── index.ts              # Public API exports
├── types.ts              # TypeScript type definitions
├── bridge.ts             # Main bridge class (singleton)
├── worker.ts             # Web Worker for off-thread execution
├── stores.ts             # Svelte stores for reactive integration
├── serialization.ts      # Data serialization utilities
├── fallback.ts           # Pure JS fallback implementations
├── integration-example.ts # Usage examples
└── README.md             # This file
```

## Features

### 1. WASM Module Loading

- **Lazy Loading**: WASM loads only when first needed
- **Progress Tracking**: Stores expose loading progress
- **Worker Execution**: WASM runs off main thread to prevent UI blocking

### 2. Data Serialization

```typescript
import {
  serializeForWasm,
  deserializeFromWasm,
  songsToWasmInput,
} from '$lib/wasm';

// Transform Dexie entities to WASM-compatible format
const wasmInput = songsToWasmInput(songs);
const json = serializeForWasm(wasmInput, { omitNulls: true });

// For large datasets, use chunked transfer
const chunks = await serializeInChunks(data, 1000, (progress) => {
  console.log(`Serialized ${progress * 100}%`);
});
```

### 3. Error Handling

```typescript
const result = await bridge.calculateSongStatistics(songs);

if (result.success) {
  // TypeScript narrows to success type
  console.log(result.data);
} else {
  // TypeScript narrows to error type
  console.error(result.error.message);
}
```

### 4. Fallback Strategy

When WASM is unavailable:

1. **Automatic Detection**: Bridge detects WASM load failures
2. **Seamless Fallback**: Operations transparently use JS implementations
3. **Performance Tracking**: `usedWasm` flag indicates which path was used

```svelte
{#if $wasmLoadState.status === 'error' && $wasmLoadState.fallbackActive}
  <div class="warning">
    Using JavaScript fallback (slower performance)
  </div>
{/if}
```

### 5. Store Integration

#### Pre-built Analytics Stores

```typescript
import {
  songStatisticsStore,    // Song rarity and gap analysis
  liberationListStore,    // Liberation list computation
  yearlyStatisticsStore,  // Year-over-year statistics
  setlistSimilarityStore, // Setlist comparison
} from '$lib/wasm';
```

#### Create Reactive Stores

```typescript
import { createReactiveWasmStore } from '$lib/wasm';
import { allShows } from '$lib/stores/dexie';

const showRarityStore = createReactiveWasmStore(
  allShows,
  (bridge, shows) => bridge.findRareShows(shows, 75),
  { debounceMs: 500 }
);
```

### 6. Worker Integration

The worker handles:
- WASM module instantiation
- Memory management
- Progress reporting for long operations
- Graceful shutdown

```typescript
// Messages TO worker
type WorkerRequest =
  | { type: 'init'; config: WasmBridgeConfig }
  | { type: 'call'; id: string; method: string; args: unknown[] }
  | { type: 'abort'; id: string }
  | { type: 'terminate' };

// Messages FROM worker
type WorkerResponse =
  | { type: 'init-success'; loadTime: number }
  | { type: 'init-error'; error: string }
  | { type: 'result'; id: string; data: unknown; executionTime: number }
  | { type: 'error'; id: string; error: string }
  | { type: 'progress'; id: string; progress: number };
```

## WASM Function Reference

| Function | Description | Input | Output |
|----------|-------------|-------|--------|
| `calculate_song_statistics` | Compute rarity scores, gaps, slot distribution | `WasmSongInput[]` | `WasmSongStatisticsOutput[]` |
| `compute_liberation_list` | Generate liberation list from songs and setlists | `songs, entries` | `WasmLiberationEntryOutput[]` |
| `aggregate_yearly_statistics` | Year-by-year show and song stats | `shows, entries` | `WasmYearlyStatisticsOutput[]` |
| `calculate_setlist_similarity` | Jaccard similarity between setlists | `setlist_a, setlist_b` | `number` (0-1) |
| `find_rare_shows` | Shows with rarity above threshold | `shows, threshold` | `WasmShowInput[]` |
| `find_song_gaps` | Songs sorted by days since last play | `entries` | `[{ song_id, gap_days, last_show_date }]` |
| `validate_setlist_integrity` | Check for position gaps, duplicates | `setlist` | `{ valid, errors, warnings }` |

## Performance Considerations

### Optimal Use Cases for WASM

1. **Large Data Processing**: Statistics over 1000+ records
2. **Complex Algorithms**: Rarity calculations, similarity matching
3. **Repeated Operations**: Frequent recalculations benefit from WASM speed

### When to Use JS Fallback

1. **Small Datasets**: Under 100 records may not benefit
2. **Simple Operations**: Basic filtering/sorting
3. **One-time Operations**: WASM load overhead may not pay off

### Memory Management

```typescript
// WASM memory is managed automatically by the bridge
// For large operations, consider chunked processing:

for (const chunk of chunkArray(largeDataset, 1000)) {
  await bridge.call('process_chunk', JSON.stringify(chunk));
  await yieldToMainThread(); // Keep UI responsive
}
```

## Configuration

```typescript
import { getWasmBridge } from '$lib/wasm';

const bridge = getWasmBridge({
  wasmPath: '/wasm/dmb_almanac_bg.wasm',
  enableFallback: true,        // Use JS when WASM unavailable
  operationTimeout: 30000,     // 30s timeout
  maxRetries: 3,               // Retry failed operations
  enablePerfLogging: false,    // Log performance metrics
  useWorker: true,             // Run WASM in Web Worker
  sharedBufferSize: 16 * 1024 * 1024,  // 16MB for SharedArrayBuffer
});
```

## Rust/WASM Development

### Expected Rust Exports

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn calculate_song_statistics(songs_json: &str) -> String {
    // Parse input
    let songs: Vec<SongInput> = serde_json::from_str(songs_json).unwrap();

    // Compute statistics
    let stats = compute_stats(&songs);

    // Return JSON
    serde_json::to_string(&stats).unwrap()
}

#[wasm_bindgen]
pub fn init_module() {
    // One-time initialization (e.g., set panic hook)
    console_error_panic_hook::set_once();
}
```

### Building WASM

```bash
# Install wasm-pack
cargo install wasm-pack

# Build for web
wasm-pack build --target web --out-dir ../static/wasm

# Or with optimizations
wasm-pack build --target web --release --out-dir ../static/wasm
```

## Troubleshooting

### WASM Won't Load

1. Check browser console for fetch errors
2. Verify WASM file path matches config
3. Ensure Content-Type header is `application/wasm`
4. Check CORS headers if loading from different origin

### Performance Issues

1. Enable `enablePerfLogging` to see timing
2. Check `usedWasm` flag - may be using fallback
3. Consider chunking large datasets
4. Verify Web Worker is being used

### Serialization Errors

1. Check for circular references in data
2. Ensure BigInt values are handled
3. Verify date formats (ISO strings expected)

## Future Enhancements

- [ ] SharedArrayBuffer support for zero-copy transfers
- [ ] Streaming results for large computations
- [ ] WASM SIMD for parallel processing
- [ ] Multi-threaded WASM workers
- [ ] Persistent WASM caching with Service Worker
