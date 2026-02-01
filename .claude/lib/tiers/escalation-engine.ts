/**
 * Escalation Engine
 * Automatic tier escalation based on quality failures and complexity mismatches
 *
 * Features:
 * - Detects quality failures using unified QualityAssessor
 * - Detects complexity mismatches (truncated output, context overflow)
 * - Escalates Haiku → Sonnet → Opus
 * - Preserves context from failed attempts
 * - Tracks escalation rate (target: <20%)
 *
 * @module @claude/lib/tiers/escalation-engine
 */

import type { Task } from '../quality/quality-assessor';
import {
  getQualityAssessor,
  DEFAULT_QUALITY_THRESHOLDS,
  type QualityAssessmentInput,
} from '../quality/quality-assessor';

/**
 * Model tier hierarchy for escalation
 */
export type ModelTier = 'haiku' | 'sonnet' | 'opus';

/**
 * Escalation reason for tracking and debugging
 */
export type EscalationReason =
  | 'low-confidence'           // Model expressed low confidence in response
  | 'validation-error'         // Output failed validation checks
  | 'truncated-output'         // Response was incomplete/truncated
  | 'context-overflow'         // Task exceeded model's context window
  | 'parsing-failure'          // Output couldn't be parsed as expected
  | 'quality-threshold'        // Output quality below acceptable threshold
  | 'timeout'                  // Model took too long to respond
  | 'error-response'           // Model returned an error
  | 'retry-limit'              // Previous tier hit retry limit
  | 'complexity-mismatch';     // Detected complexity higher than tier can handle

/**
 * Result from a model execution attempt
 */
export interface ExecutionResult {
  /** Model tier used */
  tier: ModelTier;

  /** Whether execution succeeded */
  success: boolean;

  /** Response from the model */
  response?: string;

  /** Error message if failed */
  error?: string;

  /** Execution metadata */
  metadata: {
    /** Time taken in milliseconds */
    durationMs: number;

    /** Estimated token count */
    tokenCount: number;

    /** Whether output was truncated */
    truncated: boolean;

    /** Model's self-reported confidence (0-1) */
    confidence?: number;

    /** Custom quality score (0-1) */
    qualityScore?: number;
  };

  /** Context from this attempt to preserve for escalation */
  context?: Record<string, any>;
}

/**
 * Escalation decision result
 */
export interface EscalationDecision {
  /** Whether to escalate */
  shouldEscalate: boolean;

  /** Next tier to try if escalating */
  nextTier?: ModelTier;

  /** Reason for escalation */
  reason?: EscalationReason;

  /** Confidence in this decision (0-1) */
  confidence: number;

  /** Additional context for the escalation */
  details?: string;
}

/**
 * Escalation attempt tracking
 */
export interface EscalationAttempt {
  /** Original tier attempted */
  fromTier: ModelTier;

  /** Tier escalated to */
  toTier: ModelTier;

  /** Reason for escalation */
  reason: EscalationReason;

  /** Timestamp of escalation */
  timestamp: number;

  /** Result of escalated attempt */
  result?: ExecutionResult;

  /** Preserved context from failed attempt */
  preservedContext?: Record<string, any>;
}

/**
 * Escalation statistics for monitoring
 */
export interface EscalationStatistics {
  /** Total executions */
  totalExecutions: number;

  /** Total escalations */
  totalEscalations: number;

  /** Escalation rate (0-1) */
  escalationRate: number;

  /** Escalations by tier transition */
  escalationsByTransition: {
    'haiku-to-sonnet': number;
    'haiku-to-opus': number;
    'sonnet-to-opus': number;
  };

  /** Escalations by reason */
  escalationsByReason: Record<EscalationReason, number>;

  /** Average time added by escalation (ms) */
  avgEscalationOverheadMs: number;

  /** Success rate after escalation (0-1) */
  escalationSuccessRate: number;
}

/**
 * Quality validation configuration
 */
export interface QualityThresholds {
  /** Minimum confidence threshold (0-1) */
  minConfidence: number;

  /** Minimum quality score (0-1) */
  minQualityScore: number;

  /** Maximum truncation ratio (0-1) */
  maxTruncationRatio: number;

  /** Minimum completeness score (0-1) */
  minCompleteness: number;
}

/**
 * Escalation configuration
 */
