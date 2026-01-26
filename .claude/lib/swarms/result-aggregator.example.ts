/**
 * Result Aggregator Usage Examples
 * Demonstrates how to use the swarm result aggregator for 50-100x throughput
 */

import {
  ResultAggregator,
  WorkerResult,
  createWorkerResult,
  batchWorkers,
  runBatchesSequentially,
  AggregationConfig
} from './result-aggregator';

// Example 1: Basic 50-worker swarm for code analysis
async function example1_basicSwarm() {
  console.log('=== Example 1: Basic 50-Worker Swarm ===\n');

  const aggregator = new ResultAggregator({
    min_success_threshold: 0.75,
    enable_deduplication: true,
    quality_threshold: 0.7
  });

  // Simulate 50 Haiku workers analyzing code files
  const workerPromises = Array.from({ length: 50 }, async (_, i) => {
    // Simulate Haiku API call
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));

    return createWorkerResult(`haiku-worker-${i}`, 'code-analysis', {
      file: `src/module-${i}.ts`,
      issues: Math.floor(Math.random() * 5),
      quality_score: 0.7 + Math.random() * 0.3
    }, {
      model: 'claude-haiku-4-20250514',
      tokens_used: 450 + Math.floor(Math.random() * 100),
      latency_ms: 100 + Math.random() * 100,
      confidence_score: 0.7 + Math.random() * 0.3
    });
  });

  const start = performance.now();
  const result = await aggregator.aggregateWithTimeout(
    workerPromises,
    'Analyze 50 TypeScript files for code quality issues',
    'Focus on critical issues and provide actionable recommendations'
  );
  const duration = performance.now() - start;

  console.log(`Analysis complete in ${duration.toFixed(0)}ms`);
  console.log(`Workers: ${result.metadata.total_workers}`);
  console.log(`Success rate: ${(result.metadata.successful_workers / result.metadata.total_workers * 100).toFixed(1)}%`);
  console.log(`Throughput improvement: ${result.metadata.throughput_improvement.toFixed(1)}x`);
  console.log(`Deduplicated: ${result.metadata.deduplication_savings} results`);
  console.log(`Quality filtered: ${result.metadata.quality_filtered} results`);
  console.log(`Total tokens: ${result.metadata.total_tokens_used.toLocaleString()}`);
  console.log(`Warnings: ${result.warnings.length}\n`);
}

// Example 2: 100-worker swarm for documentation generation
async function example2_massiveSwarm() {
  console.log('=== Example 2: 100-Worker Documentation Swarm ===\n');

  const aggregator = new ResultAggregator({
    min_success_threshold: 0.7,
    max_wait_time_ms: 10000, // 10 second timeout
    similarity_threshold: 0.9 // Higher threshold for doc generation
  });

  // Simulate 100 workers generating docs for API endpoints
  const workerPromises = Array.from({ length: 100 }, async (_, i) => {
    // Simulate some failures (10% failure rate)
    if (Math.random() < 0.1) {
      throw new Error(`Worker ${i} failed`);
    }

    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

    return createWorkerResult(`haiku-worker-${i}`, 'doc-generation', {
      endpoint: `/api/v1/endpoint-${i}`,
      documentation: `Generated comprehensive documentation for endpoint ${i}...`,
      examples: 3,
      coverage: 0.8 + Math.random() * 0.2
    }, {
      model: 'claude-haiku-4-20250514',
      tokens_used: 800 + Math.floor(Math.random() * 200),
      latency_ms: 200 + Math.random() * 300,
      confidence_score: 0.75 + Math.random() * 0.25
    });
  });

  const start = performance.now();
  const result = await aggregator.aggregateWithTimeout(
    workerPromises,
    'Generate API documentation for 100 endpoints',
    'Create comprehensive, consistent documentation with examples'
  );
  const duration = performance.now() - start;

  console.log(`Documentation generated in ${duration.toFixed(0)}ms`);
  console.log(`Success: ${result.success ? 'YES' : 'NO'}`);
  console.log(`Workers: ${result.metadata.successful_workers}/${result.metadata.total_workers}`);
  console.log(`Failed: ${result.metadata.failed_workers}`);
  console.log(`Throughput improvement: ${result.metadata.throughput_improvement.toFixed(1)}x`);
  console.log(`Synthesis tokens: ${result.metadata.synthesis_tokens.toLocaleString()}`);

  if (result.warnings.length > 0) {
    console.log(`\nWarnings:`);
    result.warnings.forEach(w => console.log(`  - ${w}`));
  }
  console.log();
}

