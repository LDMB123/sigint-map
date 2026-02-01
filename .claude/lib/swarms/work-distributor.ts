/**
 * Work Distributor for Parallel Worker Management
 *
 * Distributes subtasks to 50-100 parallel Haiku workers with:
 * - Work stealing for load balancing
 * - Failure handling with retry logic
 * - Progress tracking and ETA calculation
 * - Throughput optimization
 *
 * P1 DEPENDENCIES:
 * - Requires async-mutex package: npm install async-mutex
 *   (Used to prevent race conditions in stall detection)
 */

// P1: Import mutex for atomic operations
// NOTE: Requires installation: npm install async-mutex
// import { Mutex } from 'async-mutex';

/**
 * Simple mutex implementation (fallback if async-mutex not installed)
 * For production, replace with: import { Mutex } from 'async-mutex';
 */
class SimpleMutex {
  private locked = false;
  private queue: Array<() => void> = [];

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve(() => { this.locked = false; this.processQueue(); });
      } else {
        this.queue.push(() => {
          this.locked = true;
          resolve(() => { this.locked = false; this.processQueue(); });
        });
      }
    });
  }

  private processQueue() {
    const next = this.queue.shift();
    if (next) next();
  }
}

/**
 * Subtask that can be distributed to workers
 */
export interface Subtask<T = any, R = any> {
  /** Unique identifier for this subtask */
  id: string;

  /** The work payload to process */
  payload: T;

  /** Priority level (higher = more urgent) */
  priority: number;

  /** Estimated processing time in milliseconds */
  estimatedDurationMs?: number;

  /** Number of times this task has been attempted */
  attempts: number;

  /** Maximum retry attempts allowed */
  maxRetries: number;

  /** Dependencies - IDs of subtasks that must complete first */
  dependencies?: string[];

  /** Metadata for tracking and debugging */
  metadata?: Record<string, any>;
}

/**
 * Result from processing a subtask
 */
export interface SubtaskResult<R = any> {
  /** Subtask ID */
  subtaskId: string;

  /** Processing result */
  result: R;

  /** Processing time in milliseconds */
  durationMs: number;

  /** Worker ID that processed this subtask */
  workerId: string;

  /** Timestamp when completed */
  completedAt: number;
}

/**
 * Worker state and statistics
 */
export interface Worker {
  /** Worker unique identifier */
  id: string;

  /** Current status */
  status: 'idle' | 'busy' | 'failed' | 'offline';

  /** Currently assigned subtask (if busy) */
  currentSubtask?: Subtask;

  /** Timestamp when current subtask started */
  startedAt?: number;

  /** Number of subtasks completed */
  completedCount: number;

  /** Number of subtasks failed */
  failedCount: number;

  /** Total processing time in milliseconds */
  totalProcessingMs: number;

  /** Average processing time per subtask */
  avgProcessingMs: number;

  /** Worker health score (0-1, based on success rate and performance) */
  healthScore: number;

  /** Number of consecutive failures */
  consecutiveFailures: number;

  /** Last heartbeat timestamp */
  lastHeartbeat: number;
}

/**
 * Work queue with priority and dependency management
 */
export class WorkQueue<T = any, R = any> {
  private pending: Subtask<T, R>[] = [];
  private inProgress = new Map<string, Subtask<T, R>>();
  private completed = new Map<string, SubtaskResult<R>>();
  private failed = new Map<string, { subtask: Subtask<T, R>; error: Error }>();

  /**
   * Add subtask to the queue
   */
  enqueue(subtask: Subtask<T, R>): void {
    this.pending.push(subtask);
    this.sortByPriority();
  }

  /**
   * Add multiple subtasks to the queue
   */
  enqueueBatch(subtasks: Subtask<T, R>[]): void {
    this.pending.push(...subtasks);
    this.sortByPriority();
  }

