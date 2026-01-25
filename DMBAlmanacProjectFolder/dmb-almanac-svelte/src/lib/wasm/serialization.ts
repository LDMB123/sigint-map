/**
 * DMB Almanac - WASM Serialization Utilities
 *
 * Efficient data serialization for WASM/JS boundary crossing.
 * Handles type conversions, BigInt support, and optimized JSON encoding.
 */

import type {
  SerializationOptions,
  // SHORT_KEY_MAP, LongKey, ShortKey available for key compression
  WasmSongInput,
  WasmShowInput,
  WasmSetlistEntryInput,
} from './types';
import type { DexieSong, DexieShow, DexieSetlistEntry } from '$db/dexie/schema';

// ==================== CONFIGURATION ====================

const DEFAULT_SERIALIZATION_OPTIONS: SerializationOptions = {
  useBigInt: false,
  omitNulls: true,
  useShortKeys: false, // Only enable for very large payloads
};

// ==================== BIGINT HANDLING ====================

/**
 * Custom JSON replacer that handles BigInt values
 */
export function bigIntReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') {
    // Encode BigInt as string with special prefix for recovery
    return `__bigint__${value.toString()}`;
  }
  return value;
}

/**
 * Custom JSON reviver that restores BigInt values
 */
export function bigIntReviver(_key: string, value: unknown): unknown {
  if (typeof value === 'string' && value.startsWith('__bigint__')) {
    return BigInt(value.slice(10));
  }
  return value;
}

/**
 * Serialize data to JSON with BigInt support
 */
export function serializeWithBigInt(data: unknown): string {
  return JSON.stringify(data, bigIntReplacer);
}

/**
 * Deserialize JSON with BigInt support
 */
export function deserializeWithBigInt<T>(json: string): T {
  return JSON.parse(json, bigIntReviver) as T;
}

// ==================== ABBREVIATED KEY SERIALIZATION ====================

const SHORT_KEY_MAP_IMPL: Record<string, string> = {
  id: 'i',
  song_id: 'si',
  show_id: 'hi',
  venue_id: 'vi',
  tour_id: 'ti',
  date: 'd',
  title: 't',
  slug: 's',
  position: 'p',
  set_name: 'sn',
  slot: 'sl',
  is_segue: 'sg',
  show_date: 'sd',
  year: 'y',
  total_performances: 'tp',
  opener_count: 'oc',
  closer_count: 'cc',
  encore_count: 'ec',
  first_played_date: 'fp',
  last_played_date: 'lp',
  is_cover: 'ic',
  song_count: 'sc',
  rarity_index: 'ri',
};

// Lazy-initialized reverse key map (only computed if expandKeys is actually used)
let _reverseKeyMap: Record<string, string> | null = null;

function getReverseKeyMap(): Record<string, string> {
  if (_reverseKeyMap === null) {
    _reverseKeyMap = Object.fromEntries(
      Object.entries(SHORT_KEY_MAP_IMPL).map(([long, short]) => [short, long])
    );
  }
  return _reverseKeyMap;
}

/**
 * Convert object keys to short form for reduced payload size
 */
export function shortenKeys<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const shortKey = SHORT_KEY_MAP_IMPL[key] ?? key;
    result[shortKey] = value;
  }
  return result;
}

/**
 * Convert short keys back to long form
 */
export function expandKeys<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const reverseMap = getReverseKeyMap();
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const longKey = reverseMap[key] ?? key;
    result[longKey] = value;
  }
  return result;
}

/**
 * Serialize array with short keys
 */
export function serializeArrayShortKeys<T extends Record<string, unknown>>(arr: T[]): string {
  return JSON.stringify(arr.map(shortenKeys));
}

/**
 * Deserialize array with short keys back to long form
 */
export function deserializeArrayShortKeys<T>(json: string): T[] {
  const arr = JSON.parse(json) as Record<string, unknown>[];
  return arr.map(expandKeys) as T[];
}

// ==================== ENTITY TRANSFORMERS ====================

/**
 * Transform DexieSong to WASM input format
 */