export interface EscalationConfig {
  /** Quality thresholds for validation */
  qualityThresholds: QualityThresholds;

  /** Maximum number of escalation attempts */
  maxEscalations: number;

  /** Whether to preserve context between attempts */
  preserveContext: boolean;

  /** Target escalation rate for optimization */
  targetEscalationRate: number;

  /** Timeout per tier in milliseconds */
  timeoutMs: {
    haiku: number;
    sonnet: number;
    opus: number;
  };
}

/**
 * Default escalation configuration
 * Now uses unified QualityAssessor thresholds
 */
const DEFAULT_CONFIG: EscalationConfig = {
  qualityThresholds: DEFAULT_QUALITY_THRESHOLDS,
  maxEscalations: 2,
  preserveContext: true,
  targetEscalationRate: 0.20, // Target: <20%
  timeoutMs: {
    haiku: 30000,   // 30s
    sonnet: 60000,  // 60s
    opus: 120000    // 120s
  }
};

/**
 * Escalation Engine
 *
 * Manages automatic tier escalation based on quality failures and complexity mismatches
 */
export class EscalationEngine {
  private config: EscalationConfig;
  private statistics: EscalationStatistics;
  private escalationHistory: EscalationAttempt[] = [];
  private readonly maxHistorySize = 1000;

  constructor(config?: Partial<EscalationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.statistics = this.initializeStatistics();
  }

  /**
   * Initialize statistics object
   */
  private initializeStatistics(): EscalationStatistics {
    return {
      totalExecutions: 0,
      totalEscalations: 0,
      escalationRate: 0,
      escalationsByTransition: {
        'haiku-to-sonnet': 0,
        'haiku-to-opus': 0,
        'sonnet-to-opus': 0
      },
      escalationsByReason: {
        'low-confidence': 0,
        'validation-error': 0,
        'truncated-output': 0,
        'context-overflow': 0,
        'parsing-failure': 0,
        'quality-threshold': 0,
        'timeout': 0,
        'error-response': 0,
        'retry-limit': 0,
        'complexity-mismatch': 0
      },
      avgEscalationOverheadMs: 0,
      escalationSuccessRate: 0
    };
  }

  /**
   * Evaluate whether to escalate based on execution result
   *
   * @param result - Result from model execution
   * @param currentTier - Current tier being evaluated
   * @param task - Original task for context
   * @returns Escalation decision
   */
  evaluateEscalation(
    result: ExecutionResult,
    currentTier: ModelTier,
    task?: Task
  ): EscalationDecision {
    // Detect escalation reasons
    const reasons: Array<{ reason: EscalationReason; confidence: number; details: string }> = [];

    // Check for complexity mismatch first (even for successful results)
    // This catches cases where the model gives a technically correct but insufficient answer
    if (task && this.detectComplexityMismatch(task, currentTier, result)) {
      reasons.push({
        reason: 'complexity-mismatch',
        confidence: 0.8,
        details: 'Task complexity appears higher than current tier can handle'
      });
    }

    // If execution succeeded with high quality and no complexity mismatch, no escalation needed
    if (result.success && this.meetsQualityThresholds(result) && reasons.length === 0) {
      return {
        shouldEscalate: false,
        confidence: 0.95,
        details: 'Output meets quality thresholds'
      };
    }

    // Check for low confidence
    if (result.metadata.confidence !== undefined &&
        result.metadata.confidence < this.config.qualityThresholds.minConfidence) {
      reasons.push({
        reason: 'low-confidence',
        confidence: 0.9,
        details: `Confidence ${result.metadata.confidence.toFixed(2)} below threshold ${this.config.qualityThresholds.minConfidence}`
      });
    }

    // Check for truncated output
    if (result.metadata.truncated) {
      reasons.push({
        reason: 'truncated-output',
        confidence: 0.95,
        details: 'Output was truncated, indicating context overflow or incomplete response'
      });
    }

    // Check for quality score
    if (result.metadata.qualityScore !== undefined &&
        result.metadata.qualityScore < this.config.qualityThresholds.minQualityScore) {
      reasons.push({
        reason: 'quality-threshold',
        confidence: 0.85,
        details: `Quality score ${result.metadata.qualityScore.toFixed(2)} below threshold ${this.config.qualityThresholds.minQualityScore}`
      });
    }

    // Check for validation errors
    if (!result.success && result.error?.includes('validation')) {
      reasons.push({
        reason: 'validation-error',
        confidence: 0.9,
        details: `Validation failed: ${result.error}`
      });
    }

    // Check for parsing failures
    if (!result.success && result.error?.includes('parse')) {
      reasons.push({
        reason: 'parsing-failure',
        confidence: 0.85,
        details: `Parsing failed: ${result.error}`
      });
    }

    // Check for context overflow
    if (result.error?.includes('context') || result.error?.includes('token limit')) {
      reasons.push({
        reason: 'context-overflow',
        confidence: 1.0,
        details: 'Task exceeded model context window'
      });
    }

    // Check for timeout
    if (result.error?.includes('timeout') ||
        result.metadata.durationMs > this.config.timeoutMs[currentTier]) {
      reasons.push({
        reason: 'timeout',
        confidence: 0.8,
        details: `Execution exceeded timeout (${result.metadata.durationMs}ms)`
      });
    }

    // Check for error response
    if (!result.success && result.error && reasons.length === 0) {
      reasons.push({
        reason: 'error-response',
        confidence: 0.75,
        details: `Error: ${result.error}`
      });
    }

    // No escalation needed if no reasons found
    if (reasons.length === 0) {
      return {
        shouldEscalate: false,
        confidence: 0.7,
        details: 'No escalation criteria met, but quality is marginal'
      };
    }

    // Select highest confidence reason
    reasons.sort((a, b) => b.confidence - a.confidence);
    const primaryReason = reasons[0];

    // Determine next tier
    const nextTier = this.getNextTier(currentTier);

    if (!nextTier) {
      return {
        shouldEscalate: false,
        confidence: 1.0,
        details: 'Already at highest tier (Opus), cannot escalate further'
      };
    }

    return {
      shouldEscalate: true,
      nextTier,
      reason: primaryReason.reason,
      confidence: primaryReason.confidence,
      details: primaryReason.details
    };
  }