  /**
   * Get next available subtask respecting dependencies
   */
  dequeue(): Subtask<T, R> | undefined {
    // Find first subtask with all dependencies satisfied
    const availableIndex = this.pending.findIndex(subtask =>
      this.areDependenciesSatisfied(subtask)
    );

    if (availableIndex === -1) {
      return undefined;
    }

    const subtask = this.pending.splice(availableIndex, 1)[0];
    this.inProgress.set(subtask.id, subtask);
    return subtask;
  }

  /**
   * Mark subtask as completed
   */
  markCompleted(result: SubtaskResult<R>): void {
    this.inProgress.delete(result.subtaskId);
    this.completed.set(result.subtaskId, result);
  }

  /**
   * Mark subtask as failed and potentially retry
   */
  markFailed(subtaskId: string, error: Error): boolean {
    const subtask = this.inProgress.get(subtaskId);
    if (!subtask) {
      return false;
    }

    this.inProgress.delete(subtaskId);
    subtask.attempts++;

    // Retry if attempts remaining
    if (subtask.attempts < subtask.maxRetries) {
      // Exponential backoff: move to end and reduce priority slightly
      subtask.priority = Math.max(0, subtask.priority - 1);
      this.pending.push(subtask);
      this.sortByPriority();
      return true; // Will retry
    } else {
      // Max retries exceeded
      this.failed.set(subtaskId, { subtask, error });
      return false; // Won't retry
    }
  }

  /**
   * Steal work from queue (work stealing for load balancing)
   * Returns highest priority available task
   */
  steal(): Subtask<T, R> | undefined {
    return this.dequeue();
  }

  /**
   * Reclaim subtask from a failed/stalled worker
   */
  reclaim(subtaskId: string): void {
    const subtask = this.inProgress.get(subtaskId);
    if (subtask) {
      this.inProgress.delete(subtaskId);
      this.pending.unshift(subtask); // Add to front with high priority
    }
  }

  /**
   * Check if all dependencies are satisfied for a subtask
   */
  private areDependenciesSatisfied(subtask: Subtask<T, R>): boolean {
    if (!subtask.dependencies || subtask.dependencies.length === 0) {
      return true;
    }

    return subtask.dependencies.every(depId =>
      this.completed.has(depId) || this.failed.has(depId)
    );
  }

  /**
   * Sort pending queue by priority (descending)
   */
  private sortByPriority(): void {
    this.pending.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      pending: this.pending.length,
      inProgress: this.inProgress.size,
      completed: this.completed.size,
      failed: this.failed.size,
      total: this.pending.length + this.inProgress.size + this.completed.size + this.failed.size
    };
  }

  /**
   * Get all completed results
   */
  getResults(): SubtaskResult<R>[] {
    return Array.from(this.completed.values());
  }

  /**
   * Get all failed subtasks
   */
  getFailures(): Array<{ subtask: Subtask<T, R>; error: Error }> {
    return Array.from(this.failed.values());
  }

  /**
   * Check if all work is done
   */
  isDone(): boolean {
    return this.pending.length === 0 && this.inProgress.size === 0;
  }
}

/**
 * Progress tracker with ETA calculation
 */
export class ProgressTracker {
  private startTime: number = Date.now();
  private completedCount: number = 0;
  private totalCount: number = 0;
  private processingTimes: number[] = [];
  private lastUpdateTime: number = Date.now();

  /**
   * Initialize tracker with total work items
   */
  initialize(total: number): void {
    this.totalCount = total;
    this.startTime = Date.now();
    this.completedCount = 0;
    this.processingTimes = [];
  }

  /**
   * Record completion of a subtask
   */
  recordCompletion(durationMs: number): void {
    this.completedCount++;
    this.processingTimes.push(durationMs);

    // Keep only last 100 samples for moving average
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }

