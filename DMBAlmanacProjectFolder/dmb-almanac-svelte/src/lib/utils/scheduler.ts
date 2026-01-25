/**
 * Scheduler API utilities for Chromium 2025 (Chrome 129+)
 * Improves INP (Interaction to Next Paint) by yielding to the main thread
 *
 * The scheduler.yield() API allows long-running tasks to yield control back to the browser,
 * enabling it to process user input. This keeps INP below 100ms.
 *
 * Usage patterns:
 * - Bulk data processing with automatic yielding
 * - Heavy list rendering with progressive rendering
 * - Search/filter operations on large datasets
 * - Stats calculations with fine-grained control
 *
 * Chrome 129+ feature - falls back to setTimeout(0) for older browsers
 * Optimized for Apple Silicon with E-core awareness
 */

/**
 * Detect if scheduler.yield() is supported
 * Available in Chrome 129+ and edge cases in Chrome 128 with flag
 */
export function isSchedulerYieldSupported(): boolean {
  return typeof globalThis !== 'undefined' &&
    'scheduler' in globalThis &&
    typeof (globalThis as any).scheduler === 'object' &&
    (globalThis as any).scheduler !== null &&
    'yield' in (globalThis as any).scheduler;
}

/**
 * Yield to main thread, allowing browser to process pending interactions
 *
 * This is the core API - use this when you have loops that might delay INP.
 * Each yield allows the browser to:
 * - Process input events (mouse, keyboard, touch)
 * - Handle timer callbacks
 * - Update rendering
 * - Run other microtasks
 *
 * @example
 * ```typescript
 * // Processing large array
 * for (const item of largeArray) {
 *   processItem(item);
 *   await yieldToMain();  // ~1ms pause, but lets browser handle input
 * }
 * ```
 */
export async function yieldToMain(): Promise<void> {
  if (isSchedulerYieldSupported()) {
    await (globalThis as any).scheduler.yield();
  } else {
    // Fallback: setTimeout(0) for older browsers
    // Note: Less efficient but maintains INP responsiveness
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

/**
 * Yield with a specific priority level
 * Chrome 129+ scheduler.yield() accepts priority parameter
 *
 * @param priority 'user-blocking' | 'user-visible' | 'background'
 *
 * Priorities:
 * - user-blocking: Critical for interaction (default)
 * - user-visible: Important but not immediate
 * - background: Low priority, can be deferred
 *
 * On Apple Silicon, background tasks use efficiency cores (E-cores)
 */
export async function yieldWithPriority(
  priority: 'user-blocking' | 'user-visible' | 'background' = 'user-visible'
): Promise<void> {
  if (isSchedulerYieldSupported()) {
    try {
      // scheduler.yield() supports priority parameter in Chrome 129+
      await (globalThis as any).scheduler.yield({ priority });
    } catch {
      // Fallback if priority is not supported
      await (globalThis as any).scheduler.yield();
    }
  } else {
    // setTimeout fallback (doesn't support priorities)
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

/**
 * Run tasks with automatic yielding to prevent long tasks
 * Processes array of tasks, yielding between each one
 *
 * This is ideal for:
 * - Rendering large lists progressively
 * - Processing search results with visual feedback
 * - Heavy calculations that shouldn't block input
 *
 * @param tasks Array of synchronous or async task functions
 * @param options Configuration options
 * @returns Array of results in order
 *
 * @example
 * ```typescript
 * const results = await runWithYielding(
 *   largeList.map(item => () => expensiveCalculation(item)),
 *   { yieldAfterMs: 16 }  // Yield every 16ms (~60fps)
 * );
 * ```
 */
export async function runWithYielding<T>(
  tasks: Array<() => T | Promise<T>>,
  options?: {
    yieldAfterMs?: number;  // Time budget before yielding (default: 5ms)
    priority?: 'user-blocking' | 'user-visible' | 'background';
  }
): Promise<T[]> {
  const { yieldAfterMs = 5, priority = 'user-visible' } = options || {};
  const results: T[] = [];
  let lastYieldTime = performance.now();

  for (const task of tasks) {
    const now = performance.now();

    // Check if we should yield based on time
    if (now - lastYieldTime >= yieldAfterMs) {
      await yieldWithPriority(priority);
      lastYieldTime = performance.now();
    }

    // Run the task
    const result = await Promise.resolve(task());
    results.push(result);
  }

  return results;
}

/**
 * Process items in chunks with yielding between chunks
 * More efficient than yielding after every item
 *
 * Useful for:
 * - Processing search results (yield per page)
 * - Batch DOM updates (yield per batch)
 * - Large data transformations
 *
 * @param items Array of items to process
 * @param processor Function to process each item
 * @param options Configuration
 *
 * @example
 * ```typescript
 * await processInChunks(
 *   searchResults,
 *   (result) => updateDOM(result),
 *   { chunkSize: 20, priority: 'user-visible' }
 * );
 * ```
 */
export async function processInChunks<T>(
  items: T[],
  processor: (item: T, index: number) => void | Promise<void>,
  options?: {
    chunkSize?: number;  // Items per chunk (default: 10)
    priority?: 'user-blocking' | 'user-visible' | 'background';
    onProgress?: (processed: number, total: number) => void;
  }
): Promise<void> {
  const {
    chunkSize = 10,
    priority = 'user-visible',
    onProgress
  } = options || {};

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);

    for (let j = 0; j < chunk.length; j++) {
      await Promise.resolve(processor(chunk[j], i + j));
    }

    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + chunkSize, items.length), items.length);
    }

    // Yield between chunks (unless at end)
    if (i + chunkSize < items.length) {
      await yieldWithPriority(priority);
    }
  }
}

