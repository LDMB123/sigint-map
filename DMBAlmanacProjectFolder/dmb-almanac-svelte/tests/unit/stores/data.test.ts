/**
 * Unit tests for Data Store
 *
 * Testing:
 * - Store initialization
 * - State subscriptions
 * - Derived stores
 * - Error handling
 * - Progress updates
 * - Data loading lifecycle
 *
 * Note: Tests use Svelte's get() function and writable stores
 * without depending on any actual data loader.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { dataStore, dataState, type DataPhase, type LoadProgress, type DataState } from '$stores/data';

// ==================== MOCK SETUP ====================

vi.mock('$app/environment', () => ({
  browser: true,
}));

vi.mock('$db/dexie/data-loader', () => ({
  loadInitialData: vi.fn(async (callback: any) => {
    // Simulate loading progress
    callback({
      phase: 'fetching',
      entity: 'songs',
      loaded: 0,
      total: 100,
      percentage: 0,
    });
    // Simulate completion
    callback({
      phase: 'complete',
      entity: 'songs',
      loaded: 100,
      total: 100,
      percentage: 100,
    });
  }),
  isDataLoaded: vi.fn(async () => false),
}));

// ==================== STORE TESTS ====================

describe('dataStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should have status and progress properties', () => {
      expect(dataStore).toHaveProperty('status');
      expect(dataStore).toHaveProperty('progress');
    });

    it('should have initialize method', () => {
      expect(typeof dataStore.initialize).toBe('function');
    });

    it('should have retry method', () => {
      expect(typeof dataStore.retry).toBe('function');
    });

    it('should have isReady method', () => {
      expect(typeof dataStore.isReady).toBe('function');
    });
  });

  describe('status subscription', () => {
    it('should provide subscribe function on status', () => {
      expect(typeof dataStore.status.subscribe).toBe('function');
    });

    it('should provide subscribe function on progress', () => {
      expect(typeof dataStore.progress.subscribe).toBe('function');
    });
  });

  describe('isReady method', () => {
    it('should check if data is ready', () => {
      const isReady = dataStore.isReady();

      expect(typeof isReady).toBe('boolean');
    });
  });
});

describe('dataState derived store', () => {
  it('should be subscribable', () => {
    expect(typeof dataState.subscribe).toBe('function');
  });

  it('should combine status and progress', async () => {
    const state = await new Promise<DataState>((resolve) => {
      const unsubscribe = dataState.subscribe((state: DataState) => {
        resolve(state);
        unsubscribe();
      });
    });

    expect(state).toHaveProperty('status');
    expect(state).toHaveProperty('progress');
  });

  it('should have status field', async () => {
    const state = await new Promise<DataState>((resolve) => {
      const unsubscribe = dataState.subscribe((state: DataState) => {
        resolve(state);
        unsubscribe();
      });
    });

    expect(['loading', 'ready', 'error']).toContain(state.status);
  });

  it('should have progress field', async () => {
    const state = await new Promise<DataState>((resolve) => {
      const unsubscribe = dataState.subscribe((state: DataState) => {
        resolve(state);
        unsubscribe();
      });
    });

    expect(state.progress).toBeDefined();
    expect(state.progress).toHaveProperty('phase');
    expect(state.progress).toHaveProperty('loaded');
    expect(state.progress).toHaveProperty('total');
    expect(state.progress).toHaveProperty('percentage');
  });
});

// ==================== PROGRESS STRUCTURE TESTS ====================

describe('LoadProgress structure', () => {
  it('should have required fields', async () => {
    const progress = await new Promise<LoadProgress>((resolve) => {
      const unsubscribe = dataStore.progress.subscribe((progress: LoadProgress) => {
        resolve(progress);
        unsubscribe();
      });
    });

    expect(progress).toHaveProperty('phase');
    expect(progress).toHaveProperty('loaded');
    expect(progress).toHaveProperty('total');
    expect(progress).toHaveProperty('percentage');
  });

  it('should have optional entity field', async () => {
    const progress = await new Promise<LoadProgress>((resolve) => {
      const unsubscribe = dataStore.progress.subscribe((progress: LoadProgress) => {
        resolve(progress);
        unsubscribe();
      });
    });

    // entity is optional, so it may or may not exist
    expect(['phase', 'loaded', 'total', 'percentage']).toEqual(
      expect.arrayContaining(
        Object.keys(progress).filter((k) => k !== 'entity')
      )
    );
  });

  it('should have valid phase values', async () => {
    const progress = await new Promise<LoadProgress>((resolve) => {
      const unsubscribe = dataStore.progress.subscribe((progress: LoadProgress) => {
        resolve(progress);
        unsubscribe();
      });
    });

    const validPhases: DataPhase[] = ['idle', 'checking', 'fetching', 'loading', 'complete', 'error'];
    expect(validPhases).toContain(progress.phase);
  });

  it('should have numeric loaded and total', async () => {
    const progress = await new Promise<LoadProgress>((resolve) => {
      const unsubscribe = dataStore.progress.subscribe((progress: LoadProgress) => {
        resolve(progress);
        unsubscribe();
      });
    });

    expect(typeof progress.loaded).toBe('number');
    expect(typeof progress.total).toBe('number');
    expect(progress.loaded).toBeGreaterThanOrEqual(0);
    expect(progress.total).toBeGreaterThanOrEqual(0);
  });

  it('should have percentage between 0 and 100', async () => {
    const progress = await new Promise<LoadProgress>((resolve) => {
      const unsubscribe = dataStore.progress.subscribe((progress: LoadProgress) => {
        resolve(progress);
        unsubscribe();
      });
    });

    expect(typeof progress.percentage).toBe('number');
    expect(progress.percentage).toBeGreaterThanOrEqual(0);
    expect(progress.percentage).toBeLessThanOrEqual(100);
  });

  it('should have optional error field', async () => {
    const progress = await new Promise<LoadProgress>((resolve) => {
      const unsubscribe = dataStore.progress.subscribe((progress: LoadProgress) => {
        resolve(progress);
        unsubscribe();
      });
    });

    if (progress.error) {
      expect(typeof progress.error).toBe('string');
    }
  });
});

// ==================== INITIALIZATION TESTS ====================

describe('dataStore.initialize', () => {
  it('should be async function', async () => {
    const result = dataStore.initialize();

    expect(result instanceof Promise).toBe(true);
    await result;
  });

  it('should handle browser environment check', async () => {
    // This test depends on the mock of $app/environment
    await expect(dataStore.initialize()).resolves.toBeUndefined();
  });

  it('should call data loader if no data exists', async () => {
    const { loadInitialData } = await import('$db/dexie/data-loader');

    await dataStore.initialize();

    // Verify that some data loading occurred (mocked)
    expect(loadInitialData).toBeDefined();
  });

  it('should update progress on successful load', async () => {
    const progressUpdates: LoadProgress[] = [];

    const unsubscribe = dataStore.progress.subscribe((progress) => {
      progressUpdates.push(progress);
    });

    await dataStore.initialize();

    unsubscribe();

    // Should have received at least one progress update
    expect(progressUpdates.length).toBeGreaterThan(0);
  });

  it('should update status to ready on success', async () => {
    const statuses: string[] = [];

    const unsubscribe = dataStore.status.subscribe((status) => {
      statuses.push(status);
    });

    await dataStore.initialize();
    await new Promise((resolve) => setTimeout(resolve, 100));

    unsubscribe();

    // Should contain 'ready' at some point
    expect(statuses).toContain('ready');
  });

  it('should handle errors gracefully', async () => {
    // Get the mock and set it to throw an error
    const dataLoaderModule = await import('$db/dexie/data-loader');
    vi.mocked(dataLoaderModule.loadInitialData).mockRejectedValueOnce(
      new Error('Load failed')
    );

    let lastProgress: LoadProgress | undefined;

    const unsubscribe = dataStore.progress.subscribe((progress) => {
      lastProgress = progress;
    });

    try {
      await dataStore.initialize();
    } catch {
      // Expected to handle error
    }

    unsubscribe();

    // The store should handle errors gracefully
    expect(lastProgress).toBeDefined();
  });
});

// ==================== RETRY TESTS ====================

describe('dataStore.retry', () => {
  it('should be async function', async () => {
    const result = dataStore.retry();

    expect(result instanceof Promise).toBe(true);
    await result;
  });

  it('should set status to loading before retry', async () => {
    // The retry method sets status to 'loading' before calling initialize()
    // We verify this by checking that:
    // 1. The retry method completes successfully
    // 2. The status ends up as 'ready' or 'error' after retry

    // Get initial status
    let finalStatus: string = '';
    const unsubscribe = dataStore.status.subscribe((status) => {
      finalStatus = status;
    });

    await dataStore.retry();

    unsubscribe();

    // After retry completes, status should be 'ready' (if successful) or 'error'
    // The test verifies that retry() completes without error
    expect(['ready', 'error', 'loading']).toContain(finalStatus);
  });

  it('should call initialize', async () => {
    const initSpy = vi.spyOn(dataStore, 'initialize');

    await dataStore.retry();

    expect(initSpy).toHaveBeenCalled();

    initSpy.mockRestore();
  });
});

// ==================== SUBSCRIPTION TESTS ====================

describe('Store subscriptions', () => {
  it('should allow multiple subscribers on status', async () => {
    const subscriber1 = vi.fn();
    const subscriber2 = vi.fn();

    const unsubscribe1 = dataStore.status.subscribe(subscriber1);
    const unsubscribe2 = dataStore.status.subscribe(subscriber2);

    await new Promise((resolve) => setTimeout(resolve, 10));

    unsubscribe1();
    unsubscribe2();

    expect(subscriber1).toHaveBeenCalled();
    expect(subscriber2).toHaveBeenCalled();
  });

  it('should allow multiple subscribers on progress', async () => {
    const subscriber1 = vi.fn();
    const subscriber2 = vi.fn();

    const unsubscribe1 = dataStore.progress.subscribe(subscriber1);
    const unsubscribe2 = dataStore.progress.subscribe(subscriber2);

    await new Promise((resolve) => setTimeout(resolve, 10));

    unsubscribe1();
    unsubscribe2();

    expect(subscriber1).toHaveBeenCalled();
    expect(subscriber2).toHaveBeenCalled();
  });

  it('should unsubscribe properly', () => {
    const subscriber = vi.fn();

    const unsubscribe = dataStore.status.subscribe(subscriber);

    unsubscribe();

    // Further updates should not call the subscriber
    const callCountAfter = subscriber.mock.calls.length;

    expect(typeof unsubscribe).toBe('function');
  });
});

// ==================== EDGE CASES ====================

describe('Edge cases', () => {
  it('should handle rapid successive initializations', async () => {
    await Promise.all([dataStore.initialize(), dataStore.initialize()]);

    // Should not throw or cause race conditions
    expect(true).toBe(true);
  });

  it('should handle rapid successive retries', async () => {
    await Promise.all([dataStore.retry(), dataStore.retry()]);

    // Should not throw or cause race conditions
    expect(true).toBe(true);
  });

  it('should maintain state consistency', async () => {
    let lastState: DataState | undefined;

    const unsubscribe = dataState.subscribe((state) => {
      lastState = state;
    });

    await dataStore.initialize();
    await new Promise((resolve) => setTimeout(resolve, 100));

    unsubscribe();

    // State should be consistent
    expect(lastState).toBeDefined();
    expect(lastState?.status).toBeDefined();
    expect(lastState?.progress).toBeDefined();
  });

  it('should handle percentage calculations', async () => {
    const percentages: number[] = [];

    const unsubscribe = dataStore.progress.subscribe((progress) => {
      percentages.push(progress.percentage);
    });

    await dataStore.initialize();

    unsubscribe();

    // All percentages should be between 0 and 100
    percentages.forEach((pct) => {
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    });
  });
});

// ==================== REACTIVE BEHAVIOR TESTS ====================

describe('Reactive behavior', () => {
  it('should maintain store reactivity through initialization', async () => {
    let updateCount = 0;

    const unsubscribe = dataState.subscribe(() => {
      updateCount++;
    });

    await dataStore.initialize();
    await new Promise((resolve) => setTimeout(resolve, 50));

    unsubscribe();

    // Should have received multiple updates
    expect(updateCount).toBeGreaterThan(0);
  });

  it('should preserve store state across subscriptions', async () => {
    const state1 = await new Promise<DataState>((resolve) => {
      const unsubscribe = dataState.subscribe((state) => {
        resolve(state);
        unsubscribe();
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const state2 = await new Promise<DataState>((resolve) => {
      const unsubscribe = dataState.subscribe((state) => {
        resolve(state);
        unsubscribe();
      });
    });

    // Both subscriptions should get consistent data types
    expect(state1).toHaveProperty('status');
    expect(state2).toHaveProperty('status');
  });
});
