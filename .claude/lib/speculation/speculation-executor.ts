/**
 * Speculative Pre-Execution Engine
 *
 * Executes top 3 predictions in parallel using Haiku for near-instant responses.
 * Implements budget limits, result caching, and background refinement with Sonnet.
 * Uses unified QualityAssessor for quality estimation.
 *
 * Target: 8-10x apparent speed improvement through predictive execution.
 *
 * @module speculation-executor
 * @version 1.0.0
 */

import { createHash } from 'crypto';
import { performance } from 'perf_hooks';
import {
  getQualityAssessor,
  type QualityAssessmentInput,
} from '../quality/quality-assessor';

/**
 * Prediction from intent predictor
 */
export interface Prediction {
  /** Action to execute */
  action: string;

  /** Confidence score (0-1) */
  confidence: number;

  /** Context for execution */
  context?: Record<string, any>;

  /** Required skills/agents */
  requiredAgents?: string[];

  /** Priority (higher = more important) */
  priority?: number;
}

/**
 * Speculation execution result
 */
export interface SpeculationResult<T = any> {
  /** The prediction that was executed */
  prediction: Prediction;

  /** Execution result */
  result: T;

  /** Model used (haiku or sonnet) */
  model: 'haiku' | 'sonnet';

  /** Execution time in ms */
  executionTimeMs: number;

  /** Token usage */
  tokens: {
    input: number;
    output: number;
  };

  /** Quality score (if available) */
  quality?: number;

  /** Whether this was cached */
  cached: boolean;

  /** Timestamp */
  timestamp: number;
}

/**
 * Cache entry for speculated results
 */
interface SpeculationCacheEntry<T = any> {
  /** Cache key */
  key: string;

  /** Cached result */
  result: SpeculationResult<T>;

  /** TTL expiration timestamp */
  expiresAt: number;

  /** Number of cache hits */
  hits: number;

  /** Background refinement status */
  refinement?: {
    inProgress: boolean;
    refinedResult?: SpeculationResult<T>;
    refinedAt?: number;
  };
}

/**
 * Execution budget limits
 */
export interface ExecutionBudget {
  /** Maximum concurrent speculations */
  maxSpeculations: number;

  /** Maximum execution time per speculation (ms) */
  timeoutMs: number;

  /** Maximum tokens per speculation */
  maxTokens: number;

  /** Maximum total cost (USD) */
  maxCostUsd?: number;
}

/**
 * Speculation executor configuration
 */
export interface SpeculationConfig {
  /** Enable speculation */
  enabled: boolean;

  /** Budget limits */
  budget: ExecutionBudget;

  /** Cache TTL in seconds */
  cacheTtlSeconds: number;

  /** Minimum confidence threshold for speculation */
  minConfidence: number;

  /** Enable background refinement */
  backgroundRefinement: boolean;

  /** Model costs (per 1M tokens) */
  modelCosts: {
    haiku: { input: number; output: number };
    sonnet: { input: number; output: number };
  };
}

/**
 * Speculation statistics
 */
export interface SpeculationStats {
  /** Total speculations executed */
  totalSpeculations: number;

  /** Cache hits */
  cacheHits: number;

  /** Cache misses */
  cacheMisses: number;

  /** Cache hit rate */
  hitRate: number;

  /** Average speculation time (ms) */
  avgSpeculationTimeMs: number;

  /** Average response time when cached (ms) */
  avgCachedResponseTimeMs: number;

  /** Apparent speed improvement */
  speedupRatio: number;

  /** Total tokens saved */
  tokensSaved: number;

  /** Total cost saved (USD) */
  costSavedUsd: number;

  /** Background refinements completed */
  refinementsCompleted: number;
}

/**
 * Mock model executor interface
 * In production, this would integrate with Claude API
 */