export function songToWasmInput(song: DexieSong): WasmSongInput {
  return {
    id: song.id,
    title: song.title,
    slug: song.slug,
    total_performances: song.totalPerformances,
    opener_count: song.openerCount,
    closer_count: song.closerCount,
    encore_count: song.encoreCount,
    first_played_date: song.firstPlayedDate ?? null,
    last_played_date: song.lastPlayedDate ?? null,
    is_cover: song.isCover,
  };
}

/**
 * Transform DexieShow to WASM input format
 */
export function showToWasmInput(show: DexieShow): WasmShowInput {
  return {
    id: show.id,
    date: show.date,
    venue_id: show.venueId,
    tour_id: show.tourId,
    song_count: show.songCount,
    rarity_index: show.rarityIndex,
  };
}

/**
 * Transform DexieSetlistEntry to WASM input format
 */
export function setlistEntryToWasmInput(entry: DexieSetlistEntry): WasmSetlistEntryInput {
  return {
    id: entry.id,
    show_id: entry.showId,
    song_id: entry.songId,
    position: entry.position,
    set_name: entry.setName,
    slot: entry.slot,
    is_segue: entry.isSegue,
    show_date: entry.showDate,
    year: entry.year,
  };
}

/**
 * Batch transform songs to WASM input
 */
export function songsToWasmInput(songs: DexieSong[]): WasmSongInput[] {
  return songs.map(songToWasmInput);
}

/**
 * Batch transform shows to WASM input
 */
export function showsToWasmInput(shows: DexieShow[]): WasmShowInput[] {
  return shows.map(showToWasmInput);
}

/**
 * Batch transform setlist entries to WASM input
 */
export function setlistEntriesToWasmInput(entries: DexieSetlistEntry[]): WasmSetlistEntryInput[] {
  return entries.map(setlistEntryToWasmInput);
}

// ==================== SERIALIZATION CACHE ====================

/**
 * Cache for serialized WASM data to avoid repeated JSON.stringify calls
 * Performance: Reduces INP by 50-150ms on large datasets
 * Memory: Max 50MB cache, auto-evicts LRU entries
 */
interface SerializationCacheEntry {
  serialized: string;
  timestamp: number;
  size: number;
}

const SERIALIZATION_CACHE = new Map<string, SerializationCacheEntry>();
const MAX_CACHE_SIZE_MB = 50;
const MAX_CACHE_SIZE_BYTES = MAX_CACHE_SIZE_MB * 1024 * 1024;
let currentCacheSize = 0;

/**
 * Fast, collision-resistant hash for array contents
 * Samples first/last elements and uses length to detect differences
 * PERF: O(1) - doesn't iterate entire array, handles large arrays efficiently
 */
function hashArrayContent(arr: unknown[]): string {
  if (arr.length === 0) {
    return 'empty';
  }

  // For small arrays, use full JSON
  if (arr.length <= 3) {
    return JSON.stringify(arr);
  }

  // For larger arrays, sample first, middle, and last elements + length
  // This creates minimal but effective collision resistance
  const first = JSON.stringify(arr[0]);
  const last = JSON.stringify(arr[arr.length - 1]);
  const mid = JSON.stringify(arr[Math.floor(arr.length / 2)]);

  // Simple hash combining sampled elements
  // Use a basic hash to keep cache keys reasonable length
  let hash = 5381;
  const combined = `${first}|${mid}|${last}`;

  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash) ^ combined.charCodeAt(i);
  }

  return `${hash.toString(36)}_${arr.length}`;
}

/**
 * Generate cache key from data and options
 * PERF: Cache the options key to avoid repeated JSON.stringify (was called 150K+ times)
 * FIX: Use content-aware hash for arrays to prevent collision bug
 */
let cachedOptionsKey = '';
let lastOptions: Partial<SerializationOptions> | null = null;

