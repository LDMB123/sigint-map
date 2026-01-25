/**
 * Conditional yielding utilities for INP optimization
 *
 * These utilities provide fine-grained control over when to yield to the main thread
 * during long-running operations. They track elapsed time and only yield when needed,
 * avoiding unnecessary yields that could slow down operations.
 *
 * Use cases:
 * - Processing large datasets with unknown iteration time
 * - Rendering operations that might be fast or slow
 * - Operations that need to stay below 50ms blocking time
 * - Loops where individual iterations vary in duration
 *
 * INP (Interaction to Next Paint) best practices:
 * - Keep blocking tasks under 50ms
 * - Yield every 5-10ms for critical paths
 * - Use scheduler.yield() on Chromium 129+ for best performance
 *
 * @module yieldIfNeeded
 */

import { yieldToMain, yieldWithPriority } from './scheduler';

/**
 * Default time budget before yielding (in milliseconds)
 * 50ms is the threshold for "long tasks" that impact INP
 */
export const DEFAULT_TIME_BUDGET = 50;

/**
 * Aggressive time budget for user-blocking operations (in milliseconds)
 * Yields more frequently to keep UI responsive during critical interactions
 */
export const AGGRESSIVE_TIME_BUDGET = 5;

/**
 * Relaxed time budget for background operations (in milliseconds)
 * Allows longer blocking time for non-critical work
 */
export const RELAXED_TIME_BUDGET = 100;

/**
 * Yield controller for managing yielding decisions
 * Tracks elapsed time and determines when to yield
 */
export class YieldController {
  private startTime: number;
  private lastYieldTime: number;
  private timeBudget: number;
  private yieldCount = 0;

  /**
   * Create a new yield controller
   *
   * @param timeBudget - Maximum time (ms) before yielding (default: 50ms)
   */
  constructor(timeBudget: number = DEFAULT_TIME_BUDGET) {
    this.timeBudget = timeBudget;
    this.startTime = performance.now();
    this.lastYieldTime = this.startTime;
  }

  /**
   * Check if we should yield based on time elapsed since last yield
   *
   * @returns true if time budget exceeded
   */
  shouldYield(): boolean {
    const now = performance.now();
    const elapsed = now - this.lastYieldTime;
    return elapsed >= this.timeBudget;
  }

  /**
   * Yield to main thread if time budget exceeded
   * Only yields when necessary, avoiding overhead of unnecessary yields
   *
   * @param priority - Priority level for yielding
   * @returns Promise that resolves after yielding (or immediately if not needed)
   *
   * @example
   * ```typescript
   * const controller = new YieldController(50);
   *
   * for (const item of largeArray) {
   *   processItem(item);
   *   await controller.yieldIfNeeded();  // Only yields if > 50ms elapsed
   * }
   * ```
   */
  async yieldIfNeeded(
    priority: 'user-blocking' | 'user-visible' | 'background' = 'user-visible'
  ): Promise<void> {
    if (this.shouldYield()) {
      await yieldWithPriority(priority);
      this.lastYieldTime = performance.now();
      this.yieldCount++;
    }
  }

  /**
   * Force a yield regardless of time budget
   * Useful for explicit yield points (e.g., after heavy operations)
   */
  async forceYield(
    priority: 'user-blocking' | 'user-visible' | 'background' = 'user-visible'
  ): Promise<void> {
    await yieldWithPriority(priority);
    this.lastYieldTime = performance.now();
    this.yieldCount++;
  }

  /**
   * Reset the yield controller timer
   * Useful when starting a new operation or phase
   */
  reset(): void {
    this.lastYieldTime = performance.now();
  }

  /**
   * Get statistics about yielding behavior
   * Useful for performance monitoring and optimization
   */
  getStats(): {
    totalTime: number;
    yieldCount: number;
    avgTimeBetweenYields: number;
  } {
    const now = performance.now();
    const totalTime = now - this.startTime;
    const avgTimeBetweenYields = this.yieldCount > 0 ? totalTime / this.yieldCount : 0;

    return {
      totalTime,
      yieldCount: this.yieldCount,
      avgTimeBetweenYields,
    };
  }
}