interface ModelExecutor {
  execute<T>(
    prompt: string,
    model: 'haiku' | 'sonnet',
    options: {
      maxTokens: number;
      timeout: number;
    }
  ): Promise<{
    result: T;
    tokens: { input: number; output: number };
    executionTimeMs: number;
  }>;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SpeculationConfig = {
  enabled: true,
  budget: {
    maxSpeculations: 5,
    timeoutMs: 5000,
    maxTokens: 2000,
    maxCostUsd: 0.05
  },
  cacheTtlSeconds: 600, // 10 minutes
  minConfidence: 0.7,
  backgroundRefinement: true,
  modelCosts: {
    haiku: { input: 0.25, output: 1.25 },
    sonnet: { input: 3.00, output: 15.00 }
  }
};

/**
 * Speculation Executor
 *
 * Implements predictive pre-execution with caching and background refinement.
 */
export class SpeculationExecutor {
  private config: SpeculationConfig;
  private cache: Map<string, SpeculationCacheEntry>;
  private stats: SpeculationStats;
  private modelExecutor: ModelExecutor;
  private activeSpeculations: Set<string>;
  private backgroundQueue: Map<string, Promise<void>>;

  constructor(
    config: Partial<SpeculationConfig> = {},
    modelExecutor?: ModelExecutor
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new Map();
    this.activeSpeculations = new Set();
    this.backgroundQueue = new Map();

    // Initialize stats
    this.stats = {
      totalSpeculations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      avgSpeculationTimeMs: 0,
      avgCachedResponseTimeMs: 0,
      speedupRatio: 1,
      tokensSaved: 0,
      costSavedUsd: 0,
      refinementsCompleted: 0
    };

    // Use provided executor or create mock
    this.modelExecutor = modelExecutor || this.createMockExecutor();
  }

  /**
   * Execute top predictions in parallel with budget limits
   */
  async executeSpeculations(predictions: Prediction[]): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const startTime = performance.now();

    // Filter and sort predictions
    const validPredictions = predictions
      .filter(p => p.confidence >= this.config.minConfidence)
      .sort((a, b) => {
        // Sort by confidence * priority
        const scoreA = a.confidence * (a.priority || 1);
        const scoreB = b.confidence * (b.priority || 1);
        return scoreB - scoreA;
      })
      .slice(0, this.config.budget.maxSpeculations);

    if (validPredictions.length === 0) {
      return;
    }

    // Execute top predictions in parallel
    const speculationPromises = validPredictions.map(prediction =>
      this.executeSpeculation(prediction)
    );

    // Wait for all with individual timeout handling
    await Promise.allSettled(speculationPromises);

    const executionTime = performance.now() - startTime;
    this.updateExecutionStats(executionTime);
  }

  /**
   * Get cached result or null
   */
  async getCachedResult<T = any>(
    action: string,
    context?: Record<string, any>
  ): Promise<SpeculationResult<T> | null> {
    const key = this.generateCacheKey(action, context);
    const cached = this.cache.get(key);

    if (!cached) {
      this.stats.cacheMisses++;
      this.updateHitRate();
      return null;
    }

    // Check expiration
    if (cached.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.stats.cacheMisses++;
      this.updateHitRate();
      return null;
    }

    // Update hit stats
    cached.hits++;
    this.stats.cacheHits++;
    this.updateHitRate();

    // Calculate tokens and cost saved
    const result = cached.result;
    this.stats.tokensSaved += result.tokens.input + result.tokens.output;
    this.stats.costSavedUsd += this.calculateCost(
      result.model,
      result.tokens.input,
      result.tokens.output
    );

    // Return refined result if available, otherwise original
    if (cached.refinement?.refinedResult) {
      return {
        ...cached.refinement.refinedResult,
        cached: true
      };
    }

    return {
      ...cached.result,
      cached: true
    };
  }