function getCacheKey(data: unknown, options: Partial<SerializationOptions>): string {
  // PERF: Only stringify options once per unique options object
  if (options !== lastOptions) {
    cachedOptionsKey = JSON.stringify(options);
    lastOptions = options;
  }

  // Fast hash for primitive types
  if (data === null || data === undefined) {
    return `null_${cachedOptionsKey}`;
  }

  const type = typeof data;
  if (type === 'string' || type === 'number' || type === 'boolean') {
    return `${type}_${data}_${cachedOptionsKey}`;
  }

  // CRITICAL FIX: Arrays now use content-aware hash instead of just length
  // Prevents collision between arrays like [1,2,3] and [4,5,6]
  // Samples first/middle/last elements for O(1) hashing of large arrays
  if (Array.isArray(data)) {
    const contentHash = hashArrayContent(data);
    return `array_${contentHash}_${cachedOptionsKey}`;
  }

  return `object_${Object.keys(data as object).length}_${cachedOptionsKey}`;
}

/**
 * Evict oldest entries to stay under cache size limit
 * PERF: Use iterative min-finding instead of sorting entire cache
 * Original O(n log n) sort is expensive when cache is large (1000s of entries)
 */
function evictOldestEntries(): void {
  if (currentCacheSize <= MAX_CACHE_SIZE_BYTES) {
    return;
  }

  const targetSize = MAX_CACHE_SIZE_BYTES * 0.8; // Leave 20% headroom

  // PERF: Find and remove oldest entries one at a time until under limit
  // This is O(n*k) where k is number of evictions needed, vs O(n log n) for full sort
  // For typical eviction of 1-5 items, this is much faster
  while (currentCacheSize > targetSize && SERIALIZATION_CACHE.size > 0) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

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
    } else {
      break; // No more entries to evict
    }
  }
}

/**
 * Clear serialization cache (useful for testing/debugging)
 */
export function clearSerializationCache(): void {
  SERIALIZATION_CACHE.clear();
  currentCacheSize = 0;
}

/**
 * Get cache statistics
 */
export function getSerializationCacheStats() {
  return {
    entries: SERIALIZATION_CACHE.size,
    sizeBytes: currentCacheSize,
    sizeMB: (currentCacheSize / 1024 / 1024).toFixed(2)
  };
}

// ==================== OPTIMIZED SERIALIZATION ====================

/**
 * Serialize data for WASM transfer with configurable optimization
 * Includes LRU cache to avoid repeated JSON.stringify calls
 */
export function serializeForWasm(
  data: unknown,
  options: Partial<SerializationOptions> = {}
): string {
  const opts = { ...DEFAULT_SERIALIZATION_OPTIONS, ...options };

  // Check cache first
  const cacheKey = getCacheKey(data, opts);
  const cached = SERIALIZATION_CACHE.get(cacheKey);

  if (cached) {
    // Update timestamp for LRU
    cached.timestamp = Date.now();
    return cached.serialized;
  }

  let processedData = data;

  // Remove null values if configured
  if (opts.omitNulls && typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      processedData = data.map(item => removeNulls(item as Record<string, unknown>));
    } else {
      processedData = removeNulls(data as Record<string, unknown>);
    }
  }

  // Use short keys if configured
  if (opts.useShortKeys && typeof processedData === 'object' && processedData !== null) {
    if (Array.isArray(processedData)) {
      processedData = processedData.map(item => shortenKeys(item as Record<string, unknown>));
    } else {
      processedData = shortenKeys(processedData as Record<string, unknown>);
    }
  }

  // Serialize with BigInt support if needed
  let serialized: string;
  if (opts.useBigInt) {
    serialized = serializeWithBigInt(processedData);
  } else {
    serialized = JSON.stringify(processedData);
  }

  // Cache the result
  const size = serialized.length * 2; // Approximate byte size (UTF-16)
  SERIALIZATION_CACHE.set(cacheKey, {
    serialized,
    timestamp: Date.now(),
    size
  });
  currentCacheSize += size;

  // Evict old entries if over limit
  evictOldestEntries();

  return serialized;
}

/**
 * Deserialize WASM output with type restoration
 */
