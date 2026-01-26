/**
 * Tests for Similarity Matcher
 * Validates fuzzy cache matching performance and accuracy
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SimilarityMatcher,
  calculateSimilarity,
  findSimilar,
  batchFindSimilar,
  DEFAULT_CONFIG,
} from './similarity-matcher';
import type { SemanticKey } from './types';

describe('SimilarityMatcher', () => {
  let matcher: SimilarityMatcher;

  beforeEach(() => {
    matcher = new SimilarityMatcher();
  });

  describe('exact matches', () => {
    it('should return 1.0 for identical keys', () => {
      const key1: SemanticKey = {
        intent: 'borrow-fix',
        target: 'src/lib.rs',
        context: ['rust', 'memory-management'],
        params: {},
      };

      const key2: SemanticKey = {
        intent: 'borrow-fix',
        target: 'src/lib.rs',
        context: ['rust', 'memory-management'],
        params: {},
      };

      const matches = matcher.findMatches(key1, [key2]);
      expect(matches).toHaveLength(1);
      expect(matches[0].score).toBe(1.0);
    });

    it('should use fast path for exact matches', () => {
      const key: SemanticKey = {
        intent: 'component-create',
        target: 'src/components/Button.tsx',
        context: ['react', 'typescript'],
        params: {},
      };

      const candidates = Array(100).fill(key);
      const start = performance.now();
      const matches = matcher.findMatches(key, candidates);
      const elapsed = performance.now() - start;

      expect(matches).toHaveLength(100);
      expect(matches.every((m) => m.score === 1.0)).toBe(true);
      expect(elapsed).toBeLessThan(10); // Should be very fast
    });

    it('should handle context order differences', () => {
      const key1: SemanticKey = {
        intent: 'error-fix',
        target: 'app.ts',
        context: ['typescript', 'nodejs', 'express'],
        params: {},
      };

      const key2: SemanticKey = {
        intent: 'error-fix',
        target: 'app.ts',
        context: ['express', 'nodejs', 'typescript'],
        params: {},
      };

      const matches = matcher.findMatches(key1, [key2]);
      expect(matches).toHaveLength(1);
      expect(matches[0].score).toBe(1.0);
    });
  });

  describe('intent similarity', () => {
    it('should score same category intents at 0.6', () => {
      const key1: SemanticKey = {
        intent: 'borrow-fix',
        target: 'lib.rs',
        context: ['rust'],
        params: {},
      };

      const key2: SemanticKey = {
        intent: 'error-fix',
        target: 'lib.rs',
        context: ['rust'],
        params: {},
      };

      const matches = matcher.findMatches(key1, [key2]);
      expect(matches).toHaveLength(0); // Below threshold

      // Lower threshold to see the score
      const matchesLowThreshold = matcher.findMatches(key1, [key2], 0.5);
      expect(matchesLowThreshold).toHaveLength(1);
      // Intent weight is 0.5, same category is 0.6, target exact is 1.0, context perfect is 1.0
      // Score: 0.5 * 0.6 + 0.3 * 1.0 + 0.2 * 1.0 = 0.3 + 0.3 + 0.2 = 0.8
      expect(matchesLowThreshold[0].score).toBeCloseTo(0.8, 1);
    });

    it('should handle different intent categories', () => {
      const key1: SemanticKey = {
        intent: 'component-create',
        target: 'Button.tsx',
        context: ['react'],
        params: {},
      };

      const key2: SemanticKey = {
        intent: 'error-fix',
        target: 'Button.tsx',
        context: ['react'],
        params: {},
      };

      const matches = matcher.findMatches(key1, [key2], 0.3);
      // Intent score: 0 (different categories), Target: 1.0, Context: 1.0
      // Total: 0.5 * 0 + 0.3 * 1.0 + 0.2 * 1.0 = 0.5
      expect(matches).toHaveLength(1);
      expect(matches[0].score).toBeCloseTo(0.5, 1);
    });

    it('should use early intent filter for performance', () => {
      const query: SemanticKey = {
        intent: 'component-create',
        target: 'Button.tsx',
        context: ['react'],
        params: {},
      };

      // Create many candidates with incompatible intents
      const candidates: SemanticKey[] = Array(1000)
        .fill(null)
        .map((_, i) => ({
          intent: i % 2 === 0 ? 'error-fix' : 'analyze',
          target: `file${i}.ts`,
          context: ['typescript'],
          params: {},
        }));

      const start = performance.now();
      const matches = matcher.findMatches(query, candidates);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10); // Fast due to early filtering
      expect(matches).toHaveLength(0);
    });
  });

  describe('target similarity', () => {
    it('should score same basename at 1.0', () => {
      const key1: SemanticKey = {
        intent: 'error-fix',
        target: 'lib.rs',
        context: ['rust'],
        params: {},
      };

      const key2: SemanticKey = {
        intent: 'error-fix',
        target: 'src/lib.rs',
        context: ['rust'],
        params: {},
      };

      const matches = matcher.findMatches(key1, [key2]);
      // Intent: 1.0, Target: 1.0 (same basename), Context: 1.0
      // Total: 1.0
      expect(matches).toHaveLength(1);
      expect(matches[0].score).toBe(1.0);
    });

    it('should score same root different extension at 0.7', () => {
      const key1: SemanticKey = {
        intent: 'component-create',
        target: 'Button.tsx',
        context: ['react', 'typescript'],
        params: {},
      };

      const key2: SemanticKey = {
        intent: 'component-create',
        target: 'Button.jsx',
        context: ['react', 'javascript'],
        params: {},
      };

      const matches = matcher.findMatches(key1, [key2], 0.5);
      // Intent: 1.0, Target: 0.7, Context: 0.5 (react overlaps)
      // Total: 0.5 * 1.0 + 0.3 * 0.7 + 0.2 * 0.5 = 0.5 + 0.21 + 0.1 = 0.81
      expect(matches).toHaveLength(1);
      expect(matches[0].score).toBeCloseTo(0.81, 1);
    });

    it('should score substring matches at 0.6', () => {
      const key1: SemanticKey = {
        intent: 'update',
        target: 'UserService.ts',
        context: ['typescript'],
        params: {},
      };

      const key2: SemanticKey = {
        intent: 'update',
        target: 'UserServiceImpl.ts',
        context: ['typescript'],
        params: {},
      };

      const matches = matcher.findMatches(key1, [key2], 0.5);
      // Intent: 1.0, Target: 0.6 (substring), Context: 1.0
      // Total: 0.5 * 1.0 + 0.3 * 0.6 + 0.2 * 1.0 = 0.5 + 0.18 + 0.2 = 0.88
      expect(matches).toHaveLength(1);
      expect(matches[0].score).toBeCloseTo(0.88, 1);
    });

    it('should score same directory at 0.4', () => {
      const key1: SemanticKey = {
        intent: 'error-fix',
        target: 'src/utils/helpers.ts',
        context: ['typescript'],
        params: {},
      };

      const key2: SemanticKey = {
        intent: 'error-fix',
        target: 'src/utils/validators.ts',
        context: ['typescript'],
        params: {},
      };

      const matches = matcher.findMatches(key1, [key2], 0.5);
      // Intent: 1.0, Target: 0.4 (same dir), Context: 1.0
      // Total: 0.5 * 1.0 + 0.3 * 0.4 + 0.2 * 1.0 = 0.5 + 0.12 + 0.2 = 0.82
      expect(matches).toHaveLength(1);
      expect(matches[0].score).toBeCloseTo(0.82, 1);
    });

    it('should handle empty targets', () => {
      const key1: SemanticKey = {
        intent: 'analyze',
        target: '',
        context: ['python'],
        params: {},
      };

      const key2: SemanticKey = {
        intent: 'analyze',
        target: '',
        context: ['python'],
        params: {},
      };

      const matches = matcher.findMatches(key1, [key2]);
      expect(matches).toHaveLength(1);
      expect(matches[0].score).toBe(1.0);
    });

    it('should handle Windows vs Unix paths', () => {
      const key1: SemanticKey = {
        intent: 'error-fix',
        target: 'src/lib/utils.ts',
        context: ['typescript'],
        params: {},
      };

      const key2: SemanticKey = {
        intent: 'error-fix',
        target: 'src\\lib\\utils.ts',
        context: ['typescript'],
        params: {},
      };

      const matches = matcher.findMatches(key1, [key2]);
      expect(matches).toHaveLength(1);
      expect(matches[0].score).toBe(1.0);
    });
  });

  describe('context similarity', () => {
    it('should use Jaccard similarity for context overlap', () => {
      const key1: SemanticKey = {
        intent: 'component-create',
        target: 'Button.tsx',
        context: ['react', 'typescript', 'ui'],
        params: {},
      };

      const key2: SemanticKey = {
        intent: 'component-create',
        target: 'Button.tsx',
        context: ['react', 'typescript'],
        params: {},
      };

      const matches = matcher.findMatches(key1, [key2]);
      // Intent: 1.0, Target: 1.0
      // Context: intersection = 2 (react, typescript), union = 3 -> 2/3 = 0.667
      // Total: 0.5 * 1.0 + 0.3 * 1.0 + 0.2 * 0.667 = 0.5 + 0.3 + 0.133 = 0.933
      expect(matches).toHaveLength(1);
      expect(matches[0].score).toBeCloseTo(0.933, 2);
    });

    it('should handle disjoint contexts', () => {
      const key1: SemanticKey = {
        intent: 'error-fix',
        target: 'app.py',
        context: ['python', 'django'],
        params: {},
      };

      const key2: SemanticKey = {
        intent: 'error-fix',
        target: 'app.py',
        context: ['ruby', 'rails'],
        params: {},
      };

      const matches = matcher.findMatches(key1, [key2], 0.7);
      // Intent: 1.0, Target: 1.0, Context: 0.0
      // Total: 0.5 * 1.0 + 0.3 * 1.0 + 0.2 * 0.0 = 0.8
      expect(matches).toHaveLength(1);
      expect(matches[0].score).toBeCloseTo(0.8, 1);
    });

    it('should handle empty contexts', () => {
      const key1: SemanticKey = {
        intent: 'update',
        target: 'config.json',
        context: [],
        params: {},
      };

      const key2: SemanticKey = {
        intent: 'update',
        target: 'config.json',
        context: [],
        params: {},
      };

      const matches = matcher.findMatches(key1, [key2]);
      expect(matches).toHaveLength(1);
      expect(matches[0].score).toBe(1.0);
    });
  });

  describe('threshold filtering', () => {
    it('should filter matches below threshold', () => {
      const query: SemanticKey = {
        intent: 'component-create',
        target: 'Button.tsx',
        context: ['react'],
        params: {},
      };

      const candidates: SemanticKey[] = [
        {
          intent: 'component-create',
          target: 'Button.tsx',
          context: ['react'],
          params: {},
        }, // Score: 1.0
        {
          intent: 'component-create',
          target: 'Input.tsx',
          context: ['react'],
          params: {},
        }, // Lower score
        {
          intent: 'error-fix',
          target: 'Button.tsx',
          context: ['react'],
          params: {},
        }, // Score: 0.5
      ];

      const matches = matcher.findMatches(query, candidates, 0.85);
      expect(matches).toHaveLength(1);
      expect(matches[0].key.target).toBe('Button.tsx');
      expect(matches[0].key.intent).toBe('component-create');
    });

    it('should support custom thresholds', () => {
      const query: SemanticKey = {
        intent: 'borrow-fix',
        target: 'lib.rs',
        context: ['rust'],
        params: {},
      };

      const candidate: SemanticKey = {
        intent: 'error-fix',
        target: 'lib.rs',
        context: ['rust'],
        params: {},
      };

      // High threshold - no match
      const highMatches = matcher.findMatches(query, [candidate], 0.85);
      expect(highMatches).toHaveLength(0);

      // Lower threshold - match
      const lowMatches = matcher.findMatches(query, [candidate], 0.7);
      expect(lowMatches).toHaveLength(1);
    });
  });

  describe('result sorting and limiting', () => {
    it('should sort results by score descending', () => {
      const query: SemanticKey = {
        intent: 'component-create',
        target: 'Button.tsx',
        context: ['react', 'typescript'],
        params: {},
      };

      const candidates: SemanticKey[] = [
        {
          intent: 'component-create',
          target: 'Input.tsx',
          context: ['react'],
          params: {},
        }, // Lower score
        {
          intent: 'component-create',
          target: 'Button.tsx',
          context: ['react', 'typescript'],
          params: {},
        }, // Exact match
        {
          intent: 'component-create',
          target: 'Button.jsx',
          context: ['react'],
          params: {},
        }, // Medium score
      ];

      const matches = matcher.findMatches(query, candidates, 0.5);
      expect(matches.length).toBeGreaterThan(1);
      expect(matches[0].score).toBeGreaterThanOrEqual(matches[1].score);
      expect(matches[1].score).toBeGreaterThanOrEqual(matches[2].score);
      expect(matches[0].key.target).toBe('Button.tsx');
    });

    it('should limit results to maxResults', () => {
      const customMatcher = new SimilarityMatcher({ maxResults: 3 });
      const query: SemanticKey = {
        intent: 'error-fix',
        target: 'app.ts',
        context: ['typescript'],
        params: {},
      };

      const candidates: SemanticKey[] = Array(10)
        .fill(null)
        .map((_, i) => ({
          intent: 'error-fix',
          target: `file${i}.ts`,
          context: ['typescript'],
          params: {},
        }));

      const matches = customMatcher.findMatches(query, candidates, 0.5);
      expect(matches).toHaveLength(3);
    });
  });

  describe('performance', () => {
    it('should process 1000 candidates in <5ms', () => {
      const query: SemanticKey = {
        intent: 'error-fix',
        target: 'src/lib.rs',
        context: ['rust'],
        params: {},
      };

      const candidates: SemanticKey[] = Array(1000)
        .fill(null)
        .map((_, i) => ({
          intent: i % 3 === 0 ? 'error-fix' : 'component-create',
          target: `src/file${i}.rs`,
          context: ['rust'],
          params: {},
        }));

      const start = performance.now();
      const matches = matcher.findMatches(query, candidates);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(5);
      console.log(`Processed 1000 candidates in ${elapsed.toFixed(2)}ms`);
    });

    it('should benefit from vector caching', () => {
      const query: SemanticKey = {
        intent: 'component-create',
        target: 'Button.tsx',
        context: ['react'],
        params: {},
      };

      const candidates: SemanticKey[] = Array(100)
        .fill(null)
        .map(() => ({ ...query }));

      // First run - populate cache
      const start1 = performance.now();
      matcher.findMatches(query, candidates);
      const elapsed1 = performance.now() - start1;

      // Second run - use cache
      const start2 = performance.now();
      matcher.findMatches(query, candidates);
      const elapsed2 = performance.now() - start2;

      expect(elapsed2).toBeLessThan(elapsed1);
      console.log(`First run: ${elapsed1.toFixed(2)}ms, Second run: ${elapsed2.toFixed(2)}ms`);
    });

    it('should handle large batches efficiently', () => {
      const queries: SemanticKey[] = Array(50)
        .fill(null)
        .map((_, i) => ({
          intent: 'error-fix',
          target: `query${i}.ts`,
          context: ['typescript'],
          params: {},
        }));

      const candidates: SemanticKey[] = Array(100)
        .fill(null)
        .map((_, i) => ({
          intent: 'error-fix',
          target: `candidate${i}.ts`,
          context: ['typescript'],
          params: {},
        }));

      const start = performance.now();
      const results = batchFindSimilar(queries, candidates, 0.85);
      const elapsed = performance.now() - start;

      expect(results.size).toBe(50);
      expect(elapsed).toBeLessThan(50); // <1ms per query average
      console.log(`Batch processed 50 queries x 100 candidates in ${elapsed.toFixed(2)}ms`);
    });
  });

  describe('cache management', () => {
    it('should track cache sizes', () => {
      const key: SemanticKey = {
        intent: 'test',
        target: 'app.ts',
        context: ['typescript'],
        params: {},
      };

      matcher.findMatches(key, [key]);
      const stats = matcher.getCacheStats();

      expect(stats.vectorCacheSize).toBeGreaterThan(0);
      expect(stats.similarityCacheSize).toBeGreaterThan(0);
    });

    it('should clear caches', () => {
      const key: SemanticKey = {
        intent: 'test',
        target: 'app.ts',
        context: ['typescript'],
        params: {},
      };

      matcher.findMatches(key, [key]);
      matcher.clearCaches();

      const stats = matcher.getCacheStats();
      expect(stats.vectorCacheSize).toBe(0);
      expect(stats.similarityCacheSize).toBe(0);
    });
  });

  describe('convenience functions', () => {
    it('calculateSimilarity should work for one-off calculations', () => {
      const key1: SemanticKey = {
        intent: 'error-fix',
        target: 'lib.rs',
        context: ['rust'],
        params: {},
      };

      const key2: SemanticKey = {
        intent: 'error-fix',
        target: 'lib.rs',
        context: ['rust'],
        params: {},
      };

      const score = calculateSimilarity(key1, key2);
      expect(score).toBe(1.0);
    });

    it('findSimilar should work for one-off searches', () => {
      const query: SemanticKey = {
        intent: 'component-create',
        target: 'Button.tsx',
        context: ['react'],
        params: {},
      };

      const candidates: SemanticKey[] = [query];

      const matches = findSimilar(query, candidates, 0.85);
      expect(matches).toHaveLength(1);
      expect(matches[0].score).toBe(1.0);
    });

    it('batchFindSimilar should process multiple queries', () => {
      const queries: SemanticKey[] = [
        {
          intent: 'error-fix',
          target: 'a.ts',
          context: ['typescript'],
          params: {},
        },
        {
          intent: 'error-fix',
          target: 'b.ts',
          context: ['typescript'],
          params: {},
        },
      ];

      const candidates: SemanticKey[] = queries;

      const results = batchFindSimilar(queries, candidates, 0.85);
      expect(results.size).toBe(2);
    });
  });

  describe('real-world scenarios', () => {
    it('should match borrow error variations', () => {
      const query: SemanticKey = {
        intent: 'borrow-fix',
        target: 'src/lib.rs',
        context: ['rust', 'memory-management'],
        params: {},
      };

      const candidates: SemanticKey[] = [
        {
          intent: 'borrow-fix',
          target: 'lib.rs',
          context: ['rust'],
          params: {},
        },
        {
          intent: 'borrow-fix',
          target: 'src/lib.rs',
          context: ['rust', 'memory-management'],
          params: {},
        },
        {
          intent: 'error-fix',
          target: 'src/lib.rs',
          context: ['rust'],
          params: {},
        },
      ];

      const matches = matcher.findMatches(query, candidates);
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches[0].key.intent).toBe('borrow-fix');
      expect(matches[0].score).toBeGreaterThanOrEqual(0.85);
    });

    it('should match React component variations', () => {
      const query: SemanticKey = {
        intent: 'component-create',
        target: 'src/components/Button.tsx',
        context: ['react', 'typescript'],
        params: {},
      };

      const candidates: SemanticKey[] = [
        {
          intent: 'component-create',
          target: 'Button.tsx',
          context: ['react', 'typescript'],
          params: {},
        },
        {
          intent: 'component-create',
          target: 'src/components/Button.jsx',
          context: ['react', 'javascript'],
          params: {},
        },
        {
          intent: 'component-create',
          target: 'components/Button.tsx',
          context: ['react'],
          params: {},
        },
      ];

      const matches = matcher.findMatches(query, candidates);
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches[0].score).toBeGreaterThanOrEqual(0.85);
    });

    it('should handle test creation scenarios', () => {
      const query: SemanticKey = {
        intent: 'test-create',
        target: 'src/utils/helpers.ts',
        context: ['typescript', 'testing'],
        params: {},
      };

      const candidates: SemanticKey[] = [
        {
          intent: 'test-create',
          target: 'src/utils/helpers.test.ts',
          context: ['typescript', 'testing'],
          params: {},
        },
        {
          intent: 'test-create',
          target: 'utils/helpers.ts',
          context: ['typescript'],
          params: {},
        },
      ];

      const matches = matcher.findMatches(query, candidates, 0.8);
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty candidates', () => {
      const query: SemanticKey = {
        intent: 'error-fix',
        target: 'app.ts',
        context: ['typescript'],
        params: {},
      };

      const matches = matcher.findMatches(query, []);
      expect(matches).toHaveLength(0);
    });

    it('should handle special characters in targets', () => {
      const key1: SemanticKey = {
        intent: 'update',
        target: 'file-name_with.special@chars.ts',
        context: ['typescript'],
        params: {},
      };

      const key2: SemanticKey = {
        intent: 'update',
        target: 'file-name_with.special@chars.ts',
        context: ['typescript'],
        params: {},
      };

      const matches = matcher.findMatches(key1, [key2]);
      expect(matches).toHaveLength(1);
      expect(matches[0].score).toBe(1.0);
    });

    it('should handle very long context arrays', () => {
      const longContext = Array(50)
        .fill(null)
        .map((_, i) => `tag${i}`);

      const key: SemanticKey = {
        intent: 'analyze',
        target: 'app.ts',
        context: longContext,
        params: {},
      };

      const matches = matcher.findMatches(key, [key]);
      expect(matches).toHaveLength(1);
      expect(matches[0].score).toBe(1.0);
    });
  });
});
