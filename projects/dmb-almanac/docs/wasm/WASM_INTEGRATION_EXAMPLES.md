# WASM Integration Examples

Real-world integration examples for using WASM in the DMB Almanac.

---

## Example 1: Unique Songs Dashboard

Display unique songs performed per year in a dashboard chart.

### Component Implementation

**File**: `app/src/routes/stats/unique-songs/+page.svelte`

```javascript
<script>
  import { onMount } from 'svelte';
  import { WasmRuntime } from '$lib/wasm/loader.js';
  import { db } from '$lib/db/dexie/instance.js';

  let uniqueSongsData = new Map();
  let loading = true;
  let backend = 'javascript'; // Track which backend was used

  onMount(async () => {
    try {
      // Load setlist entries from database
      const entries = await db.setlistEntries.toArray();

      // Try WASM backend
      if (await WasmRuntime.isAvailable()) {
        const wasmModule = await WasmRuntime.load();

        // Prepare data for WASM
        const songs = entries.map(e => ({
          year: e.year,
          song: e.songName
        }));

        // Compute with WASM
        const startTime = performance.now();
        uniqueSongsData = wasmModule.unique_songs_per_year(songs);
        const timeMs = performance.now() - startTime;

        backend = 'wasm';
        console.log(`WASM computed unique songs in ${timeMs.toFixed(2)}ms`);
      } else {
        // Fallback to JavaScript
        uniqueSongsData = computeUniqueSongsJS(entries);
        backend = 'javascript';
      }
    } catch (error) {
      console.error('Failed to compute unique songs:', error);
    } finally {
      loading = false;
    }
  });

  // JavaScript fallback implementation
  function computeUniqueSongsJS(entries) {
    const songsByYear = new Map();

    for (const entry of entries) {
      const songs = songsByYear.get(entry.year) || new Set();
      songs.add(entry.songName);
      songsByYear.set(entry.year, songs);
    }

    const result = new Map();
    for (const [year, songs] of songsByYear) {
      result.set(year, songs.size);
    }

    return result;
  }
</script>

{#if loading}
  <p>Loading unique songs data...</p>
{:else}
  <div class="stats-dashboard">
    <h2>Unique Songs Per Year</h2>
    <p class="backend-info">Computed using: {backend.toUpperCase()}</p>

    <div class="chart">
      {#each [...uniqueSongsData.entries()].sort((a, b) => b[0] - a[0]) as [year, count]}
        <div class="bar">
          <span class="year">{year}</span>
          <div class="bar-fill" style="width: {(count / 200) * 100}%">
            {count} songs
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .stats-dashboard {
    padding: 2rem;
  }

  .backend-info {
    color: #666;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }

  .chart {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .bar {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .year {
    font-weight: bold;
    min-width: 50px;
  }

  .bar-fill {
    background: linear-gradient(90deg, #4CAF50, #45a049);
    padding: 0.5rem;
    border-radius: 4px;
    color: white;
    font-size: 0.9rem;
  }
</style>
```

---

## Example 2: Year Histogram with 3-Tier Fallback

Automatically select fastest backend (GPU → WASM → JavaScript).

### Component Implementation

**File**: `app/src/routes/stats/shows-by-year/+page.svelte`

