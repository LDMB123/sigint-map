/**
 * Similarity Matcher for Fuzzy Cache Matching
 * High-performance vector similarity search on SemanticKeys
 *
 * Performance targets:
 * - <5ms per similarity check
 * - 0.85 threshold for cache hits
 * - Weighted scoring: Intent (50%) + Target (30%) + Context (20%)
 *
 * Uses optimized algorithms:
 * - Early termination for impossible matches
 * - Pre-computed vector embeddings
 * - Efficient string similarity (no expensive edit distance)
 * - Cached intermediate results
 */

import type { SemanticKey, SimilarityMatch, SimilarityWeights } from './types';

/**
 * Configuration for similarity matching
 */
export interface SimilarityConfig {
  /** Minimum similarity score for cache hit (default: 0.85) */
  threshold: number;

  /** Component weights for similarity calculation */
  weights: SimilarityWeights;

  /** Maximum candidates to return */
  maxResults?: number;

  /** Maximum cache size to prevent unbounded memory growth */
  maxCacheSize?: number;

  /** Enable performance optimizations */
  optimizations?: {
    /** Skip candidates with different intents */
    earlyIntentFilter?: boolean;

    /** Use fast path for exact matches */
    fastExactMatch?: boolean;

    /** Cache intermediate calculations */
    cacheIntermediates?: boolean;
  };
}

/**
 * Default configuration optimized for 90%+ cache hit rate
 */
export const DEFAULT_CONFIG: SimilarityConfig = {
  threshold: 0.85,
  weights: {
    intent: 0.50, // Intent similarity (most important)
    target: 0.30, // Target similarity (very important)
    context: 0.20, // Context overlap (additional signal)
  },
  maxResults: undefined, // No limit by default
  maxCacheSize: 10000, // Prevent unbounded memory growth
  optimizations: {
    earlyIntentFilter: true,
    fastExactMatch: true,
    cacheIntermediates: true,
  },
};

/**
 * Vector representation of a semantic key for fast similarity computation
 */
interface SemanticVector {
  /** Original semantic key */
  key: SemanticKey;

  /** Pre-computed intent features */
  intentFeatures: {
    normalized: string;
    category: string;
    tokens: Set<string>;
  };

  /** Pre-computed target features */
  targetFeatures: {
    normalized: string;
    basename: string;
    directory: string;
    extension: string;
    tokens: Set<string>;
  };

  /** Pre-computed context features */
  contextFeatures: {
    tags: Set<string>;
    primary: string; // Most important context tag
  };

  /** Exact match fingerprint for fast comparison */
  fingerprint: string;
}

/**
 * Intent categories for grouping similar intents
 */
const INTENT_CATEGORIES: Record<string, string> = {
  'borrow-fix': 'debug',
  'error-fix': 'debug',
  'type-fix': 'debug',
  'compile-fix': 'debug',
  'component-create': 'create',
  'test-create': 'create',
  'function-create': 'create',
  'type-create': 'create',
  'docs-generate': 'create',
  'refactor': 'refactor',
  'performance-optimize': 'optimize',
  'code-simplify': 'refactor',
  'extract-function': 'refactor',
  'explain': 'analyze',
  'analyze': 'analyze',
  'find-usage': 'analyze',
  'list-dependencies': 'analyze',
  'update': 'modify',
  'rename': 'modify',
  'remove': 'modify',
  'add': 'modify',
  'configure': 'setup',
  'dependency-install': 'setup',
  'test': 'test',
  'test-run': 'test',
};

/**
 * SimilarityMatcher - High-performance fuzzy cache matching
 *
 * Usage:
 * ```ts
 * const matcher = new SimilarityMatcher();
 * const results = matcher.findMatches(queryKey, cachedKeys);
 * if (results.length > 0) {
 *   console.log(`Cache hit with ${results[0].score} similarity`);
 * }
 * ```
 */
export class SimilarityMatcher {
  private config: SimilarityConfig;
  private vectorCache = new Map<SemanticKey, SemanticVector>();
  private similarityCache = new Map<string, number>();

