/**
 * Helper type declarations for WASM module interaction
 *
 * These types provide safe access to WASM functions that are not in the base WasmExports interface
 * but are added dynamically by WASM modules that support advanced features like zero-copy returns.
 *
 * Usage:
 * ```typescript
 * import type { WasmModuleExtended } from './wasm-helpers';
 *
 * const wasmModule: WasmModuleExtended = {
 *   ...baseModule,
 *   extractYearsTyped: (json) => ({ ptr, len })
 * };
 * ```
 */

/**
 * Typed array data returned from WASM zero-copy functions
 * Contains a pointer and length for manual TypedArray construction
 */
export interface WasmTypedArrayReturn {
  /** Pointer to data in WASM linear memory */
  ptr: number;

  /** Number of elements in the array */
  len: number;
}

/**
 * Parallel arrays data returned from WASM for efficient batch operations
 * Commonly used for returning multiple related arrays (e.g., IDs and counts)
 */
export interface WasmParallelArraysReturn {
  /** Pointer to first array in WASM linear memory */
  ptr1: number;

  /** Length of first array */
  len1: number;

  /** Pointer to second array in WASM linear memory */
  ptr2?: number;

  /** Length of second array */
  len2?: number;

  /** Pointer to third array in WASM linear memory (if applicable) */
  ptr3?: number;

  /** Length of third array */
  len3?: number;
}

/**
 * Extended WASM module with typed functions for zero-copy returns
 * These functions are optional and may not be available in all WASM modules
 *
 * Use with type guards or safe access patterns:
 * ```typescript
 * const fn = (module as unknown as Record<string, unknown>)['extractYearsTyped'] as
 *   | ((json: string) => WasmTypedArrayReturn)
 *   | undefined;
 * ```
 */
export interface WasmExportsExtended {
  // Zero-copy typed functions for performance-critical paths
  /**
   * Extract unique years from shows data as typed array
   * Returns Int32Array of year values
   */
  extractYearsTyped?: (showsJson: string) => WasmTypedArrayReturn;

  /**
   * Get show IDs for a song as typed array
   * Returns BigInt64Array of show IDs
   */
  getShowIdsForSongTyped?: (
    entriesJson: string,
    songId: bigint
  ) => WasmTypedArrayReturn;

  /**
   * Get song IDs for a venue as typed array
   * Returns BigInt64Array of song IDs
   */
  getSongIdsForVenueTyped?: (
    showsJson: string,
    entriesJson: string,
    venueId: bigint
  ) => WasmTypedArrayReturn;

  /**
   * Get play counts per song as parallel arrays
   * Returns { songIds: BigInt64Array, counts: Int32Array }
   */
  getPlayCountsPerSong?: (
    entriesJson: string
  ) => {
    songIds: BigInt64Array;
    counts: Int32Array;
  };

  /**
   * Get unique years from shows as typed array
   * Returns Int32Array of years
   */
  getUniqueYearsTyped?: (showsJson: string) => Int32Array;
}

/**
 * Safe accessor for WASM extended functions
 * Properly typed to avoid unsafe casts
 *
 * Usage:
 * ```typescript
 * const accessor = new WasmFunctionAccessor(wasmModule);
 * const yearsReturn = accessor.extractYearsTyped(showsJson);
 * if (yearsReturn) {
 *   const years = viewTypedArrayFromWasm(memory, yearsReturn);
 * }
 * ```
 */
export class WasmFunctionAccessor {
  private module: unknown;

  constructor(module: unknown) {
    this.module = module;
  }

  /**
   * Safely access extractYearsTyped function if available
   */
  extractYearsTyped(
    json: string
  ): WasmTypedArrayReturn | undefined {
    const fn = (this.module as Record<string, unknown>)[
      'extractYearsTyped'
    ] as ((json: string) => WasmTypedArrayReturn) | undefined;

    return fn ? fn(json) : undefined;
  }

  /**
   * Safely access getShowIdsForSongTyped function if available
   */
  getShowIdsForSongTyped(
    entriesJson: string,
    songId: bigint
  ): WasmTypedArrayReturn | undefined {
    const fn = (this.module as Record<string, unknown>)[
      'getShowIdsForSongTyped'
    ] as
      | ((entriesJson: string, songId: bigint) => WasmTypedArrayReturn)
      | undefined;

    return fn ? fn(entriesJson, songId) : undefined;
  }

