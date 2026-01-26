/**
 * Result Adapter for Cached Results
 * Adapts cached results to new queries while maintaining quality
 *
 * Key capabilities:
 * - File rename adaptation: Update file references when targets differ
 * - Parameter interpolation: Apply new parameter values to cached results
 * - Context merging: Combine cached context with new requirements
 * - Quality preservation: Ensure adaptations maintain semantic correctness
 *
 * Performance targets:
 * - <10ms per adaptation
 * - 95%+ quality retention for similar queries
 * - Avoid re-execution unless necessary
 */

import type { SemanticKey } from './types';

/**
 * Adaptation result with metadata
 */
export interface AdaptationResult<T = any> {
  /** Adapted result */
  result: T;

  /** Confidence in adaptation quality (0-1) */
  confidence: number;

  /** Transformations applied during adaptation */
  transformations: AdaptationTransformation[];

  /** Whether adaptation was successful */
  success: boolean;

  /** Reason for failure if unsuccessful */
  failureReason?: string;
}

/**
 * Transformation applied during adaptation
 */
export interface AdaptationTransformation {
  /** Type of transformation */
  type: 'file-rename' | 'parameter-interpolation' | 'context-merge' | 'path-update' | 'text-substitution';

  /** Description of what changed */
  description: string;

  /** Confidence in this transformation (0-1) */
  confidence: number;

  /** Original value */
  from: string;

  /** New value */
  to: string;
}

/**
 * Configuration for result adaptation
 */
export interface AdapterConfig {
  /** Minimum confidence threshold to attempt adaptation (default: 0.7) */
  minConfidence: number;

  /** Enable file path transformations */
  enableFileRename: boolean;

  /** Enable parameter interpolation */
  enableParameterInterpolation: boolean;

  /** Enable context merging */
  enableContextMerge: boolean;

  /** Maximum number of transformations to apply (safety limit) */
  maxTransformations: number;

  /** Strategy for handling conflicts */
  conflictStrategy: 'conservative' | 'aggressive' | 'balanced';
}

/**
 * Default adapter configuration
 */
export const DEFAULT_ADAPTER_CONFIG: AdapterConfig = {
  minConfidence: 0.7,
  enableFileRename: true,
  enableParameterInterpolation: true,
  enableContextMerge: true,
  maxTransformations: 10,
  conflictStrategy: 'balanced',
};

/**
 * ResultAdapter - Adapt cached results to new queries
 *
 * Usage:
 * ```ts
 * const adapter = new ResultAdapter();
 * const adapted = adapter.adapt(
 *   cachedResult,
 *   originalKey,
 *   newKey
 * );
 *
 * if (adapted.success && adapted.confidence > 0.8) {
 *   return adapted.result; // Use adapted result
 * } else {
 *   // Re-execute original query
 * }
 * ```
 */
export class ResultAdapter<T = any> {
  private config: AdapterConfig;

  constructor(config: Partial<AdapterConfig> = {}) {
    this.config = { ...DEFAULT_ADAPTER_CONFIG, ...config };
  }

  /**
   * Check if cached result can be adapted to new semantic key
   * Returns confidence score (0-1)
   */
  canAdapt(fromKey: SemanticKey, toKey: SemanticKey): boolean {
    const confidence = this.calculateAdaptationConfidence(fromKey, toKey);
    return confidence >= this.config.minConfidence;
  }