/**
 * Simple helper for yielding if time budget exceeded
 * Tracks time since last call and yields when needed
 *
 * This is a stateful function - maintains internal timer across calls
 * Use for simple loops where you don't need full YieldController features
 *
 * @param timeBudget - Maximum time (ms) before yielding (default: 50ms)
 * @returns Function that yields when time budget exceeded
 *
 * @example
 * ```typescript
 * const yieldIfNeeded = createYieldIfNeeded(50);
 *
 * for (const item of items) {
 *   processItem(item);
 *   await yieldIfNeeded();  // Yields if > 50ms since last yield
 * }
 * ```
 */
export function createYieldIfNeeded(
  timeBudget: number = DEFAULT_TIME_BUDGET,
  priority: 'user-blocking' | 'user-visible' | 'background' = 'user-visible'
): () => Promise<void> {
  let lastYieldTime = performance.now();

  return async () => {
    const now = performance.now();
    const elapsed = now - lastYieldTime;

    if (elapsed >= timeBudget) {
      await yieldWithPriority(priority);
      lastYieldTime = performance.now();
    }
  };
}

/**
 * Process array items with automatic yielding
 * Yields based on time budget rather than item count
 *
 * More efficient than fixed-chunk processing when item processing time varies
 *
 * @param items - Array of items to process
 * @param processor - Function to process each item
 * @param options - Configuration options
 * @returns Promise that resolves when all items processed
 *
 * @example
 * ```typescript
 * await processWithYield(
 *   largeDataset,
 *   (item) => expensiveOperation(item),
 *   { timeBudget: 16, priority: 'user-visible' }
 * );
 * ```
 */