  /**
   * Check if result meets quality thresholds using QualityAssessor
   */
  private meetsQualityThresholds(result: ExecutionResult): boolean {
    const assessor = getQualityAssessor();

    const qualityInput: QualityAssessmentInput = {
      output: result.response || '',
      confidence: result.metadata.confidence,
      metadata: {
        truncated: result.metadata.truncated,
        error: result.error,
      },
    };

    return assessor.meetsThresholds(qualityInput);
  }

  /**
   * Detect complexity mismatch using heuristics
   */
  private detectComplexityMismatch(
    task: Task,
    currentTier: ModelTier,
    result: ExecutionResult
  ): boolean {
    // Heuristics for complexity mismatch:
    // 1. Response is very short compared to task description (incomplete)
    // 2. Multiple technical domains mentioned but simple response
    // 3. Task mentions architecture/design but response is implementation-level

    const taskDesc = task.description || '';
    const response = result.response || '';

    // Heuristic 1: Response too short for complex task
    if (taskDesc.length > 500 && response.length < 200) {
      return true;
    }

    // Heuristic 2: Task mentions multiple domains
    const complexityIndicators = [
      'architecture', 'system design', 'microservices', 'distributed',
      'scalability', 'performance', 'optimization', 'refactor',
      'multiple files', 'cross-cutting', 'end-to-end'
    ];

    const indicatorCount = complexityIndicators.filter(
      indicator => taskDesc.toLowerCase().includes(indicator)
    ).length;

    if (indicatorCount >= 3 && currentTier === 'haiku') {
      return true;
    }

    if (indicatorCount >= 5 && currentTier === 'sonnet') {
      return true;
    }

    // Heuristic 3: Low quality score with multiple questions in task
    const questionCount = (taskDesc.match(/\?/g) || []).length;
    if (questionCount >= 3 && result.metadata.qualityScore &&
        result.metadata.qualityScore < 0.6) {
      return true;
    }

    return false;
  }

  /**
   * Get next tier in escalation chain
   */
  private getNextTier(currentTier: ModelTier): ModelTier | null {
    switch (currentTier) {
      case 'haiku':
        return 'sonnet';
      case 'sonnet':
        return 'opus';
      case 'opus':
        return null; // Already at highest tier
      default:
        return null;
    }
  }

