/**
 * INP (Interaction to Next Paint) Optimization Utilities
 * Chromium 143+ / Chrome 129+ features for responsive interactions
 *
 * INP measures the time from user interaction to visual feedback.
 * Target: < 100ms (Good), < 200ms (Needs Improvement), > 200ms (Poor)
 *
 * Key techniques:
 * 1. scheduler.yield() - Break long tasks into chunks
 * 2. requestIdleCallback - Defer non-critical work
 * 3. Event delegation - Reduce event listener count
 * 4. Debouncing/Throttling - Coalesce rapid events
 *
 * @see https://web.dev/inp/
 * @see https://developer.chrome.com/docs/web-platform/interaction-to-next-paint/
 */

/**
 * Wrap an event handler to yield between heavy operations
 * Allows browser to process additional input events
 *
 * Usage:
 * ```typescript
 * element.addEventListener('click', yieldingHandler(expensiveOperation));
 * ```
 */
export function yieldingHandler<T extends Event>(
  handler: (event: T) => void | Promise<void>,
  options?: {
    priority?: 'user-blocking' | 'user-visible' | 'background';
  }
): (event: T) => void {
  return (event: T) => {
    // Immediate visual feedback (synchronous)
    const startTime = performance.now();

    // Run handler and yield if needed
    // Intentional fire-and-forget: event handler execution doesn't require awaiting
    // Yielding happens after handler completes for responsiveness, not blocking
    void Promise.resolve(handler(event))
      .then(async () => {
        const duration = performance.now() - startTime;

        // If handler took long, yield to let browser process more events
        if (duration > 50 && isSchedulerYieldSupported()) {
          const priority = options?.priority || 'user-visible';
          await (globalThis as any).scheduler.yield({ priority });
        }
      })
      .catch(err => {
        console.error('[INP] yieldingHandler error:', err);
      });
  };
}

/**
 * Create a debounced handler that yields before execution
 * Perfect for search, filter, and resize events
 *
 * Usage:
 * ```typescript
 * const handleSearch = debouncedYieldingHandler(
 *   async (query: string) => {
 *     const results = await search(query);
 *     updateUI(results);
 *   },
 *   300
 * );
 *
 * input.addEventListener('input', (e) => {
 *   handleSearch((e.target as HTMLInputElement).value);
 * });
 * ```
 */
export function debouncedYieldingHandler<T extends any[]>(
  handler: (...args: T) => void | Promise<void>,
  delayMs: number = 300,
  options?: {
    priority?: 'user-blocking' | 'user-visible' | 'background';
  }
): (...args: T) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: T) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(async () => {
      try {
        // Yield before heavy work
        if (isSchedulerYieldSupported()) {
          const priority = options?.priority || 'user-visible';
          await (globalThis as any).scheduler.yield({ priority });
        }

        await Promise.resolve(handler(...args));
      } catch (err) {
        console.error('[INP] debouncedYieldingHandler error:', err);
      } finally {
        timeoutId = null;
      }
    }, delayMs);
  };
}

/**
 * Create a throttled handler that yields before execution
 * Different from debounce - fires periodically, not just at end
 *
 * Usage:
 * ```typescript
 * const handleScroll = throttledYieldingHandler(
 *   () => updateScrollIndicator(),
 *   100
 * );
 *
 * window.addEventListener('scroll', handleScroll, { passive: true });
 * ```
 */
export function throttledYieldingHandler<T extends any[]>(
  handler: (...args: T) => void | Promise<void>,
  intervalMs: number = 100,
  options?: {
    priority?: 'user-blocking' | 'user-visible' | 'background';
  }
): (...args: T) => void {
  let lastExecuteTime = 0;
  let scheduled = false;

  return (...args: T) => {
    const now = performance.now();
    const timeSinceLastExecute = now - lastExecuteTime;

    const execute = async () => {
      try {
        // Yield before heavy work
        if (isSchedulerYieldSupported()) {
          const priority = options?.priority || 'user-visible';
          await (globalThis as any).scheduler.yield({ priority });
        }

        lastExecuteTime = performance.now();
        scheduled = false;
        await Promise.resolve(handler(...args));
      } catch (err) {
        console.error('[INP] throttledYieldingHandler error:', err);
      }
    };

    if (timeSinceLastExecute >= intervalMs) {
      // Intentional fire-and-forget: throttled execution doesn't require awaiting
      void execute().catch(err => console.error('[INP] throttle execute error:', err));
    } else if (!scheduled) {
      const delay = intervalMs - timeSinceLastExecute;
      setTimeout(() => {
        // Intentional fire-and-forget: delayed throttled execution doesn't require awaiting
        void execute().catch(err => console.error('[INP] throttle delayed execute error:', err));
      }, delay);
      scheduled = true;
    }
  };
}

/**
 * Process a list of items progressively with visual updates
 * Yields to browser after each batch
 *
 * Usage:
 * ```typescript
 * async function renderSearchResults(results: SearchResult[]) {
 *   await progressiveRender(results, (result) => {
 *     appendResultToDOM(result);
 *   }, { batchSize: 20 });
 * }
 * ```
 */