```javascript
<script>
  import { onMount } from 'svelte';
  import { ComputeOrchestrator } from '$lib/gpu/fallback.js';
  import { db } from '$lib/db/dexie/instance.js';

  let yearHistogram = new Map();
  let backend = '';
  let executionTime = 0;
  let loading = true;

  onMount(async () => {
    try {
      // Load shows from database
      const shows = await db.shows.toArray();

      // Compute with automatic backend selection
      const result = await ComputeOrchestrator.aggregateByYear(shows);

      yearHistogram = result.result;
      backend = result.backend;
      executionTime = result.timeMs;

      console.log(`Computed with ${backend} in ${executionTime.toFixed(2)}ms`);
    } catch (error) {
      console.error('Failed to compute year histogram:', error);
    } finally {
      loading = false;
    }
  });
</script>

{#if loading}
  <p>Computing year histogram...</p>
{:else}
  <div class="histogram-dashboard">
    <h2>Shows by Year</h2>

    <div class="performance-info">
      <span class="backend">Backend: {backend.toUpperCase()}</span>
      <span class="timing">Time: {executionTime.toFixed(2)}ms</span>
    </div>

    <div class="histogram">
      {#each [...yearHistogram.entries()].sort((a, b) => a[0] - b[0]) as [year, count]}
        <div class="histogram-bar">
          <span class="year">{year}</span>
          <div
            class="bar"
            style="height: {(count / Math.max(...yearHistogram.values())) * 200}px"
            title="{count} shows"
          >
            {count}
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .histogram-dashboard {
    padding: 2rem;
  }

  .performance-info {
    display: flex;
    gap: 2rem;
    margin-bottom: 2rem;
    font-size: 0.9rem;
    color: #666;
  }

  .backend {
    font-weight: bold;
  }

  .histogram {
    display: flex;
    gap: 4px;
    align-items: flex-end;
    height: 250px;
  }

  .histogram-bar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .bar {
    background: #2196F3;
    width: 30px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    color: white;
    font-size: 0.8rem;
    padding: 4px 0;
    border-radius: 4px 4px 0 0;
    transition: background 0.2s;
  }

  .bar:hover {
    background: #1976D2;
  }

  .year {
    font-size: 0.8rem;
    transform: rotate(-45deg);
  }
</style>
```

---

## Example 3: Top Songs Leaderboard

Compute top songs using WASM percentile calculations.

### Component Implementation

**File**: `app/src/routes/stats/top-songs/+page.svelte`

```javascript
<script>
  import { onMount } from 'svelte';
  import { WasmRuntime } from '$lib/wasm/loader.js';
  import { db } from '$lib/db/dexie/instance.js';

  let topSongs = [];
  let loading = true;
  let p50 = 0;
  let p90 = 0;
  let p99 = 0;

  onMount(async () => {
    try {
      // Load setlist entries and songs
      const entries = await db.setlistEntries.toArray();
      const songs = await db.songs.toArray();

      // Count performances per song
      const songCounts = new Map();
      for (const entry of entries) {
        songCounts.set(entry.songId, (songCounts.get(entry.songId) || 0) + 1);
      }

      // Convert to sorted array
      const counts = Array.from(songCounts.entries())
        .map(([songId, count]) => ({
          song: songs.find(s => s.id === songId),
          count
        }))
        .sort((a, b) => b.count - a.count);

      topSongs = counts.slice(0, 20);

      // Calculate percentiles with WASM
      if (await WasmRuntime.isAvailable()) {
        const wasmModule = await WasmRuntime.load();

        // Sort counts for percentile calculation
        const sortedCounts = new Float64Array(
          counts.map(c => c.count).sort((a, b) => a - b)
        );

        p50 = wasmModule.calculate_percentile(sortedCounts, 0.5);
        p90 = wasmModule.calculate_percentile(sortedCounts, 0.9);
        p99 = wasmModule.calculate_percentile(sortedCounts, 0.99);
      }
    } catch (error) {
      console.error('Failed to compute top songs:', error);
    } finally {
      loading = false;
    }
  });
</script>

{#if loading}
  <p>Loading top songs...</p>
{:else}
  <div class="leaderboard">
    <h2>Top 20 Most Played Songs</h2>

    <div class="percentiles">
      <div class="percentile">
        <span class="label">Median (50th):</span>
        <span class="value">{Math.round(p50)} plays</span>
      </div>
      <div class="percentile">
        <span class="label">90th Percentile:</span>
        <span class="value">{Math.round(p90)} plays</span>
      </div>
      <div class="percentile">
        <span class="label">99th Percentile:</span>
        <span class="value">{Math.round(p99)} plays</span>
      </div>
    </div>

    <ol class="songs-list">
      {#each topSongs as { song, count }, index}
        <li class="song-item" class:top-three={index < 3}>
          <span class="rank">#{index + 1}</span>
          <span class="name">{song?.name || 'Unknown'}</span>
          <span class="count">{count} plays</span>
        </li>
      {/each}
    </ol>
  </div>
{/if}

<style>
  .leaderboard {
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
  }

  .percentiles {
    display: flex;
    gap: 2rem;
    margin: 1rem 0 2rem;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 8px;
  }

  .percentile {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .label {
    font-size: 0.85rem;
    color: #666;
  }

  .value {
    font-size: 1.2rem;
    font-weight: bold;
    color: #2196F3;
  }

  .songs-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .song-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border-bottom: 1px solid #eee;
    transition: background 0.2s;
  }

  .song-item:hover {
    background: #f9f9f9;
  }

  .song-item.top-three {
    background: #fff3e0;
    font-weight: bold;
  }

  .rank {
    font-size: 1.2rem;
    min-width: 50px;
    color: #666;
  }

  .name {
    flex: 1;
  }

  .count {
    color: #2196F3;
    font-weight: bold;
  }
</style>
```

