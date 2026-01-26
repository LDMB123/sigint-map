/**
 * Type definitions for Semantic Cache System
 * Shared types across cache components
 */

/**
 * Semantic key structure for cache lookup
 */
export interface SemanticKey {
  /** Normalized intent: what the user wants to do */
  intent: string;

  /** Target of the operation: file path, module name, function name, etc. */
  target: string;

  /** Contextual information: language, domain, keywords */
  context: string[];

  /** Task-specific parameters extracted from the request */
  params: Record<string, any>;
}

/**
 * Similarity match result
 */
export interface SimilarityMatch {
  /** The matched semantic key */
  key: SemanticKey;

  /** Similarity score (0-1) */
  score: number;
}

/**
 * Intent category for grouping similar intents
 */
export type IntentCategory =
  | 'debug'      // Fixing errors, debugging
  | 'create'     // Creating new code
  | 'refactor'   // Refactoring existing code
  | 'analyze'    // Analyzing and explaining
  | 'optimize'   // Performance optimization
  | 'modify'     // Updating existing code
  | 'setup'      // Configuration and setup
  | 'test';      // Testing

/**
 * Intent pattern for matching and extraction
 */
export interface IntentPattern {
  /** Regular expression to match */
  pattern: RegExp;

  /** Normalized intent name */
  intent: string;

  /** Intent category */
  category: IntentCategory;
}

/**
 * Target pattern for extraction
 */
export interface TargetPattern {
  /** Regular expression to match */
  pattern: RegExp;

  /** Function to extract target from match */
  extractor: (match: RegExpMatchArray) => string;
}

/**
 * Context pattern for extraction
 */
export interface ContextPattern {
  /** Regular expression to match */
  pattern: RegExp;

  /** Context tags to add when matched */
  context: string[];
}

/**
 * Parameter pattern for extraction
 */
export interface ParamPattern {
  /** Regular expression to match */
  pattern: RegExp;

  /** Parameter name */
  name: string;

  /** Function to extract value from match */
  extractor: (match: RegExpMatchArray) => any;
}

/**
 * Cache entry with semantic key
 */
export interface SemanticCacheEntry<T = any> {
  /** Semantic key */
  semanticKey: SemanticKey;

  /** Deterministic hash of semantic key */
  hash: string;

  /** Cached result */
  result: T;

  /** Timestamp when cached */
  timestamp: number;

  /** Number of cache hits */
  hits: number;

  /** Expiration timestamp */
  expiresAt: number;

  /** Agent that produced the result */
  agentId?: string;

  /** File hash for invalidation */
  fileHash?: string;
}

/**
 * Similarity threshold configuration
 */
export interface SimilarityThresholds {
  /** Very high similarity - safe to use cached result */
  veryHigh: number; // 0.90

  /** High similarity - typical cache hit threshold */
  high: number; // 0.85

  /** Moderate similarity - consider adaptation */
  moderate: number; // 0.70

  /** Low similarity - cache miss */
  low: number; // 0.50
}

/**
 * Similarity component weights
 */
export interface SimilarityWeights {
  /** Weight for intent similarity (most important) */
  intent: number; // 0.50

  /** Weight for target similarity (very important) */
  target: number; // 0.30

  /** Weight for context overlap (additional signal) */
  context: number; // 0.20
}

/**
 * Result adapter for similar matches
 * Adapts cached results to slightly different requests
 */
export interface ResultAdapter<T = any> {
  /** Adapt cached result to new semantic key */
  adapt(cached: T, newKey: SemanticKey): T;

  /** Check if this adapter can handle the transformation */
  canAdapt(fromKey: SemanticKey, toKey: SemanticKey): boolean;
}

/**
 * Cache invalidation rule
 */
export interface InvalidationRule {
  /** Trigger event type */
  trigger: 'file-modified' | 'dependency-changed' | 'config-changed' | 'time-based';

  /** Predicate to determine if key should be invalidated */
  invalidates: (key: SemanticKey) => boolean;
}

/**
 * Dynamic TTL configuration
 */
export interface DynamicTTL {
  /** Base TTL in milliseconds */
  base: number;

  /** Factors that adjust TTL */
  factors: Array<{
    /** Condition to check */
    condition: string;

    /** TTL multiplier when condition is true */
    multiplier: number;
  }>;
}

/**
 * Cache statistics
 */
export interface CacheStatistics {
  /** Number of exact cache hits */
  exactHits: number;

  /** Number of similar cache hits */
  similarHits: number;

  /** Number of cache misses */
  misses: number;

  /** Overall hit rate (0-1) */
  hitRate: number;

  /** Number of cache entries */
  cacheSize: number;

  /** Average lookup time in milliseconds */
  avgLookupTimeMs: number;

  /** Tokens saved through caching */
  tokensSaved: number;

  /** Cost saved in USD */
  costSavedUsd: number;
}