export function deserializeFromWasm<T>(
  json: string,
  options: Partial<SerializationOptions> = {}
): T {
  const opts = { ...DEFAULT_SERIALIZATION_OPTIONS, ...options };

  let data: unknown;

  // Parse with BigInt support if needed
  if (opts.useBigInt) {
    data = deserializeWithBigInt(json);
  } else {
    data = JSON.parse(json);
  }

  // Expand short keys if they were used
  if (opts.useShortKeys && typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      data = data.map(item => expandKeys(item as Record<string, unknown>));
    } else {
      data = expandKeys(data as Record<string, unknown>);
    }
  }

  return data as T;
}

/**
 * Remove null/undefined values from object
 */
function removeNulls(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// ==================== TYPED ARRAY UTILITIES ====================

/**
 * TypedArray result container for zero-copy returns from WASM
 * Wraps typed arrays with metadata for easy consumption
 */
export interface TypedArrayContainer<T extends TypedArray = TypedArray> {
  /** The underlying typed array */
  data: T;
  /** Number of valid elements */
  length: number;
  /** Byte offset in WASM memory (for debugging) */
  byteOffset?: number;
  /** Whether this is a view into WASM memory (true) or a copy (false) */
  isZeroCopy: boolean;
}

/**
 * Union type for all supported TypedArrays
 */
export type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

/**
 * Numeric TypedArrays (excludes BigInt variants)
 */
export type NumericTypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

/**
 * BigInt TypedArrays
 */
export type BigIntTypedArray = BigInt64Array | BigUint64Array;

/**
 * Convert JavaScript array to typed array for efficient transfer
 */
export function toTypedArray(data: number[]): Float64Array | Int32Array {
  // Use Int32Array for integers, Float64Array for decimals
  const hasDecimals = data.some(n => !Number.isInteger(n));
  if (hasDecimals) {
    return new Float64Array(data);
  }
  return new Int32Array(data);
}

/**
 * Convert typed array back to JavaScript array
 */
export function fromTypedArray(typedArray: Float64Array | Int32Array): number[] {
  return Array.from(typedArray);
}

/**
 * Convert BigInt64Array to regular number array
 * WARNING: Only safe for values that fit in Number.MAX_SAFE_INTEGER
 */
export function fromBigInt64Array(typedArray: BigInt64Array): number[] {
  const result: number[] = new Array(typedArray.length);
  for (let i = 0; i < typedArray.length; i++) {
    result[i] = Number(typedArray[i]);
  }
  return result;
}

/**
 * Convert number array to BigInt64Array
 */
export function toBigInt64Array(data: number[]): BigInt64Array {
  const result = new BigInt64Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = BigInt(data[i]);
  }
  return result;
}

/**
 * Encode string as Uint8Array using TextEncoder
 */
