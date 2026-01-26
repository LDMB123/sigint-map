/**
 * Unified Quality Assessor
 *
 * Single source of truth for quality and complexity assessment across the agent ecosystem.
 * Consolidates assessment logic from TierSelector, EscalationEngine, SpeculationExecutor, and ResultAggregator.
 *
 * Features:
 * - Task complexity scoring (0-100 scale)
 * - Output quality assessment (0-1 scale)
 * - Confidence evaluation (0-1 scale)
 * - Completeness validation (0-1 scale)
 * - Unified threshold configuration
 * - Consistent scoring algorithms
 *
 * @module @claude/lib/quality/quality-assessor
 * @version 1.0.0
 */

/**
 * Task interface for complexity analysis
 */
export interface Task {
  description: string;
  domain?: string;
  requiredCapabilities?: string[];
  contextSize?: number;
  constraints?: string[];
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Quality assessment input
 */
export interface QualityAssessmentInput {
  /** Response text to assess */
  response?: string;

  /** Model's self-reported confidence (0-1) */
  confidence?: number;

  /** Execution metadata */
  metadata?: {
    /** Whether output was truncated */
    truncated?: boolean;

    /** Token count */
    tokenCount?: number;

    /** Execution time in ms */
    durationMs?: number;

    /** Any error message */
    error?: string;
  };

  /** Original task for context */
  task?: Task;
}

/**
 * Complexity signals extracted from task
 */
export interface ComplexitySignals {
  tokenCount: number;
  questionCount: number;
  stepCount: number;
  domainCount: number;
  fileCount: number;
  abstractionLevel: number;
}

/**
 * Complexity assessment result
 */
export interface ComplexityAssessment {
  /** Complexity score (0-100) */
  score: number;

  /** Recommended tier based on score */
  tier: 'haiku' | 'sonnet' | 'opus';

  /** Extracted signals */
  signals: ComplexitySignals;

  /** Score breakdown by signal */
  contributions: {
    tokenCount: number;
    questionCount: number;
    stepCount: number;
    domainCount: number;
    fileCount: number;
    abstractionLevel: number;
  };
}

/**
 * Quality assessment result
 */
export interface QualityAssessment {
  /** Overall quality score (0-1) */
  score: number;

  /** Individual quality dimensions */
  dimensions: {
    /** Confidence score (0-1) */
    confidence: number;

    /** Completeness score (0-1) */
    completeness: number;

    /** Coherence score (0-1) */
    coherence: number;

    /** Correctness indicators (0-1) */
    correctness: number;
  };

  /** Whether quality meets thresholds */
  meetsThreshold: boolean;

  /** Issues detected */
  issues: QualityIssue[];
}

/**
 * Quality issue detected
 */
export interface QualityIssue {
  type: 'low-confidence' | 'truncated' | 'incomplete' | 'incoherent' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  dimension: keyof QualityAssessment['dimensions'];
}

/**
 * Quality thresholds configuration
 */
export interface QualityThresholds {
  /** Minimum overall quality score (0-1) */
  minQualityScore: number;

  /** Minimum confidence threshold (0-1) */
  minConfidence: number;

  /** Minimum completeness (0-1) */
  minCompleteness: number;

  /** Maximum truncation ratio (0-1) */
  maxTruncationRatio: number;
}

/**
 * Default quality thresholds
 * Single source of truth for all systems
 */
export const DEFAULT_QUALITY_THRESHOLDS: QualityThresholds = {
  minQualityScore: 0.75,
  minConfidence: 0.7,
  minCompleteness: 0.9,
  maxTruncationRatio: 0.05,
} as const;

/**
 * Complexity scoring weights
 * Single source of truth for complexity calculation
 */
const COMPLEXITY_WEIGHTS = {
  tokenCount: 0.15,
  questionCount: 0.20,
  stepCount: 0.20,
  domainCount: 0.15,
  fileCount: 0.10,
  abstractionLevel: 0.20,
} as const;

/**
 * Tier thresholds for model selection
 * Single source of truth for tier boundaries
 */
export const TIER_THRESHOLDS = {
  haiku: { max: 30 },
  sonnet: { min: 25, max: 70 },
  opus: { min: 65 },
} as const;

/**
 * Unified Quality Assessor
 *
 * Provides consistent quality and complexity assessment across all systems
 */
export class QualityAssessor {
  private thresholds: QualityThresholds;

  constructor(thresholds?: Partial<QualityThresholds>) {
    this.thresholds = { ...DEFAULT_QUALITY_THRESHOLDS, ...thresholds };
  }

