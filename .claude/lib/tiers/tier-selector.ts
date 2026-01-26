/**
 * Tier Selector
 * Intelligent model tier selection with distribution tracking and escalation logic
 *
 * Features:
 * - Complexity-based tier selection using unified QualityAssessor
 * - Overlap zone handling with escalation support
 * - Distribution metrics tracking (target: 60% Haiku, 35% Sonnet, 5% Opus)
 * - Validation and adjustment recommendations
 */

import {
  qualityAssessor,
  TIER_THRESHOLDS,
  type Task,
  type ComplexityAssessment,
} from '../quality/quality-assessor';

/**
 * Tier recommendation type
 */
export type TierRecommendation = 'haiku' | 'sonnet' | 'opus';

/**
 * Complexity breakdown type (re-exported from QualityAssessor)
 */
export type ComplexityBreakdown = ComplexityAssessment['contributions'];

/**
 * Tier selection result with escalation metadata
 */
export interface TierSelection {
  tier: TierRecommendation;
  score: number;
  breakdown: ComplexityBreakdown;
  inOverlapZone: boolean;
  canEscalate: boolean;
  escalationTier?: TierRecommendation;
  reason: string;
}

/**
 * Distribution metrics for tier usage tracking
 */
export interface TierDistribution {
  haiku: number;
  sonnet: number;
  opus: number;
  total: number;
}

/**
 * Distribution percentages
 */
export interface TierDistributionPercentages {
  haiku: number;
  sonnet: number;
  opus: number;
}

/**
 * Distribution validation result
 */
export interface DistributionValidation {
  isValid: boolean;
  current: TierDistributionPercentages;
  target: TierDistributionPercentages;
  deviations: {
    haiku: number;
    sonnet: number;
    opus: number;
  };
  recommendations: string[];
}

/**
 * Target distribution percentages
 */
export const TARGET_DISTRIBUTION: TierDistributionPercentages = {
  haiku: 60,
  sonnet: 35,
  opus: 5,
} as const;

/**
 * Acceptable deviation from target (percentage points)
 */
export const ACCEPTABLE_DEVIATION = 5;

/**
 * Overlap zone definitions
 * - Lower overlap (25-30): Haiku/Sonnet boundary
 * - Upper overlap (65-70): Sonnet/Opus boundary
 */
export const OVERLAP_ZONES = {
  lower: { min: 25, max: 30 },
  upper: { min: 65, max: 70 },
} as const;

/**
 * Check if score is in an overlap zone
 */
function isInOverlapZone(score: number): { inZone: boolean; zone?: 'lower' | 'upper' } {
  if (score >= OVERLAP_ZONES.lower.min && score <= OVERLAP_ZONES.lower.max) {
    return { inZone: true, zone: 'lower' };
  }
  if (score >= OVERLAP_ZONES.upper.min && score <= OVERLAP_ZONES.upper.max) {
    return { inZone: true, zone: 'upper' };
  }
  return { inZone: false };
}

/**
 * Determine escalation tier for overlap zone scores
 */
function getEscalationTier(
  score: number,
  currentTier: TierRecommendation
): TierRecommendation | undefined {
  const overlap = isInOverlapZone(score);

  if (!overlap.inZone) {
    return undefined;
  }

  // Lower overlap zone (25-30): Haiku can escalate to Sonnet
  if (overlap.zone === 'lower' && currentTier === 'haiku') {
    return 'sonnet';
  }

  // Upper overlap zone (65-70): Sonnet can escalate to Opus
  if (overlap.zone === 'upper' && currentTier === 'sonnet') {
    return 'opus';
  }

  return undefined;
}

/**
 * Generate selection reason based on score and zone
 */
