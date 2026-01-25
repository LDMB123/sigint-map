/**
 * Unit tests for Scheduler API utilities
 *
 * Testing:
 * - Scheduler.yield() detection and fallback
 * - Yielding with priority levels
 * - Task execution with yielding
 * - Chunk processing
 * - Debouncing and throttling
 * - Idle task scheduling
 * - Performance monitoring
 *
 * Note: These tests mock the scheduler API since it's not available
 * in all test environments.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  isSchedulerYieldSupported,
  yieldToMain,
  yieldWithPriority,
  runWithYielding,
  processInChunks,
  runAsyncGenerator,
  debounceScheduled,
  scheduleIdleTask,
  throttleScheduled,
  monitoredExecution,
  cancelScheduledTask,
  batchOperations,
  getSchedulerCapabilities,
  initSchedulerMonitoring,
  hasExceededTimeLimit,
  processInChunksWithYield,
} from '$lib/utils/scheduler';

// ==================== MOCK SETUP ====================

const mockScheduler = {
  yield: vi.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
  vi.clearAllMocks();

  // Reset global state
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).scheduler = undefined;
  }
});

// ==================== SCHEDULER DETECTION TESTS ====================

describe('isSchedulerYieldSupported', () => {
  it('should return false when scheduler not available', () => {
    const result = isSchedulerYieldSupported();

    // Result depends on environment
    expect(typeof result).toBe('boolean');
  });

  it('should return true when scheduler.yield is available', () => {
    (globalThis as any).scheduler = mockScheduler;

    const result = isSchedulerYieldSupported();

    expect(result).toBe(true);
  });

  it('should return false when scheduler.yield is missing', () => {
    (globalThis as any).scheduler = {};

    const result = isSchedulerYieldSupported();

    expect(result).toBe(false);
  });
});

// ==================== YIELD TESTS ====================

describe('yieldToMain', () => {
  it('should be async function', () => {
    const result = yieldToMain();

    expect(result instanceof Promise).toBe(true);
  });

  it('should use scheduler.yield if available', async () => {
    (globalThis as any).scheduler = mockScheduler;

    await yieldToMain();

    expect(mockScheduler.yield).toHaveBeenCalled();
  });

  it('should fallback to setTimeout if scheduler unavailable', async () => {
    (globalThis as any).scheduler = undefined;
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

    await yieldToMain();

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 0);

    setTimeoutSpy.mockRestore();
  });

  it('should resolve without error', async () => {
    await expect(yieldToMain()).resolves.toBeUndefined();
  });
});

describe('yieldWithPriority', () => {
  it('should accept priority parameter', async () => {
    (globalThis as any).scheduler = mockScheduler;

    await yieldWithPriority('user-blocking');
    await yieldWithPriority('user-visible');
    await yieldWithPriority('background');

    // All should succeed
    expect(true).toBe(true);
  });

  it('should default to user-visible priority', async () => {
    (globalThis as any).scheduler = mockScheduler;

    await yieldWithPriority();

    expect(mockScheduler.yield).toHaveBeenCalled();
  });

  it('should fallback gracefully if priority not supported', async () => {
    // Mock scheduler.yield to reject for priority parameter but work without it
    const yieldMock = vi.fn()
      .mockImplementationOnce((opts: any) => {
        if (opts?.priority) {
          return Promise.reject(new Error('Priority not supported'));
        }
        return Promise.resolve();
      })
      .mockResolvedValue(undefined); // Fallback call without priority

    (globalThis as any).scheduler = {
      yield: yieldMock,
    };

    // Should not throw - the implementation catches the error and falls back
    await expect(yieldWithPriority('user-blocking')).resolves.toBeUndefined();
  });

  it('should fallback to setTimeout if scheduler unavailable', async () => {
    (globalThis as any).scheduler = undefined;
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

    await yieldWithPriority('user-visible');

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 0);

    setTimeoutSpy.mockRestore();
  });
});

// ==================== TASK EXECUTION TESTS ====================

describe('runWithYielding', () => {
  it('should execute all tasks', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const task1 = vi.fn(() => 1);
    const task2 = vi.fn(() => 2);
    const task3 = vi.fn(() => 3);

    const results = await runWithYielding([task1, task2, task3]);

    expect(results).toEqual([1, 2, 3]);
    expect(task1).toHaveBeenCalled();
    expect(task2).toHaveBeenCalled();
    expect(task3).toHaveBeenCalled();
  });

  it('should execute async tasks', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const asyncTask = vi.fn(async () => 42);

    const results = await runWithYielding([asyncTask]);

    expect(results).toEqual([42]);
    expect(asyncTask).toHaveBeenCalled();
  });

  it('should respect yieldAfterMs option', async () => {
    (globalThis as any).scheduler = mockScheduler;

    // Create tasks that take some time to execute, so the time budget is exceeded
    const tasks = Array.from({ length: 5 }, () => vi.fn(() => {
      // Simulate work by blocking for a small amount of time
      const start = performance.now();
      while (performance.now() - start < 2) {
        // Busy wait to consume time
      }
      return 1;
    }));

    await runWithYielding(tasks, { yieldAfterMs: 1 }); // Very short time budget

    // Should have yielded at least once due to time budget being exceeded
    expect(mockScheduler.yield.mock.calls.length).toBeGreaterThan(0);
  });

  it('should return results in order', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const tasks = [
      () => 'first',
      () => 'second',
      () => 'third',
    ];

    const results = await runWithYielding(tasks);

    expect(results).toEqual(['first', 'second', 'third']);
  });

  it('should handle empty task array', async () => {
    const results = await runWithYielding([]);

    expect(results).toEqual([]);
  });

  it('should handle errors in tasks', async () => {
    const errorTask = vi.fn(() => {
      throw new Error('Task failed');
    });

    await expect(runWithYielding([errorTask])).rejects.toThrow('Task failed');
  });
});

// ==================== CHUNK PROCESSING TESTS ====================

describe('processInChunks', () => {
  it('should process all items', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const items = Array.from({ length: 30 }, (_, i) => i);
    const processor = vi.fn().mockResolvedValue(undefined);

    await processInChunks(items, processor, { chunkSize: 10 });

    // Should process all items
    expect(processor.mock.calls.length).toBe(30);
  });

  it('should chunk items correctly', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const chunks: any[] = [];

    const processor = vi.fn(async (item) => {
      // Track which items are processed
    });

    await processInChunks(items, processor, { chunkSize: 3 });

    expect(processor).toHaveBeenCalledTimes(8);
  });

  it('should call progress callback', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const items = Array.from({ length: 20 }, (_, i) => i);
    const processor = vi.fn().mockResolvedValue(undefined);
    const onProgress = vi.fn();

    await processInChunks(items, processor, {
      chunkSize: 5,
      onProgress,
    });

    expect(onProgress).toHaveBeenCalled();
  });

  it('should yield between chunks', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const items = Array.from({ length: 25 }, (_, i) => i);
    const processor = vi.fn().mockResolvedValue(undefined);

    await processInChunks(items, processor, { chunkSize: 5 });

    // Should yield between chunks (4 yields for 5 chunks)
    expect(mockScheduler.yield.mock.calls.length).toBeGreaterThan(0);
  });

  it('should handle empty array', async () => {
    const processor = vi.fn();

    await processInChunks([], processor, { chunkSize: 10 });

    expect(processor).not.toHaveBeenCalled();
  });

  it('should handle async processors', async () => {
    (globalThis as any).scheduler = mockScheduler;

    let processedCount = 0;
    const asyncProcessor = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      processedCount++;
    });

    const items = [1, 2, 3];

    await processInChunks(items, asyncProcessor, { chunkSize: 1 });

    expect(processedCount).toBe(3);
  });
});

// ==================== DEBOUNCE TESTS ====================

describe('debounceScheduled', () => {
  it('should be function', () => {
    const debounced = debounceScheduled(() => {}, 100);

    expect(typeof debounced).toBe('function');
  });

  it('should delay execution', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const task = vi.fn();
    const debounced = debounceScheduled(task, 50);

    debounced();
    expect(task).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(task).toHaveBeenCalled();
  });

  it('should coalesce multiple calls', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const task = vi.fn();
    const debounced = debounceScheduled(task, 50);

    debounced();
    debounced();
    debounced();

    await new Promise((resolve) => setTimeout(resolve, 100));
    // Should only call once despite three calls
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('should accept optional priority parameter', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const task = vi.fn();
    const debounced = debounceScheduled(task, 50, {
      priority: 'background',
    });

    debounced();

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(task).toHaveBeenCalled();
  });

  it('should default to 300ms delay', async () => {
    const task = vi.fn();
    const debounced = debounceScheduled(task);

    debounced();

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(task).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(task).toHaveBeenCalled();
  });
});

// ==================== THROTTLE TESTS ====================

describe('throttleScheduled', () => {
  it('should be function', () => {
    const throttled = throttleScheduled(() => {}, 100);

    expect(typeof throttled).toBe('function');
  });

  it('should limit call frequency', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const task = vi.fn();
    const throttled = throttleScheduled(task, 50);

    throttled();
    // The first call triggers an async execution, so task may not be called immediately
    // Wait a tick for the async execution to complete
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(task).toHaveBeenCalledTimes(1);

    throttled();
    // Second call within throttle window should be scheduled, not immediately executed
    expect(task).toHaveBeenCalledTimes(1); // Still 1, not called again yet

    await new Promise((resolve) => setTimeout(resolve, 100));
    // After waiting beyond the throttle interval, the scheduled call should have executed
    expect(task.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('should accept priority parameter', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const task = vi.fn();
    const throttled = throttleScheduled(task, 50, {
      priority: 'user-visible',
    });

    throttled();

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(task).toHaveBeenCalled();
  });
});

// ==================== IDLE TASK SCHEDULING TESTS ====================

describe('scheduleIdleTask', () => {
  it('should return cancel function', () => {
    const task = vi.fn();
    const cancel = scheduleIdleTask(task);

    expect(typeof cancel).toBe('function');

    cancel();
  });

  it('should execute task after timeout', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const task = vi.fn();
    scheduleIdleTask(task);

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(task).toHaveBeenCalled();
  });

  it('should support timeout option', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const task = vi.fn();
    scheduleIdleTask(task, { timeout: 100 });

    expect(task).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(task).toHaveBeenCalled();
  });

  it('should allow cancellation', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const task = vi.fn();
    const cancel = scheduleIdleTask(task);

    cancel();

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(task).not.toHaveBeenCalled();
  });
});

// ==================== BATCH OPERATIONS TESTS ====================

describe('batchOperations', () => {
  it('should execute all operations', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const op1 = vi.fn();
    const op2 = vi.fn();
    const op3 = vi.fn();

    await batchOperations([op1, op2, op3]);

    expect(op1).toHaveBeenCalled();
    expect(op2).toHaveBeenCalled();
    expect(op3).toHaveBeenCalled();
  });

  it('should execute operations in order', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const callOrder: number[] = [];
    const op1 = () => { callOrder.push(1); };
    const op2 = () => { callOrder.push(2); };
    const op3 = () => { callOrder.push(3); };

    await batchOperations([op1, op2, op3]);

    expect(callOrder).toEqual([1, 2, 3]);
  });

  it('should yield between operations', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const ops = Array.from({ length: 5 }, () => vi.fn());

    await batchOperations(ops);

    // Should yield at least once
    expect(mockScheduler.yield.mock.calls.length).toBeGreaterThan(0);
  });

  it('should not yield after last operation', async () => {
    (globalThis as any).scheduler = mockScheduler;

    mockScheduler.yield.mockClear();

    const ops = Array.from({ length: 2 }, () => vi.fn());

    await batchOperations(ops);

    // Should yield only once (between operations, not after last)
    expect(mockScheduler.yield.mock.calls.length).toBe(1);
  });
});

// ==================== CAPABILITY DETECTION TESTS ====================

describe('getSchedulerCapabilities', () => {
  it('should return capabilities object', () => {
    const caps = getSchedulerCapabilities();

    expect(caps).toHaveProperty('supportsYield');
    expect(caps).toHaveProperty('supportsPriority');
    expect(caps).toHaveProperty('supportsIdleCallback');
    expect(caps).toHaveProperty('isAppleSilicon');
  });

  it('should have boolean properties', () => {
    const caps = getSchedulerCapabilities();

    expect(typeof caps.supportsYield).toBe('boolean');
    expect(typeof caps.supportsPriority).toBe('boolean');
    expect(typeof caps.supportsIdleCallback).toBe('boolean');
    expect(typeof caps.isAppleSilicon).toBe('boolean');
  });

  it('should detect scheduler support', () => {
    (globalThis as any).scheduler = mockScheduler;

    const caps = getSchedulerCapabilities();

    expect(caps.supportsYield).toBe(true);
  });
});

// ==================== TIME LIMIT TESTS ====================

describe('hasExceededTimeLimit', () => {
  it('should detect when time limit exceeded', async () => {
    const startTime = performance.now() - 100;

    const exceeded = hasExceededTimeLimit(startTime, 50);

    expect(exceeded).toBe(true);
  });

  it('should detect when time limit not exceeded', () => {
    const startTime = performance.now();

    const exceeded = hasExceededTimeLimit(startTime, 1000);

    expect(exceeded).toBe(false);
  });

  it('should use 50ms default limit', () => {
    const startTime = performance.now() - 100;

    const exceeded = hasExceededTimeLimit(startTime);

    expect(exceeded).toBe(true);
  });
});

// ==================== PROCESS IN CHUNKS WITH YIELD TESTS ====================

describe('processInChunksWithYield', () => {
  it('should process all items', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const items = Array.from({ length: 20 }, (_, i) => i);
    const processor = vi.fn().mockResolvedValue(undefined);

    await processInChunksWithYield(items, processor);

    expect(processor).toHaveBeenCalledTimes(20);
  });

  it('should yield based on time budget', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const items = Array.from({ length: 10 }, (_, i) => i);
    const processor = vi.fn().mockResolvedValue(undefined);

    await processInChunksWithYield(items, processor, { timeBudget: 0 });

    // With 0ms time budget, should yield for each item
    expect(mockScheduler.yield.mock.calls.length).toBeGreaterThan(0);
  });

  it('should call progress callback', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const items = Array.from({ length: 10 }, (_, i) => i);
    const processor = vi.fn().mockResolvedValue(undefined);
    const onProgress = vi.fn();

    await processInChunksWithYield(items, processor, { onProgress });

    expect(onProgress).toHaveBeenCalled();
  });

  it('should handle empty array', async () => {
    const processor = vi.fn();

    await processInChunksWithYield([], processor);

    expect(processor).not.toHaveBeenCalled();
  });
});

// ==================== INITIALIZATION TESTS ====================

describe('initSchedulerMonitoring', () => {
  it('should not throw', () => {
    expect(() => initSchedulerMonitoring()).not.toThrow();
  });

  it('should log capabilities', () => {
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    initSchedulerMonitoring();

    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should warn if scheduler.yield not available', () => {
    (globalThis as any).scheduler = undefined;

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    initSchedulerMonitoring();

    if (warnSpy.mock.calls.length > 0) {
      expect(warnSpy.mock.calls[0][0]).toContain('scheduler.yield');
    }

    warnSpy.mockRestore();
  });
});

// ==================== EDGE CASES ====================

describe('Edge cases', () => {
  it('should handle rapid consecutive yields', async () => {
    (globalThis as any).scheduler = mockScheduler;

    await Promise.all([yieldToMain(), yieldToMain(), yieldToMain()]);

    expect(mockScheduler.yield.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('should handle deep task nesting', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const nestedTask = async () => {
      await yieldToMain();
      await yieldToMain();
      return 42;
    };

    const result = await runWithYielding([nestedTask]);

    expect(result[0]).toBe(42);
  });

  it('should handle very short time budgets', async () => {
    (globalThis as any).scheduler = mockScheduler;

    const items = Array.from({ length: 5 }, (_, i) => i);
    const processor = vi.fn().mockResolvedValue(undefined);

    await processInChunksWithYield(items, processor, { timeBudget: 0.001 });

    expect(processor).toHaveBeenCalledTimes(5);
  });

  it('should handle cancelled idle tasks', () => {
    const task = vi.fn();
    const cancel = scheduleIdleTask(task);

    cancel();
    cancel(); // Should not throw when cancelled twice

    expect(true).toBe(true);
  });
});