  /**
   * Assess task complexity
   *
   * @param task - Task to analyze
   * @returns Complexity assessment with score and breakdown
   */
  assessComplexity(task: Task): ComplexityAssessment {
    const signals = this.extractComplexitySignals(task);
    const contributions = this.calculateContributions(signals);
    const score = this.calculateComplexityScore(contributions);

    // Determine tier based on score
    let tier: 'haiku' | 'sonnet' | 'opus';
    if (score <= TIER_THRESHOLDS.haiku.max) {
      tier = 'haiku';
    } else if (score >= TIER_THRESHOLDS.opus.min) {
      tier = 'opus';
    } else {
      tier = 'sonnet';
    }

    return {
      score,
      tier,
      signals,
      contributions,
    };
  }

  /**
   * Assess output quality
   *
   * @param input - Quality assessment input
   * @returns Quality assessment with score and issues
   */
  assessQuality(input: QualityAssessmentInput): QualityAssessment {
    const dimensions = this.assessQualityDimensions(input);
    const issues = this.detectQualityIssues(input, dimensions);
    const score = this.calculateQualityScore(dimensions);
    const meetsThreshold = this.meetsQualityThresholds(score, dimensions);

    return {
      score,
      dimensions,
      meetsThreshold,
      issues,
    };
  }

  /**
   * Quick check if quality meets thresholds
   *
   * @param input - Quality assessment input
   * @returns Whether quality meets all thresholds
   */
  meetsThresholds(input: QualityAssessmentInput): boolean {
    const assessment = this.assessQuality(input);
    return assessment.meetsThreshold;
  }

  /**
   * Get recommended tier based on complexity
   *
   * @param task - Task to analyze
   * @returns Recommended tier ('haiku', 'sonnet', or 'opus')
   */
  getRecommendedTier(task: Task): 'haiku' | 'sonnet' | 'opus' {
    const complexity = this.assessComplexity(task);

    if (complexity.score <= TIER_THRESHOLDS.haiku.max) {
      return 'haiku';
    } else if (complexity.score >= TIER_THRESHOLDS.opus.min) {
      return 'opus';
    }
    return 'sonnet';
  }

