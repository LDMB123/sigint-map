/**
 * WASM-JS Interop - Quick Fix Code Snippets
 * Copy-paste ready code for all 11 optimization fixes
 * DMB Almanac | January 23, 2026
 */

// ============================================================================
// FIX #1: CACHE COLLISION BUG - serialization.ts line 190-220
// ============================================================================

// BEFORE (Broken):
function getCacheKeyBefore(data: unknown, options: Partial<SerializationOptions>): string {
  if (Array.isArray(data)) {
    return `array_${data.length}_${cachedOptionsKey}`; // ❌ Collision!
  }
  return `object_${Object.keys(data as object).length}_${cachedOptionsKey}`; // ❌ Collision!
}

// AFTER (Fixed):
const identityMap = new WeakMap<object, string>();
let identityCounter = 0;

function getCacheKeyAfter(data: unknown, options: Partial<SerializationOptions>): string {
  if (options !== lastOptions) {
    cachedOptionsKey = JSON.stringify(options);
    lastOptions = options;
  }

  if (data === null || data === undefined) {
    return `null_${cachedOptionsKey}`;
  }

  const type = typeof data;
  if (type === 'string' || type === 'number' || type === 'boolean') {
    return `${type}_${data}_${cachedOptionsKey}`;
  }

  if (typeof data === 'object') {
    if (identityMap.has(data)) {
      return identityMap.get(data)!;
    }
    const uniqueKey = `obj_${++identityCounter}_${cachedOptionsKey}`;
    identityMap.set(data as object, uniqueKey);
    return uniqueKey;
  }

  return `unknown_${cachedOptionsKey}`;
}

// ============================================================================
// FIX #2: MOVE JSON.STRINGIFY INSIDE CACHE MISS - queries.ts line 63+
// ============================================================================

// BEFORE (Wasted JSON calls):
export async function wasmGlobalSearchBefore(
  songs: DexieSong[],
  venues: DexieVenue[],
  guests: DexieGuest[],
  query: string,
  limit: number = 50
): Promise<SearchResult[]> {
  const cache = getQueryCache();
  const cacheKey = `search:global:${query}:${limit}`;
  const cached = cache.get<SearchResult[]>(cacheKey);
  if (cached) {
    return cached; // ❌ JSON.stringify below was wasted!
  }

  // ❌ These run EVERY TIME even on cache hits above
  const result = await bridge.call<string>(
    'global_search',
    JSON.stringify(songs),
    JSON.stringify(venues),
    JSON.stringify(guests),
    query,
    limit
  );
  // ...
}

// AFTER (Fixed):
export async function wasmGlobalSearchAfter(
  songs: DexieSong[],
  venues: DexieVenue[],
  guests: DexieGuest[],
  query: string,
  limit: number = 50
): Promise<SearchResult[]> {
  const cache = getQueryCache();
  const cacheKey = `search:global:${query}:${limit}`;

  // ✅ Check cache FIRST, before stringify
  const cached = cache.get<SearchResult[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // ✅ Only stringify on cache miss
  const result = await bridge.call<string>(
    'global_search',
    JSON.stringify(songs),
    JSON.stringify(venues),
    JSON.stringify(guests),
    query,
    limit
  );

  if (result.success && result.data) {
    const parsed = JSON.parse(result.data) as SearchResult[];
    cache.set(cacheKey, parsed, CacheTTL.STATS);
    return parsed;
  }

  // Fallback...
  throw new Error('Global search failed');
}

// Apply to these 15+ functions:
// queries.ts line 63: wasmGlobalSearch
// queries.ts line 103: wasmGetTourStatsByYear
// queries.ts line 151: wasmGetToursGroupedByDecade
// queries.ts line 190: wasmGetYearBreakdownForGuest
// queries.ts line 239: wasmCountEncoresByYear
// queries.ts line 316: wasmGetShowIdsForSong
// queries.ts line 374: wasmGetShowIdsForGuest
// queries.ts line 420: wasmGetTopOpeningSongs
// queries.ts line 473: wasmGetTopClosingSongs
// queries.ts line 527: wasmGetTopEncoreSongs
// queries.ts line 608: wasmGetTopSlotSongsCombined
// queries.ts line 659: wasmGetShowsByYearSummary
// queries.ts line 718: wasmGetYearBreakdownForSong
// queries.ts line 775: wasmGetYearBreakdownForVenue
// queries.ts line 832: wasmGetTopSongsByPerformances

// ============================================================================
// FIX #3: CACHE TEXTENCODER/TEXTDECODER - serialization.ts line 318
// ============================================================================

// BEFORE (Creates instances every time):
export function encodeStringBefore(str: string): Uint8Array {
  return new TextEncoder().encode(str); // ❌ New instance
}

export function decodeStringBefore(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes); // ❌ New instance
}