---

## Example 4: Server-Side Precomputation

Use WASM in SvelteKit server routes for fast API responses.

### API Route Implementation

**File**: `app/src/routes/api/stats/unique-songs/+server.js`

```javascript
import { json } from '@sveltejs/kit';
import { WasmRuntime } from '$lib/wasm/loader.js';
import { db } from '$lib/db/dexie/instance.js';

export async function GET({ url }) {
  try {
    // Parse query parameters
    const year = url.searchParams.get('year');

    // Load data
    const entries = await db.setlistEntries.toArray();

    // Check if WASM is available
    const wasmAvailable = await WasmRuntime.isAvailable();

    let result;
    if (wasmAvailable) {
      // Use WASM for fast computation
      const wasmModule = await WasmRuntime.load();

      const songs = entries.map(e => ({
        year: e.year,
        song: e.songName
      }));

      const startTime = performance.now();
      const allYears = wasmModule.unique_songs_per_year(songs);
      const timeMs = performance.now() - startTime;

      if (year) {
        // Filter to specific year
        result = {
          year: parseInt(year),
          uniqueSongs: allYears.get(parseInt(year)) || 0,
          backend: 'wasm',
          timeMs
        };
      } else {
        // Return all years
        result = {
          years: Object.fromEntries(allYears),
          backend: 'wasm',
          timeMs
        };
      }
    } else {
      // Fallback to JavaScript
      const songsByYear = new Map();

      for (const entry of entries) {
        const songs = songsByYear.get(entry.year) || new Set();
        songs.add(entry.songName);
        songsByYear.set(entry.year, songs);
      }

      if (year) {
        result = {
          year: parseInt(year),
          uniqueSongs: songsByYear.get(parseInt(year))?.size || 0,
          backend: 'javascript'
        };
      } else {
        result = {
          years: Object.fromEntries(
            Array.from(songsByYear.entries()).map(([y, s]) => [y, s.size])
          ),
          backend: 'javascript'
        };
      }
    }

    return json(result);
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
}
```

**Usage**:
```javascript
// Client-side fetch
const response = await fetch('/api/stats/unique-songs?year=2024');
const data = await response.json();
console.log(`2024 had ${data.uniqueSongs} unique songs`);
console.log(`Computed with ${data.backend} in ${data.timeMs}ms`);
```

---

## Example 5: Background Worker with WASM

Offload heavy WASM computations to Web Worker for non-blocking UI.

### Worker Implementation

**File**: `app/src/lib/workers/stats-worker.js`