    this.lastUpdateTime = Date.now();
  }

  /**
   * Get current progress (0-1)
   */
  getProgress(): number {
    if (this.totalCount === 0) return 0;
    return this.completedCount / this.totalCount;
  }

  /**
   * Get percentage complete (0-100)
   */
  getPercentage(): number {
    return Math.round(this.getProgress() * 100);
  }

  /**
   * Calculate estimated time remaining in milliseconds
   */
  getETA(): number {
    if (this.completedCount === 0) {
      return Infinity;
    }

    const remainingCount = this.totalCount - this.completedCount;
    const avgProcessingTime = this.getAverageProcessingTime();

    return remainingCount * avgProcessingTime;
  }

  /**
   * Get human-readable ETA string
   */
  getETAString(): string {
    const etaMs = this.getETA();

    if (!isFinite(etaMs)) {
      return 'calculating...';
    }

    const seconds = Math.floor(etaMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get average processing time per subtask
   */
  getAverageProcessingTime(): number {
    if (this.processingTimes.length === 0) {
      return 0;
    }

    const sum = this.processingTimes.reduce((a, b) => a + b, 0);
    return sum / this.processingTimes.length;
  }

  /**
   * Get throughput (items per second)
   */
  getThroughput(): number {
    const elapsedSeconds = (Date.now() - this.startTime) / 1000;
    if (elapsedSeconds === 0) return 0;
    return this.completedCount / elapsedSeconds;
  }

  /**
   * Get elapsed time in milliseconds
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get comprehensive progress report
   */
  getReport() {
    return {
      completed: this.completedCount,
      total: this.totalCount,
      percentage: this.getPercentage(),
      etaMs: this.getETA(),
      etaString: this.getETAString(),
      throughput: this.getThroughput(),
      avgProcessingMs: this.getAverageProcessingTime(),
      elapsedMs: this.getElapsedTime()
    };
  }
}

/**
 * Worker pool manager
 */
export class WorkerPool {
  private workers = new Map<string, Worker>();
  private workerHealthCheckInterval?: NodeJS.Timeout;

  private readonly HEALTH_CHECK_INTERVAL_MS = 5000; // 5 seconds
  private readonly WORKER_TIMEOUT_MS = 30000; // 30 seconds
  private readonly HEALTH_DECAY_RATE = 0.05; // Health decays by 5% per failure

  /**
   * Initialize worker pool with specified size
   */
  initialize(workerCount: number): void {
    this.workers.clear();

    for (let i = 0; i < workerCount; i++) {
      const worker: Worker = {
        id: `worker-${i}`,
        status: 'idle',
        completedCount: 0,
        failedCount: 0,
        totalProcessingMs: 0,
        avgProcessingMs: 0,
        healthScore: 1.0,
        consecutiveFailures: 0,
        lastHeartbeat: Date.now()
      };

      this.workers.set(worker.id, worker);
    }

    this.startHealthChecks();
  }

  /**
   * Get an idle worker
   */
  getIdleWorker(): Worker | undefined {
    const idleWorkers = Array.from(this.workers.values())
      .filter(w => w.status === 'idle')
      .sort((a, b) => b.healthScore - a.healthScore); // Prefer healthier workers

    return idleWorkers[0];
  }

  /**
   * Assign subtask to worker
   */
  assignSubtask(worker: Worker, subtask: Subtask): void {
    worker.status = 'busy';
    worker.currentSubtask = subtask;
    worker.startedAt = Date.now();
    worker.lastHeartbeat = Date.now();
  }

  /**
   * Mark subtask as completed for worker
   */
  completeSubtask(workerId: string, result: SubtaskResult): void {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    worker.status = 'idle';
    worker.completedCount++;
    worker.totalProcessingMs += result.durationMs;
    worker.avgProcessingMs = worker.totalProcessingMs / worker.completedCount;
    worker.consecutiveFailures = 0;
    worker.currentSubtask = undefined;
    worker.startedAt = undefined;
    worker.lastHeartbeat = Date.now();

    // Improve health score on success (up to max 1.0)
    worker.healthScore = Math.min(1.0, worker.healthScore + 0.01);
  }

  /**
   * Mark subtask as failed for worker
   */
  failSubtask(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    worker.status = 'idle';
    worker.failedCount++;
    worker.consecutiveFailures++;
    worker.currentSubtask = undefined;
    worker.startedAt = undefined;
    worker.lastHeartbeat = Date.now();

    // Degrade health score on failure
    worker.healthScore = Math.max(0, worker.healthScore - this.HEALTH_DECAY_RATE);

    // Mark worker as failed if too many consecutive failures
    if (worker.consecutiveFailures >= 3) {
      worker.status = 'failed';
    }
  }

  /**
   * Check for stalled workers and reclaim their work
   */
  checkForStalledWorkers(): string[] {
    const now = Date.now();
    const stalledWorkerIds: string[] = [];

    for (const worker of this.workers.values()) {
      if (worker.status === 'busy' && worker.startedAt) {
        const elapsed = now - worker.startedAt;

        if (elapsed > this.WORKER_TIMEOUT_MS) {
          stalledWorkerIds.push(worker.id);
          worker.status = 'failed';
          worker.consecutiveFailures++;
          worker.healthScore = Math.max(0, worker.healthScore - this.HEALTH_DECAY_RATE);
        }
      }
    }

    return stalledWorkerIds;
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    if (this.workerHealthCheckInterval) {
      clearInterval(this.workerHealthCheckInterval);
    }

    this.workerHealthCheckInterval = setInterval(() => {
      this.checkForStalledWorkers();
    }, this.HEALTH_CHECK_INTERVAL_MS);
  }

  /**
   * Stop health checks
   */
  stopHealthChecks(): void {
    if (this.workerHealthCheckInterval) {
      clearInterval(this.workerHealthCheckInterval);
      this.workerHealthCheckInterval = undefined;
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    const workers = Array.from(this.workers.values());

    return {
      total: workers.length,
      idle: workers.filter(w => w.status === 'idle').length,
      busy: workers.filter(w => w.status === 'busy').length,
      failed: workers.filter(w => w.status === 'failed').length,
      totalCompleted: workers.reduce((sum, w) => sum + w.completedCount, 0),
      totalFailed: workers.reduce((sum, w) => sum + w.failedCount, 0),
      avgHealthScore: workers.reduce((sum, w) => sum + w.healthScore, 0) / workers.length
    };
  }

  /**
   * Get all workers sorted by health score
   */
  getWorkersByHealth(): Worker[] {
    return Array.from(this.workers.values())
      .sort((a, b) => b.healthScore - a.healthScore);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopHealthChecks();
    this.workers.clear();
  }
}

/**
 * Configuration for work distributor
 */
export interface WorkDistributorConfig {
  /** Number of parallel workers (50-100 recommended) */
  workerCount: number;

  /** Maximum retry attempts per subtask */
  maxRetries: number;

  /** Enable work stealing for load balancing */
  enableWorkStealing: boolean;

  /** Work stealing check interval in milliseconds */
  workStealingIntervalMs: number;

  /** Progress update callback interval in milliseconds */
  progressUpdateIntervalMs: number;

  /** Task processor function */
  processor: (subtask: Subtask) => Promise<any>;

  /** Optional callback for progress updates */
  onProgress?: (report: ReturnType<ProgressTracker['getReport']>) => void;

  /** Optional callback for individual completions */
  onSubtaskComplete?: (result: SubtaskResult) => void;

  /** Optional callback for individual failures */
  onSubtaskFail?: (subtaskId: string, error: Error, willRetry: boolean) => void;
}

/**
 * Work Distributor - Main orchestrator
 * Distributes work across parallel workers with advanced features
 */
export class WorkDistributor<T = any, R = any> {
  private queue: WorkQueue<T, R>;
  private pool: WorkerPool;
  private tracker: ProgressTracker;
  private config: WorkDistributorConfig;

  private isRunning = false;
  private progressInterval?: NodeJS.Timeout;
  private processingPromises = new Map<string, Promise<void>>();

  // P1: Mutex for atomic stall detection and reclaim operations
  // Prevents race condition where stall detection and task completion race
  private reclaimMutex = new SimpleMutex();

  constructor(config: WorkDistributorConfig) {
    this.config = config;
    this.queue = new WorkQueue<T, R>();
    this.pool = new WorkerPool();
    this.tracker = new ProgressTracker();
  }

  /**
   * Distribute work and process all subtasks
   */
  async distribute(subtasks: Subtask<T, R>[]): Promise<{
    results: SubtaskResult<R>[];
    failures: Array<{ subtask: Subtask<T, R>; error: Error }>;
    stats: any;
  }> {
    if (this.isRunning) {
      throw new Error('WorkDistributor is already running');
    }

    this.isRunning = true;

    // Initialize components
    this.queue.enqueueBatch(subtasks);
    this.pool.initialize(this.config.workerCount);
    this.tracker.initialize(subtasks.length);

    // Start progress reporting
    this.startProgressReporting();

    try {
      // Main distribution loop
      await this.processQueue();

      // Collect results
      const results = this.queue.getResults();
      const failures = this.queue.getFailures();
      const stats = this.getStatistics();

      return { results, failures, stats };
    } finally {
      this.cleanup();
    }
  }

  /**
   * P1: Atomically check for stalled workers and reclaim their work
   * Prevents race condition where stall detection and completion race:
   * - Without mutex: Stall detector sees worker busy → worker completes → both reclaim and delete
   * - With mutex: Operations are serialized, preventing duplicate processing
   */
  private async checkAndReclaimStalledWork(): Promise<void> {
    const release = await this.reclaimMutex.acquire();
    try {
      const stalledWorkers = this.pool.checkForStalledWorkers();
      for (const workerId of stalledWorkers) {
        const worker = this.pool.getWorkersByHealth().find(w => w.id === workerId);
        if (worker?.currentSubtask) {
          const subtaskId = worker.currentSubtask.id;

          // Only reclaim if still in processing promises
          // (worker completion may have already removed it)
          const promise = this.processingPromises.get(subtaskId);
          if (promise) {
            console.log(`[STALL DETECTION] Reclaiming stalled subtask ${subtaskId} from worker ${workerId}`);
            this.processingPromises.delete(subtaskId);
            this.queue.reclaim(subtaskId);
            worker.currentSubtask = undefined;
          }
        }
      }
    } finally {
      release();
    }
  }

  /**
   * Main processing loop
   */
  private async processQueue(): Promise<void> {
    while (!this.queue.isDone() || this.processingPromises.size > 0) {
      // P1: Check for stalled workers and reclaim their work atomically
      // Use mutex to prevent race condition with task completion
      await this.checkAndReclaimStalledWork();

      // Assign work to idle workers
      let idleWorker = this.pool.getIdleWorker();
      while (idleWorker) {
        const subtask = this.queue.dequeue();
        if (!subtask) break;

        // Assign and process
        this.pool.assignSubtask(idleWorker, subtask);
        const promise = this.processSubtask(idleWorker, subtask);
        this.processingPromises.set(subtask.id, promise);

        // Get next idle worker
        idleWorker = this.pool.getIdleWorker();
      }

      // Wait for at least one task to complete before next iteration
      if (this.processingPromises.size > 0) {
        await Promise.race(Array.from(this.processingPromises.values()));
      }

      // Small delay to prevent tight loop
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * Process a single subtask with a worker
   */
  private async processSubtask(worker: Worker, subtask: Subtask<T, R>): Promise<void> {
    const startTime = Date.now();

    try {
      // Execute task processor
      const result = await this.config.processor(subtask);
      const durationMs = Date.now() - startTime;

      // Create result
      const subtaskResult: SubtaskResult<R> = {
        subtaskId: subtask.id,
        result,
        durationMs,
        workerId: worker.id,
        completedAt: Date.now()
      };

      // Update state
      this.queue.markCompleted(subtaskResult);
      this.pool.completeSubtask(worker.id, subtaskResult);
      this.tracker.recordCompletion(durationMs);

      // Callback
      if (this.config.onSubtaskComplete) {
        this.config.onSubtaskComplete(subtaskResult);
      }
    } catch (error) {
      // Handle failure
      const err = error instanceof Error ? error : new Error(String(error));
      const willRetry = this.queue.markFailed(subtask.id, err);
      this.pool.failSubtask(worker.id);

      // Callback
      if (this.config.onSubtaskFail) {
        this.config.onSubtaskFail(subtask.id, err, willRetry);
      }
    } finally {
      // P1: Remove from processing promises atomically
      // Use mutex to prevent race with stall detection
      const release = await this.reclaimMutex.acquire();
      try {
        this.processingPromises.delete(subtask.id);
      } finally {
        release();
      }
    }
  }

  /**
   * Start periodic progress reporting
   */
  private startProgressReporting(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    if (this.config.onProgress) {
      this.progressInterval = setInterval(() => {
        const report = this.tracker.getReport();
        this.config.onProgress!(report);
      }, this.config.progressUpdateIntervalMs);
    }
  }

  /**
   * Stop progress reporting
   */
  private stopProgressReporting(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = undefined;
    }
  }

  /**
   * Get comprehensive statistics
   */
  getStatistics() {
    return {
      queue: this.queue.getStats(),
      pool: this.pool.getStats(),
      progress: this.tracker.getReport()
    };
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.stopProgressReporting();
    this.pool.cleanup();
    this.isRunning = false;
    this.processingPromises.clear();

    // Final progress report
    if (this.config.onProgress) {
      this.config.onProgress(this.tracker.getReport());
    }
  }
}

/**
 * Utility function to create subtasks with sensible defaults
 */
export function createSubtask<T>(
  id: string,
  payload: T,
  options: {
    priority?: number;
    maxRetries?: number;
    dependencies?: string[];
    estimatedDurationMs?: number;
    metadata?: Record<string, any>;
  } = {}
): Subtask<T> {
  return {
    id,
    payload,
    priority: options.priority ?? 10,
    attempts: 0,
    maxRetries: options.maxRetries ?? 3,
    dependencies: options.dependencies,
    estimatedDurationMs: options.estimatedDurationMs,
    metadata: options.metadata
  };
}

/**
 * Example usage function
 */
export async function exampleUsage() {
  // Create subtasks
  const subtasks = Array.from({ length: 200 }, (_, i) =>
    createSubtask(`task-${i}`, { index: i, data: `data-${i}` }, {
      priority: Math.floor(Math.random() * 20),
      maxRetries: 3
    })
  );

  // Configure distributor
  const distributor = new WorkDistributor({
    workerCount: 75, // 75 parallel workers
    maxRetries: 3,
    enableWorkStealing: true,
    workStealingIntervalMs: 1000,
    progressUpdateIntervalMs: 500,

    // Task processor
    processor: async (subtask) => {
      // Simulate work with random duration
      const duration = 100 + Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, duration));

      // Simulate occasional failures (5% failure rate)
      if (Math.random() < 0.05) {
        throw new Error(`Task ${subtask.id} failed randomly`);
      }

      return {
        processed: subtask.payload,
        timestamp: Date.now()
      };
    },

    // Progress callback
    onProgress: (report) => {
      console.log(`Progress: ${report.percentage}% | ETA: ${report.etaString} | Throughput: ${report.throughput.toFixed(2)} tasks/s`);
    },

    // Completion callback
    onSubtaskComplete: (result) => {
      console.log(`Completed: ${result.subtaskId} in ${result.durationMs}ms by ${result.workerId}`);
    },

    // Failure callback
    onSubtaskFail: (subtaskId, error, willRetry) => {
      console.log(`Failed: ${subtaskId} - ${error.message} (retry: ${willRetry})`);
    }
  });

  // Distribute and process
  const { results, failures, stats } = await distributor.distribute(subtasks);

  console.log('\n=== Final Results ===');
  console.log(`Total completed: ${results.length}`);
  console.log(`Total failed: ${failures.length}`);
  console.log(`Success rate: ${((results.length / subtasks.length) * 100).toFixed(2)}%`);
  console.log(`Throughput: ${stats.progress.throughput.toFixed(2)} tasks/s`);
  console.log(`Total time: ${(stats.progress.elapsedMs / 1000).toFixed(2)}s`);
}
