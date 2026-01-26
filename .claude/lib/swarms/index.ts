/**
 * Swarms - Parallel Worker Management System
 *
 * A complete framework for distributing work across 50-100 parallel workers
 * with advanced features including work stealing, retry logic, progress tracking,
 * and result aggregation.
 *
 * @module swarms
 */

// Work Distribution
export {
  WorkDistributor,
  WorkQueue,
  WorkerPool,
  ProgressTracker,
  createSubtask,
  type Subtask,
  type SubtaskResult,
  type Worker,
  type WorkDistributorConfig
} from './work-distributor';

// Result Aggregation
export {
  ResultAggregator,
  type AggregationStrategy,
  type AggregationResult,
  type DuplicateStrategy,
  type StreamingOptions,
  Strategies
} from './result-aggregator';

// Task Decomposition
export {
  TaskDecomposer,
  type DecompositionStrategy,
  type DecomposedTask,
  type TaskContext,
  type ValidationResult
} from './decomposer';

/**
 * Quick start example:
 *
 * ```typescript
 * import { WorkDistributor, createSubtask } from '.claude/lib/swarms';
 *
 * // Create subtasks
 * const subtasks = data.map((item, i) =>
 *   createSubtask(`task-${i}`, item)
 * );
 *
 * // Distribute work
 * const distributor = new WorkDistributor({
 *   workerCount: 75,
 *   maxRetries: 3,
 *   enableWorkStealing: true,
 *   workStealingIntervalMs: 1000,
 *   progressUpdateIntervalMs: 500,
 *   processor: async (subtask) => {
 *     return await processData(subtask.payload);
 *   }
 * });
 *
 * const { results, failures, stats } = await distributor.distribute(subtasks);
 * ```
 */