  /**
   * Execute a single speculation
   */
  private async executeSpeculation(prediction: Prediction): Promise<void> {
    const key = this.generateCacheKey(prediction.action, prediction.context);

    // Skip if already in progress
    if (this.activeSpeculations.has(key)) {
      return;
    }

    // Skip if already cached
    const existing = this.cache.get(key);
    if (existing && existing.expiresAt > Date.now()) {
      return;
    }

    this.activeSpeculations.add(key);
    this.stats.totalSpeculations++;

    try {
      const startTime = performance.now();

      // Execute with Haiku (fast + cheap)
      const prompt = this.buildPrompt(prediction);
      const execution = await this.executeWithTimeout(
        this.modelExecutor.execute(prompt, 'haiku', {
          maxTokens: this.config.budget.maxTokens,
          timeout: this.config.budget.timeoutMs
        }),
        this.config.budget.timeoutMs
      );

      if (!execution) {
        // Timeout - skip caching
        return;
      }

      const executionTime = performance.now() - startTime;

      // Create speculation result
      const result: SpeculationResult = {
        prediction,
        result: execution.result,
        model: 'haiku',
        executionTimeMs: executionTime,
        tokens: execution.tokens,
        cached: false,
        timestamp: Date.now()
      };

      // Cache the result
      const cacheEntry: SpeculationCacheEntry = {
        key,
        result,
        expiresAt: Date.now() + this.config.cacheTtlSeconds * 1000,
        hits: 0,
        refinement: {
          inProgress: false
        }
      };

      this.cache.set(key, cacheEntry);

      // Trigger background refinement if enabled
      if (this.config.backgroundRefinement) {
        this.scheduleBackgroundRefinement(key, prediction);
      }
    } catch (error) {
      console.error(`Speculation failed for ${prediction.action}:`, error);
    } finally {
      this.activeSpeculations.delete(key);
    }
  }

  /**
   * Schedule background refinement with Sonnet
   */
  private scheduleBackgroundRefinement(
    cacheKey: string,
    prediction: Prediction
  ): void {
    const cached = this.cache.get(cacheKey);
    if (!cached || !cached.refinement) {
      return;
    }

    // Mark as in progress
    cached.refinement.inProgress = true;

    // Execute refinement in background
    const refinementPromise = this.executeBackgroundRefinement(
      cacheKey,
      prediction
    );

    this.backgroundQueue.set(cacheKey, refinementPromise);
  }

  /**
   * Execute background refinement with Sonnet
   */
  private async executeBackgroundRefinement(
    cacheKey: string,
    prediction: Prediction
  ): Promise<void> {
    try {
      const prompt = this.buildPrompt(prediction);
      const startTime = performance.now();

      // Execute with Sonnet (higher quality)
      const execution = await this.modelExecutor.execute(prompt, 'sonnet', {
        maxTokens: this.config.budget.maxTokens * 2, // More tokens for refinement
        timeout: this.config.budget.timeoutMs * 2 // More time for refinement
      });

      const executionTime = performance.now() - startTime;

      // Create refined result
      const refinedResult: SpeculationResult = {
        prediction,
        result: execution.result,
        model: 'sonnet',
        executionTimeMs: executionTime,
        tokens: execution.tokens,
        quality: this.estimateQuality(execution.result),
        cached: false,
        timestamp: Date.now()
      };

      // Update cache with refined result
      const cached = this.cache.get(cacheKey);
      if (cached && cached.refinement) {
        cached.refinement.refinedResult = refinedResult;
        cached.refinement.refinedAt = Date.now();
        cached.refinement.inProgress = false;
        this.stats.refinementsCompleted++;
      }
    } catch (error) {
      console.error('Background refinement failed:', error);

      // Mark as failed
      const cached = this.cache.get(cacheKey);
      if (cached && cached.refinement) {
        cached.refinement.inProgress = false;
      }
    } finally {
      this.backgroundQueue.delete(cacheKey);
    }
  }

  /**
   * Build prompt for prediction
   */
  private buildPrompt(prediction: Prediction): string {
    const contextStr = prediction.context
      ? `\n\nContext: ${JSON.stringify(prediction.context, null, 2)}`
      : '';

    return `Execute the following action: ${prediction.action}${contextStr}`;
  }