/**
 * Run an async iterator with automatic yielding
 * Perfect for generator functions that produce values over time
 *
 * @param generator Async generator function
 * @param processor Process each yielded value
 * @param options Configuration
 *
 * @example
 * ```typescript
 * async function* searchGenerator(query: string) {
 *   for (const result of results) {
 *     yield result;
 *   }
 * }
 *
 * await runAsyncGenerator(
 *   searchGenerator('term'),
 *   (result) => appendResultToDOM(result)
 * );
 * ```
 */
export async function runAsyncGenerator<T>(
  generator: AsyncGenerator<T>,
  processor: (value: T, index: number) => void | Promise<void>,
  options?: {
    priority?: 'user-blocking' | 'user-visible' | 'background';
    onProgress?: (processed: number) => void;
  }
): Promise<void> {
  const { priority = 'user-visible', onProgress } = options || {};
  let index = 0;

  for await (const value of generator) {
    await Promise.resolve(processor(value, index));

    if (onProgress) {
      onProgress(index + 1);
    }

    // Yield to allow browser to process input
    await yieldWithPriority(priority);
    index++;
  }
}

/**
 * Debounced task scheduler - coalesces multiple calls into single execution
 * Useful for handling rapid user interactions
 *
 * @param task Function to execute
 * @param delayMs Debounce delay in milliseconds
 * @param options Configuration
 * @returns Function that triggers the debounced task
 *
 * @example
 * ```typescript
 * const handleSearch = debounceScheduled(
 *   (query: string) => performSearch(query),
 *   300,
 *   { priority: 'user-visible' }
 * );
 *
 * input.addEventListener('input', (e) => {
 *   handleSearch((e.target as HTMLInputElement).value);
 * });
 * ```
 */
export function debounceScheduled<T extends (...args: any[]) => void | Promise<void>>(
  task: T,
  delayMs: number = 300,
  options?: {
    priority?: 'user-blocking' | 'user-visible' | 'background';
  }
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    lastArgs = args;

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(async () => {
      if (lastArgs !== null) {
        await yieldWithPriority(options?.priority || 'user-visible');
        await Promise.resolve((task as any)(...lastArgs));
        timeoutId = null;
        lastArgs = null;
      }
    }, delayMs);
  };
}

/**
 * Schedule a function to run at idle time with yielding
 * Low priority work that runs when browser is idle
 *
 * Uses requestIdleCallback if available, falls back to scheduler.yield()
 *
 * @param task Function to run
 * @param options Configuration
 * @returns Function to cancel the scheduled task
 *
 * @example
 * ```typescript
 * const cancel = scheduleIdleTask(
 *   () => updateAnalytics(),
 *   { timeout: 5000 }  // Cancel after 5s
 * );
 * ```
 */