export async function progressiveRender<T>(
  items: T[],
  renderer: (item: T, index: number) => void,
  options?: {
    batchSize?: number;
    priority?: 'user-blocking' | 'user-visible' | 'background';
    onProgress?: (rendered: number, total: number) => void;
  }
): Promise<void> {
  const {
    batchSize = 10,
    priority = 'user-visible',
    onProgress
  } = options || {};

  if (!isSchedulerYieldSupported()) {
    // Fallback: render everything synchronously
    items.forEach((item, i) => renderer(item, i));
    return;
  }

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    // Render batch items (synchronous for visual consistency)
    batch.forEach((item, j) => {
      renderer(item, i + j);
    });

    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + batchSize, items.length), items.length);
    }

    // Yield between batches to allow browser to process input
    if (i + batchSize < items.length) {
      await (globalThis as any).scheduler.yield({ priority });
    }
  }
}

/**
 * Measure interaction time and log if it exceeds threshold
 * Useful for debugging INP issues
 *
 * Usage:
 * ```typescript
 * element.addEventListener('click', measureInteractionTime(
 *   () => expensiveOperation(),
 *   { threshold: 100, label: 'Search Click' }
 * ));
 * ```
 */
export function measureInteractionTime<T extends Event>(
  handler: (event: T) => void | Promise<void>,
  options?: {
    threshold?: number;  // Log if exceeds threshold (default: 100ms)
    label?: string;
  }
): (event: T) => void {
  const { threshold = 100, label = 'Interaction' } = options || {};

  return (event: T) => {
    const startTime = performance.now();

    const handleComplete = () => {
      const duration = performance.now() - startTime;

      if (duration > threshold) {
        console.warn(`[INP] ${label} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`, {
          event: event.type,
          duration,
          threshold
        });
      } else {
        console.debug(`[INP] ${label} took ${duration.toFixed(2)}ms`, {
          event: event.type,
          duration
        });
      }
    };

    try {
      const result = handler(event);
      if (result instanceof Promise) {
        result.finally(handleComplete).catch(err => {
          console.error('[INP] measureInteractionTime error:', err);
          handleComplete();
        });
      } else {
        handleComplete();
      }
    } catch (err) {
      console.error('[INP] measureInteractionTime handler error:', err);
      handleComplete();
    }
  };
}

/**
 * Create a batched event handler that processes multiple events together
 * Reduces main thread load for high-frequency events
 *
 * Usage:
 * ```typescript
 * const batchedHandler = batchedEventHandler(
 *   (events) => updateUI(events),
 *   { batchInterval: 16 }  // ~60fps
 * );
 *
 * for (const element of elements) {
 *   element.addEventListener('scroll', batchedHandler, { passive: true });
 * }
 * ```
 */
export function batchedEventHandler<T extends Event>(
  handler: (events: T[]) => void | Promise<void>,
  options?: {
    batchInterval?: number;  // ms to wait before processing batch
    maxBatchSize?: number;   // max events before force processing
  }
): (event: T) => void {
  const { batchInterval = 16, maxBatchSize = 10 } = options || {};

  let batch: T[] = [];
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const processBatch = async () => {
    if (batch.length === 0) return;

    const eventsBatch = batch;
    batch = [];
    timeoutId = null;

    try {
      await Promise.resolve(handler(eventsBatch));
    } catch (err) {
      console.error('[INP] batchedEventHandler error:', err);
    }
  };

  return (event: T) => {
    batch.push(event);

    // Force process if batch is full
    if (batch.length >= maxBatchSize) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      // Intentional fire-and-forget: batch processing doesn't require awaiting
      void processBatch().catch(err => console.error('[INP] batch force process error:', err));
      return;
    }

    // Schedule processing if not already scheduled
    if (timeoutId === null) {
      timeoutId = setTimeout(() => {
        // Intentional fire-and-forget: scheduled batch processing doesn't require awaiting
        void processBatch().catch(err => console.error('[INP] batch scheduled process error:', err));
      }, batchInterval);
    }
  };
}

/**
 * Detect scheduler.yield() support
 */
function isSchedulerYieldSupported(): boolean {
  return typeof globalThis !== 'undefined' &&
    'scheduler' in globalThis &&
    'yield' in (globalThis as any).scheduler;
}

/**
 * Hook to add INP monitoring to a Svelte component
 * Logs when interactions exceed threshold
 *
 * Usage:
 * ```svelte
 * <script>
 *   import { onMount } from 'svelte';
 *   import { monitorINP } from '$lib/utils/inpOptimization';
 *
 *   onMount(() => {
 *     return monitorINP(document.getElementById('my-button'), { threshold: 100 });
 *   });
 * </script>
 * ```
 */
export function monitorINP(
  element: Element,
  options?: {
    threshold?: number;
    eventTypes?: string[];
  }
): () => void {
  const {
    threshold = 100,
    eventTypes = ['click', 'keydown', 'pointerdown']
  } = options || {};

  const handlers: Record<string, (event: Event) => void> = {};

  eventTypes.forEach(eventType => {
    handlers[eventType] = measureInteractionTime(
      () => {},
      { threshold, label: `${eventType} on ${element.tagName}` }
    );

    element.addEventListener(eventType, handlers[eventType]);
  });

  // Cleanup function
  return () => {
    eventTypes.forEach(eventType => {
      element.removeEventListener(eventType, handlers[eventType]);
    });
  };
}

/**
 * Export all utilities as default object
 */
export default {
  yieldingHandler,
  debouncedYieldingHandler,
  throttledYieldingHandler,
  progressiveRender,
  measureInteractionTime,
  batchedEventHandler,
  monitorINP
};