export async function processWithYield<T>(
  items: T[],
  processor: (item: T, index: number) => void | Promise<void>,
  options: {
    timeBudget?: number;
    priority?: 'user-blocking' | 'user-visible' | 'background';
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<void> {
  const {
    timeBudget = DEFAULT_TIME_BUDGET,
    priority = 'user-visible',
    onProgress,
  } = options;

  const controller = new YieldController(timeBudget);

  for (let i = 0; i < items.length; i++) {
    await Promise.resolve(processor(items[i], i));

    if (onProgress) {
      onProgress(i + 1, items.length);
    }

    // Yield if time budget exceeded
    await controller.yieldIfNeeded(priority);
  }
}

/**
 * Process array items in batches with yielding between batches
 * Combines batching (for efficiency) with time-based yielding (for responsiveness)
 *
 * Best for:
 * - DOM operations (batch DOM updates, yield between batches)
 * - Database operations (batch writes, yield between batches)
 * - Network requests (batch requests, yield between batches)
 *
 * @param items - Array of items to process
 * @param processor - Function to process a batch of items
 * @param options - Configuration options
 * @returns Promise that resolves when all items processed
 *
 * @example
 * ```typescript
 * await processBatchesWithYield(
 *   songs,
 *   async (batch) => await db.songs.bulkAdd(batch),
 *   { batchSize: 100, priority: 'background' }
 * );
 * ```
 */
export async function processBatchesWithYield<T>(
  items: T[],
  processor: (batch: T[], batchIndex: number) => void | Promise<void>,
  options: {
    batchSize?: number;
    priority?: 'user-blocking' | 'user-visible' | 'background';
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<void> {
  const {
    batchSize = 100,
    priority = 'user-visible',
    onProgress,
  } = options;

  let processed = 0;
  let batchIndex = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, Math.min(i + batchSize, items.length));

    await Promise.resolve(processor(batch, batchIndex));

    processed += batch.length;
    batchIndex++;

    if (onProgress) {
      onProgress(processed, items.length);
    }

    // Yield between batches (unless at end)
    if (processed < items.length) {
      await yieldWithPriority(priority);
    }
  }
}

/**
 * Map array items with automatic yielding
 * Like Array.prototype.map but yields to maintain INP responsiveness
 *
 * @param items - Array of items to map
 * @param mapper - Function to transform each item
 * @param options - Configuration options
 * @returns Promise that resolves to mapped array
 *
 * @example
 * ```typescript
 * const transformed = await mapWithYield(
 *   shows,
 *   (show) => transformShow(show),
 *   { timeBudget: 16 }
 * );
 * ```
 */
export async function mapWithYield<T, R>(
  items: T[],
  mapper: (item: T, index: number) => R | Promise<R>,
  options: {
    timeBudget?: number;
    priority?: 'user-blocking' | 'user-visible' | 'background';
  } = {}
): Promise<R[]> {
  const {
    timeBudget = DEFAULT_TIME_BUDGET,
    priority = 'user-visible',
  } = options;

  const results: R[] = [];
  const controller = new YieldController(timeBudget);

  for (let i = 0; i < items.length; i++) {
    const result = await Promise.resolve(mapper(items[i], i));
    results.push(result);

    await controller.yieldIfNeeded(priority);
  }

  return results;
}

/**
 * Filter array items with automatic yielding
 * Like Array.prototype.filter but yields to maintain INP responsiveness
 *
 * @param items - Array of items to filter
 * @param predicate - Function to test each item
 * @param options - Configuration options
 * @returns Promise that resolves to filtered array
 *
 * @example
 * ```typescript
 * const covers = await filterWithYield(
 *   songs,
 *   (song) => song.isCover,
 *   { timeBudget: 50 }
 * );
 * ```
 */
export async function filterWithYield<T>(
  items: T[],
  predicate: (item: T, index: number) => boolean | Promise<boolean>,
  options: {
    timeBudget?: number;
    priority?: 'user-blocking' | 'user-visible' | 'background';
  } = {}
): Promise<T[]> {
  const {
    timeBudget = DEFAULT_TIME_BUDGET,
    priority = 'user-visible',
  } = options;

  const results: T[] = [];
  const controller = new YieldController(timeBudget);

  for (let i = 0; i < items.length; i++) {
    const shouldInclude = await Promise.resolve(predicate(items[i], i));

    if (shouldInclude) {
      results.push(items[i]);
    }

    await controller.yieldIfNeeded(priority);
  }

  return results;
}

/**
 * Reduce array items with automatic yielding
 * Like Array.prototype.reduce but yields to maintain INP responsiveness
 *
 * @param items - Array of items to reduce
 * @param reducer - Function to accumulate values
 * @param initialValue - Initial accumulator value
 * @param options - Configuration options
 * @returns Promise that resolves to reduced value
 *
 * @example
 * ```typescript
 * const total = await reduceWithYield(
 *   shows,
 *   (sum, show) => sum + show.songCount,
 *   0,
 *   { timeBudget: 50 }
 * );
 * ```
 */
export async function reduceWithYield<T, R>(
  items: T[],
  reducer: (accumulator: R, item: T, index: number) => R | Promise<R>,
  initialValue: R,
  options: {
    timeBudget?: number;
    priority?: 'user-blocking' | 'user-visible' | 'background';
  } = {}
): Promise<R> {
  const {
    timeBudget = DEFAULT_TIME_BUDGET,
    priority = 'user-visible',
  } = options;

  let accumulator = initialValue;
  const controller = new YieldController(timeBudget);

  for (let i = 0; i < items.length; i++) {
    accumulator = await Promise.resolve(reducer(accumulator, items[i], i));
    await controller.yieldIfNeeded(priority);
  }

  return accumulator;
}

/**
 * Check if current operation is taking too long
 * Useful for early exit detection in loops
 *
 * @param startTime - When operation started (from performance.now())
 * @param maxDuration - Maximum allowed duration in ms
 * @returns true if operation exceeded max duration
 *
 * @example
 * ```typescript
 * const start = performance.now();
 *
 * for (const item of items) {
 *   if (isBlockingTooLong(start, 50)) {
 *     console.warn('Operation taking too long, yielding');
 *     await yieldToMain();
 *   }
 *   processItem(item);
 * }
 * ```
 */
export function isBlockingTooLong(
  startTime: number,
  maxDuration: number = DEFAULT_TIME_BUDGET
): boolean {
  return performance.now() - startTime >= maxDuration;
}

/**
 * Wrap a function to automatically yield if it takes too long
 * Monitors execution time and yields if threshold exceeded
 *
 * @param fn - Function to wrap
 * @param options - Configuration options
 * @returns Wrapped function that yields if needed
 *
 * @example
 * ```typescript
 * const processWithYield = wrapWithYield(
 *   (data) => expensiveOperation(data),
 *   { maxDuration: 16 }
 * );
 *
 * await processWithYield(largeDataset);  // Yields if > 16ms
 * ```
 */
export function wrapWithYield<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    maxDuration?: number;
    priority?: 'user-blocking' | 'user-visible' | 'background';
  } = {}
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  const {
    maxDuration = DEFAULT_TIME_BUDGET,
    priority = 'user-visible',
  } = options;

  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const startTime = performance.now();
    const result = await Promise.resolve(fn(...args));
    const duration = performance.now() - startTime;

    if (duration > maxDuration) {
      await yieldWithPriority(priority);
    }

    return result;
  };
}
