/**
 * Result Aggregator for Swarm Intelligence
 * Collects and synthesizes results from 50-100 parallel Haiku workers
 * Uses Sonnet for intelligent synthesis and unified QualityAssessor for validation
 *
 * Features:
 * - Handles 50-100x parallel worker results
 * - Graceful partial failure handling
 * - Quality validation and filtering using QualityAssessor
 * - Intelligent deduplication
 * - Coherent synthesis using Sonnet
 * - Performance metrics and monitoring
 */

import { createHash } from 'crypto';
import {
  getQualityAssessor,
  DEFAULT_QUALITY_THRESHOLDS,
  type QualityAssessmentInput,
} from '../quality/quality-assessor';

export interface WorkerResult<T = any> {
  worker_id: string;
  task_id: string;
  status: 'success' | 'failure' | 'partial';
  data: T;
  metadata: {
    model: string;
    tokens_used: number;
    latency_ms: number;
    confidence_score?: number;
    error?: string;
  };
  timestamp: number;
}

export interface AggregationConfig {
  min_success_threshold: number; // Minimum % of successful workers (default 70%)
  max_wait_time_ms: number; // Maximum time to wait for all workers
  enable_deduplication: boolean; // Remove duplicate results
  similarity_threshold: number; // 0-1 for content similarity (default 0.85)
  quality_threshold: number; // Minimum quality score 0-1 (default 0.6)
  synthesis_model: 'sonnet-4.5' | 'opus-4.5'; // Model for synthesis
  enable_parallel_validation: boolean; // Validate results in parallel
}

export interface AggregationResult<T = any> {
  synthesized_output: T;
  success: boolean;
  metadata: {
    total_workers: number;
    successful_workers: number;
    failed_workers: number;
    partial_workers: number;
    deduplication_savings: number;
    quality_filtered: number;
    total_tokens_used: number;
    total_latency_ms: number;
    synthesis_tokens: number;
    throughput_improvement: number; // Actual throughput vs single model
  };
  worker_results: WorkerResult<T>[];
  warnings: string[];
}

export interface SynthesisPrompt {
  task_description: string;
  worker_results: any[];
  synthesis_instructions?: string;
}

/**
 * Result Aggregator for massively parallel swarm operations
 */
export class ResultAggregator {
  private config: AggregationConfig;
  private defaultConfig: AggregationConfig = {
    min_success_threshold: 0.7, // 70% minimum success rate
    max_wait_time_ms: 30000, // 30 seconds max wait
    enable_deduplication: true,
    similarity_threshold: 0.85,
    quality_threshold: DEFAULT_QUALITY_THRESHOLDS.minQualityScore, // Use unified threshold
    synthesis_model: 'sonnet-4.5',
    enable_parallel_validation: true
  };

  constructor(config?: Partial<AggregationConfig>) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Aggregate results from multiple workers
   */
  async aggregate<T>(
    workerResults: WorkerResult<T>[],
    taskDescription: string,
    synthesisInstructions?: string
  ): Promise<AggregationResult<T>> {
    const startTime = performance.now();
    const warnings: string[] = [];

    // Step 1: Validate worker results
    const validatedResults = this.validateResults(workerResults);

    // Step 2: Calculate success rate
    const successRate = this.calculateSuccessRate(validatedResults);
    if (successRate < this.config.min_success_threshold) {
      warnings.push(
        `Success rate ${(successRate * 100).toFixed(1)}% below threshold ${(this.config.min_success_threshold * 100).toFixed(1)}%`
      );
    }

    // Step 3: Filter by quality
    const qualityResults = this.filterByQuality(validatedResults);
    const qualityFiltered = validatedResults.length - qualityResults.length;
    if (qualityFiltered > 0) {
      warnings.push(`Filtered ${qualityFiltered} low-quality results`);
    }

    // Step 4: Deduplicate results
    let deduplicationSavings = 0;
    let uniqueResults = qualityResults;
    if (this.config.enable_deduplication) {
      const beforeCount = qualityResults.length;
      uniqueResults = this.deduplicateResults(qualityResults);
      deduplicationSavings = beforeCount - uniqueResults.length;
      if (deduplicationSavings > 0) {
        warnings.push(`Deduplicated ${deduplicationSavings} similar results`);
      }
    }

    // Step 5: Synthesize using Sonnet
    const synthesizedOutput = await this.synthesizeResults<T>(
      uniqueResults,
      taskDescription,
      synthesisInstructions
    );

    // Step 6: Calculate metrics
    const totalLatency = performance.now() - startTime;
    const metadata = this.calculateMetrics(
      workerResults,
      uniqueResults,
      deduplicationSavings,
      qualityFiltered,
      totalLatency,
      synthesizedOutput.tokens_used
    );

    return {
      synthesized_output: synthesizedOutput.data,
      success: successRate >= this.config.min_success_threshold,
      metadata,
      worker_results: uniqueResults,
      warnings
    };
  }