  /**
   * Generate cache key from action and context
   */
  private generateCacheKey(
    action: string,
    context?: Record<string, any>
  ): string {
    const hash = createHash('sha256');
    hash.update(action);
    if (context) {
      hash.update(JSON.stringify(context));
    }
    return `spec:${hash.digest('hex')}`;
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T | null> {
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), timeoutMs)
    );

    return Promise.race([promise, timeout]);
  }

  /**
   * Calculate execution cost
   */
  private calculateCost(
    model: 'haiku' | 'sonnet',
    inputTokens: number,
    outputTokens: number
  ): number {
    const costs = this.config.modelCosts[model];
    const inputCost = (inputTokens / 1_000_000) * costs.input;
    const outputCost = (outputTokens / 1_000_000) * costs.output;
    return inputCost + outputCost;
  }

  /**
   * Estimate quality of result using QualityAssessor
   */
  private estimateQuality(result: any): number {
    const assessor = getQualityAssessor();

    // Convert result to string for quality assessment
    const output = typeof result === 'string' ? result : JSON.stringify(result);

    const qualityInput: QualityAssessmentInput = {
      output,
      metadata: {
        truncated: false,
      },
    };

    const assessment = assessor.assessQuality(qualityInput);
    return assessment.score;
  }

  /**
   * Update execution statistics
   */
  private updateExecutionStats(executionTimeMs: number): void {
    const totalExecutions = this.stats.totalSpeculations;
    this.stats.avgSpeculationTimeMs =
      (this.stats.avgSpeculationTimeMs * (totalExecutions - 1) + executionTimeMs) /
      totalExecutions;
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.cacheHits + this.stats.cacheMisses;
    this.stats.hitRate = total > 0 ? this.stats.cacheHits / total : 0;

    // Calculate speedup ratio
    // Assume: cached lookup = 50ms, speculation execution = 800ms (Haiku avg)
    const avgCachedTime = 50;
    const avgExecutionTime = 800;

    if (this.stats.hitRate > 0) {
      this.stats.avgCachedResponseTimeMs = avgCachedTime;
      this.stats.speedupRatio = avgExecutionTime / (
        this.stats.hitRate * avgCachedTime +
        (1 - this.stats.hitRate) * avgExecutionTime
      );
    }
  }

  /**
   * Create mock executor for testing
   */
  private createMockExecutor(): ModelExecutor {
    return {
      async execute<T>(
        prompt: string,
        model: 'haiku' | 'sonnet',
        options: { maxTokens: number; timeout: number }
      ): Promise<{
        result: T;
        tokens: { input: number; output: number };
        executionTimeMs: number;
      }> {
        // Simulate execution time
        const baseTime = model === 'haiku' ? 800 : 2500;
        const variance = baseTime * 0.2;
        const executionTime = baseTime + (Math.random() - 0.5) * variance;

        await new Promise(resolve => setTimeout(resolve, executionTime));

        // Mock token usage
        const inputTokens = Math.floor(prompt.length / 4);
        const outputTokens = Math.floor(Math.random() * 1000) + 500;

        return {
          result: {
            success: true,
            data: `Mock result for: ${prompt.slice(0, 50)}...`,
            model,
            timestamp: Date.now()
          } as T,
          tokens: {
            input: inputTokens,
            output: outputTokens
          },
          executionTimeMs: executionTime
        };
      }
    };
  }

  /**
   * Get current statistics
   */
  getStats(): SpeculationStats {
    return { ...this.stats };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Validate performance targets
   *
   * Validates that we're achieving 8-10x apparent speed improvement
   */
  validatePerformanceTargets(): {
    valid: boolean;
    speedup: number;
    hitRate: number;
    issues: string[];
  } {
    const issues: string[] = [];
    const speedup = this.stats.speedupRatio;
    const hitRate = this.stats.hitRate;

    // Target: 8-10x speedup
    if (speedup < 8) {
      issues.push(
        `Speedup ${speedup.toFixed(2)}x is below target of 8x. ` +
        `Increase cache hit rate or reduce speculation latency.`
      );
    }

    // Target: >80% hit rate for predictable workflows
    if (hitRate < 0.8) {
      issues.push(
        `Hit rate ${(hitRate * 100).toFixed(1)}% is below target of 80%. ` +
        `Improve prediction accuracy or increase speculation coverage.`
      );
    }

    // Validate cache is being used
    if (this.stats.totalSpeculations > 50 && this.stats.cacheHits === 0) {
      issues.push(
        'No cache hits after 50 speculations. Cache may not be working correctly.'
      );
    }

    return {
      valid: issues.length === 0 && speedup >= 8,
      speedup,
      hitRate,
      issues
    };
  }

  /**
   * Export cache statistics for monitoring
   */
  exportStats(): {
    stats: SpeculationStats;
    cacheEntries: number;
    activeSpeculations: number;
    backgroundQueue: number;
    validation: ReturnType<typeof this.validatePerformanceTargets>;
  } {
    return {
      stats: this.getStats(),
      cacheEntries: this.cache.size,
      activeSpeculations: this.activeSpeculations.size,
      backgroundQueue: this.backgroundQueue.size,
      validation: this.validatePerformanceTargets()
    };
  }
}