  /**
   * Update quality thresholds
   */
  updateThresholds(thresholds: Partial<QualityThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current thresholds
   */
  getThresholds(): QualityThresholds {
    return { ...this.thresholds };
  }

  // ============================================================================
  // PRIVATE METHODS: Complexity Assessment
  // ============================================================================

  /**
   * Extract complexity signals from task
   */
  private extractComplexitySignals(task: Task): ComplexitySignals {
    const description = task.description || '';
    const context = task.context || {};

    // Token count (approximate: chars / 4, or use contextSize if provided)
    const tokenCount = task.contextSize || Math.ceil(description.length / 4);

    // Question count
    const questionMarks = (description.match(/\?/g) || []).length;
    const questionWords = (description.match(/\b(how|what|why|when|where|which)\b[^?]*\?/gi) || []).length;
    const implicitQuestions = (description.match(/\b(should|could|would|can we|how to|what about|consider:|address:)\b/gi) || []).length;
    const questionCount = questionMarks + questionWords + implicitQuestions;

    // Step count
    const sequenceWords = (description.match(/\b(first|second|third|fourth|then|next|finally|after|before|subsequently)\b/gi) || []).length;
    const bulletPoints = (description.match(/\n\s*[-*•]\s/g) || []).length;
    const numberedItems = (description.match(/\n\s*\d+\.\s/g) || []).length;
    const actionVerbs = (description.match(/\b(implement|create|build|design|refactor|test|deploy|add|update|remove|fix|analyze|investigate|plan|migrate)\b/gi) || []).length;
    // Add constraints as additional steps/complexity
    const constraintCount = task.constraints?.length || 0;
    const stepCount = sequenceWords + bulletPoints + numberedItems + Math.min(actionVerbs, 5) + constraintCount;

    // Domain count
    const domains = [
      /\b(react|vue|angular|svelte|nextjs|next\.js)\b/gi,
      /\b(typescript|javascript|python|rust|go|java|c\+\+)\b/gi,
      /\b(node|express|fastapi|django|rails|spring)\b/gi,
      /\b(postgres|mongodb|redis|mysql|sqlite)\b/gi,
      /\b(docker|kubernetes|aws|gcp|azure|vercel)\b/gi,
      /\b(graphql|rest|grpc|websocket|trpc)\b/gi,
      /\b(jest|vitest|pytest|playwright|cypress)\b/gi,
      /\b(webpack|vite|rollup|esbuild|turbopack)\b/gi,
      /\b(git|github|gitlab|ci\/cd|pipeline)\b/gi,
      /\b(authentication|authorization|security|oauth)\b/gi,
    ];
    const domainMatches = new Set<string>();
    domains.forEach(regex => {
      const matches = description.match(regex) || [];
      matches.forEach(m => domainMatches.add(m.toLowerCase()));
    });

    // Add explicit domain if provided
    if (task.domain) {
      domainMatches.add(task.domain.toLowerCase());
    }

    // Add required capabilities as domain indicators
    if (task.requiredCapabilities && task.requiredCapabilities.length > 0) {
      task.requiredCapabilities.forEach(cap => domainMatches.add(cap.toLowerCase()));
    }

    const domainCount = Math.min(domainMatches.size, 10);

    // File count
    const filePatterns = [
      /\b[\w-]+\.(ts|js|tsx|jsx|py|rs|go|java|c|cpp|h|hpp)\b/gi,
      /\b[\w-]+\.(json|yaml|yml|toml|xml|md|txt)\b/gi,
      /\b[\w\/.-]+\/[\w\/.-]+\.(ts|js|tsx|jsx|py|rs|go)\b/gi,
    ];
    const fileMatches = new Set<string>();
    filePatterns.forEach(regex => {
      const matches = description.match(regex) || [];
      matches.forEach(m => fileMatches.add(m));
    });
    const contextFileCount = context.fileCount || context.files?.length || 0;
    const fileCount = Math.min(fileMatches.size + contextFileCount, 20);

    // Abstraction level (0-5)
    const abstractionKeywords = [
      { regex: /\b(architecture|system design|scalability|distributed|microservices|event-driven)\b/gi, level: 5 },
      { regex: /\b(pattern|strategy|factory|observer|singleton|dependency injection)\b/gi, level: 4 },
      { regex: /\b(component|module|interface|abstraction|encapsulation)\b/gi, level: 3 },
      { regex: /\b(feature|functionality|behavior|workflow|integration)\b/gi, level: 2 },
      { regex: /\b(function|method|variable|loop|condition|import)\b/gi, level: 1 },
    ];

    let abstractionLevel = 0;
    for (const { regex, level } of abstractionKeywords) {
      if (regex.test(description)) {
        abstractionLevel = Math.max(abstractionLevel, level);
      }
    }
    if (abstractionLevel === 0) {
      abstractionLevel = 1;
    }

    return {
      tokenCount,
      questionCount,
      stepCount,
      domainCount,
      fileCount,
      abstractionLevel,
    };
  }

  /**
   * Calculate weighted contributions from signals
   */
  private calculateContributions(signals: ComplexitySignals): ComplexityAssessment['contributions'] {
    return {
      tokenCount: (signals.tokenCount / 1000) * COMPLEXITY_WEIGHTS.tokenCount,
      questionCount: (signals.questionCount * 10) * COMPLEXITY_WEIGHTS.questionCount,
      stepCount: (signals.stepCount * 8) * COMPLEXITY_WEIGHTS.stepCount,
      domainCount: (signals.domainCount * 15) * COMPLEXITY_WEIGHTS.domainCount,
      fileCount: (signals.fileCount * 5) * COMPLEXITY_WEIGHTS.fileCount,
      abstractionLevel: (signals.abstractionLevel * 20) * COMPLEXITY_WEIGHTS.abstractionLevel,
    };
  }

  /**
   * Calculate final complexity score (0-100)
   */
  private calculateComplexityScore(contributions: ComplexityAssessment['contributions']): number {
    const totalScore = Object.values(contributions).reduce((sum, value) => sum + value, 0);
    const normalizedScore = Math.min(totalScore, 100);
    return Math.round(normalizedScore * 100) / 100;
  }

  // ============================================================================
  // PRIVATE METHODS: Quality Assessment
  // ============================================================================

  /**
   * Assess individual quality dimensions
   */
  private assessQualityDimensions(input: QualityAssessmentInput): QualityAssessment['dimensions'] {
    const response = input.response || '';
    const metadata = input.metadata || {};

    // Confidence dimension
    const confidence = input.confidence ?? 0.75; // Default moderate confidence if not provided

    // Completeness dimension
    let completeness = 1.0;
    if (metadata.truncated) {
      completeness = 0.0; // Truncated output is incomplete
    } else if (response.length > 0) {
      // Assess completeness by checking for incomplete markers
      const incompleteMarkers = [
        /\.\.\.$/, // Ends with ellipsis
        /\[incomplete\]/i,
        /\[truncated\]/i,
        /to be continued/i,
      ];
      const hasIncompleteMarker = incompleteMarkers.some(regex => regex.test(response));
      if (hasIncompleteMarker) {
        completeness = 0.5;
      }
    }

    // Coherence dimension
    let coherence = 1.0;
    if (response.length > 0) {
      // Check for incoherence markers
      const incoherenceMarkers = [
        /\[?ERROR/i,
        /\[?WARNING/i,
        /undefined is not/i,
        /cannot read property/i,
        /unexpected token/i,
      ];
      const hasIncoherenceMarker = incoherenceMarkers.some(regex => regex.test(response));
      if (hasIncoherenceMarker) {
        coherence = 0.4;
      }
    }

    // Correctness dimension
    let correctness = 1.0;
    if (metadata.error) {
      // Errors significantly impact correctness
      if (metadata.error.includes('validation')) {
        correctness = 0.3;
      } else if (metadata.error.includes('parse')) {
        correctness = 0.4;
      } else if (metadata.error.includes('timeout')) {
        correctness = 0.6; // Timeout doesn't mean incorrect, just incomplete
      } else {
        correctness = 0.5;
      }
    }

    return {
      confidence,
      completeness,
      coherence,
      correctness,
    };
  }

  /**
   * Detect quality issues
   */
  private detectQualityIssues(
    input: QualityAssessmentInput,
    dimensions: QualityAssessment['dimensions']
  ): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Low confidence
    if (dimensions.confidence < this.thresholds.minConfidence) {
      issues.push({
        type: 'low-confidence',
        severity: dimensions.confidence < 0.5 ? 'high' : 'medium',
        message: `Confidence ${dimensions.confidence.toFixed(2)} below threshold ${this.thresholds.minConfidence}`,
        dimension: 'confidence',
      });
    }

    // Truncated output
    if (input.metadata?.truncated) {
      issues.push({
        type: 'truncated',
        severity: 'critical',
        message: 'Output was truncated, indicating context overflow or incomplete response',
        dimension: 'completeness',
      });
    }

    // Incomplete output
    if (dimensions.completeness < this.thresholds.minCompleteness) {
      issues.push({
        type: 'incomplete',
        severity: dimensions.completeness < 0.5 ? 'high' : 'medium',
        message: `Completeness ${dimensions.completeness.toFixed(2)} below threshold ${this.thresholds.minCompleteness}`,
        dimension: 'completeness',
      });
    }

    // Incoherent output
    if (dimensions.coherence < 0.7) {
      issues.push({
        type: 'incoherent',
        severity: dimensions.coherence < 0.5 ? 'high' : 'medium',
        message: `Coherence ${dimensions.coherence.toFixed(2)} indicates structural issues`,
        dimension: 'coherence',
      });
    }

    // Error response
    if (input.metadata?.error) {
      issues.push({
        type: 'error',
        severity: 'high',
        message: `Error: ${input.metadata.error}`,
        dimension: 'correctness',
      });
    }

    return issues;
  }

  /**
   * Calculate overall quality score from dimensions
   */
  private calculateQualityScore(dimensions: QualityAssessment['dimensions']): number {
    // Weighted average of dimensions
    const weights = {
      confidence: 0.25,
      completeness: 0.30,
      coherence: 0.20,
      correctness: 0.25,
    };

    const score =
      dimensions.confidence * weights.confidence +
      dimensions.completeness * weights.completeness +
      dimensions.coherence * weights.coherence +
      dimensions.correctness * weights.correctness;

    return Math.round(score * 1000) / 1000; // Round to 3 decimal places
  }

  /**
   * Check if quality meets all thresholds
   */
  private meetsQualityThresholds(
    score: number,
    dimensions: QualityAssessment['dimensions']
  ): boolean {
    return (
      score >= this.thresholds.minQualityScore &&
      dimensions.confidence >= this.thresholds.minConfidence &&
      dimensions.completeness >= this.thresholds.minCompleteness
    );
  }
}

/**
 * Create a default quality assessor instance
 */
export function createQualityAssessor(thresholds?: Partial<QualityThresholds>): QualityAssessor {
  return new QualityAssessor(thresholds);
}

/**
 * Default quality assessor instance (singleton pattern)
 */
export const qualityAssessor = new QualityAssessor();

/**
 * Quick complexity check
 */
export function assessComplexity(task: Task): ComplexityAssessment {
  return qualityAssessor.assessComplexity(task);
}

/**
 * Quick quality check
 */
export function assessQuality(input: QualityAssessmentInput): QualityAssessment {
  return qualityAssessor.assessQuality(input);
}

/**
 * Quick threshold check
 */
export function meetsQualityThresholds(input: QualityAssessmentInput): boolean {
  return qualityAssessor.meetsThresholds(input);
}
