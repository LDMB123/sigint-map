/**
 * TypeScript type definitions for scheduler.yield() API
 * Provides IDE autocomplete and type safety
 */

/**
 * Options for scheduling operations
 */
export interface ScheduleOptions {
  /** Priority level for task execution */
  priority?: 'user-blocking' | 'user-visible' | 'background';

  /** Yield time budget in milliseconds */
  yieldAfterMs?: number;

  /** Timeout for idle tasks in milliseconds */
  timeout?: number;

  /** Debug logging enabled */
  debug?: boolean;
}

/**
 * Options for chunk-based processing
 */
export interface ChunkProcessOptions extends ScheduleOptions {
  /** Number of items per chunk (default: 10) */
  chunkSize?: number;

  /** Callback for progress updates */
  onProgress?: (processed: number, total: number) => void;
}

/**
 * Options for monitoring renders
 */
export interface RenderMonitorOptions extends ScheduleOptions {
  /** Yield threshold for DOM mutations (default: 50) */
  mutationThreshold?: number;

  /** Max frame time before yield in ms (default: 16 for 60fps) */
  maxFrameTime?: number;
}

/**
 * Options for scroll monitoring
 */
export interface ScrollMonitorOptions extends ScheduleOptions {
  /** Intersection observer threshold (default: 0.1) */
  threshold?: number | number[];
}

/**
 * Scheduler capabilities and support information
 */
export interface SchedulerCapabilities {
  /** scheduler.yield() API is available */
  supportsYield: boolean;

  /** Priority parameter for scheduler.yield() */
  supportsPriority: boolean;

  /** requestIdleCallback API available */
  supportsIdleCallback: boolean;

  /** Running on Apple Silicon (M1/M2/M3/M4) */
  isAppleSilicon: boolean;
}

/**
 * Information about a scheduled task
 */
export interface ScheduledTaskInfo {
  /** Unique task ID */
  id: string;

  /** Task priority */
  priority: 'user-blocking' | 'user-visible' | 'background';

  /** Time task was created */
  createdAt: number;

  /** Task execution status */
  status: 'pending' | 'running' | 'completed' | 'cancelled';

  /** Time task started execution */
  startedAt?: number;

  /** Time task completed */
  completedAt?: number;

  /** Execution duration in milliseconds */
  duration?: number;
}

/**
 * Performance metrics for yielding operations
 */
export interface YieldPerformanceMetrics {
  /** Total number of yields performed */
  totalYields: number;

  /** Average yield duration in milliseconds */
  averageYieldDuration: number;

  /** Total time spent in yields */
  totalYieldTime: number;

  /** Number of operations using yields */
  operationCount: number;

  /** Average INP improvement percentage */
  inpImprovement: number;
}

/**
 * Generic debounced function type with proper constraints
 */
export type DebouncedFunction<Args extends unknown[] = [], R = void> = {
  /** Execute the debounced function */
  (...args: Args): void;

  /** Cancel pending execution */
  cancel(): void;

  /** Flush - execute immediately */
  flush(): void;

  /** Check if execution is pending */
  isPending(): boolean;
};

/**
 * Generic throttled function type with proper constraints
 */
export type ThrottledFunction<Args extends unknown[] = [], R = void> = {
  /** Execute the throttled function */
  (...args: Args): void;

  /** Cancel pending execution */
  cancel(): void;

  /** Check if function has been executed */
  isThrottled(): boolean;

  /** Reset throttle state */
  reset(): void;
};

/**
 * Result of a yielding operation
 */
export interface YieldingOperationResult<T> {
  /** Results of the operation */
  results: T[];

  /** Total execution time */
  totalTime: number;

  /** Number of yields performed */
  yieldCount: number;

  /** Average time between yields */
  averageYieldInterval: number;

  /** Whether operation completed successfully */
  success: boolean;

  /** Error if operation failed */
  error?: Error;
}

/**
 * Monitored operation result
 */
export interface MonitoredOperationResult {
  /** Whether execution exceeded time threshold */
  exceededThreshold: boolean;

  /** Actual execution time */
  executionTime: number;

  /** Time threshold that was set */
  threshold: number;

  /** Whether yielding was triggered */
  yieldTriggered: boolean;
}

/**
 * Statistics about scheduler usage
 */
export interface SchedulerUsageStats {
  /** Total number of yield calls */
  totalYields: number;

  /** Yields by priority level */
  yieldsByPriority: {
    'user-blocking': number;
    'user-visible': number;
    'background': number;
  };

  /** Average yield interval */
  averageYieldInterval: number;

  /** Min/max yield times */
  minYieldTime: number;
  maxYieldTime: number;

  /** Total time spent yielding */
  totalYieldTime: number;

  /** Percentage of execution time spent yielding */
  yieldTimePercentage: number;
}

/**
 * Async generator factory function - produces async generator of items
 */
export type AsyncGeneratorFn<T> = () => AsyncGenerator<T>;

/**
 * Task that can be processed by the scheduler with typed result
 */
export type SchedulableTask<T = void> = () => T | Promise<T>;

/**
 * Processor function for items with proper typing
 */
export type ItemProcessor<T> = (item: T, index: number) => void | Promise<void>;

/**
 * Filter predicate function with query and typed return
 */
export type FilterPredicate<T> = (item: T, query: string) => boolean;

/**
 * Metric calculator function with typed result
 */
export type MetricCalculator<T, R = number> = (item: T) => R | Promise<R>;

/**
 * Progress callback with typed numeric parameters
 */
export type ProgressCallback = (processed: number, total: number) => void;