// Example 3: Progressive batch processing for large datasets
async function example3_batchedSwarm() {
  console.log('=== Example 3: Batched 75-Worker Swarm ===\n');

  const aggregator = new ResultAggregator({
    min_success_threshold: 0.8,
    enable_parallel_validation: true
  });

  // Create 75 workers
  const allWorkers = Array.from({ length: 75 }, async (_, i) => {
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 150));

    return createWorkerResult(`haiku-worker-${i}`, 'data-processing', {
      record_id: `record-${i}`,
      processed: true,
      transformations: 5
    }, {
      model: 'claude-haiku-4-20250514',
      tokens_used: 300 + Math.floor(Math.random() * 100),
      latency_ms: 150 + Math.random() * 150,
      confidence_score: 0.8 + Math.random() * 0.2
    });
  });

  // Process in batches of 25
  const batches = batchWorkers(allWorkers, 25);

  console.log(`Processing ${allWorkers.length} workers in ${batches.length} batches`);
  console.log(`Batch size: 25\n`);

  const start = performance.now();
  const batchResults = await runBatchesSequentially(batches);
  const duration = performance.now() - start;

  console.log(`Batches completed in ${duration.toFixed(0)}ms`);
  console.log(`Results collected: ${batchResults.length}`);

  // Now aggregate all batch results
  const aggregated = await aggregator.aggregate(
    batchResults,
    'Process 75 data records with validation'
  );

  console.log(`\nAggregation complete:`);
  console.log(`Success: ${aggregated.success ? 'YES' : 'NO'}`);
  console.log(`Throughput: ${aggregated.metadata.throughput_improvement.toFixed(1)}x`);
  console.log(`Total tokens: ${aggregated.metadata.total_tokens_used.toLocaleString()}\n`);
}

// Example 4: Handling partial failures with custom synthesis
async function example4_partialFailures() {
  console.log('=== Example 4: Swarm with Partial Failures ===\n');

  const aggregator = new ResultAggregator({
    min_success_threshold: 0.6, // More lenient threshold
    quality_threshold: 0.5
  });

  // Simulate 60 workers with varying success rates
  const workerPromises = Array.from({ length: 60 }, async (_, i) => {
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));

    // Simulate different failure modes
    const rand = Math.random();
    let status: 'success' | 'failure' | 'partial';
    let confidence: number;

    if (rand < 0.7) {
      status = 'success';
      confidence = 0.8 + Math.random() * 0.2;
    } else if (rand < 0.85) {
      status = 'partial';
      confidence = 0.5 + Math.random() * 0.3;
    } else {
      status = 'failure';
      confidence = 0;
    }

    const result = createWorkerResult(`haiku-worker-${i}`, 'search-task', {
      query: `search-${i}`,
      results_found: status === 'success' ? 10 : status === 'partial' ? 3 : 0,
      relevance: confidence
    }, {
      model: 'claude-haiku-4-20250514',
      tokens_used: status === 'failure' ? 50 : 400,
      latency_ms: 100 + Math.random() * 100,
      confidence_score: confidence
    });

    result.status = status;
    return result;
  });

  const result = await aggregator.aggregateWithTimeout(
    workerPromises,
    'Search across 60 data sources',
    'Prioritize high-quality results and merge findings'
  );

  console.log(`Search complete:`);
  console.log(`Success: ${result.success ? 'YES' : 'NO'}`);
  console.log(`Successful workers: ${result.metadata.successful_workers}`);
  console.log(`Partial workers: ${result.metadata.partial_workers}`);
  console.log(`Failed workers: ${result.metadata.failed_workers}`);
  console.log(`Quality filtered: ${result.metadata.quality_filtered}`);
  console.log(`Effective workers: ${result.worker_results.length}`);
  console.log(`Throughput: ${result.metadata.throughput_improvement.toFixed(1)}x\n`);
}