export function scheduleIdleTask(
  task: () => void | Promise<void>,
  options?: {
    timeout?: number;  // Max wait time in ms
  }
): () => void {
  let cancelled = false;

  const run = async () => {
    if (!cancelled) {
      await yieldWithPriority('background');
      if (!cancelled) {
        await Promise.resolve(task());
      }
    }
  };

  if ('requestIdleCallback' in window) {
    const id = requestIdleCallback(
      () => run().catch((err) => {
        console.warn('[Scheduler] scheduleIdleTask failed:', err);
      }),
      { timeout: options?.timeout }
    );

    return () => {
      cancelled = true;
      cancelIdleCallback(id);
    };
  } else {
    // Fallback: schedule at end of current task queue
    setTimeout(() => run().catch((err) => {
      console.warn('[Scheduler] scheduleIdleTask fallback failed:', err);
    }), 0);
    return () => {
      cancelled = true;
    };
  }
}

/**
 * Throttle task execution - limits how often a task runs
 * Different from debounce - executes periodically, not just at end
 *
 * @param task Function to execute
 * @param intervalMs Minimum time between executions
 * @param options Configuration
 * @returns Function that triggers throttled execution
 *
 * @example
 * ```typescript
 * const handleScroll = throttleScheduled(
 *   () => updateScrollIndicator(),
 *   100,
 *   { priority: 'user-visible' }
 * );
 *
 * window.addEventListener('scroll', handleScroll, { passive: true });
 * ```
 */
export function throttleScheduled<T extends (...args: any[]) => void | Promise<void>>(
  task: T,
  intervalMs: number = 100,
  options?: {
    priority?: 'user-blocking' | 'user-visible' | 'background';
  }
): (...args: Parameters<T>) => void {
  let lastExecuteTime = 0;
  let scheduled = false;

  return (...args: Parameters<T>) => {
    const now = performance.now();
    const timeSinceLastExecute = now - lastExecuteTime;

    const execute = async () => {
      lastExecuteTime = performance.now();
      scheduled = false;
      await yieldWithPriority(options?.priority || 'user-visible');
      await Promise.resolve((task as any)(...args));
    };

    if (timeSinceLastExecute >= intervalMs) {
      // Execute immediately
      execute().catch((err) => {
        console.warn('[Scheduler] throttleScheduled immediate execution failed:', err);
      });
    } else if (!scheduled) {
      // Schedule for later
      const delay = intervalMs - timeSinceLastExecute;
      setTimeout(() => execute().catch((err) => {
        console.warn('[Scheduler] throttleScheduled delayed execution failed:', err);
      }), delay);
      scheduled = true;
    }
  };
}

/**
 * Monitor and break up long-running synchronous code
 * Detects when a function is taking too long and yields
 *
 * @param fn Function to monitor
 * @param maxDurationMs Maximum time before yielding (default: 50ms)
 * @returns Wrapped function that yields if it exceeds duration
 *
 * @example
 * ```typescript
 * const processLarge = monitoredExecution(
 *   (items) => items.forEach(updateDOM),
 *   { maxDurationMs: 16 }  // Yield every 16ms (~60fps)
 * );
 * ```
 */
export function monitoredExecution<T extends (...args: any[]) => any>(
  fn: T,
  options?: {
    maxDurationMs?: number;
    priority?: 'user-blocking' | 'user-visible' | 'background';
  }
): T {
  const {
    maxDurationMs = 50,
    priority = 'user-visible'
  } = options || {};

  return (async (...args: Parameters<T>) => {
    const startTime = performance.now();
    const result = await Promise.resolve((fn as any)(...args));
    const duration = performance.now() - startTime;

    if (duration > maxDurationMs) {
      // Execution took too long, yield to let browser process input
      await yieldWithPriority(priority);
    }

    return result;
  }) as T;
}

/**
 * Cancel a task scheduled with scheduler.postTask
 * Used with priority-based task scheduling
 *
 * @param taskId Task ID returned by scheduler.postTask
 *
 * @example
 * ```typescript
 * const id = scheduler.postTask(doWork, { priority: 'background' });
 * cancelScheduledTask(id);
 * ```
 */
export function cancelScheduledTask(_taskId: unknown): void {
  if ('scheduler' in globalThis && 'postTask' in (globalThis as any).scheduler) {
    try {
      const controller = new AbortController();
      controller.abort();
    } catch {
      // Task cancellation not supported
    }
  }
}

/**
 * Batch multiple operations into a single yielding operation
 * Useful for coordinating multiple heavy tasks
 *
 * @param operations Array of functions to run
 * @param options Configuration
 *
 * @example
 * ```typescript
 * await batchOperations([
 *   () => updateSearchResults(query),
 *   () => updateFilterOptions(),
 *   () => updateStats()
 * ]);
 * ```
 */