  /**
   * Record an escalation attempt
   */
  recordEscalation(
    fromTier: ModelTier,
    toTier: ModelTier,
    reason: EscalationReason,
    result?: ExecutionResult,
    preservedContext?: Record<string, any>
  ): void {
    const attempt: EscalationAttempt = {
      fromTier,
      toTier,
      reason,
      timestamp: Date.now(),
      result,
      preservedContext
    };

    this.escalationHistory.push(attempt);

    // Trim history if too large
    if (this.escalationHistory.length > this.maxHistorySize) {
      this.escalationHistory.shift();
    }

    // Update statistics
    this.statistics.totalEscalations++;
    this.statistics.totalExecutions++; // Escalation counts as an execution

    const transition = `${fromTier}-to-${toTier}` as keyof typeof this.statistics.escalationsByTransition;
    if (transition in this.statistics.escalationsByTransition) {
      this.statistics.escalationsByTransition[transition]++;
    }

    this.statistics.escalationsByReason[reason]++;

    // Update success rate
    const successfulEscalations = this.escalationHistory.filter(
      a => a.result?.success
    ).length;
    if (this.statistics.totalEscalations > 0) {
      this.statistics.escalationSuccessRate =
        successfulEscalations / this.statistics.totalEscalations;
    }

    // Update escalation rate
    this.updateEscalationRate();
  }

  /**
   * Record a successful execution (no escalation needed)
   */
  recordExecution(tier: ModelTier, durationMs: number): void {
    this.statistics.totalExecutions++;
    this.updateEscalationRate();

    // Update average overhead if escalation occurred
    if (this.statistics.totalEscalations > 0) {
      const totalOverhead = this.statistics.avgEscalationOverheadMs *
        (this.statistics.totalEscalations - 1);
      this.statistics.avgEscalationOverheadMs =
        (totalOverhead + durationMs) / this.statistics.totalEscalations;
    }
  }

  /**
   * Update escalation rate
   */
  private updateEscalationRate(): void {
    if (this.statistics.totalExecutions > 0) {
      this.statistics.escalationRate =
        this.statistics.totalEscalations / this.statistics.totalExecutions;
    }
  }

  /**
   * Preserve context from failed attempt for escalation
   */
  preserveContext(result: ExecutionResult, task: Task): Record<string, any> {
    if (!this.config.preserveContext) {
      return {};
    }

    return {
      // Original task info
      originalTask: task,

      // Failed attempt info
      failedAttempt: {
        tier: result.tier,
        response: result.response,
        error: result.error,
        metadata: result.metadata
      },

      // Additional context from result
      ...result.context,

      // Timestamp
      preservedAt: Date.now()
    };
  }

  /**
   * Get escalation statistics
   */
  getStatistics(): EscalationStatistics {
    return { ...this.statistics };
  }

  /**
   * Get escalation history
   */
  getHistory(limit?: number): EscalationAttempt[] {
    const history = [...this.escalationHistory];
    if (limit) {
      return history.slice(-limit);
    }
    return history;
  }

  /**
   * Get recent escalations by reason
   */
  getEscalationsByReason(reason: EscalationReason, limit: number = 10): EscalationAttempt[] {
    return this.escalationHistory
      .filter(attempt => attempt.reason === reason)
      .slice(-limit);
  }

  /**
   * Check if escalation rate is within target
   */
  isWithinTarget(): boolean {
    return this.statistics.escalationRate <= this.config.targetEscalationRate;
  }

  /**
   * Get escalation rate health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    escalationRate: number;
    target: number;
  } {
    const rate = this.statistics.escalationRate;
    const target = this.config.targetEscalationRate;

    if (rate <= target) {
      return {
        status: 'healthy',
        message: `Escalation rate ${(rate * 100).toFixed(1)}% is within target ${(target * 100).toFixed(1)}%`,
        escalationRate: rate,
        target
      };
    } else if (rate <= target * 1.5) {
      return {
        status: 'warning',
        message: `Escalation rate ${(rate * 100).toFixed(1)}% is above target ${(target * 100).toFixed(1)}%`,
        escalationRate: rate,
        target
      };
    } else {
      return {
        status: 'critical',
        message: `Escalation rate ${(rate * 100).toFixed(1)}% is significantly above target ${(target * 100).toFixed(1)}%`,
        escalationRate: rate,
        target
      };
    }
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.statistics = this.initializeStatistics();
    this.escalationHistory = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<EscalationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): EscalationConfig {
    return { ...this.config };
  }

  /**
   * Export escalation history for persistence
   */
  exportHistory(): EscalationAttempt[] {
    return [...this.escalationHistory];
  }