  /**
   * Validate worker results for completeness and format
   */
  private validateResults<T>(results: WorkerResult<T>[]): WorkerResult<T>[] {
    return results.filter(result => {
      // Must have required fields
      if (!result.worker_id || !result.task_id || !result.status) {
        return false;
      }

      // Must have data (even for partial results)
      if (result.data === undefined || result.data === null) {
        return false;
      }

      // Must have metadata
      if (!result.metadata || typeof result.metadata !== 'object') {
        return false;
      }

      return true;
    });
  }

  /**
   * Calculate success rate from worker results
   */
  private calculateSuccessRate<T>(results: WorkerResult<T>[]): number {
    if (results.length === 0) return 0;

    const successCount = results.filter(
      r => r.status === 'success' || r.status === 'partial'
    ).length;

    return successCount / results.length;
  }

  /**
   * Filter results by quality threshold using QualityAssessor
   */
  private filterByQuality<T>(results: WorkerResult<T>[]): WorkerResult<T>[] {
    const assessor = getQualityAssessor();

    return results.filter(result => {
      // Convert result data to string for quality assessment
      const output = this.extractText(result.data);

      const qualityInput: QualityAssessmentInput = {
        output,
        confidence: result.metadata.confidence_score,
        metadata: {
          truncated: false, // Worker results assumed not truncated
          error: result.metadata.error,
        },
      };

      // Use QualityAssessor to validate against unified thresholds
      return assessor.meetsThresholds(qualityInput);
    });
  }

  /**
   * Deduplicate similar results using content hashing and similarity
   */
  private deduplicateResults<T>(results: WorkerResult<T>[]): WorkerResult<T>[] {
    if (results.length === 0) return results;

    const uniqueResults: WorkerResult<T>[] = [];
    const seenHashes = new Set<string>();

    for (const result of results) {
      const contentHash = this.hashContent(result.data);

      // Check exact duplicates first (fast path)
      if (!seenHashes.has(contentHash)) {
        seenHashes.add(contentHash);
        uniqueResults.push(result);
        continue;
      }

      // Check semantic similarity for near-duplicates
      const isSimilar = this.isSimilarToExisting(result, uniqueResults);
      if (!isSimilar) {
        uniqueResults.push(result);
      }
    }

    return uniqueResults;
  }