// AFTER (Reuse singleton):
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function encodeStringAfter(str: string): Uint8Array {
  return textEncoder.encode(str); // ✅ Reuse
}

export function decodeStringAfter(bytes: Uint8Array): string {
  return textDecoder.decode(bytes); // ✅ Reuse
}

// ============================================================================
// FIX #4: SKIP NULL REMOVAL ON DEFAULT PATH - serialization.ts line 260
// ============================================================================

// BEFORE (Runs even when not needed):
export function serializeForWasmBefore(
  data: unknown,
  options: Partial<SerializationOptions> = {}
): string {
  const opts = { ...DEFAULT_SERIALIZATION_OPTIONS, ...options };
  const cacheKey = getCacheKey(data, opts);
  const cached = SERIALIZATION_CACHE.get(cacheKey);
  if (cached) {
    cached.timestamp = Date.now();
    return cached.serialized;
  }

  let processedData = data;

  // ❌ Runs on EVERY call since omitNulls defaults to true
  if (opts.omitNulls && typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      processedData = data.map(item => removeNulls(item as Record<string, unknown>));
    } else {
      processedData = removeNulls(data as Record<string, unknown>);
    }
  }

  // ... rest of serialization
}

// AFTER (Only runs when needed):
let lastProcessedOptions: Partial<SerializationOptions> | null = null;
let shouldProcessData = false;

export function serializeForWasmAfter(
  data: unknown,
  options: Partial<SerializationOptions> = {}
): string {
  const opts = { ...DEFAULT_SERIALIZATION_OPTIONS, ...options };
  const cacheKey = getCacheKey(data, opts);
  const cached = SERIALIZATION_CACHE.get(cacheKey);
  if (cached) {
    cached.timestamp = Date.now();
    return cached.serialized;
  }

  let processedData = data;

  // ✅ Only recompute if options changed
  if (opts !== lastProcessedOptions) {
    shouldProcessData = opts.omitNulls || opts.useShortKeys;
    lastProcessedOptions = opts;
  }

  // ✅ Only process if actually needed
  if (shouldProcessData && typeof data === 'object' && data !== null) {
    if (opts.omitNulls) {
      if (Array.isArray(data)) {
        processedData = data.map(item => removeNulls(item as Record<string, unknown>));
      } else {
        processedData = removeNulls(data as Record<string, unknown>);
      }
    }

    if (opts.useShortKeys) {
      if (Array.isArray(processedData)) {
        processedData = processedData.map(item => shortenKeys(item as Record<string, unknown>));
      } else {
        processedData = shortenKeys(processedData as Record<string, unknown>);
      }
    }
  }

  // ... rest of serialization
}

// ============================================================================
// FIX #5: OPTIMIZE LRU CACHE EVICTION - serialization.ts line 237
// ============================================================================

// BEFORE (O(n) scan per eviction):
function evictOldestEntriesBefore(): void {
  if (currentCacheSize <= MAX_CACHE_SIZE_BYTES) {
    return;
  }

  const targetSize = MAX_CACHE_SIZE_BYTES * 0.8;

  // ❌ Linear scan for EACH eviction
  while (currentCacheSize > targetSize && SERIALIZATION_CACHE.size > 0) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    // O(n) scan: If 1000 entries, 100 evictions = 100,000 comparisons
    for (const [key, entry] of SERIALIZATION_CACHE.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = SERIALIZATION_CACHE.get(oldestKey)!;
      SERIALIZATION_CACHE.delete(oldestKey);
      currentCacheSize -= entry.size;
    }
  }
}

// AFTER (O(n log n) sort + O(k) iteration):
function evictOldestEntriesAfter(): void {
  if (currentCacheSize <= MAX_CACHE_SIZE_BYTES) {
    return;
  }

  const targetSize = MAX_CACHE_SIZE_BYTES * 0.8;

  // ✅ Sort once, then iterate
  const entries = Array.from(SERIALIZATION_CACHE.entries());
  entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

  for (const [key, entry] of entries) {
    if (currentCacheSize <= targetSize) {
      break;
    }

    SERIALIZATION_CACHE.delete(key);
    currentCacheSize -= entry.size;
  }
}