function getSelectionReason(
  score: number,
  tier: TierRecommendation,
  inOverlapZone: boolean
): string {
  if (!inOverlapZone) {
    if (tier === 'haiku') {
      return `Simple task (score: ${score}) - well-suited for Haiku`;
    }
    if (tier === 'sonnet') {
      return `Medium complexity task (score: ${score}) - requires Sonnet capabilities`;
    }
    return `Complex task (score: ${score}) - requires Opus capabilities`;
  }

  // In overlap zone
  const overlap = isInOverlapZone(score);
  if (overlap.zone === 'lower') {
    return `Score ${score} in Haiku/Sonnet boundary zone - starting with ${tier}, escalation available`;
  }
  return `Score ${score} in Sonnet/Opus boundary zone - starting with ${tier}, escalation available`;
}

/**
 * Select optimal tier for a task with escalation support
 *
 * @param task - Task to analyze
 * @returns Tier selection with escalation metadata
 */
export function selectTier(task: Task): TierSelection {
  const assessor = qualityAssessor;
  const complexityAssessment = assessor.assessComplexity(task);

  const tier = complexityAssessment.tier;
  const score = complexityAssessment.score;
  const breakdown = complexityAssessment.contributions;

  const overlap = isInOverlapZone(score);
  const inOverlapZone = overlap.inZone;
  const escalationTier = getEscalationTier(score, tier);
  const canEscalate = escalationTier !== undefined;
  const reason = getSelectionReason(score, tier, inOverlapZone);

  return {
    tier,
    score,
    breakdown,
    inOverlapZone,
    canEscalate,
    escalationTier,
    reason,
  };
}

/**
 * Select tier with simple return (tier name only)
 *
 * @param task - Task to analyze
 * @returns Tier name
 */
export function selectTierSimple(task: Task): TierRecommendation {
  const assessor = qualityAssessor;
  return assessor.getRecommendedTier(task);
}

/**
 * Tier distribution tracker
 */
export class TierDistributionTracker {
  private counts: TierDistribution;

  constructor(initialCounts?: Partial<TierDistribution>) {
    this.counts = {
      haiku: initialCounts?.haiku ?? 0,
      sonnet: initialCounts?.sonnet ?? 0,
      opus: initialCounts?.opus ?? 0,
      total: initialCounts?.total ?? 0,
    };
  }

  /**
   * Record a tier selection
   */
  record(tier: TierRecommendation): void {
    this.counts[tier]++;
    this.counts.total++;
  }

  /**
   * Record multiple tier selections
   */
  recordBatch(tiers: TierRecommendation[]): void {
    tiers.forEach(tier => this.record(tier));
  }

  /**
   * Get current distribution counts
   */
  getCounts(): TierDistribution {
    return { ...this.counts };
  }

  /**
   * Get current distribution as percentages
   */
  getPercentages(): TierDistributionPercentages {
    if (this.counts.total === 0) {
      return { haiku: 0, sonnet: 0, opus: 0 };
    }

    return {
      haiku: Math.round((this.counts.haiku / this.counts.total) * 100 * 100) / 100,
      sonnet: Math.round((this.counts.sonnet / this.counts.total) * 100 * 100) / 100,
      opus: Math.round((this.counts.opus / this.counts.total) * 100 * 100) / 100,
    };
  }