  /**
   * Adapt cached result to new semantic key
   */
  adapt(cached: T, fromKey: SemanticKey, toKey: SemanticKey): AdaptationResult<T> {
    const transformations: AdaptationTransformation[] = [];
    let result = this.deepClone(cached);
    let overallConfidence = this.calculateAdaptationConfidence(fromKey, toKey);

    // Check if adaptation is viable
    if (!this.canAdapt(fromKey, toKey)) {
      return {
        result: cached,
        confidence: overallConfidence,
        transformations: [],
        success: false,
        failureReason: `Confidence ${overallConfidence.toFixed(2)} below threshold ${this.config.minConfidence}`,
      };
    }

    // Apply transformations in order of safety
    try {
      // 1. File rename transformation (most common and safe)
      if (this.config.enableFileRename && fromKey.target !== toKey.target) {
        const fileRenameResult = this.applyFileRename(result, fromKey.target, toKey.target);
        if (fileRenameResult) {
          result = fileRenameResult.result;
          transformations.push(fileRenameResult.transformation);
        }
      }

      // 2. Parameter interpolation
      if (this.config.enableParameterInterpolation && this.hasParameterChanges(fromKey, toKey)) {
        const paramResult = this.applyParameterInterpolation(result, fromKey.params, toKey.params);
        result = paramResult.result;
        transformations.push(...paramResult.transformations);
      }

      // 3. Context merging
      if (this.config.enableContextMerge && this.hasContextChanges(fromKey, toKey)) {
        const contextTransform = this.applyContextMerge(result, fromKey.context, toKey.context);
        if (contextTransform) {
          transformations.push(contextTransform);
        }
      }

      // Safety check: too many transformations might indicate poor match
      if (transformations.length > this.config.maxTransformations) {
        return {
          result: cached,
          confidence: 0,
          transformations,
          success: false,
          failureReason: `Too many transformations required: ${transformations.length} > ${this.config.maxTransformations}`,
        };
      }

      // Calculate final confidence based on transformations
      const transformationConfidence = this.calculateTransformationConfidence(transformations);
      const finalConfidence = Math.min(overallConfidence, transformationConfidence);

      return {
        result,
        confidence: finalConfidence,
        transformations,
        success: true,
      };
    } catch (error) {
      return {
        result: cached,
        confidence: 0,
        transformations,
        success: false,
        failureReason: `Adaptation error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Calculate confidence that adaptation will maintain quality
   */
  private calculateAdaptationConfidence(fromKey: SemanticKey, toKey: SemanticKey): number {
    // Must have same intent (or very similar)
    if (fromKey.intent !== toKey.intent) {
      const intentSimilarity = this.intentSimilarity(fromKey.intent, toKey.intent);
      if (intentSimilarity < 0.6) {
        return 0; // Different intents - cannot adapt
      }
    }

    let confidence = 1.0;

    // Penalize target differences
    if (fromKey.target !== toKey.target) {
      const targetSimilarity = this.targetSimilarity(fromKey.target, toKey.target);
      confidence *= 0.5 + (targetSimilarity * 0.5); // Scale from 0.5 to 1.0
    }

    // Penalize context differences
    const contextOverlap = this.contextOverlap(fromKey.context, toKey.context);
    confidence *= 0.7 + (contextOverlap * 0.3); // Scale from 0.7 to 1.0

    // Penalize parameter changes
    const paramSimilarity = this.parameterSimilarity(fromKey.params, toKey.params);
    confidence *= 0.8 + (paramSimilarity * 0.2); // Scale from 0.8 to 1.0

    return confidence;
  }

  /**
   * Apply file rename transformation
   * Replaces all occurrences of old file path with new file path
   */
  private applyFileRename(result: any, fromPath: string, toPath: string): { result: any; transformation: AdaptationTransformation } | null {
    if (!fromPath || !toPath || fromPath === toPath) {
      return null;
    }

    const fromNormalized = this.normalizePath(fromPath);
    const toNormalized = this.normalizePath(toPath);

    // Extract base names for more flexible matching (preserving case for display)
    const fromBasenameOriginal = this.getBasename(fromPath);
    const toBasenameOriginal = this.getBasename(toPath);
    const fromBasename = this.getBasename(fromNormalized);
    const toBasename = this.getBasename(toNormalized);

    // Extract base names without extension for partial matching
    const fromBasenameNoExt = fromBasenameOriginal.replace(/\.[^.]*$/, '');
    const toBasenameNoExt = toBasenameOriginal.replace(/\.[^.]*$/, '');

    let replacementCount = 0;

    // Recursively replace in result - returns transformed value
    const replace = (obj: any): any => {
      if (typeof obj === 'string') {
        let modified = obj;

        // Replace full paths (exact match)
        modified = modified.replace(new RegExp(this.escapeRegex(fromPath), 'g'), toPath);

        // Replace normalized paths
        if (fromNormalized !== fromPath) {
          modified = modified.replace(new RegExp(this.escapeRegex(fromNormalized), 'g'), toNormalized);
        }

        // Replace basenames with word boundaries (case-sensitive first)
        if (fromBasenameOriginal !== toBasenameOriginal) {
          modified = modified.replace(
            new RegExp(`\\b${this.escapeRegex(fromBasenameOriginal)}\\b`, 'g'),
            toBasenameOriginal
          );
        }

        // Replace basename without extension (case-sensitive for identifiers like UserService)
        if (fromBasenameNoExt !== toBasenameNoExt && fromBasenameNoExt.length > 0) {
          modified = modified.replace(
            new RegExp(`\\b${this.escapeRegex(fromBasenameNoExt)}\\b`, 'g'),
            toBasenameNoExt
          );
        }

        if (modified !== obj) {
          replacementCount++;
        }
        return modified;
      }

      if (Array.isArray(obj)) {
        return obj.map((item) => replace(item));
      }

      if (typeof obj === 'object' && obj !== null) {
        const newObj: any = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            newObj[key] = replace(obj[key]);
          }
        }
        return newObj;
      }

      return obj;
    };

    const newResult = replace(result);

    if (replacementCount === 0) {
      return null; // No changes made
    }

    // Calculate confidence based on path similarity
    const similarity = this.targetSimilarity(fromPath, toPath);
    const confidence = 0.7 + (similarity * 0.3); // 0.7 to 1.0 range

    return {
      result: newResult,
      transformation: {
        type: 'file-rename',
        description: `Renamed ${fromBasenameOriginal} → ${toBasenameOriginal} (${replacementCount} occurrences)`,
        confidence,
        from: fromPath,
        to: toPath,
      },
    };
  }

  /**
   * Apply parameter interpolation
   * Updates result with new parameter values
   */
  private applyParameterInterpolation(
    result: any,
    fromParams: Record<string, any>,
    toParams: Record<string, any>
  ): { result: any; transformations: AdaptationTransformation[] } {
    const transformations: AdaptationTransformation[] = [];
    let currentResult = result;

    // Find parameters that changed
    for (const key in toParams) {
      if (Object.prototype.hasOwnProperty.call(toParams, key)) {
        const oldValue = fromParams[key];
        const newValue = toParams[key];

        if (oldValue !== undefined && oldValue !== newValue) {
          // Interpolate parameter value in result
          const paramResult = this.interpolateParameter(currentResult, key, oldValue, newValue);
          if (paramResult) {
            currentResult = paramResult.result;
            transformations.push(paramResult.transformation);
          }
        }
      }
    }

    return { result: currentResult, transformations };
  }

  /**
   * Interpolate a single parameter in the result
   */
  private interpolateParameter(
    result: any,
    paramName: string,
    oldValue: any,
    newValue: any
  ): { result: any; transformation: AdaptationTransformation } | null {
    const oldStr = String(oldValue);
    const newStr = String(newValue);

    if (oldStr === newStr) {
      return null;
    }

    let replacementCount = 0;

    // Replace in result - returns transformed value
    const replace = (obj: any): any => {
      if (typeof obj === 'string') {
        const modified = obj.replace(
          new RegExp(this.escapeRegex(oldStr), 'g'),
          newStr
        );
        if (modified !== obj) {
          replacementCount++;
        }
        return modified;
      }

      if (obj === oldValue) {
        replacementCount++;
        return newValue;
      }

      if (Array.isArray(obj)) {
        return obj.map((item) => replace(item));
      }

      if (typeof obj === 'object' && obj !== null) {
        const newObj: any = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            newObj[key] = replace(obj[key]);
          }
        }
        return newObj;
      }

      return obj;
    };

    const newResult = replace(result);

    if (replacementCount === 0) {
      return null;
    }

    // Confidence based on value similarity
    const confidence = typeof oldValue === typeof newValue ? 0.85 : 0.7;

    return {
      result: newResult,
      transformation: {
        type: 'parameter-interpolation',
        description: `Interpolated parameter ${paramName}: ${oldStr} → ${newStr} (${replacementCount} occurrences)`,
        confidence,
        from: oldStr,
        to: newStr,
      },
    };
  }

  /**
   * Apply context merging
   * Adds new context information to result metadata
   */
  private applyContextMerge(
    result: any,
    fromContext: string[],
    toContext: string[]
  ): AdaptationTransformation | null {
    // Find new context tags
    const newTags = toContext.filter((tag) => !fromContext.includes(tag));

    if (newTags.length === 0) {
      return null; // No new context to merge
    }

    // Add context metadata to result if it's an object
    if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
      if (!result._metadata) {
        result._metadata = {};
      }
      if (!result._metadata.context) {
        result._metadata.context = [...fromContext];
      }

      // Merge new context tags
      for (const tag of newTags) {
        if (!result._metadata.context.includes(tag)) {
          result._metadata.context.push(tag);
        }
      }
    }

    // Confidence is high for context merging (low risk)
    const confidence = 0.9;

    return {
      type: 'context-merge',
      description: `Merged context: added [${newTags.join(', ')}]`,
      confidence,
      from: fromContext.join(','),
      to: toContext.join(','),
    };
  }

  /**
   * Calculate overall confidence from transformations
   */
  private calculateTransformationConfidence(transformations: AdaptationTransformation[]): number {
    if (transformations.length === 0) {
      return 1.0; // No transformations needed = perfect match
    }

    // Average confidence, weighted by transformation type
    const weights: Record<AdaptationTransformation['type'], number> = {
      'file-rename': 0.9,
      'parameter-interpolation': 0.8,
      'context-merge': 0.95,
      'path-update': 0.85,
      'text-substitution': 0.7,
    };

    let totalWeight = 0;
    let weightedSum = 0;

    for (const transform of transformations) {
      const weight = weights[transform.type] || 0.5;
      weightedSum += transform.confidence * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Check if parameters have changed
   */
  private hasParameterChanges(fromKey: SemanticKey, toKey: SemanticKey): boolean {
    const fromKeys = Object.keys(fromKey.params);
    const toKeys = Object.keys(toKey.params);

    if (fromKeys.length !== toKeys.length) {
      return true;
    }

    for (const key of fromKeys) {
      if (fromKey.params[key] !== toKey.params[key]) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if context has changed
   */
  private hasContextChanges(fromKey: SemanticKey, toKey: SemanticKey): boolean {
    const fromSet = new Set(fromKey.context);
    const toSet = new Set(toKey.context);

    if (fromSet.size !== toSet.size) {
      return true;
    }

    for (const ctx of fromSet) {
      if (!toSet.has(ctx)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate intent similarity (0-1)
   */
  private intentSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;

    // Extract intent category (e.g., "component-create" -> "create")
    const categoryA = a.split('-').pop() || a;
    const categoryB = b.split('-').pop() || b;

    if (categoryA === categoryB) return 0.6;

    // Check for substring match
    if (a.includes(b) || b.includes(a)) return 0.4;

    return 0.0;
  }

  /**
   * Calculate target similarity (0-1)
   */
  private targetSimilarity(a: string, b: string): number {
    if (!a || !b) return a === b ? 1.0 : 0.0;
    if (a === b) return 1.0;

    const normA = this.normalizePath(a);
    const normB = this.normalizePath(b);

    if (normA === normB) return 1.0;

    // Same basename
    const basenameA = this.getBasename(normA);
    const basenameB = this.getBasename(normB);

    if (basenameA === basenameB) return 0.8;

    // Same basename root (different extension)
    const rootA = basenameA.replace(/\.[^.]*$/, '');
    const rootB = basenameB.replace(/\.[^.]*$/, '');

    if (rootA === rootB) return 0.7;

    // Substring match
    if (normA.includes(normB) || normB.includes(normA)) return 0.6;

    // Same directory
    const dirA = this.getDirname(normA);
    const dirB = this.getDirname(normB);

    if (dirA && dirB && dirA === dirB) return 0.4;

    return 0.0;
  }

  /**
   * Calculate context overlap (0-1)
   */
  private contextOverlap(a: string[], b: string[]): number {
    if (a.length === 0 && b.length === 0) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;

    const setA = new Set(a);
    const setB = new Set(b);

    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
  }

  /**
   * Calculate parameter similarity (0-1)
   */
  private parameterSimilarity(a: Record<string, any>, b: Record<string, any>): number {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length === 0 && keysB.length === 0) return 1.0;

    const allKeys = new Set([...keysA, ...keysB]);
    let matches = 0;

    for (const key of allKeys) {
      if (a[key] === b[key]) {
        matches++;
      }
    }

    return matches / allKeys.size;
  }

  /**
   * Deep clone an object
   */
  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
      return obj.map((item) => this.deepClone(item));
    }

    if (obj instanceof Set) {
      return new Set([...obj].map((item) => this.deepClone(item)));
    }

    if (obj instanceof Map) {
      return new Map([...obj].map(([k, v]) => [this.deepClone(k), this.deepClone(v)]));
    }

    const cloned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }

    return cloned;
  }

  /**
   * Normalize file path
   */
  private normalizePath(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
  }

  /**
   * Get basename from path
   */
  private getBasename(path: string): string {
    const normalized = this.normalizePath(path);
    const parts = normalized.split('/');
    return parts[parts.length - 1] || '';
  }

  /**
   * Get dirname from path
   */
  private getDirname(path: string): string {
    const normalized = this.normalizePath(path);
    const parts = normalized.split('/');
    return parts.slice(0, -1).join('/');
  }

  /**
   * Escape string for use in regex
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AdapterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AdapterConfig {
    return { ...this.config };
  }
}

/**
 * Convenience function to adapt a result
 */
export function adaptResult<T>(
  cached: T,
  fromKey: SemanticKey,
  toKey: SemanticKey,
  config?: Partial<AdapterConfig>
): AdaptationResult<T> {
  const adapter = new ResultAdapter<T>(config);
  return adapter.adapt(cached, fromKey, toKey);
}

/**
 * Convenience function to check if adaptation is viable
 */
export function canAdaptResult(
  fromKey: SemanticKey,
  toKey: SemanticKey,
  config?: Partial<AdapterConfig>
): boolean {
  const adapter = new ResultAdapter(config);
  return adapter.canAdapt(fromKey, toKey);
}

/**
 * Batch adapt multiple results
 */
export function batchAdaptResults<T>(
  cached: T,
  fromKey: SemanticKey,
  toKeys: SemanticKey[],
  config?: Partial<AdapterConfig>
): Map<SemanticKey, AdaptationResult<T>> {
  const adapter = new ResultAdapter<T>(config);
  const results = new Map<SemanticKey, AdaptationResult<T>>();

  for (const toKey of toKeys) {
    const result = adapter.adapt(cached, fromKey, toKey);
    results.set(toKey, result);
  }

  return results;
}

/**
 * Adaptation statistics
 */
export interface AdaptationStats {
  /** Total adaptation attempts */
  attempts: number;

  /** Successful adaptations */
  successes: number;

  /** Failed adaptations */
  failures: number;

  /** Success rate (0-1) */
  successRate: number;

  /** Average confidence of successful adaptations */
  avgConfidence: number;

  /** Total transformations applied */
  totalTransformations: number;

  /** Breakdown by transformation type */
  transformationBreakdown: Record<AdaptationTransformation['type'], number>;
}

/**
 * Tracked Result Adapter with statistics
 */
export class TrackedResultAdapter<T = any> extends ResultAdapter<T> {
  private stats: AdaptationStats = {
    attempts: 0,
    successes: 0,
    failures: 0,
    successRate: 0,
    avgConfidence: 0,
    totalTransformations: 0,
    transformationBreakdown: {
      'file-rename': 0,
      'parameter-interpolation': 0,
      'context-merge': 0,
      'path-update': 0,
      'text-substitution': 0,
    },
  };

  private confidenceSum = 0;

  /**
   * Adapt with statistics tracking
   */
  adapt(cached: T, fromKey: SemanticKey, toKey: SemanticKey): AdaptationResult<T> {
    this.stats.attempts++;

    const result = super.adapt(cached, fromKey, toKey);

    if (result.success) {
      this.stats.successes++;
      this.confidenceSum += result.confidence;
      this.stats.avgConfidence = this.confidenceSum / this.stats.successes;

      // Track transformations
      this.stats.totalTransformations += result.transformations.length;
      for (const transform of result.transformations) {
        this.stats.transformationBreakdown[transform.type]++;
      }
    } else {
      this.stats.failures++;
    }

    this.stats.successRate = this.stats.successes / this.stats.attempts;

    return result;
  }

  /**
   * Get adaptation statistics
   */
  getStats(): AdaptationStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      attempts: 0,
      successes: 0,
      failures: 0,
      successRate: 0,
      avgConfidence: 0,
      totalTransformations: 0,
      transformationBreakdown: {
        'file-rename': 0,
        'parameter-interpolation': 0,
        'context-merge': 0,
        'path-update': 0,
        'text-substitution': 0,
      },
    };
    this.confidenceSum = 0;
  }
}