  /**
   * Import escalation history from persistence
   */
  importHistory(history: EscalationAttempt[]): void {
    this.escalationHistory = history.slice(-this.maxHistorySize);

    // Recalculate statistics from history
    this.statistics = this.initializeStatistics();

    for (const attempt of this.escalationHistory) {
      this.statistics.totalEscalations++;

      const transition = `${attempt.fromTier}-to-${attempt.toTier}` as keyof typeof this.statistics.escalationsByTransition;
      if (transition in this.statistics.escalationsByTransition) {
        this.statistics.escalationsByTransition[transition]++;
      }

      this.statistics.escalationsByReason[attempt.reason]++;

      if (attempt.result?.success) {
        const successfulEscalations = this.escalationHistory.filter(
          a => a.result?.success
        ).length;
        this.statistics.escalationSuccessRate =
          successfulEscalations / this.statistics.totalEscalations;
      }
    }
  }
}

/**
 * Create a default escalation engine instance
 */
export const escalationEngine = new EscalationEngine();

/**
 * Helper function to create execution result from model response
 */
export function createExecutionResult(
  tier: ModelTier,
  response: string,
  metadata: Partial<ExecutionResult['metadata']>,
  error?: string
): ExecutionResult {
  return {
    tier,
    success: !error,
    response: error ? undefined : response,
    error,
    metadata: {
      durationMs: metadata.durationMs || 0,
      tokenCount: metadata.tokenCount || Math.ceil(response.length / 4),
      truncated: metadata.truncated || false,
      confidence: metadata.confidence,
      qualityScore: metadata.qualityScore
    }
  };
}

/**
 * Helper function to escalate with automatic context preservation
 */
export async function escalateWithRetry<T>(
  task: Task,
  executor: (tier: ModelTier, context?: Record<string, any>) => Promise<ExecutionResult>,
  initialTier: ModelTier,
  engine: EscalationEngine = escalationEngine
): Promise<{ result: ExecutionResult; escalations: number }> {
  let currentTier = initialTier;
  let escalations = 0;
  let preservedContext: Record<string, any> | undefined = undefined;
  let hasContext = false;

  // P1: Absolute safety limit to prevent infinite loops (should never be hit if config is correct)
  const ABSOLUTE_MAX_ESCALATIONS = 10;

  while (true) {
    // P1: Hard-coded safety check independent of configuration
    if (escalations >= ABSOLUTE_MAX_ESCALATIONS) {
      console.error(`[ESCALATION SAFETY] Hit absolute escalation limit (${ABSOLUTE_MAX_ESCALATIONS}) - bug suspected in escalation logic or config`);
      return { result: { success: false, error: 'Absolute escalation limit exceeded' } as ExecutionResult, escalations };
    }
    const startTime = Date.now();

    // Execute with current tier (pass undefined for first attempt, not empty object)
    const result = await executor(currentTier, hasContext ? preservedContext : undefined);
    const durationMs = Date.now() - startTime;

    // Evaluate escalation
    const decision = engine.evaluateEscalation(result, currentTier, task);

    // If successful or no escalation needed, return
    if (!decision.shouldEscalate) {
      engine.recordExecution(currentTier, durationMs);
      return { result, escalations };
    }

    // Cannot escalate further
    if (!decision.nextTier) {
      engine.recordExecution(currentTier, durationMs);
      return { result, escalations };
    }

    // Check if we've hit max escalations
    if (escalations >= engine.getConfig().maxEscalations) {
      // Return current result without further escalation
      engine.recordExecution(currentTier, durationMs);
      return { result, escalations };
    }

    // Preserve context and escalate
    preservedContext = engine.preserveContext(result, task);
    hasContext = true;

    engine.recordEscalation(
      currentTier,
      decision.nextTier,
      decision.reason!,
      result,
      preservedContext
    );

    currentTier = decision.nextTier;
    escalations++;
  }
}
