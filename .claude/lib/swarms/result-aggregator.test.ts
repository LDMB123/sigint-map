/**
 * Test suite for Result Aggregator
 * Validates 50-100x throughput improvement and quality handling
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  ResultAggregator,
  WorkerResult,
  createWorkerResult,
  batchWorkers,
  runBatchesSequentially
} from './result-aggregator';

describe('ResultAggregator', () => {
  let aggregator: ResultAggregator;

  beforeEach(() => {
    aggregator = new ResultAggregator();
  });

  describe('Basic Aggregation', () => {
    test('should aggregate successful results', async () => {
      const results: WorkerResult<string>[] = [
        createWorkerResult('w1', 't1', 'Result A', { latency_ms: 100 }),
        createWorkerResult('w2', 't1', 'Result B', { latency_ms: 120 }),
        createWorkerResult('w3', 't1', 'Result C', { latency_ms: 90 })
      ];

      const aggregated = await aggregator.aggregate(
        results,
        'Test task'
      );

      expect(aggregated.success).toBe(true);
      expect(aggregated.metadata.total_workers).toBe(3);
      expect(aggregated.metadata.successful_workers).toBe(3);
      expect(aggregated.metadata.failed_workers).toBe(0);
      expect(aggregated.synthesized_output).toBeDefined();
    });

    test('should handle partial failures gracefully', async () => {
      const results: WorkerResult<string>[] = [
        createWorkerResult('w1', 't1', 'Result A', { latency_ms: 100 }),
        { ...createWorkerResult('w2', 't1', 'Result B'), status: 'failure' },
        createWorkerResult('w3', 't1', 'Result C', { latency_ms: 90 }),
        createWorkerResult('w4', 't1', 'Result D', { latency_ms: 110 })
      ];

      const aggregated = await aggregator.aggregate(
        results,
        'Test task'
      );

      expect(aggregated.success).toBe(true); // 75% success rate
      expect(aggregated.metadata.successful_workers).toBe(3);
      expect(aggregated.metadata.failed_workers).toBe(1);
    });

    test('should fail when below success threshold', async () => {
      const results: WorkerResult<string>[] = [
        createWorkerResult('w1', 't1', 'Result A', { latency_ms: 100 }),
        { ...createWorkerResult('w2', 't1', 'Result B'), status: 'failure' },
        { ...createWorkerResult('w3', 't1', 'Result C'), status: 'failure' },
        { ...createWorkerResult('w4', 't1', 'Result D'), status: 'failure' }
      ];

      const aggregated = await aggregator.aggregate(
        results,
        'Test task'
      );

      expect(aggregated.success).toBe(false); // 25% success rate < 70% threshold
      expect(aggregated.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Quality Filtering', () => {
    test('should filter low-quality results', async () => {
      const results: WorkerResult<string>[] = [
        createWorkerResult('w1', 't1', 'High quality', {
          confidence_score: 0.9
        }),
        createWorkerResult('w2', 't1', 'Medium quality', {
          confidence_score: 0.7
        }),
        createWorkerResult('w3', 't1', 'Low quality', {
          confidence_score: 0.3
        }),
        createWorkerResult('w4', 't1', 'Very low quality', {
          confidence_score: 0.1
        })
      ];

      const aggregated = await aggregator.aggregate(
        results,
        'Test task'
      );

      expect(aggregated.metadata.quality_filtered).toBe(2); // 0.3 and 0.1 filtered
      expect(aggregated.warnings).toContain('Filtered 2 low-quality results');
    });

    test('should include results without confidence scores', async () => {
      const results: WorkerResult<string>[] = [
        createWorkerResult('w1', 't1', 'No confidence', {}),
        createWorkerResult('w2', 't1', 'Has confidence', {
          confidence_score: 0.8
        })
      ];

      const aggregated = await aggregator.aggregate(
        results,
        'Test task'
      );

      expect(aggregated.metadata.quality_filtered).toBe(0);
      expect(aggregated.worker_results.length).toBe(2);
    });
  });

  describe('Deduplication', () => {
    test('should deduplicate identical results', async () => {
      const results: WorkerResult<string>[] = [
        createWorkerResult('w1', 't1', 'Same result'),
        createWorkerResult('w2', 't1', 'Same result'),
        createWorkerResult('w3', 't1', 'Same result'),
        createWorkerResult('w4', 't1', 'Different result')
      ];

      const aggregated = await aggregator.aggregate(
        results,
        'Test task'
      );

      expect(aggregated.metadata.deduplication_savings).toBeGreaterThan(0);
      expect(aggregated.worker_results.length).toBeLessThan(4);
    });

    test('should deduplicate similar results', async () => {
      const results: WorkerResult<string>[] = [
        createWorkerResult('w1', 't1', 'The quick brown fox jumps over'),
        createWorkerResult('w2', 't1', 'The quick brown fox jumps'),
        createWorkerResult('w3', 't1', 'Quick brown fox jumping'),
        createWorkerResult('w4', 't1', 'Completely different content here')
      ];

      const aggregated = await aggregator.aggregate(
        results,
        'Test task'
      );

      // Should keep at least 2 unique results
      expect(aggregated.worker_results.length).toBeGreaterThanOrEqual(2);
      expect(aggregated.worker_results.length).toBeLessThan(4);
    });

    test('should respect deduplication config', async () => {
      const noDedupe = new ResultAggregator({
        enable_deduplication: false
      });

      const results: WorkerResult<string>[] = [
        createWorkerResult('w1', 't1', 'Same result'),
        createWorkerResult('w2', 't1', 'Same result'),
        createWorkerResult('w3', 't1', 'Same result')
      ];

      const aggregated = await noDedupe.aggregate(
        results,
        'Test task'
      );

      expect(aggregated.metadata.deduplication_savings).toBe(0);
      expect(aggregated.worker_results.length).toBe(3);
    });
  });

  describe('Throughput Improvement Validation', () => {
    test('should achieve 50x+ throughput with 50 workers', async () => {
      const workerCount = 50;
      const avgLatencyMs = 2000; // 2s per worker

      const results: WorkerResult<string>[] = Array.from(
        { length: workerCount },
        (_, i) =>
          createWorkerResult(`w${i}`, 't1', `Result ${i}`, {
            latency_ms: avgLatencyMs + Math.random() * 500,
            tokens_used: 500
          })
      );

      const aggregated = await aggregator.aggregate(
        results,
        'Parallel task execution'
      );

      // Throughput improvement should be close to worker count
      // (accounting for synthesis overhead)
      expect(aggregated.metadata.throughput_improvement).toBeGreaterThan(45);
      expect(aggregated.metadata.total_workers).toBe(50);
      expect(aggregated.success).toBe(true);
    });

    test('should achieve 100x+ throughput with 100 workers', async () => {
      const workerCount = 100;
      const avgLatencyMs = 2000;

      const results: WorkerResult<string>[] = Array.from(
        { length: workerCount },
        (_, i) =>
          createWorkerResult(`w${i}`, 't1', `Result ${i}`, {
            latency_ms: avgLatencyMs + Math.random() * 500,
            tokens_used: 500
          })
      );

      const aggregated = await aggregator.aggregate(
        results,
        'Massive parallel task execution'
      );

      expect(aggregated.metadata.throughput_improvement).toBeGreaterThan(90);
      expect(aggregated.metadata.total_workers).toBe(100);
      expect(aggregated.success).toBe(true);
    });

    test('should maintain quality with partial failures', async () => {
      const workerCount = 75;
      const failureRate = 0.2; // 20% failure rate

      const results: WorkerResult<string>[] = Array.from(
        { length: workerCount },
        (_, i) => {
          const shouldFail = Math.random() < failureRate;
          const result = createWorkerResult(`w${i}`, 't1', `Result ${i}`, {
            latency_ms: 2000,
            tokens_used: 500
          });
          return shouldFail ? { ...result, status: 'failure' as const } : result;
        }
      );

      const aggregated = await aggregator.aggregate(
        results,
        'Task with partial failures'
      );

      // Should still succeed with 80% success rate
      expect(aggregated.success).toBe(true);
      expect(aggregated.metadata.successful_workers).toBeGreaterThan(50);
    });
  });

  describe('Timeout Handling', () => {
    test('should handle worker timeouts', async () => {
      const fastWorker = Promise.resolve(
        createWorkerResult('w1', 't1', 'Fast result', { latency_ms: 100 })
      );

      const slowWorker = new Promise<WorkerResult<string>>(resolve =>
        setTimeout(
          () =>
            resolve(
              createWorkerResult('w2', 't1', 'Slow result', { latency_ms: 5000 })
            ),
          5000
        )
      );

      const timeoutAggregator = new ResultAggregator({
        max_wait_time_ms: 1000 // 1 second timeout
      });

      const aggregated = await timeoutAggregator.aggregateWithTimeout(
        [fastWorker, slowWorker],
        'Task with timeout'
      );

      expect(aggregated.metadata.total_workers).toBe(2);
      expect(aggregated.metadata.failed_workers).toBe(1); // Slow worker times out
    });

    test('should aggregate available results on timeout', async () => {
      const workers = Array.from({ length: 10 }, (_, i) => {
        const delay = i < 7 ? 100 : 5000; // 7 fast, 3 slow
        return new Promise<WorkerResult<string>>(resolve =>
          setTimeout(
            () =>
              resolve(
                createWorkerResult(`w${i}`, 't1', `Result ${i}`, {
                  latency_ms: delay
                })
              ),
            delay
          )
        );
      });

      const timeoutAggregator = new ResultAggregator({
        max_wait_time_ms: 1000,
        min_success_threshold: 0.6 // 60% threshold
      });

      const aggregated = await timeoutAggregator.aggregateWithTimeout(
        workers,
        'Task with mixed timing'
      );

      expect(aggregated.metadata.successful_workers).toBeGreaterThanOrEqual(7);
      expect(aggregated.success).toBe(true); // 70% success rate
    });
  });

  describe('Data Format Handling', () => {
    test('should handle string results', async () => {
      const results: WorkerResult<string>[] = [
        createWorkerResult('w1', 't1', 'Text result A'),
        createWorkerResult('w2', 't1', 'Text result B')
      ];

      const aggregated = await aggregator.aggregate(results, 'String task');

      expect(typeof aggregated.synthesized_output).toBe('string');
    });

    test('should handle object results', async () => {
      type ResultData = { key: string; value: number };

      const results: WorkerResult<ResultData>[] = [
        createWorkerResult('w1', 't1', { key: 'a', value: 1 }),
        createWorkerResult('w2', 't1', { key: 'b', value: 2 })
      ];

      const aggregated = await aggregator.aggregate(results, 'Object task');

      expect(typeof aggregated.synthesized_output).toBe('object');
    });

    test('should handle array results', async () => {
      const results: WorkerResult<string[]>[] = [
        createWorkerResult('w1', 't1', ['item1', 'item2']),
        createWorkerResult('w2', 't1', ['item3', 'item4'])
      ];

      const aggregated = await aggregator.aggregate(results, 'Array task');

      expect(Array.isArray(aggregated.synthesized_output)).toBe(true);
    });
  });

  describe('Configuration', () => {
    test('should use custom configuration', () => {
      const custom = new ResultAggregator({
        min_success_threshold: 0.5,
        similarity_threshold: 0.9
      });

      const config = custom.getConfig();

      expect(config.min_success_threshold).toBe(0.5);
      expect(config.similarity_threshold).toBe(0.9);
    });

    test('should update configuration', () => {
      aggregator.updateConfig({
        quality_threshold: 0.8
      });

      const config = aggregator.getConfig();

      expect(config.quality_threshold).toBe(0.8);
    });
  });

  describe('Utility Functions', () => {
    test('should create worker results', () => {
      const result = createWorkerResult('w1', 't1', 'test data', {
        latency_ms: 100,
        confidence_score: 0.9
      });

      expect(result.worker_id).toBe('w1');
      expect(result.task_id).toBe('t1');
      expect(result.status).toBe('success');
      expect(result.data).toBe('test data');
      expect(result.metadata.latency_ms).toBe(100);
      expect(result.metadata.confidence_score).toBe(0.9);
    });

    test('should batch workers', () => {
      const workers = Array.from({ length: 25 }, (_, i) =>
        Promise.resolve(createWorkerResult(`w${i}`, 't1', `Result ${i}`))
      );

      const batches = batchWorkers(workers, 10);

      expect(batches.length).toBe(3); // 10 + 10 + 5
      expect(batches[0].length).toBe(10);
      expect(batches[1].length).toBe(10);
      expect(batches[2].length).toBe(5);
    });

    test('should run batches sequentially', async () => {
      const workers = Array.from({ length: 6 }, (_, i) =>
        Promise.resolve(createWorkerResult(`w${i}`, 't1', `Result ${i}`))
      );

      const batches = batchWorkers(workers, 2);
      const results = await runBatchesSequentially(batches);

      expect(results.length).toBe(6);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty results', async () => {
      const aggregated = await aggregator.aggregate([], 'Empty task');

      expect(aggregated.success).toBe(false);
      expect(aggregated.metadata.total_workers).toBe(0);
    });

    test('should handle single result', async () => {
      const results = [createWorkerResult('w1', 't1', 'Single result')];

      const aggregated = await aggregator.aggregate(results, 'Single task');

      expect(aggregated.success).toBe(true);
      expect(aggregated.synthesized_output).toBe('Single result');
      expect(aggregated.metadata.synthesis_tokens).toBe(0); // No synthesis needed
    });

    test('should handle malformed results', async () => {
      const results = [
        createWorkerResult('w1', 't1', 'Valid result'),
        {} as WorkerResult<string>, // Invalid
        createWorkerResult('w2', 't1', 'Another valid result')
      ];

      const aggregated = await aggregator.aggregate(results, 'Mixed task');

      expect(aggregated.metadata.total_workers).toBe(2); // Only valid results
    });
  });

  describe('Performance Metrics', () => {
    test('should track token usage', async () => {
      const results: WorkerResult<string>[] = Array.from(
        { length: 10 },
        (_, i) =>
          createWorkerResult(`w${i}`, 't1', `Result ${i}`, {
            tokens_used: 500
          })
      );

      const aggregated = await aggregator.aggregate(results, 'Token tracking');

      // 10 workers * 500 tokens + synthesis
      expect(aggregated.metadata.total_tokens_used).toBeGreaterThan(5000);
    });

    test('should track latency', async () => {
      const results: WorkerResult<string>[] = Array.from(
        { length: 5 },
        (_, i) =>
          createWorkerResult(`w${i}`, 't1', `Result ${i}`, {
            latency_ms: 1000
          })
      );

      const aggregated = await aggregator.aggregate(results, 'Latency tracking');

      expect(aggregated.metadata.total_latency_ms).toBeGreaterThan(0);
    });
  });
});