  /**
   * Hash content for fast duplicate detection
   */
  private hashContent(data: any): string {
    const normalized = JSON.stringify(data, Object.keys(data).sort());
    return createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Check if result is semantically similar to existing results
   */
  private isSimilarToExisting<T>(
    result: WorkerResult<T>,
    existing: WorkerResult<T>[]
  ): boolean {
    const resultText = this.extractText(result.data);

    for (const existingResult of existing) {
      const existingText = this.extractText(existingResult.data);
      const similarity = this.calculateSimilarity(resultText, existingText);

      if (similarity >= this.config.similarity_threshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract text content from result data for similarity comparison
   */
  private extractText(data: any): string {
    if (typeof data === 'string') {
      return data;
    }

    if (typeof data === 'object' && data !== null) {
      // Handle common patterns
      if (data.content) return String(data.content);
      if (data.text) return String(data.text);
      if (data.result) return String(data.result);
      if (data.output) return String(data.output);

      // Fallback to JSON
      return JSON.stringify(data);
    }

    return String(data);
  }

  /**
   * Calculate text similarity using Jaccard similarity on word tokens
   * Fast approximation suitable for deduplication
   */
  private calculateSimilarity(text1: string, text2: string): number {
    // Normalize and tokenize
    const tokens1 = new Set(this.tokenize(text1.toLowerCase()));
    const tokens2 = new Set(this.tokenize(text2.toLowerCase()));

    // Calculate Jaccard similarity
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.size / union.size;
  }

  /**
   * Simple word tokenization
   */
  private tokenize(text: string): string[] {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  /**
   * Synthesize results using Sonnet for coherent output
   * This is where the magic happens - converting 50-100 worker outputs
   * into a single, high-quality response
   */
  private async synthesizeResults<T>(
    results: WorkerResult<T>[],
    taskDescription: string,
    synthesisInstructions?: string
  ): Promise<{ data: T; tokens_used: number }> {
    // If only one result, return it directly
    if (results.length === 1) {
      return {
        data: results[0].data,
        tokens_used: 0 // No synthesis needed
      };
    }

    // Extract data from all results
    const workerOutputs = results.map(r => ({
      worker_id: r.worker_id,
      confidence: r.metadata.confidence_score || 1.0,
      data: r.data
    }));

    // Build synthesis prompt
    const synthesisPrompt = this.buildSynthesisPrompt(
      taskDescription,
      workerOutputs,
      synthesisInstructions
    );

    // In a real implementation, this would call Anthropic API
    // For now, we'll use a mock synthesis strategy
    const synthesized = await this.mockSynthesis(workerOutputs, synthesisPrompt);

    return synthesized;
  }

  /**
   * Build synthesis prompt for Sonnet
   */
  private buildSynthesisPrompt(
    taskDescription: string,
    workerOutputs: any[],
    customInstructions?: string
  ): string {
    const outputsText = workerOutputs
      .map((output, idx) => {
        return `### Worker ${idx + 1} (confidence: ${(output.confidence * 100).toFixed(0)}%)
${this.formatWorkerOutput(output.data)}`;
      })
      .join('\n\n');

    return `# Task: Result Synthesis

You are synthesizing results from ${workerOutputs.length} parallel workers who completed this task:

**Task Description:**
${taskDescription}

**Worker Results:**
${outputsText}

**Your Goal:**
Analyze all worker results and create a single, coherent, high-quality output that:
1. Combines the best insights from all workers
2. Removes redundancy and contradictions
3. Maintains accuracy and completeness
4. Prioritizes results from high-confidence workers
5. Produces output in the same format as the worker results

${customInstructions ? `**Additional Instructions:**\n${customInstructions}\n` : ''}

Provide only the synthesized result, without meta-commentary.`;
  }

  /**
   * Format worker output for synthesis prompt
   */
  private formatWorkerOutput(data: any): string {
    if (typeof data === 'string') {
      return data;
    }

    if (typeof data === 'object' && data !== null) {
      return JSON.stringify(data, null, 2);
    }

    return String(data);
  }

  /**
   * Mock synthesis for testing (replace with real Anthropic API call)
   * In production, this would call Claude Sonnet 4.5
   */
  private async mockSynthesis<T>(
    workerOutputs: any[],
    synthesisPrompt: string
  ): Promise<{ data: T; tokens_used: number }> {
    // Strategy: Use highest confidence result as base
    const sorted = [...workerOutputs].sort((a, b) => b.confidence - a.confidence);
    const bestResult = sorted[0];

    // In a real implementation, would call:
    // const response = await anthropic.messages.create({
    //   model: 'claude-sonnet-4-5-20250929',
    //   max_tokens: 4096,
    //   messages: [{ role: 'user', content: synthesisPrompt }]
    // });

    // Mock token count (synthesis prompt + response)
    const estimatedTokens = Math.floor(synthesisPrompt.length / 4) + 1000;

    return {
      data: bestResult.data,
      tokens_used: estimatedTokens
    };
  }

  /**
   * Calculate aggregation metrics and throughput improvement
   */
  private calculateMetrics<T>(
    allResults: WorkerResult<T>[],
    usedResults: WorkerResult<T>[],
    deduplicationSavings: number,
    qualityFiltered: number,
    totalLatencyMs: number,
    synthesisTokens: number
  ): AggregationResult<T>['metadata'] {
    const successful = allResults.filter(r => r.status === 'success').length;
    const failed = allResults.filter(r => r.status === 'failure').length;
    const partial = allResults.filter(r => r.status === 'partial').length;

    const totalTokens = allResults.reduce(
      (sum, r) => sum + r.metadata.tokens_used,
      0
    );

    // Calculate throughput improvement
    // Assumption: Workers run in parallel, so total time = max(worker_latency) + synthesis
    const maxWorkerLatency = Math.max(...allResults.map(r => r.metadata.latency_ms));
    const singleModelEstimate = allResults.reduce(
      (sum, r) => sum + r.metadata.latency_ms,
      0
    );
    const actualLatency = maxWorkerLatency + totalLatencyMs;
    const throughputImprovement = singleModelEstimate / actualLatency;

    return {
      total_workers: allResults.length,
      successful_workers: successful,
      failed_workers: failed,
      partial_workers: partial,
      deduplication_savings: deduplicationSavings,
      quality_filtered: qualityFiltered,
      total_tokens_used: totalTokens + synthesisTokens,
      total_latency_ms: totalLatencyMs,
      synthesis_tokens: synthesisTokens,
      throughput_improvement: throughputImprovement
    };
  }

  /**
   * Aggregate results with timeout handling
   */
  async aggregateWithTimeout<T>(
    workerPromises: Promise<WorkerResult<T>>[],
    taskDescription: string,
    synthesisInstructions?: string
  ): Promise<AggregationResult<T>> {
    const timeoutMs = this.config.max_wait_time_ms;

    // Race all workers against timeout
    const settledResults = await Promise.allSettled(
      workerPromises.map(p =>
        this.promiseWithTimeout(p, timeoutMs)
      )
    );

    // Extract successful results
    const workerResults: WorkerResult<T>[] = settledResults
      .map((result, idx) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          // Create failure result for rejected promises
          return {
            worker_id: `worker-${idx}`,
            task_id: 'unknown',
            status: 'failure' as const,
            data: null as T,
            metadata: {
              model: 'haiku',
              tokens_used: 0,
              latency_ms: timeoutMs,
              error: result.reason?.message || 'Worker failed or timed out'
            },
            timestamp: Date.now()
          };
        }
      })
      .filter(r => r !== null);

    return this.aggregate(workerResults, taskDescription, synthesisInstructions);
  }

  /**
   * Wrap promise with timeout
   */
  private promiseWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      )
    ]);
  }

  /**
   * Get configuration
   */
  getConfig(): AggregationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AggregationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Utility: Create worker result
 */
