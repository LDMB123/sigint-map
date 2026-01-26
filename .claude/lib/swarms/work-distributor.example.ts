/**
 * Work Distributor Examples
 * Demonstrates real-world usage patterns for parallel task processing
 */

import {
  WorkDistributor,
  createSubtask,
  type Subtask
} from './work-distributor';

/**
 * Example 1: Processing large dataset with parallel workers
 */
export async function exampleDataProcessing() {
  console.log('=== Example 1: Large Dataset Processing ===\n');

  // Simulate a large dataset of 1000 items
  const dataset = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    value: Math.random() * 100,
    metadata: { category: i % 5 }
  }));

  // Create subtasks for each data item
  const subtasks = dataset.map((item) =>
    createSubtask(
      `process-${item.id}`,
      item,
      {
        priority: item.metadata.category === 0 ? 20 : 10, // High priority for category 0
        maxRetries: 3
      }
    )
  );

  // Configure distributor with 75 parallel workers
  const distributor = new WorkDistributor({
    workerCount: 75,
    maxRetries: 3,
    enableWorkStealing: true,
    workStealingIntervalMs: 1000,
    progressUpdateIntervalMs: 500,

    // Data processing function
    processor: async (subtask) => {
      // Simulate data transformation
      const input = subtask.payload;
      const processed = {
        id: input.id,
        transformedValue: Math.sqrt(input.value),
        category: input.metadata.category,
        timestamp: Date.now()
      };

      // Simulate processing time (50-150ms)
      await new Promise(resolve =>
        setTimeout(resolve, 50 + Math.random() * 100)
      );

      return processed;
    },

    // Progress updates every 500ms
    onProgress: (report) => {
      console.log(
        `Progress: ${report.percentage}% | ` +
        `Completed: ${report.completed}/${report.total} | ` +
        `ETA: ${report.etaString} | ` +
        `Throughput: ${report.throughput.toFixed(2)} items/s`
      );
    }
  });

  const startTime = Date.now();
  const { results, failures, stats } = await distributor.distribute(subtasks);
  const duration = Date.now() - startTime;

  console.log('\n=== Results ===');
  console.log(`Total processed: ${results.length}`);
  console.log(`Total failed: ${failures.length}`);
  console.log(`Success rate: ${((results.length / dataset.length) * 100).toFixed(2)}%`);
  console.log(`Total time: ${(duration / 1000).toFixed(2)}s`);
  console.log(`Average throughput: ${stats.progress.throughput.toFixed(2)} items/s`);
  console.log(`Worker efficiency: ${stats.pool.avgHealthScore.toFixed(2)}`);

  return results;
}

/**
 * Example 2: API batch processing with rate limiting
 */
export async function exampleAPIBatchProcessing() {
  console.log('\n=== Example 2: API Batch Processing ===\n');

  interface APIRequest {
    endpoint: string;
    data: any;
  }

  // Create batch of API requests
  const apiRequests: APIRequest[] = Array.from({ length: 500 }, (_, i) => ({
    endpoint: `/api/resource/${i}`,
    data: { value: Math.random() }
  }));

  const subtasks = apiRequests.map((req, i) =>
    createSubtask(`api-${i}`, req, { maxRetries: 5 })
  );

  let totalRetries = 0;

  const distributor = new WorkDistributor({
    workerCount: 50, // 50 concurrent API calls
    maxRetries: 5,
    enableWorkStealing: true,
    workStealingIntervalMs: 500,
    progressUpdateIntervalMs: 1000,

    // Simulated API call processor
    processor: async (subtask) => {
      const request = subtask.payload as APIRequest;

      // Simulate occasional API failures (10% failure rate)
      if (Math.random() < 0.1) {
        throw new Error(`API call failed: ${request.endpoint}`);
      }

      // Simulate API latency (100-300ms)
      await new Promise(resolve =>
        setTimeout(resolve, 100 + Math.random() * 200)
      );

      return {
        status: 'success',
        endpoint: request.endpoint,
        response: { processed: true }
      };
    },

    onProgress: (report) => {
      console.log(
        `API Progress: ${report.percentage}% | ` +
        `ETA: ${report.etaString} | ` +
        `Rate: ${report.throughput.toFixed(2)} req/s`
      );
    },

    onSubtaskFail: (subtaskId, error, willRetry) => {
      if (willRetry) {
        totalRetries++;
        console.log(`Retrying: ${subtaskId} - ${error.message}`);
      } else {
        console.log(`Permanent failure: ${subtaskId} - ${error.message}`);
      }
    }
  });

  const { results, failures, stats } = await distributor.distribute(subtasks);

  console.log('\n=== API Batch Results ===');
  console.log(`Successful requests: ${results.length}`);
  console.log(`Failed requests: ${failures.length}`);
  console.log(`Total retries: ${totalRetries}`);
  console.log(`Average latency: ${stats.progress.avgProcessingMs.toFixed(2)}ms`);

  return results;
}

