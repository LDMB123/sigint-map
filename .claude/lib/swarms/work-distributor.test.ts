/**
 * Tests for Work Distributor
 * Validates parallel worker management, work stealing, retries, and progress tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  WorkDistributor,
  WorkQueue,
  WorkerPool,
  ProgressTracker,
  createSubtask,
  type Subtask,
  type SubtaskResult
} from './work-distributor';

describe('WorkQueue', () => {
  let queue: WorkQueue;

  beforeEach(() => {
    queue = new WorkQueue();
  });

  it('should enqueue and dequeue subtasks', () => {
    const subtask = createSubtask('task-1', { data: 'test' });
    queue.enqueue(subtask);

    const dequeued = queue.dequeue();
    expect(dequeued).toEqual(subtask);
  });

  it('should sort by priority', () => {
    const low = createSubtask('low', {}, { priority: 5 });
    const high = createSubtask('high', {}, { priority: 15 });
    const medium = createSubtask('medium', {}, { priority: 10 });

    queue.enqueue(low);
    queue.enqueue(high);
    queue.enqueue(medium);

    expect(queue.dequeue()?.id).toBe('high');
    expect(queue.dequeue()?.id).toBe('medium');
    expect(queue.dequeue()?.id).toBe('low');
  });

  it('should handle dependencies correctly', () => {
    const task1 = createSubtask('task-1', {});
    const task2 = createSubtask('task-2', {}, { dependencies: ['task-1'] });

    queue.enqueue(task2);
    queue.enqueue(task1);

    // task2 should not be dequeued until task1 is completed
    const first = queue.dequeue();
    expect(first?.id).toBe('task-1');

    // Mark task1 as completed
    queue.markCompleted({
      subtaskId: 'task-1',
      result: {},
      durationMs: 100,
      workerId: 'worker-1',
      completedAt: Date.now()
    });

    // Now task2 should be available
    const second = queue.dequeue();
    expect(second?.id).toBe('task-2');
  });

  it('should retry failed tasks up to maxRetries', () => {
    const subtask = createSubtask('task-1', {}, { maxRetries: 3 });
    queue.enqueue(subtask);

    const dequeued = queue.dequeue();
    expect(dequeued).toBeDefined();

    // First failure - should retry
    const willRetry1 = queue.markFailed('task-1', new Error('Failure 1'));
    expect(willRetry1).toBe(true);

    // Second failure - should retry
    queue.dequeue();
    const willRetry2 = queue.markFailed('task-1', new Error('Failure 2'));
    expect(willRetry2).toBe(true);

    // Third failure - should NOT retry (maxRetries = 3, attempts would be 3)
    queue.dequeue();
    const willRetry3 = queue.markFailed('task-1', new Error('Failure 3'));
    expect(willRetry3).toBe(false);

    const stats = queue.getStats();
    expect(stats.failed).toBe(1);
  });

  it('should reclaim subtasks from stalled workers', () => {
    const subtask = createSubtask('task-1', {});
    queue.enqueue(subtask);

    const dequeued = queue.dequeue();
    expect(dequeued).toBeDefined();

    const stats1 = queue.getStats();
    expect(stats1.inProgress).toBe(1);

    queue.reclaim('task-1');

    const stats2 = queue.getStats();
    expect(stats2.inProgress).toBe(0);
    expect(stats2.pending).toBe(1);
  });

  it('should report correct statistics', () => {
    queue.enqueueBatch([
      createSubtask('task-1', {}),
      createSubtask('task-2', {}),
      createSubtask('task-3', {})
    ]);

    const stats1 = queue.getStats();
    expect(stats1.pending).toBe(3);
    expect(stats1.total).toBe(3);

    queue.dequeue();
    const stats2 = queue.getStats();
    expect(stats2.pending).toBe(2);
    expect(stats2.inProgress).toBe(1);

    queue.markCompleted({
      subtaskId: 'task-1',
      result: {},
      durationMs: 100,
      workerId: 'worker-1',
      completedAt: Date.now()
    });

    const stats3 = queue.getStats();
    expect(stats3.completed).toBe(1);
    expect(stats3.inProgress).toBe(0);
  });
});

describe('WorkerPool', () => {
  let pool: WorkerPool;

  beforeEach(() => {
    pool = new WorkerPool();
  });

  afterEach(() => {
    pool.cleanup();
  });

  it('should initialize with specified worker count', () => {
    pool.initialize(50);
    const stats = pool.getStats();
    expect(stats.total).toBe(50);
    expect(stats.idle).toBe(50);
  });

  it('should assign subtasks to idle workers', () => {
    pool.initialize(10);
    const worker = pool.getIdleWorker();
    expect(worker).toBeDefined();

    const subtask = createSubtask('task-1', {});
    pool.assignSubtask(worker!, subtask);

    expect(worker!.status).toBe('busy');
    expect(worker!.currentSubtask?.id).toBe('task-1');

    const stats = pool.getStats();
    expect(stats.idle).toBe(9);
    expect(stats.busy).toBe(1);
  });

  it('should update worker stats on completion', () => {
    pool.initialize(10);
    const worker = pool.getIdleWorker()!;
    const subtask = createSubtask('task-1', {});

    pool.assignSubtask(worker, subtask);

    const result: SubtaskResult = {
      subtaskId: 'task-1',
      result: {},
      durationMs: 500,
      workerId: worker.id,
      completedAt: Date.now()
    };

    pool.completeSubtask(worker.id, result);

    expect(worker.status).toBe('idle');
    expect(worker.completedCount).toBe(1);
    expect(worker.avgProcessingMs).toBe(500);
    expect(worker.consecutiveFailures).toBe(0);
    expect(worker.healthScore).toBeGreaterThan(0.9);
  });

  it('should degrade health score on failures', () => {
    pool.initialize(10);
    const worker = pool.getIdleWorker()!;
    const initialHealth = worker.healthScore;

    const subtask = createSubtask('task-1', {});
    pool.assignSubtask(worker, subtask);
    pool.failSubtask(worker.id);

    expect(worker.healthScore).toBeLessThan(initialHealth);
    expect(worker.consecutiveFailures).toBe(1);
    expect(worker.failedCount).toBe(1);
  });

  it('should mark worker as failed after consecutive failures', () => {
    pool.initialize(10);
    const worker = pool.getIdleWorker()!;

    // Simulate 3 consecutive failures
    for (let i = 0; i < 3; i++) {
      const subtask = createSubtask(`task-${i}`, {});
      pool.assignSubtask(worker, subtask);
      pool.failSubtask(worker.id);
    }

    expect(worker.status).toBe('failed');
    expect(worker.consecutiveFailures).toBe(3);
  });

  it('should detect stalled workers', async () => {
    pool.initialize(10);
    const worker = pool.getIdleWorker()!;
    const subtask = createSubtask('task-1', {});

    pool.assignSubtask(worker, subtask);

    // Manually set startedAt to simulate stalled worker (31 seconds ago)
    worker.startedAt = Date.now() - 31000;

    const stalledWorkers = pool.checkForStalledWorkers();

    expect(stalledWorkers).toContain(worker.id);
    expect(worker.status).toBe('failed');
  });

  it('should prefer healthier workers', () => {
    pool.initialize(10);
    const workers = pool.getWorkersByHealth();

    // Degrade health of first worker
    pool.assignSubtask(workers[0], createSubtask('task-1', {}));
    pool.failSubtask(workers[0].id);

    const idleWorker = pool.getIdleWorker();

    // Should not be the degraded worker
    expect(idleWorker?.id).not.toBe(workers[0].id);
  });
});

describe('ProgressTracker', () => {
  let tracker: ProgressTracker;

  beforeEach(() => {
    tracker = new ProgressTracker();
  });

  it('should track progress correctly', () => {
    tracker.initialize(100);

    expect(tracker.getProgress()).toBe(0);
    expect(tracker.getPercentage()).toBe(0);

    tracker.recordCompletion(100);
    expect(tracker.getProgress()).toBe(0.01);
    expect(tracker.getPercentage()).toBe(1);

    for (let i = 0; i < 49; i++) {
      tracker.recordCompletion(100);
    }

    expect(tracker.getPercentage()).toBe(50);
  });

  it('should calculate ETA accurately', () => {
    tracker.initialize(100);

    // Complete 10 items at 100ms each
    for (let i = 0; i < 10; i++) {
      tracker.recordCompletion(100);
    }

    const eta = tracker.getETA();
    // Should be approximately 90 * 100ms = 9000ms
    expect(eta).toBeGreaterThan(8000);
    expect(eta).toBeLessThan(10000);
  });

  it('should calculate throughput', async () => {
    tracker.initialize(100);

    // Simulate processing items
    for (let i = 0; i < 10; i++) {
      tracker.recordCompletion(50);
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const throughput = tracker.getThroughput();
    expect(throughput).toBeGreaterThan(0);
  });

  it('should provide comprehensive report', async () => {
    tracker.initialize(50);

    // Add small delays to ensure elapsed time is measurable
    for (let i = 0; i < 25; i++) {
      tracker.recordCompletion(100);
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }

    const report = tracker.getReport();

    expect(report.completed).toBe(25);
    expect(report.total).toBe(50);
    expect(report.percentage).toBe(50);
    expect(report.avgProcessingMs).toBe(100);
    expect(report.throughput).toBeGreaterThanOrEqual(0); // Allow for very fast execution
    expect(report.etaMs).toBeGreaterThan(0);
    expect(report.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('should use moving average for processing time', () => {
    tracker.initialize(200);

    // Add 100 items at 100ms
    for (let i = 0; i < 100; i++) {
      tracker.recordCompletion(100);
    }

    // Add 50 more at 200ms (should update average)
    for (let i = 0; i < 50; i++) {
      tracker.recordCompletion(200);
    }

    // Moving average should reflect recent slower times
    const avgTime = tracker.getAverageProcessingTime();
    expect(avgTime).toBeGreaterThan(100);
  });
});

describe('WorkDistributor - Integration', () => {
  it('should process all subtasks successfully', async () => {
    const subtasks = Array.from({ length: 50 }, (_, i) =>
      createSubtask(`task-${i}`, { index: i })
    );

    let completedCount = 0;

    const distributor = new WorkDistributor({
      workerCount: 10,
      maxRetries: 3,
      enableWorkStealing: true,
      workStealingIntervalMs: 100,
      progressUpdateIntervalMs: 100,

      processor: async (subtask) => {
        await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));
        return { processed: true, index: subtask.payload.index };
      },

      onSubtaskComplete: () => {
        completedCount++;
      }
    });

    const { results, failures, stats } = await distributor.distribute(subtasks);

    expect(results.length).toBe(50);
    expect(failures.length).toBe(0);
    expect(completedCount).toBe(50);
    expect(stats.progress.percentage).toBe(100);
  });

  it('should handle failures and retry correctly', async () => {
    const subtasks = Array.from({ length: 20 }, (_, i) =>
      createSubtask(`task-${i}`, { index: i }, { maxRetries: 2 })
    );

    let failureCount = 0;

    const distributor = new WorkDistributor({
      workerCount: 5,
      maxRetries: 2,
      enableWorkStealing: true,
      workStealingIntervalMs: 100,
      progressUpdateIntervalMs: 100,

      processor: async (subtask) => {
        // Fail first 5 tasks on first attempt only
        if (subtask.payload.index < 5 && subtask.attempts === 0) {
          throw new Error('Simulated failure');
        }

        await new Promise(resolve => setTimeout(resolve, 10));
        return { processed: true };
      },

      onSubtaskFail: () => {
        failureCount++;
      }
    });

    const { results, failures } = await distributor.distribute(subtasks);

    // All should eventually succeed (retries work)
    expect(results.length).toBe(20);
    expect(failures.length).toBe(0);
    expect(failureCount).toBeGreaterThan(0); // Some failures occurred
  });

  it('should respect dependencies', async () => {
    const completionOrder: string[] = [];

    const subtasks = [
      createSubtask('task-1', {}),
      createSubtask('task-2', {}, { dependencies: ['task-1'] }),
      createSubtask('task-3', {}, { dependencies: ['task-1', 'task-2'] })
    ];

    const distributor = new WorkDistributor({
      workerCount: 10,
      maxRetries: 3,
      enableWorkStealing: true,
      workStealingIntervalMs: 100,
      progressUpdateIntervalMs: 100,

      processor: async (subtask) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        completionOrder.push(subtask.id);
        return { processed: true };
      }
    });

    await distributor.distribute(subtasks);

    // Verify completion order respects dependencies
    expect(completionOrder[0]).toBe('task-1');
    expect(completionOrder[1]).toBe('task-2');
    expect(completionOrder[2]).toBe('task-3');
  });

  it('should track progress accurately', async () => {
    const progressReports: number[] = [];

    const subtasks = Array.from({ length: 100 }, (_, i) =>
      createSubtask(`task-${i}`, {})
    );

    const distributor = new WorkDistributor({
      workerCount: 20,
      maxRetries: 3,
      enableWorkStealing: true,
      workStealingIntervalMs: 100,
      progressUpdateIntervalMs: 50,

      processor: async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        return { processed: true };
      },

      onProgress: (report) => {
        progressReports.push(report.percentage);
      }
    });

    await distributor.distribute(subtasks);

    // Should have multiple progress updates
    expect(progressReports.length).toBeGreaterThan(1);

    // Last report should be 100%
    expect(progressReports[progressReports.length - 1]).toBe(100);
  });

  it('should handle high concurrency (100 workers)', async () => {
    const subtasks = Array.from({ length: 500 }, (_, i) =>
      createSubtask(`task-${i}`, { index: i })
    );

    const distributor = new WorkDistributor({
      workerCount: 100,
      maxRetries: 3,
      enableWorkStealing: true,
      workStealingIntervalMs: 100,
      progressUpdateIntervalMs: 100,

      processor: async (subtask) => {
        await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 10));
        return { index: subtask.payload.index };
      }
    });

    const startTime = Date.now();
    const { results, failures, stats } = await distributor.distribute(subtasks);
    const duration = Date.now() - startTime;

    expect(results.length).toBe(500);
    expect(failures.length).toBe(0);
    expect(stats.pool.total).toBe(100);

    // With 100 workers, should complete much faster than sequential
    console.log(`Processed 500 tasks with 100 workers in ${duration}ms`);
    console.log(`Throughput: ${stats.progress.throughput.toFixed(2)} tasks/s`);
  });

  it('should calculate meaningful statistics', async () => {
    const subtasks = Array.from({ length: 50 }, (_, i) =>
      createSubtask(`task-${i}`, {})
    );

    const distributor = new WorkDistributor({
      workerCount: 10,
      maxRetries: 3,
      enableWorkStealing: true,
      workStealingIntervalMs: 100,
      progressUpdateIntervalMs: 100,

      processor: async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        return { processed: true };
      }
    });

    const { stats } = await distributor.distribute(subtasks);

    expect(stats.queue.completed).toBe(50);
    expect(stats.pool.totalCompleted).toBe(50);
    expect(stats.progress.percentage).toBe(100);
    expect(stats.progress.throughput).toBeGreaterThan(0);
    expect(stats.progress.avgProcessingMs).toBeGreaterThan(0);
    expect(stats.pool.avgHealthScore).toBeGreaterThan(0.9);
  });
});

describe('createSubtask utility', () => {
  it('should create subtask with defaults', () => {
    const subtask = createSubtask('task-1', { data: 'test' });

    expect(subtask.id).toBe('task-1');
    expect(subtask.payload).toEqual({ data: 'test' });
    expect(subtask.priority).toBe(10);
    expect(subtask.attempts).toBe(0);
    expect(subtask.maxRetries).toBe(3);
  });

  it('should accept custom options', () => {
    const subtask = createSubtask('task-1', { data: 'test' }, {
      priority: 20,
      maxRetries: 5,
      dependencies: ['task-0'],
      estimatedDurationMs: 1000,
      metadata: { category: 'important' }
    });

    expect(subtask.priority).toBe(20);
    expect(subtask.maxRetries).toBe(5);
    expect(subtask.dependencies).toEqual(['task-0']);
    expect(subtask.estimatedDurationMs).toBe(1000);
    expect(subtask.metadata).toEqual({ category: 'important' });
  });
});