```javascript
import { WasmRuntime } from '$lib/wasm/loader.js';

// Listen for messages from main thread
self.addEventListener('message', async (event) => {
  const { type, data, id } = event.data;

  try {
    switch (type) {
      case 'unique-songs': {
        const wasmModule = await WasmRuntime.load();
        const result = wasmModule.unique_songs_per_year(data.songs);

        self.postMessage({
          id,
          type: 'unique-songs-result',
          result: Object.fromEntries(result) // Convert Map to object for transfer
        });
        break;
      }

      case 'aggregate-years': {
        const wasmModule = await WasmRuntime.load();
        const result = wasmModule.aggregate_by_year(data.years);

        self.postMessage({
          id,
          type: 'aggregate-years-result',
          result: Object.fromEntries(result)
        });
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      id,
      type: 'error',
      error: error.message
    });
  }
});
```

### Main Thread Usage

**File**: `app/src/routes/stats/+page.svelte`

```javascript
<script>
  import { onMount } from 'svelte';

  let worker;
  let messageId = 0;
  let pendingRequests = new Map();

  onMount(() => {
    // Create worker
    worker = new Worker(
      new URL('$lib/workers/stats-worker.js', import.meta.url),
      { type: 'module' }
    );

    // Handle worker messages
    worker.addEventListener('message', (event) => {
      const { id, type, result, error } = event.data;

      const pending = pendingRequests.get(id);
      if (!pending) return;

      pendingRequests.delete(id);

      if (error) {
        pending.reject(new Error(error));
      } else {
        pending.resolve(result);
      }
    });

    return () => {
      // Cleanup worker on unmount
      worker.terminate();
    };
  });

  // Helper to send messages to worker
  function sendToWorker(type, data) {
    return new Promise((resolve, reject) => {
      const id = messageId++;

      pendingRequests.set(id, { resolve, reject });

      worker.postMessage({ id, type, data });
    });
  }

  // Example usage
  async function computeUniqueSongs(songs) {
    const result = await sendToWorker('unique-songs', { songs });
    return new Map(Object.entries(result));
  }
</script>
```

**Benefits**:
- Non-blocking UI (computations run in background)
- WASM performance (5-10x faster than JavaScript)
- Responsive app (main thread stays free)

---

## Example 6: Progressive Enhancement

Use WASM when available, gracefully degrade to JavaScript.

```javascript
<script>
  import { WasmRuntime } from '$lib/wasm/loader.js';

  export async function computeStats(entries) {
    // Try WASM first
    if (await WasmRuntime.isAvailable()) {
      return computeStatsWasm(entries);
    }

    // Fall back to JavaScript
    return computeStatsJS(entries);
  }

  async function computeStatsWasm(entries) {
    const wasmModule = await WasmRuntime.load();

    const songs = entries.map(e => ({
      year: e.year,
      song: e.songName
    }));

    return {
      uniqueSongsPerYear: wasmModule.unique_songs_per_year(songs),
      backend: 'wasm'
    };
  }

  function computeStatsJS(entries) {
    const songsByYear = new Map();

    for (const entry of entries) {
      const songs = songsByYear.get(entry.year) || new Set();
      songs.add(entry.songName);
      songsByYear.set(entry.year, songs);
    }

    const uniqueSongsPerYear = new Map();
    for (const [year, songs] of songsByYear) {
      uniqueSongsPerYear.set(year, songs.size);
    }

    return {
      uniqueSongsPerYear,
      backend: 'javascript'
    };
  }
</script>
```

**Key Principle**: Always provide JavaScript fallback for maximum compatibility.

---

## Best Practices Summary

1. **Load WASM once** at app initialization, not on every call
2. **Use ComputeOrchestrator** for automatic GPU → WASM → JS fallback
3. **Batch operations** to minimize marshalling overhead
4. **Use TypedArrays** for numeric data (10-20x faster marshalling)
5. **Profile in production** using ComputeTelemetry
6. **Always provide JavaScript fallback** for compatibility
7. **Offload to workers** for heavy computations (keeps UI responsive)
8. **Cache results** when possible to avoid recomputation

---

## Additional Resources

- **API Reference**: `WASM_API_REFERENCE.md`
- **Performance Guide**: `WASM_PERFORMANCE_GUIDE.md`
- **Rust Development**: `/rust/aggregations/README.md`
- **Build Guide**: `/scripts/build-wasm.sh`