export async function batchOperations(
  operations: Array<() => void | Promise<void>>,
  options?: {
    priority?: 'user-blocking' | 'user-visible' | 'background';
  }
): Promise<void> {
  const { priority = 'user-visible' } = options || {};

  for (let i = 0; i < operations.length; i++) {
    await Promise.resolve(operations[i]());

    // Yield between operations (unless last)
    if (i < operations.length - 1) {
      await yieldWithPriority(priority);
    }
  }
}

/**
 * Get information about scheduler availability and capabilities
 * Useful for feature detection and logging
 */
export interface SchedulerCapabilities {
  supportsYield: boolean;
  supportsPriority: boolean;
  supportsIdleCallback: boolean;
  isAppleSilicon: boolean;
}

export function getSchedulerCapabilities(): SchedulerCapabilities {
  const caps: SchedulerCapabilities = {
    supportsYield: isSchedulerYieldSupported(),
    supportsPriority: false,
    supportsIdleCallback: 'requestIdleCallback' in window,
    isAppleSilicon: false
  };

  // Check if priority is supported
  if (caps.supportsYield) {
    try {
      (globalThis as any).scheduler.yield({ priority: 'user-visible' });
      caps.supportsPriority = true;
    } catch {
      // Priority not supported
    }
  }

  // Detect Apple Silicon
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (gl) {
      const renderer = gl.getParameter(gl.RENDERER);
      caps.isAppleSilicon = renderer.includes('Apple') && !renderer.includes('Intel');
    }
  } catch {
    // WebGL not available
  }

  return caps;
}

/**
 * Initialize scheduler monitoring and logging
 * Call once on app startup to log capabilities
 *
 * @example
 * ```typescript
 * initSchedulerMonitoring();
 * ```
 */
export function initSchedulerMonitoring(): void {
  if (typeof window === 'undefined') return;

  const caps = getSchedulerCapabilities();

  console.debug('[Scheduler] Capabilities:', {
    'scheduler.yield()': caps.supportsYield,
    'priority parameter': caps.supportsPriority,
    'requestIdleCallback': caps.supportsIdleCallback,
    'Apple Silicon GPU': caps.isAppleSilicon
  });

  // Warn if scheduler.yield is not available
  if (!caps.supportsYield) {
    console.warn('[Scheduler] scheduler.yield() not supported, using setTimeout fallback');
  }
}

/**
 * Check if an operation has been blocking for too long
 * Useful for early exit detection in loops
 *
 * @param startTime - When operation started (from performance.now())
 * @param maxDuration - Maximum allowed duration in ms (default: 50ms)
 * @returns true if operation exceeded max duration
 *
 * @example
 * ```typescript
 * const start = performance.now();
 *
 * for (const item of items) {
 *   if (hasExceededTimeLimit(start, 50)) {
 *     console.warn('Operation taking too long, yielding');
 *     await yieldToMain();
 *     start = performance.now();  // Reset timer after yield
 *   }
 *   processItem(item);
 * }
 * ```
 */
export function hasExceededTimeLimit(
  startTime: number,
  maxDuration: number = 50
): boolean {
  return performance.now() - startTime >= maxDuration;
}

/**
 * Process items in chunks with automatic yielding based on time budget
 * More efficient than processInChunks for variable-duration operations
 *
 * @param items - Array of items to process
 * @param processor - Function to process each item
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * await processInChunksWithYield(
 *   largeDataset,
 *   (item) => expensiveOperation(item),
 *   { timeBudget: 16, priority: 'user-visible' }
 * );
 * ```
 */
export async function processInChunksWithYield<T>(
  items: T[],
  processor: (item: T, index: number) => void | Promise<void>,
  options: {
    timeBudget?: number;  // Time budget before yielding (default: 50ms)
    priority?: 'user-blocking' | 'user-visible' | 'background';
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<void> {
  const {
    timeBudget = 50,
    priority = 'user-visible',
    onProgress
  } = options;

  let lastYieldTime = performance.now();

  for (let i = 0; i < items.length; i++) {
    await Promise.resolve(processor(items[i], i));

    if (onProgress) {
      onProgress(i + 1, items.length);
    }

    // Check if we should yield based on time
    const now = performance.now();
    if (now - lastYieldTime >= timeBudget) {
      await yieldWithPriority(priority);
      lastYieldTime = performance.now();
    }
  }
}