  /**
   * Safely access getSongIdsForVenueTyped function if available
   */
  getSongIdsForVenueTyped(
    showsJson: string,
    entriesJson: string,
    venueId: bigint
  ): WasmTypedArrayReturn | undefined {
    const fn = (this.module as Record<string, unknown>)[
      'getSongIdsForVenueTyped'
    ] as
      | ((
          showsJson: string,
          entriesJson: string,
          venueId: bigint
        ) => WasmTypedArrayReturn)
      | undefined;

    return fn ? fn(showsJson, entriesJson, venueId) : undefined;
  }

  /**
   * Safely access getPlayCountsPerSong function if available
   */
  getPlayCountsPerSong(
    entriesJson: string
  ): { songIds: BigInt64Array; counts: Int32Array } | undefined {
    const fn = (this.module as Record<string, unknown>)[
      'getPlayCountsPerSong'
    ] as
      | ((entriesJson: string) => {
          songIds: BigInt64Array;
          counts: Int32Array;
        })
      | undefined;

    return fn ? fn(entriesJson) : undefined;
  }

  /**
   * Safely access getUniqueYearsTyped function if available
   */
  getUniqueYearsTyped(showsJson: string): Int32Array | undefined {
    const fn = (this.module as Record<string, unknown>)[
      'getUniqueYearsTyped'
    ] as ((showsJson: string) => Int32Array) | undefined;

    return fn ? fn(showsJson) : undefined;
  }
}

/**
 * Type guard to check if a value looks like a WasmTypedArrayReturn
 *
 * Usage:
 * ```typescript
 * const result = someWasmCall();
 * if (isWasmTypedArrayReturn(result)) {
 *   const typed = viewTypedArrayFromWasm(memory, result);
 * }
 * ```
 */
export function isWasmTypedArrayReturn(
  value: unknown
): value is WasmTypedArrayReturn {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ptr' in value &&
    'len' in value &&
    typeof (value as any).ptr === 'number' &&
    typeof (value as any).len === 'number'
  );
}

/**
 * Type guard to check if a value looks like WasmParallelArraysReturn
 */
export function isWasmParallelArraysReturn(
  value: unknown
): value is WasmParallelArraysReturn {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ptr1' in value &&
    'len1' in value &&
    typeof (value as any).ptr1 === 'number' &&
    typeof (value as any).len1 === 'number'
  );
}

/**
 * Extract function name and signature from WASM module
 * Useful for debugging which functions are available
 *
 * Usage:
 * ```typescript
 * const names = getWasmFunctionNames(wasmModule);
 * console.log('Available functions:', names);
 * ```
 */
export function getWasmFunctionNames(module: unknown): string[] {
  if (typeof module !== 'object' || module === null) {
    return [];
  }

  return Object.keys(module as Record<string, unknown>)
    .filter(
      key =>
        typeof (module as Record<string, unknown>)[key] ===
        'function'
    );
}

/**
 * Verify WASM module has required functions
 *
 * Usage:
 * ```typescript
 * if (!hasWasmFunction(module, 'extractYearsTyped')) {
 *   console.warn('Function not available, using fallback');
 * }
 * ```
 */
export function hasWasmFunction(
  module: unknown,
  functionName: string
): boolean {
  return (
    typeof module === 'object' &&
    module !== null &&
    typeof (module as Record<string, unknown>)[functionName] ===
      'function'
  );
}

/**
 * Safely call a WASM function with fallback
 *
 * Usage:
 * ```typescript
 * const result = callWasmFunctionSafe(
 *   module,
 *   'extractYearsTyped',
 *   () => fallbackYears(),
 *   (fn) => fn(showsJson)
 * );
 * ```
 */
export function callWasmFunctionSafe<T>(
  module: unknown,
  functionName: string,
  fallback: () => T,
  call: (fn: Function) => T
): T {
  const fn = (module as Record<string, unknown>)[
    functionName
  ] as Function | undefined;

  if (!fn || typeof fn !== 'function') {
    return fallback();
  }

  try {
    return call(fn);
  } catch (error) {
    console.error(`WASM function ${functionName} failed:`, error);
    return fallback();
  }
}
