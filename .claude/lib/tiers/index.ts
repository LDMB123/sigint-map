/**
 * Tier Selection System - Main Export
 *
 * Provides intelligent task complexity analysis and model tier selection
 * with distribution tracking in the Cascading Tier System.
 *
 * @module @claude/lib/tiers
 */

// Complexity Analyzer
export {
  // Main analysis functions
  analyzeComplexity,
  analyzeTier,
  analyzeComplexityDetailed,

  // Supporting functions
  extractSignals,
  calculateComplexity,
  getRecommendedTier,

  // Constants
  TIER_THRESHOLDS,

  // Types
  type Task,
  type ComplexitySignals,
  type ComplexityBreakdown,
  type TierRecommendation,
} from './complexity-analyzer';

// Tier Selector
export {
  // Main selection functions
  selectTier,
  selectTierSimple,
  analyzeBatch,
  calculateDistribution,

  // Distribution tracking
  TierDistributionTracker,
  createDistributionTracker,

  // Constants
  TARGET_DISTRIBUTION,
  ACCEPTABLE_DEVIATION,
  OVERLAP_ZONES,

  // Types
  type TierSelection,
  type TierDistribution,
  type TierDistributionPercentages,
  type DistributionValidation,
} from './tier-selector';

// Escalation Engine
export {
  // Main engine class
  EscalationEngine,
  escalationEngine,

  // Helper functions
  createExecutionResult,
  escalateWithRetry,

  // Types
  type ModelTier,
  type EscalationReason,
  type ExecutionResult,
  type EscalationDecision,
  type EscalationAttempt,
  type EscalationStatistics,
  type QualityThresholds,
  type EscalationConfig,
} from './escalation-engine';