  /**
   * Validate distribution against target
   */
  validate(): DistributionValidation {
    const current = this.getPercentages();

    const deviations = {
      haiku: current.haiku - TARGET_DISTRIBUTION.haiku,
      sonnet: current.sonnet - TARGET_DISTRIBUTION.sonnet,
      opus: current.opus - TARGET_DISTRIBUTION.opus,
    };

    const isValid =
      Math.abs(deviations.haiku) <= ACCEPTABLE_DEVIATION &&
      Math.abs(deviations.sonnet) <= ACCEPTABLE_DEVIATION &&
      Math.abs(deviations.opus) <= ACCEPTABLE_DEVIATION;

    const recommendations: string[] = [];

    if (!isValid) {
      if (deviations.haiku < -ACCEPTABLE_DEVIATION) {
        recommendations.push(
          `Haiku usage too low (${current.haiku}% vs ${TARGET_DISTRIBUTION.haiku}% target). Consider lowering thresholds or using Haiku for overlap zone tasks.`
        );
      } else if (deviations.haiku > ACCEPTABLE_DEVIATION) {
        recommendations.push(
          `Haiku usage too high (${current.haiku}% vs ${TARGET_DISTRIBUTION.haiku}% target). May be under-utilizing more capable models.`
        );
      }

      if (deviations.sonnet < -ACCEPTABLE_DEVIATION) {
        recommendations.push(
          `Sonnet usage too low (${current.sonnet}% vs ${TARGET_DISTRIBUTION.sonnet}% target). Tasks may be over-simplified or over-complicated.`
        );
      } else if (deviations.sonnet > ACCEPTABLE_DEVIATION) {
        recommendations.push(
          `Sonnet usage too high (${current.sonnet}% vs ${TARGET_DISTRIBUTION.sonnet}% target). Consider tier adjustments.`
        );
      }

      if (deviations.opus < -ACCEPTABLE_DEVIATION) {
        recommendations.push(
          `Opus usage too low (${current.opus}% vs ${TARGET_DISTRIBUTION.opus}% target). May be missing complex tasks or thresholds too high.`
        );
      } else if (deviations.opus > ACCEPTABLE_DEVIATION) {
        recommendations.push(
          `Opus usage too high (${current.opus}% vs ${TARGET_DISTRIBUTION.opus}% target). Review task complexity scoring or consider escalation patterns.`
        );
      }

      if (recommendations.length === 0) {
        recommendations.push('Distribution outside acceptable range but no specific tier issues detected.');
      }
    }

    return {
      isValid,
      current,
      target: TARGET_DISTRIBUTION,
      deviations,
      recommendations,
    };
  }

  /**
   * Reset all counts
   */
  reset(): void {
    this.counts = {
      haiku: 0,
      sonnet: 0,
      opus: 0,
      total: 0,
    };
  }

  /**
   * Get distribution summary as string
   */
  getSummary(): string {
    const percentages = this.getPercentages();
    const validation = this.validate();

    let summary = `Tier Distribution (${this.counts.total} tasks):\n`;
    summary += `  Haiku:  ${this.counts.haiku.toString().padStart(4)} (${percentages.haiku.toFixed(1)}%) [target: ${TARGET_DISTRIBUTION.haiku}%]\n`;
    summary += `  Sonnet: ${this.counts.sonnet.toString().padStart(4)} (${percentages.sonnet.toFixed(1)}%) [target: ${TARGET_DISTRIBUTION.sonnet}%]\n`;
    summary += `  Opus:   ${this.counts.opus.toString().padStart(4)} (${percentages.opus.toFixed(1)}%) [target: ${TARGET_DISTRIBUTION.opus}%]\n`;
    summary += `\nValidation: ${validation.isValid ? 'PASS' : 'FAIL'}\n`;

    if (!validation.isValid) {
      summary += '\nRecommendations:\n';
      validation.recommendations.forEach((rec, i) => {
        summary += `  ${i + 1}. ${rec}\n`;
      });
    }

    return summary;
  }
}

/**
 * Create a new distribution tracker
 */
export function createDistributionTracker(
  initialCounts?: Partial<TierDistribution>
): TierDistributionTracker {
  return new TierDistributionTracker(initialCounts);
}

/**
 * Batch analyze tasks and return distribution
 */
export function analyzeBatch(tasks: Task[]): {
  selections: TierSelection[];
  distribution: TierDistribution;
  percentages: TierDistributionPercentages;
  validation: DistributionValidation;
} {
  const tracker = createDistributionTracker();
  const selections: TierSelection[] = [];

  for (const task of tasks) {
    const selection = selectTier(task);
    selections.push(selection);
    tracker.record(selection.tier);
  }

  return {
    selections,
    distribution: tracker.getCounts(),
    percentages: tracker.getPercentages(),
    validation: tracker.validate(),
  };
}

/**
 * Export for external tracking
 */
export function calculateDistribution(
  counts: TierDistribution
): {
  percentages: TierDistributionPercentages;
  validation: DistributionValidation;
} {
  const tracker = createDistributionTracker(counts);
  return {
    percentages: tracker.getPercentages(),
    validation: tracker.validate(),
  };
}