export function createWorkerResult<T>(
  workerId: string,
  taskId: string,
  data: T,
  metadata: Partial<WorkerResult<T>['metadata']> = {}
): WorkerResult<T> {
  return {
    worker_id: workerId,
    task_id: taskId,
    status: 'success',
    data,
    metadata: {
      model: metadata.model || 'claude-haiku-4-20250514',
      tokens_used: metadata.tokens_used || 0,
      latency_ms: metadata.latency_ms || 0,
      confidence_score: metadata.confidence_score || 1.0,
      error: metadata.error
    },
    timestamp: Date.now()
  };
}

/**
 * Utility: Batch workers into groups for controlled parallelism
 */
export function batchWorkers<T>(
  workers: Promise<WorkerResult<T>>[],
  batchSize: number
): Promise<WorkerResult<T>>[][] {
  const batches: Promise<WorkerResult<T>>[][] = [];

  for (let i = 0; i < workers.length; i += batchSize) {
    batches.push(workers.slice(i, i + batchSize));
  }

  return batches;
}

/**
 * Utility: Run batches sequentially
 */
export async function runBatchesSequentially<T>(
  batches: Promise<WorkerResult<T>>[][]
): Promise<WorkerResult<T>[]> {
  const results: WorkerResult<T>[] = [];

  for (const batch of batches) {
    const batchResults = await Promise.allSettled(batch);
    const successfulResults = batchResults
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<WorkerResult<T>>).value);
    results.push(...successfulResults);
  }

  return results;
}

// Export default instance with standard configuration
export const defaultAggregator = new ResultAggregator();