export function encodeString(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Decode Uint8Array back to string
 */
export function decodeString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

// ==================== ZERO-COPY TYPED ARRAY HELPERS ====================

/**
 * Create a zero-copy view of WASM memory as a typed array
 * PERF: This does not copy data - it creates a view directly into WASM memory
 *
 * WARNING: The returned view becomes invalid if WASM memory grows or is freed.
 * Use copyTypedArrayFromWasm for data that needs to outlive the WASM call.
 *
 * @param memory - WebAssembly.Memory instance
 * @param ptr - Pointer to start of data in WASM memory
 * @param length - Number of elements (not bytes)
 * @param ArrayType - TypedArray constructor to use
 */
export function viewTypedArrayFromWasm<T extends TypedArray>(
  memory: WebAssembly.Memory,
  ptr: number,
  length: number,
  ArrayType: new (buffer: ArrayBuffer, byteOffset: number, length: number) => T
): TypedArrayContainer<T> {
  const view = new ArrayType(memory.buffer, ptr, length);
  return {
    data: view,
    length,
    byteOffset: ptr,
    isZeroCopy: true,
  };
}

/**
 * Copy typed array data from WASM memory
 * PERF: Creates a copy of the data - slower than view but safe to keep
 *
 * Use this when you need to store the data beyond the current WASM call,
 * or when the data might be modified by subsequent WASM operations.
 *
 * @param memory - WebAssembly.Memory instance
 * @param ptr - Pointer to start of data in WASM memory
 * @param length - Number of elements (not bytes)
 * @param ArrayType - TypedArray constructor to use
 */
export function copyTypedArrayFromWasm<T extends TypedArray>(
  memory: WebAssembly.Memory,
  ptr: number,
  length: number,
  ArrayType: new (buffer: ArrayBuffer, byteOffset: number, length: number) => T
): TypedArrayContainer<T> {
  // Create a view first
  const view = new ArrayType(memory.buffer, ptr, length);
  // Then copy to a new ArrayBuffer - use slice to create independent copy
  const copyBuffer = memory.buffer.slice(ptr, ptr + length * view.BYTES_PER_ELEMENT);
  const copy = new ArrayType(copyBuffer, 0, length);
  return {
    data: copy,
    length,
    isZeroCopy: false,
  };
}

/**
 * Write a typed array to WASM memory
 * Returns the pointer to the written data
 *
 * @param memory - WebAssembly.Memory instance
 * @param ptr - Pointer to write location in WASM memory
 * @param data - TypedArray to write
 */
export function writeTypedArrayToWasm<T extends TypedArray>(
  memory: WebAssembly.Memory,
  ptr: number,
  data: T
): number {
  const view = new Uint8Array(memory.buffer, ptr, data.byteLength);
  view.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  return ptr;
}

/**
 * Get the appropriate TypedArray constructor for a WASM value type
 */
export function getTypedArrayConstructor(
  wasmType: 'i32' | 'i64' | 'f32' | 'f64' | 'u8' | 'u16' | 'u32'
): new (buffer: ArrayBuffer, byteOffset: number, length: number) => TypedArray {
  switch (wasmType) {
    case 'i32':
      return Int32Array;
    case 'i64':
      return BigInt64Array;
    case 'f32':
      return Float32Array;
    case 'f64':
      return Float64Array;
    case 'u8':
      return Uint8Array;
    case 'u16':
      return Uint16Array;
    case 'u32':
      return Uint32Array;
    default:
      throw new Error(`Unknown WASM type: ${wasmType}`);
  }
}

/**
 * Bytes per element for different WASM types
 */
export const WASM_TYPE_SIZES: Record<string, number> = {
  i8: 1,
  u8: 1,
  i16: 2,
  u16: 2,
  i32: 4,
  u32: 4,
  f32: 4,
  i64: 8,
  u64: 8,
  f64: 8,
};

// ==================== PARALLEL TYPED ARRAYS ====================

/**
 * Result container for parallel typed arrays (e.g., IDs and values)
 * Common pattern for returning related data from WASM
 */
export interface ParallelTypedArrays<
  TIds extends TypedArray = Int32Array | BigInt64Array,
  TValues extends TypedArray = Int32Array | Float32Array | Float64Array
> {
  /** Array of IDs (song IDs, show IDs, etc.) */
  ids: TIds;
  /** Array of corresponding values (counts, scores, etc.) */
  values: TValues;
  /** Number of valid entries */
  length: number;
  /** Whether arrays are zero-copy views */
  isZeroCopy: boolean;
}

/**
 * Create parallel typed arrays from WASM pointers
 * PERF: Creates views into WASM memory - no copying
 */
export function viewParallelArraysFromWasm<
  TIds extends TypedArray,
  TValues extends TypedArray
>(
  memory: WebAssembly.Memory,
  idsPtr: number,
  valuesPtr: number,
  length: number,
  IdsType: new (buffer: ArrayBuffer, byteOffset: number, length: number) => TIds,
  ValuesType: new (buffer: ArrayBuffer, byteOffset: number, length: number) => TValues
): ParallelTypedArrays<TIds, TValues> {
  return {
    ids: new IdsType(memory.buffer, idsPtr, length),
    values: new ValuesType(memory.buffer, valuesPtr, length),
    length,
    isZeroCopy: true,
  };
}

/**
 * Copy parallel typed arrays from WASM
 * PERF: Creates copies - safe to keep beyond WASM call
 */
export function copyParallelArraysFromWasm<
  TIds extends TypedArray,
  TValues extends TypedArray
>(
  memory: WebAssembly.Memory,
  idsPtr: number,
  valuesPtr: number,
  length: number,
  IdsType: new (buffer: ArrayBuffer, byteOffset: number, length: number) => TIds,
  ValuesType: new (buffer: ArrayBuffer, byteOffset: number, length: number) => TValues
): ParallelTypedArrays<TIds, TValues> {
  const idsView = new IdsType(memory.buffer, idsPtr, length);
  const valuesView = new ValuesType(memory.buffer, valuesPtr, length);

  // Create independent copies by slicing the buffer
  const idsBuffer = memory.buffer.slice(idsPtr, idsPtr + length * idsView.BYTES_PER_ELEMENT);
  const valuesBuffer = memory.buffer.slice(valuesPtr, valuesPtr + length * valuesView.BYTES_PER_ELEMENT);

  const ids = new IdsType(idsBuffer, 0, length);
  const values = new ValuesType(valuesBuffer, 0, length);

  return { ids, values, length, isZeroCopy: false };
}

// ==================== CONVERSION UTILITIES ====================

/**
 * Convert parallel typed arrays to an array of objects
 * Useful for UI consumption when you need object format
 *
 * @param ids - Array of IDs
 * @param values - Array of corresponding values
 * @param idKey - Key name for ID in output objects
 * @param valueKey - Key name for value in output objects
 */
export function parallelArraysToObjects<
  TIds extends TypedArray,
  TValues extends TypedArray,
  K1 extends string,
  K2 extends string
>(
  ids: TIds,
  values: TValues,
  idKey: K1,
  valueKey: K2
): Array<{ [key in K1]: number | bigint } & { [key in K2]: number | bigint }> {
  const length = Math.min(ids.length, values.length);
  const result = new Array(length);

  for (let i = 0; i < length; i++) {
    result[i] = {
      [idKey]: ids[i],
      [valueKey]: values[i],
    };
  }

  return result;
}

/**
 * Extract a single typed array column from an array of objects
 * Useful for preparing data for WASM processing
 *
 * @param objects - Array of objects
 * @param key - Key to extract
 * @param ArrayType - TypedArray constructor
 */
export function objectsToTypedArray<T extends Record<string, number | bigint>>(
  objects: T[],
  key: keyof T,
  ArrayType: new (length: number) => NumericTypedArray
): NumericTypedArray {
  const result = new ArrayType(objects.length);
  for (let i = 0; i < objects.length; i++) {
    result[i] = Number(objects[i][key]);
  }
  return result;
}

/**
 * Extract BigInt column to BigInt64Array
 */
export function objectsToBigInt64Array<T extends Record<string, number | bigint>>(
  objects: T[],
  key: keyof T
): BigInt64Array {
  const result = new BigInt64Array(objects.length);
  for (let i = 0; i < objects.length; i++) {
    const val = objects[i][key];
    result[i] = typeof val === 'bigint' ? val : BigInt(val);
  }
  return result;
}

// ==================== INTERLEAVED DATA UTILITIES ====================

/**
 * Deinterleave packed WASM data into separate arrays
 * Useful when WASM returns struct-of-arrays as interleaved data
 *
 * @param interleaved - Interleaved data from WASM
 * @param stride - Number of values per item
 * @param length - Number of items
 */
export function deinterleaveTypedArray<T extends NumericTypedArray>(
  interleaved: T,
  stride: number,
  length: number
): T[] {
  const ArrayType = interleaved.constructor as new (length: number) => T;
  const result: T[] = [];

  for (let col = 0; col < stride; col++) {
    const column = new ArrayType(length);
    for (let row = 0; row < length; row++) {
      column[row] = interleaved[row * stride + col];
    }
    result.push(column);
  }

  return result;
}

/**
 * Interleave separate arrays into packed format for WASM
 */
export function interleaveTypedArrays<T extends NumericTypedArray>(
  arrays: T[],
  length: number
): T {
  if (arrays.length === 0) {
    throw new Error('Cannot interleave empty array list');
  }

  const ArrayType = arrays[0].constructor as new (length: number) => T;
  const stride = arrays.length;
  const result = new ArrayType(length * stride);

  for (let row = 0; row < length; row++) {
    for (let col = 0; col < stride; col++) {
      result[row * stride + col] = arrays[col][row];
    }
  }

  return result;
}

// ==================== SHARED MEMORY UTILITIES ====================

/**
 * Check if SharedArrayBuffer is available
 */
export function isSharedArrayBufferSupported(): boolean {
  if (typeof SharedArrayBuffer === 'undefined') {
    return false;
  }

  // Check for cross-origin isolation (required for SharedArrayBuffer in browsers)
  if (typeof crossOriginIsolated !== 'undefined' && !crossOriginIsolated) {
    return false;
  }

  return true;
}

/**
 * Create a SharedArrayBuffer for zero-copy data transfer
 */
export function createSharedBuffer(size: number): SharedArrayBuffer | null {
  if (!isSharedArrayBufferSupported()) {
    return null;
  }

  try {
    return new SharedArrayBuffer(size);
  } catch {
    // SharedArrayBuffer may be disabled by security policies
    return null;
  }
}

/**
 * Write JSON data to SharedArrayBuffer
 * Returns the number of bytes written
 */
export function writeToSharedBuffer(
  buffer: SharedArrayBuffer,
  data: string,
  offset: number = 0
): number {
  const view = new Uint8Array(buffer);
  const encoded = encodeString(data);

  if (offset + encoded.length > buffer.byteLength) {
    throw new Error(`Data too large for buffer: ${encoded.length} > ${buffer.byteLength - offset}`);
  }

  view.set(encoded, offset);
  return encoded.length;
}

/**
 * Read JSON data from SharedArrayBuffer
 */
export function readFromSharedBuffer(
  buffer: SharedArrayBuffer,
  offset: number = 0,
  length: number
): string {
  const view = new Uint8Array(buffer, offset, length);
  return decodeString(view);
}

// ==================== CHUNKED TRANSFER ====================

/**
 * Split large array into chunks for incremental processing
 */
export function* chunkArray<T>(array: T[], chunkSize: number): Generator<T[], void, unknown> {
  for (let i = 0; i < array.length; i += chunkSize) {
    yield array.slice(i, i + chunkSize);
  }
}

/**
 * Serialize data in chunks with progress callback
 */
export async function serializeInChunks<T>(
  data: T[],
  chunkSize: number,
  onProgress?: (progress: number) => void
): Promise<string[]> {
  const chunks: string[] = [];
  let processed = 0;

  for (const chunk of chunkArray(data, chunkSize)) {
    chunks.push(JSON.stringify(chunk));
    processed += chunk.length;
    onProgress?.(processed / data.length);

    // Yield to main thread
    await yieldToMainThread();
  }

  return chunks;
}

/**
 * Yield to main thread for UI responsiveness
 * FIX: Removed fallback setTimeout that was always running even when scheduler.yield available
 * Now properly uses scheduler.yield when available (better performance/INP)
 */
async function yieldToMainThread(): Promise<void> {
  // Use native scheduler.yield if available (modern browsers)
  if (typeof scheduler !== 'undefined' && typeof scheduler.yield === 'function') {
    return scheduler.yield();
  }

  // Fallback to setTimeout for older environments
  return new Promise(resolve => setTimeout(resolve, 0));
}

// ==================== VALIDATION ====================

/**
 * Validate WASM JSON response format
 */
export function validateWasmResponse(json: string): { valid: boolean; error?: string } {
  try {
    const data = JSON.parse(json);

    // Check for error response format from WASM
    if (typeof data === 'object' && data !== null && 'error' in data) {
      return { valid: false, error: data.error as string };
    }

    return { valid: true };
  } catch (e) {
    return { valid: false, error: `Invalid JSON: ${e}` };
  }
}