/**
 * Example usage and performance validation
 */
export async function exampleUsage() {
  console.log('=== Speculation Executor Example ===\n');

  // Create executor with custom config
  const executor = new SpeculationExecutor({
    enabled: true,
    budget: {
      maxSpeculations: 5,
      timeoutMs: 5000,
      maxTokens: 2000
    },
    cacheTtlSeconds: 600,
    minConfidence: 0.7,
    backgroundRefinement: true
  });

  // Example predictions from workflow
  const predictions: Prediction[] = [
    {
      action: 'run cargo check',
      confidence: 0.95,
      priority: 3,
      context: { project: 'rust-app' }
    },
    {
      action: 'fix related borrow errors',
      confidence: 0.80,
      priority: 2,
      context: { project: 'rust-app' }
    },
    {
      action: 'run tests',
      confidence: 0.70,
      priority: 1,
      context: { project: 'rust-app' }
    }
  ];

  console.log('1. Executing speculations...');
  await executor.executeSpeculations(predictions);

  console.log('\n2. Initial stats:');
  console.log(JSON.stringify(executor.getStats(), null, 2));

  // Simulate user requesting predicted action
  console.log('\n3. User requests "run cargo check" (should hit cache)...');
  const startTime = performance.now();
  const result = await executor.getCachedResult('run cargo check', {
    project: 'rust-app'
  });
  const responseTime = performance.now() - startTime;

  console.log(`   Response time: ${responseTime.toFixed(2)}ms`);
  console.log(`   Cache hit: ${result?.cached ? 'YES' : 'NO'}`);
  console.log(`   Model used: ${result?.model || 'N/A'}`);

  // Wait for background refinement
  console.log('\n4. Waiting for background refinement...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Check refined result
  const refinedResult = await executor.getCachedResult('run cargo check', {
    project: 'rust-app'
  });
  console.log(`   Refined with Sonnet: ${refinedResult?.model === 'sonnet' ? 'YES' : 'NO'}`);

  // Validate performance targets
  console.log('\n5. Performance validation:');
  const validation = executor.validatePerformanceTargets();
  console.log(`   Valid: ${validation.valid}`);
  console.log(`   Speedup: ${validation.speedup.toFixed(2)}x`);
  console.log(`   Hit rate: ${(validation.hitRate * 100).toFixed(1)}%`);

  if (validation.issues.length > 0) {
    console.log('\n   Issues:');
    validation.issues.forEach(issue => console.log(`   - ${issue}`));
  }

  console.log('\n6. Final statistics:');
  console.log(JSON.stringify(executor.exportStats(), null, 2));
}

// Export singleton instance
export const speculationExecutor = new SpeculationExecutor();