/**
 * Example 3: Dependency-based task pipeline
 */
export async function exampleDependencyPipeline() {
  console.log('\n=== Example 3: Dependency Pipeline ===\n');

  // Create a pipeline: Extract → Transform → Load (ETL)
  const extractTasks = Array.from({ length: 10 }, (_, i) =>
    createSubtask(`extract-${i}`, { source: `source-${i}` })
  );

  const transformTasks = extractTasks.map((task, i) =>
    createSubtask(
      `transform-${i}`,
      { sourceData: task.payload },
      { dependencies: [task.id] }
    )
  );

  const loadTasks = transformTasks.map((task, i) =>
    createSubtask(
      `load-${i}`,
      { transformedData: task.payload },
      { dependencies: [task.id] }
    )
  );

  // Combine all tasks
  const allTasks = [...extractTasks, ...transformTasks, ...loadTasks];

  const completionOrder: string[] = [];

  const distributor = new WorkDistributor({
    workerCount: 100, // High parallelism, but dependencies enforce ordering
    maxRetries: 3,
    enableWorkStealing: true,
    workStealingIntervalMs: 100,
    progressUpdateIntervalMs: 500,

    processor: async (subtask) => {
      const phase = subtask.id.split('-')[0];

      // Simulate processing time based on phase
      const processingTime = {
        extract: 100,
        transform: 150,
        load: 200
      }[phase] || 100;

      await new Promise(resolve => setTimeout(resolve, processingTime));

      completionOrder.push(subtask.id);

      return {
        phase,
        id: subtask.id,
        processed: true
      };
    },

    onProgress: (report) => {
      console.log(
        `Pipeline: ${report.percentage}% | ` +
        `Stage: ${report.completed}/${report.total} | ` +
        `ETA: ${report.etaString}`
      );
    }
  });

  const { results, stats } = await distributor.distribute(allTasks);

  console.log('\n=== Pipeline Results ===');
  console.log(`Total stages completed: ${results.length}`);
  console.log(`Pipeline time: ${(stats.progress.elapsedMs / 1000).toFixed(2)}s`);
  console.log('\nCompletion order (first 10):');
  completionOrder.slice(0, 10).forEach((id, i) => {
    console.log(`  ${i + 1}. ${id}`);
  });

  // Verify dependency ordering
  const extractComplete = completionOrder.filter(id => id.startsWith('extract')).length;
  const transformComplete = completionOrder.filter(id => id.startsWith('transform')).length;
  const loadComplete = completionOrder.filter(id => id.startsWith('load')).length;

  console.log(`\nExtract: ${extractComplete}, Transform: ${transformComplete}, Load: ${loadComplete}`);

  return results;
}

/**
 * Example 4: File processing with priority and failure handling
 */