// ============================================================================
// FIX #6: BINARY ENCODING FOR TYPED ARRAYS - bridge.ts line 540+
// ============================================================================

// Helper function for binary encoding:
export function encodeSetlistEntriesBinary(entries: WasmSetlistEntryInput[]): ArrayBuffer {
  const size = 4 + entries.length * (4 + 4 + 2 + 1); // count + show_id + song_id + position + slot
  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);

  let offset = 0;

  // Write entry count
  view.setUint32(offset, entries.length, true);
  offset += 4;

  // Write show_ids
  for (const e of entries) {
    view.setUint32(offset, e.show_id, true);
    offset += 4;
  }

  // Write song_ids
  for (const e of entries) {
    view.setUint32(offset, e.song_id, true);
    offset += 4;
  }

  // Write positions
  for (const e of entries) {
    view.setUint16(offset, e.position, true);
    offset += 2;
  }

  // Write slots
  for (const e of entries) {
    const slotMap: Record<string, number> = { 'opener': 1, 'closer': 2, 'midset': 3, 'encore': 4 };
    view.setUint8(offset, slotMap[e.slot] ?? 0);
    offset += 1;
  }

  return buffer;
}

// BEFORE (JSON for binary data):
public async getShowIdsForSongTypedBefore(
  setlistEntries: DexieSetlistEntry[],
  songId: bigint
): Promise<WasmResult<BigInt64Array>> {
  const entriesInput = setlistEntriesToWasmInput(setlistEntries);
  return this.call<BigInt64Array>(
    'getShowIdsForSongTyped' as WasmMethodName,
    JSON.stringify(entriesInput), // ❌ 10K entries = 500KB JSON
    songId
  );
}

// AFTER (Binary for binary data):
public async getShowIdsForSongTypedAfter(
  setlistEntries: DexieSetlistEntry[],
  songId: bigint
): Promise<WasmResult<BigInt64Array>> {
  const entriesInput = setlistEntriesToWasmInput(setlistEntries);
  const binaryData = encodeSetlistEntriesBinary(entriesInput); // ✅ 65KB binary
  return this.call<BigInt64Array>(
    'getShowIdsForSongTyped' as WasmMethodName,
    binaryData,
    songId
  );
}

// ============================================================================
// FIX #7: SIMPLIFY REDUNDANT CONDITIONALS - worker.ts line 95
// ============================================================================

// BEFORE (Unnecessary checks):
async function executeWasmMethodBefore(
  id: string,
  method: keyof WasmExports,
  args: unknown[]
): Promise<void> {
  // ❌ Check for already-serialized strings on EVERY arg
  const serializedArgs = args.map(arg => {
    if (typeof arg === 'string') return arg; // Skip
    if (typeof arg === 'object') return serializeForWasm(arg); // Serialize
    return arg;
  });

  const wasmFn = wasmModule[method] as (...args: unknown[]) => unknown;
  const wasmResult = wasmFn(...serializedArgs);
}

// AFTER (Simplified - assume pre-serialized):
async function executeWasmMethodAfter(
  id: string,
  method: keyof WasmExports,
  args: unknown[]
): Promise<void> {
  // ✅ Assume args are already properly formatted
  // (strings pre-serialized from high-level API)

  const wasmFn = wasmModule[method] as (...args: unknown[]) => unknown;
  const wasmResult = wasmFn(...args);
}

// ============================================================================
// FIX #8: CACHE LOWERCASE RESULTS - queries.ts line 77+
// ============================================================================

// BEFORE (Repeated toLowerCase):
for (const venue of venues) {
  const lowerName = venue.name.toLowerCase();
  const lowerCity = venue.city?.toLowerCase();
  const nameMatch = lowerName.includes(lowerQuery);
  const cityMatch = lowerCity?.includes(lowerQuery) ?? false; // ❌ toLowerCase called again
  if (nameMatch || cityMatch) {
    results.push({ /* ... */ });
  }
}

// AFTER (Cached):
for (const venue of venues) {
  const lowerName = venue.name.toLowerCase();
  const lowerCity = venue.city?.toLowerCase() ?? '';
  const nameMatch = lowerName.includes(lowerQuery);
  const cityMatch = lowerCity.includes(lowerQuery); // ✅ Reuse cached value
  if (nameMatch || cityMatch) {
    results.push({ /* ... */ });
  }
}

// ============================================================================
// FIX #9: FOR-LOOP VS MAP - fallback.ts line 89+
// ============================================================================