  constructor(config: Partial<SimilarityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Find matching semantic keys from candidates
   * Returns matches sorted by similarity score (highest first)
   *
   * Performance: O(n) where n = candidates.length
   * Typically <5ms for up to 1000 candidates
   */
  findMatches(
    query: SemanticKey,
    candidates: SemanticKey[],
    threshold?: number
  ): SimilarityMatch[] {
    const effectiveThreshold = threshold ?? this.config.threshold;
    const queryVector = this.vectorize(query);
    const matches: SimilarityMatch[] = [];

    for (const candidate of candidates) {
      // Fast exact match check
      const candidateVector = this.vectorize(candidate);
      if (
        this.config.optimizations?.fastExactMatch &&
        queryVector.fingerprint === candidateVector.fingerprint
      ) {
        // Cache the exact match with LRU eviction
        const cacheKey = `${queryVector.fingerprint}:${candidateVector.fingerprint}`;
        if (this.config.optimizations?.cacheIntermediates) {
          const maxSize = this.config.maxCacheSize || 10000;
          if (this.similarityCache.size >= maxSize) {
            // Remove oldest entry (first entry in Map)
            const firstKey = this.similarityCache.keys().next().value;
            if (firstKey) {
              this.similarityCache.delete(firstKey);
            }
          }
          this.similarityCache.set(cacheKey, 1.0);
        }
        matches.push({ key: candidate, score: 1.0 });
        continue;
      }

      // Early intent filter for performance
      if (
        this.config.optimizations?.earlyIntentFilter &&
        !this.intentsCompatible(queryVector, candidateVector)
      ) {
        continue;
      }

      // Calculate similarity
      const score = this.calculateSimilarityVectors(queryVector, candidateVector);

      if (score >= effectiveThreshold) {
        matches.push({ key: candidate, score });
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    // Limit results
    if (this.config.maxResults && matches.length > this.config.maxResults) {
      return matches.slice(0, this.config.maxResults);
    }

    return matches;
  }

  /**
   * Calculate similarity between two semantic keys
   * Returns score from 0.0 (no match) to 1.0 (exact match)
   *
   * Performance: <1ms per comparison
   */
  private calculateSimilarityVectors(a: SemanticVector, b: SemanticVector): number {
    // Check cache first
    const cacheKey = `${a.fingerprint}:${b.fingerprint}`;
    if (this.config.optimizations?.cacheIntermediates) {
      const cached = this.similarityCache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    const { intent: intentWeight, target: targetWeight, context: contextWeight } = this.config.weights;

    const intentSim = this.intentSimilarity(a, b);
    const targetSim = this.targetSimilarity(a, b);
    const contextSim = this.contextSimilarity(a, b);

    const score = intentSim * intentWeight + targetSim * targetWeight + contextSim * contextWeight;

    // Cache result with LRU eviction
    if (this.config.optimizations?.cacheIntermediates) {
      const maxSize = this.config.maxCacheSize || 10000;
      if (this.similarityCache.size >= maxSize) {
        // Remove oldest entry (first entry in Map)
        const firstKey = this.similarityCache.keys().next().value;
        if (firstKey) {
          this.similarityCache.delete(firstKey);
        }
      }
      this.similarityCache.set(cacheKey, score);
    }

    return score;
  }

  /**
   * Calculate similarity between two semantic keys (public API)
   */
  calculateSimilarity(a: SemanticKey, b: SemanticKey): number {
    const vectorA = this.vectorize(a);
    const vectorB = this.vectorize(b);
    return this.calculateSimilarityVectors(vectorA, vectorB);
  }

  /**
   * Convert semantic key to vector representation with pre-computed features
   */
  private vectorize(key: SemanticKey): SemanticVector {
    // Check cache
    if (this.vectorCache.has(key)) {
      return this.vectorCache.get(key)!;
    }

    // Extract intent features
    const intentNormalized = key.intent.toLowerCase().trim();
    const intentCategory = INTENT_CATEGORIES[intentNormalized] || 'unknown';
    const intentTokens = new Set(intentNormalized.split(/[-_]/));

    // Extract target features
    const targetNormalized = key.target.toLowerCase().trim().replace(/\\/g, '/');
    const targetParts = targetNormalized.split('/');
    const targetBasename = targetParts[targetParts.length - 1] || '';
    const targetDirectory = targetParts.slice(0, -1).join('/');
    const targetExtension = targetBasename.includes('.') ? targetBasename.split('.').pop() || '' : '';
    const targetTokens = new Set(targetNormalized.split(/[/._-]/));

    // Extract context features
    const contextTags = new Set(key.context.map((c) => c.toLowerCase().trim()));
    const contextPrimary = key.context[0]?.toLowerCase().trim() || '';

    // Create fingerprint for exact matching
    const fingerprint = this.createFingerprint(key);

    const vector: SemanticVector = {
      key,
      intentFeatures: {
        normalized: intentNormalized,
        category: intentCategory,
        tokens: intentTokens,
      },
      targetFeatures: {
        normalized: targetNormalized,
        basename: targetBasename,
        directory: targetDirectory,
        extension: targetExtension,
        tokens: targetTokens,
      },
      contextFeatures: {
        tags: contextTags,
        primary: contextPrimary,
      },
      fingerprint,
    };

    // LRU eviction if cache is full
    const maxSize = this.config.maxCacheSize || 10000;
    if (this.vectorCache.size >= maxSize) {
      // Remove oldest entry (first entry in Map)
      const firstKey = this.vectorCache.keys().next().value;
      if (firstKey) {
        this.vectorCache.delete(firstKey);
      }
    }

    // Cache vector
    this.vectorCache.set(key, vector);

    return vector;
  }

  /**
   * Create a unique fingerprint for exact matching
   */
  private createFingerprint(key: SemanticKey): string {
    const parts = [
      key.intent.toLowerCase().trim(),
      key.target.toLowerCase().trim(),
      [...key.context].sort().join(','),
    ];
    return parts.join('|');
  }

  /**
   * Check if intents are compatible (for early filtering)
   * Returns false only if intents are definitely incompatible
   * This is a conservative filter - only filter out obvious mismatches
   */
  private intentsCompatible(a: SemanticVector, b: SemanticVector): boolean {
    // Same intent or category
    if (
      a.intentFeatures.normalized === b.intentFeatures.normalized ||
      a.intentFeatures.category === b.intentFeatures.category
    ) {
      return true;
    }

    // Share any intent tokens
    for (const token of a.intentFeatures.tokens) {
      if (b.intentFeatures.tokens.has(token)) {
        return true;
      }
    }

    // Both are unknown categories - don't filter
    if (a.intentFeatures.category === 'unknown' || b.intentFeatures.category === 'unknown') {
      return true;
    }

    // Different categories and no shared tokens - likely incompatible, but be conservative
    // Only filter if they're in very different categories (create vs analyze, etc.)
    const veryDifferent = this.categoriesVeryDifferent(
      a.intentFeatures.category,
      b.intentFeatures.category
    );
    return !veryDifferent;
  }

  /**
   * Check if two categories are very different (for conservative early filtering)
   */
  private categoriesVeryDifferent(catA: string, catB: string): boolean {
    // Define pairs of very different categories
    const veryDifferentPairs = new Set([
      'create:analyze',
      'create:test',
      'debug:setup',
      'analyze:modify',
    ]);

    const pair1 = `${catA}:${catB}`;
    const pair2 = `${catB}:${catA}`;

    return veryDifferentPairs.has(pair1) || veryDifferentPairs.has(pair2);
  }

  /**
   * Calculate intent similarity
   * - Exact match: 1.0
   * - Same category: 0.6
   * - Partial token overlap: 0.4
   * - Different: 0.0
   */
  private intentSimilarity(a: SemanticVector, b: SemanticVector): number {
    // Exact match
    if (a.intentFeatures.normalized === b.intentFeatures.normalized) {
      return 1.0;
    }

    // Same category
    if (a.intentFeatures.category === b.intentFeatures.category && a.intentFeatures.category !== 'unknown') {
      return 0.6;
    }

    // Token overlap
    const tokensA = a.intentFeatures.tokens;
    const tokensB = b.intentFeatures.tokens;
    const intersection = new Set([...tokensA].filter((x) => tokensB.has(x)));

    if (intersection.size > 0) {
      const union = new Set([...tokensA, ...tokensB]);
      const jaccardSimilarity = intersection.size / union.size;
      return 0.4 * jaccardSimilarity;
    }

    return 0.0;
  }

  /**
   * Calculate target similarity
   * - Exact match: 1.0
   * - Same basename: 0.8
   * - Same basename different extension: 0.7
   * - Substring match: 0.6
   * - Same directory: 0.4
   * - Token overlap: 0.3 * jaccard
   * - Different: 0.0
   */
  private targetSimilarity(a: SemanticVector, b: SemanticVector): number {
    const targetA = a.targetFeatures.normalized;
    const targetB = b.targetFeatures.normalized;

    // Empty targets
    if (!targetA && !targetB) return 1.0;
    if (!targetA || !targetB) return 0.0;

    // Exact match
    if (targetA === targetB) return 1.0;

    // Same basename
    const basenameA = a.targetFeatures.basename;
    const basenameB = b.targetFeatures.basename;

    if (basenameA && basenameB && basenameA === basenameB) {
      return 1.0;
    }

    // Same basename root (different extensions)
    const rootA = basenameA.replace(/\.[^.]*$/, '');
    const rootB = basenameB.replace(/\.[^.]*$/, '');
    if (rootA && rootB && rootA === rootB) {
      return 0.7;
    }

    // Substring match in basenames (e.g., UserService vs UserServiceImpl)
    if (rootA && rootB && (rootA.includes(rootB) || rootB.includes(rootA))) {
      return 0.6;
    }

    // Substring match in full paths
    if (targetA.includes(targetB) || targetB.includes(targetA)) {
      return 0.6;
    }

    // Same directory
    const dirA = a.targetFeatures.directory;
    const dirB = b.targetFeatures.directory;
    if (dirA && dirB && dirA === dirB) {
      return 0.4;
    }

    // Token overlap (file path components)
    const tokensA = a.targetFeatures.tokens;
    const tokensB = b.targetFeatures.tokens;
    const intersection = new Set([...tokensA].filter((x) => tokensB.has(x)));

    if (intersection.size > 0) {
      const union = new Set([...tokensA, ...tokensB]);
      const jaccardSimilarity = intersection.size / union.size;
      return 0.3 * jaccardSimilarity;
    }

    return 0.0;
  }

  /**
   * Calculate context similarity using Jaccard coefficient
   * - Measures tag set overlap
   * - Returns intersection / union
   */
  private contextSimilarity(a: SemanticVector, b: SemanticVector): number {
    const tagsA = a.contextFeatures.tags;
    const tagsB = b.contextFeatures.tags;

    // Both empty
    if (tagsA.size === 0 && tagsB.size === 0) return 1.0;

    // One empty
    if (tagsA.size === 0 || tagsB.size === 0) return 0.0;

    // Jaccard similarity: |A ∩ B| / |A ∪ B|
    const intersection = new Set([...tagsA].filter((x) => tagsB.has(x)));
    const union = new Set([...tagsA, ...tagsB]);

    return intersection.size / union.size;
  }

  /**
   * Clear all internal caches
   * Call periodically to prevent unbounded memory growth
   */
  clearCaches(): void {
    this.vectorCache.clear();
    this.similarityCache.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    vectorCacheSize: number;
    similarityCacheSize: number;
  } {
    return {
      vectorCacheSize: this.vectorCache.size,
      similarityCacheSize: this.similarityCache.size,
    };
  }
}

/**
 * Convenience function for one-off similarity calculations
 * For batch operations, use SimilarityMatcher instance for better performance
 */
export function calculateSimilarity(
  a: SemanticKey,
  b: SemanticKey,
  weights?: SimilarityWeights
): number {
  const config = weights ? { weights } : undefined;
  const matcher = new SimilarityMatcher(config);
  return matcher.calculateSimilarity(a, b);
}

/**
 * Convenience function to find similar keys
 * For repeated searches, use SimilarityMatcher instance for better performance
 */
export function findSimilar(
  query: SemanticKey,
  candidates: SemanticKey[],
  threshold: number = 0.85,
  config?: Partial<SimilarityConfig>
): SimilarityMatch[] {
  const matcher = new SimilarityMatcher({ ...config, threshold });
  return matcher.findMatches(query, candidates, threshold);
}

/**
 * Batch similarity calculation for multiple queries
 * Optimized for processing many queries against the same candidate set
 */
export function batchFindSimilar(
  queries: SemanticKey[],
  candidates: SemanticKey[],
  threshold: number = 0.85,
  config?: Partial<SimilarityConfig>
): Map<SemanticKey, SimilarityMatch[]> {
  const matcher = new SimilarityMatcher({ ...config, threshold });
  const results = new Map<SemanticKey, SimilarityMatch[]>();

  for (const query of queries) {
    const matches = matcher.findMatches(query, candidates, threshold);
    results.set(query, matches);
  }

  return results;
}