export async function exampleFileProcessing() {
  console.log('\n=== Example 4: File Processing ===\n');

  interface FileTask {
    filename: string;
    size: number;
    priority: 'high' | 'normal' | 'low';
  }

  // Simulate file queue
  const files: FileTask[] = [
    ...Array.from({ length: 20 }, (_, i) => ({
      filename: `important-${i}.txt`,
      size: 1000 + Math.random() * 5000,
      priority: 'high' as const
    })),
    ...Array.from({ length: 80 }, (_, i) => ({
      filename: `normal-${i}.txt`,
      size: 1000 + Math.random() * 3000,
      priority: 'normal' as const
    })),
    ...Array.from({ length: 100 }, (_, i) => ({
      filename: `archive-${i}.txt`,
      size: 500 + Math.random() * 2000,
      priority: 'low' as const
    }))
  ];

  const priorityMap = { high: 20, normal: 10, low: 5 };

  const subtasks = files.map((file, i) =>
    createSubtask(
      `file-${i}`,
      file,
      {
        priority: priorityMap[file.priority],
        maxRetries: 3,
        estimatedDurationMs: file.size / 10 // Estimate based on size
      }
    )
  );

  const processingStats = {
    high: 0,
    normal: 0,
    low: 0
  };

  const distributor = new WorkDistributor({
    workerCount: 60,
    maxRetries: 3,
    enableWorkStealing: true,
    workStealingIntervalMs: 500,
    progressUpdateIntervalMs: 1000,

    processor: async (subtask) => {
      const file = subtask.payload as FileTask;

      // Simulate file processing time based on size
      await new Promise(resolve =>
        setTimeout(resolve, file.size / 20)
      );

      // Simulate occasional file read errors (5% failure rate)
      if (Math.random() < 0.05) {
        throw new Error(`Failed to process ${file.filename}`);
      }

      processingStats[file.priority]++;

      return {
        filename: file.filename,
        processed: true,
        size: file.size,
        priority: file.priority
      };
    },

    onProgress: (report) => {
      console.log(
        `Files: ${report.percentage}% | ` +
        `${report.completed}/${report.total} | ` +
        `ETA: ${report.etaString} | ` +
        `${report.throughput.toFixed(2)} files/s`
      );
    },

    onSubtaskComplete: (result) => {
      // Log high-priority completions
      const file = files.find(f => f.filename === result.result.filename);
      if (file?.priority === 'high') {
        console.log(`  [HIGH] Completed: ${result.result.filename}`);
      }
    }
  });

  const { results, failures, stats } = await distributor.distribute(subtasks);

  console.log('\n=== File Processing Results ===');
  console.log(`Total processed: ${results.length}`);
  console.log(`Total failed: ${failures.length}`);
  console.log(`\nBy Priority:`);
  console.log(`  High: ${processingStats.high}`);
  console.log(`  Normal: ${processingStats.normal}`);
  console.log(`  Low: ${processingStats.low}`);
  console.log(`\nPerformance:`);
  console.log(`  Throughput: ${stats.progress.throughput.toFixed(2)} files/s`);
  console.log(`  Total time: ${(stats.progress.elapsedMs / 1000).toFixed(2)}s`);

  return results;
}

/**
 * Example 5: Real-time monitoring with progress tracking
 */
export async function exampleRealTimeMonitoring() {
  console.log('\n=== Example 5: Real-time Monitoring ===\n');

  const subtasks = Array.from({ length: 200 }, (_, i) =>
    createSubtask(`task-${i}`, { id: i })
  );

  const progressHistory: any[] = [];

  const distributor = new WorkDistributor({
    workerCount: 80,
    maxRetries: 3,
    enableWorkStealing: true,
    workStealingIntervalMs: 500,
    progressUpdateIntervalMs: 250, // Frequent updates

    processor: async (subtask) => {
      await new Promise(resolve =>
        setTimeout(resolve, 50 + Math.random() * 100)
      );
      return { processed: true };
    },

    onProgress: (report) => {
      progressHistory.push({ ...report, timestamp: Date.now() });

      // Display progress bar
      const barLength = 40;
      const filled = Math.floor((report.percentage / 100) * barLength);
      const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

      console.log(
        `[${bar}] ${report.percentage}% | ` +
        `ETA: ${report.etaString} | ` +
        `${report.throughput.toFixed(1)}/s`
      );
    }
  });

  const { results, stats } = await distributor.distribute(subtasks);

  console.log('\n=== Monitoring Summary ===');
  console.log(`Total updates: ${progressHistory.length}`);
  console.log(`Update frequency: ${(progressHistory.length / (stats.progress.elapsedMs / 1000)).toFixed(2)} updates/s`);
  console.log(`Peak throughput: ${Math.max(...progressHistory.map(h => h.throughput)).toFixed(2)} tasks/s`);
  console.log(`Final throughput: ${stats.progress.throughput.toFixed(2)} tasks/s`);

  return results;
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Work Distributor - Usage Examples    ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    await exampleDataProcessing();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await exampleAPIBatchProcessing();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await exampleDependencyPipeline();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await exampleFileProcessing();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await exampleRealTimeMonitoring();

    console.log('\n✓ All examples completed successfully!');
  } catch (error) {
    console.error('\n✗ Error running examples:', error);
  }
}

// Uncomment to run examples
// runAllExamples().catch(console.error);