// Example 5: Real-world code review swarm
async function example5_codeReviewSwarm() {
  console.log('=== Example 5: Code Review Swarm (80 files) ===\n');

  const aggregator = new ResultAggregator({
    min_success_threshold: 0.75,
    enable_deduplication: true,
    similarity_threshold: 0.85,
    synthesis_model: 'sonnet-4.5'
  });

  // Simulate reviewing 80 files in parallel
  const files = Array.from({ length: 80 }, (_, i) => `src/components/Component${i}.tsx`);

  const workerPromises = files.map(async (file, i) => {
    // Simulate review latency
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    return createWorkerResult(`haiku-worker-${i}`, 'code-review', {
      file,
      issues: [
        { type: 'style', count: Math.floor(Math.random() * 3) },
        { type: 'bug', count: Math.floor(Math.random() * 2) },
        { type: 'performance', count: Math.floor(Math.random() * 2) }
      ],
      suggestions: Math.floor(Math.random() * 5),
      complexity_score: 0.3 + Math.random() * 0.5
    }, {
      model: 'claude-haiku-4-20250514',
      tokens_used: 600 + Math.floor(Math.random() * 400),
      latency_ms: 500 + Math.random() * 1000,
      confidence_score: 0.75 + Math.random() * 0.25
    });
  });

  const start = performance.now();
  const result = await aggregator.aggregateWithTimeout(
    workerPromises,
    'Review 80 React components for issues and improvements',
    `Synthesize findings into:
    1. Critical issues requiring immediate attention
    2. Common patterns and recommendations
    3. Priority-ranked action items`
  );
  const duration = performance.now() - start;

  console.log(`Code review complete in ${(duration / 1000).toFixed(2)}s`);
  console.log(`Files reviewed: ${result.metadata.successful_workers}/${files.length}`);
  console.log(`Deduplicated: ${result.metadata.deduplication_savings} similar findings`);
  console.log(`Quality filtered: ${result.metadata.quality_filtered} low-confidence results`);
  console.log(`Throughput improvement: ${result.metadata.throughput_improvement.toFixed(1)}x`);
  console.log(`Total tokens: ${result.metadata.total_tokens_used.toLocaleString()}`);
  console.log(`Synthesis tokens: ${result.metadata.synthesis_tokens.toLocaleString()}`);

  // Calculate cost savings (example rates)
  const haikuCostPer1M = 0.25; // $0.25 per 1M input tokens
  const sonnetCostPer1M = 3.00; // $3.00 per 1M input tokens
  const totalCost = (result.metadata.total_tokens_used / 1_000_000) * haikuCostPer1M +
                    (result.metadata.synthesis_tokens / 1_000_000) * sonnetCostPer1M;

  console.log(`\nEstimated cost: $${totalCost.toFixed(4)}`);
  console.log(`Time vs sequential: ${(duration / 1000).toFixed(1)}s vs ${(result.metadata.throughput_improvement * (duration / 1000)).toFixed(1)}s`);
  console.log(`Time savings: ${((1 - 1/result.metadata.throughput_improvement) * 100).toFixed(1)}%\n`);
}

// Example 6: Custom configuration and monitoring
async function example6_customConfiguration() {
  console.log('=== Example 6: Custom Configuration ===\n');

  // Create aggregator with custom config
  const customAggregator = new ResultAggregator({
    min_success_threshold: 0.5,
    max_wait_time_ms: 5000,
    enable_deduplication: true,
    similarity_threshold: 0.95, // Very strict deduplication
    quality_threshold: 0.8, // High quality bar
    synthesis_model: 'opus-4.5', // Use Opus for synthesis
    enable_parallel_validation: true
  });

  console.log('Configuration:');
  const config = customAggregator.getConfig();
  console.log(`  Min success threshold: ${(config.min_success_threshold * 100).toFixed(0)}%`);
  console.log(`  Max wait time: ${config.max_wait_time_ms}ms`);
  console.log(`  Deduplication: ${config.enable_deduplication ? 'enabled' : 'disabled'}`);
  console.log(`  Similarity threshold: ${(config.similarity_threshold * 100).toFixed(0)}%`);
  console.log(`  Quality threshold: ${(config.quality_threshold * 100).toFixed(0)}%`);
  console.log(`  Synthesis model: ${config.synthesis_model}`);

  // Update config dynamically
  customAggregator.updateConfig({
    min_success_threshold: 0.6,
    quality_threshold: 0.7
  });

  console.log(`\nUpdated thresholds:`);
  const updated = customAggregator.getConfig();
  console.log(`  Min success: ${(updated.min_success_threshold * 100).toFixed(0)}%`);
  console.log(`  Quality: ${(updated.quality_threshold * 100).toFixed(0)}%\n`);
}

// Run all examples
async function runExamples() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Result Aggregator Examples - Swarm Intelligence         ║');
  console.log('║   Demonstrates 50-100x throughput improvement              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    await example1_basicSwarm();
    await example2_massiveSwarm();
    await example3_batchedSwarm();
    await example4_partialFailures();
    await example5_codeReviewSwarm();
    await example6_customConfiguration();

    console.log('═══════════════════════════════════════════════════════════');
    console.log('All examples completed successfully!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('Example failed:', error);
    process.exit(1);
  }
}

// Uncomment to run examples
// runExamples();

// Export examples for testing
export {
  example1_basicSwarm,
  example2_massiveSwarm,
  example3_batchedSwarm,
  example4_partialFailures,
  example5_codeReviewSwarm,
  example6_customConfiguration
};