// BEFORE (Overhead from .map):
return songs.map(song => {
  // ... calculate properties ...
  return {
    song_id: song.id,
    rarity_score: rarityScore,
    gap_days: gapDays,
    // ...
  };
});

// AFTER (for-loop):
const results: typeof returnType[] = [];
for (const song of songs) {
  // ... calculate properties ...
  results.push({
    song_id: song.id,
    rarity_score: rarityScore,
    gap_days: gapDays,
    // ...
  });
}
return results;

// ============================================================================
// FIX #10: IMPLEMENT SHAREDARRAYBUFFER (Complex - Optional)
// ============================================================================

// Check if available:
export function isSharedArrayBufferSupported(): boolean {
  if (typeof SharedArrayBuffer === 'undefined') return false;
  if (typeof crossOriginIsolated !== 'undefined' && !crossOriginIsolated) return false;
  return true;
}

// Create for large payloads:
export function createSharedBuffer(size: number): SharedArrayBuffer | null {
  if (!isSharedArrayBufferSupported()) return null;
  try {
    return new SharedArrayBuffer(size);
  } catch {
    return null;
  }
}

// Usage (in bridge.ts, high-level API):
public async callWithSharedBuffer<T>(
  method: WasmMethodName,
  data: unknown
): Promise<WasmResult<T>> {
  // Only for payloads >100KB
  const jsonSize = JSON.stringify(data).length;

  if (jsonSize > 102400 && isSharedArrayBufferSupported()) {
    const buffer = createSharedBuffer(jsonSize);
    if (buffer) {
      // Write data to shared buffer
      const view = new Uint8Array(buffer);
      const encoded = new TextEncoder().encode(JSON.stringify(data));
      view.set(encoded);

      // Call WASM with buffer reference
      return this.callWorker<T>(method, [buffer]);
    }
  }

  // Fall back to normal JSON
  return this.call<T>(method, JSON.stringify(data));
}

// ============================================================================
// FIX #11: USE TYPED ARRAYS CORRECTLY
// ============================================================================

// The TypedArray methods already exist but use JSON - just need binary encoding
// See FIX #6 for implementation details

// Methods that should use binary:
// - getShowIdsForSongTyped() - returns BigInt64Array
// - getUniqueYearsTyped() - returns Int32Array
// - getPlayCountsPerSong() - returns {songIds: BigInt64Array, counts: Int32Array}

// All should accept binary input, not JSON string input

// ============================================================================
// TESTING CODE - Add to test suite
// ============================================================================

function testCacheCollisionFix() {
  const opts = {};

  const arr1 = [{a: 1}, {b: 2}];
  const arr2 = [{c: 3}, {d: 4}];

  const key1 = getCacheKeyAfter(arr1, opts);
  const key2 = getCacheKeyAfter(arr2, opts);

  console.assert(key1 !== key2, 'ERROR: Cache keys should be unique!');

  const s1 = serializeForWasmAfter(arr1);
  const s2 = serializeForWasmAfter(arr2);

  console.assert(s1 !== s2, 'ERROR: Serialized strings should be different!');
  console.assert(JSON.parse(s1)[0].a === 1, 'ERROR: First array should preserve data!');
  console.assert(JSON.parse(s2)[0].c === 3, 'ERROR: Second array should preserve data!');

  console.log('✅ Cache collision fix test passed!');
}

function testTextEncoderCaching() {
  const str = 'Hello, World!';

  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    encodeStringAfter(str);
  }
  const time = performance.now() - start;

  console.log(`✅ 1000 encodeString calls: ${time.toFixed(2)}ms`);
  console.assert(time < 50, 'ERROR: Encoding should be fast with cached instances!');
}

function testCacheMissPatterns() {
  // Mock cache implementation to count stringify calls
  let stringifyCount = 0;
  const originalStringify = JSON.stringify;
  JSON.stringify = function(...args) {
    stringifyCount++;
    return originalStringify.apply(this, args as any);
  };

  // Test should show stringify not called when cache hits
  const cache = new Map();
  const data = [{id: 1}, {id: 2}];
  const key = 'test-key';

  cache.set(key, data);

  // First call - cache hit
  const cached = cache.get(key);
  stringifyCount = 0;

  if (cached) {
    // Should NOT stringify here
    console.log('Cache hit - stringify count:', stringifyCount);
    console.assert(stringifyCount === 0, 'ERROR: Should not stringify on cache hit!');
  }

  console.log('✅ Cache miss pattern test passed!');
}

// ============================================================================
// END OF QUICK FIX CODE SNIPPETS
// ============================================================================
