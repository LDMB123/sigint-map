/**
 * Tests for Result Adapter
 */

import { describe, it, expect } from 'vitest';
import {
  ResultAdapter,
  TrackedResultAdapter,
  adaptResult,
  canAdaptResult,
  batchAdaptResults,
  type AdaptationResult,
  type AdapterConfig,
} from './result-adapter';
import type { SemanticKey } from './types';

describe('ResultAdapter', () => {
  describe('File Rename Adaptation', () => {
    it('should rename file paths in string results', () => {
      const adapter = new ResultAdapter<string>();
      const cached = 'Fixed borrow error in src/lib.rs by adding lifetime annotations';
      const fromKey: SemanticKey = {
        intent: 'borrow-fix',
        target: 'src/lib.rs',
        context: ['rust'],
        params: {},
      };
      const toKey: SemanticKey = {
        intent: 'borrow-fix',
        target: 'src/main.rs',
        context: ['rust'],
        params: {},
      };

      const result = adapter.adapt(cached, fromKey, toKey);

      expect(result.success).toBe(true);
      expect(result.result).toContain('src/main.rs');
      expect(result.result).not.toContain('src/lib.rs');
      expect(result.transformations).toHaveLength(1);
      expect(result.transformations[0].type).toBe('file-rename');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should rename file paths in object results', () => {
      // More realistic scenario - same file in different directory
      const adapter = new ResultAdapter<any>();
      const cached = {
        message: 'Fixed error in src/lib/utils.ts',
        files: ['src/lib/utils.ts', 'src/lib/utils.test.ts'],
        code: 'import { helper } from "./src/lib/utils";',
      };
      const fromKey: SemanticKey = {
        intent: 'error-fix',
        target: 'src/lib/utils.ts',
        context: ['typescript'],
        params: {},
      };
      const toKey: SemanticKey = {
        intent: 'error-fix',
        target: 'src/core/utils.ts',
        context: ['typescript'],
        params: {},
      };

      const result = adapter.adapt(cached, fromKey, toKey);

      expect(result.success).toBe(true);
      expect(result.result.message).toContain('src/core/utils.ts');
      expect(result.result.files).toContain('src/core/utils.ts');
    });

    it('should handle basename-only matches', () => {
      const adapter = new ResultAdapter<string>();
      const cached = 'Updated lib.rs with new implementation';
      const fromKey: SemanticKey = {
        intent: 'update',
        target: 'src/lib.rs',
        context: ['rust'],
        params: {},
      };
      const toKey: SemanticKey = {
        intent: 'update',
        target: 'lib.rs',
        context: ['rust'],
        params: {},
      };

      const result = adapter.adapt(cached, fromKey, toKey);

      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Parameter Interpolation', () => {
    it('should interpolate numeric parameters', () => {
      const adapter = new ResultAdapter<any>();
      const cached = {
        message: 'Created component with 5 props',
        code: 'const props = new Array(5);',
      };
      const fromKey: SemanticKey = {
        intent: 'component-create',
        target: 'Component.tsx',
        context: ['react'],
        params: { count: 5 },
      };
      const toKey: SemanticKey = {
        intent: 'component-create',
        target: 'Component.tsx',
        context: ['react'],
        params: { count: 10 },
      };

      const result = adapter.adapt(cached, fromKey, toKey);

      expect(result.success).toBe(true);
      expect(result.result.message).toContain('10');
      expect(result.result.code).toContain('10');
      expect(result.transformations.some((t) => t.type === 'parameter-interpolation')).toBe(true);
    });

    it('should interpolate string parameters', () => {
      const adapter = new ResultAdapter<string>();
      const cached = 'Generated UserProfile component';
      const fromKey: SemanticKey = {
        intent: 'component-create',
        target: 'Component.tsx',
        context: ['react'],
        params: { name: 'UserProfile' },
      };
      const toKey: SemanticKey = {
        intent: 'component-create',
        target: 'Component.tsx',
        context: ['react'],
        params: { name: 'UserSettings' },
      };

      const result = adapter.adapt(cached, fromKey, toKey);

      expect(result.success).toBe(true);
      expect(result.result).toContain('UserSettings');
      expect(result.result).not.toContain('UserProfile');
    });

    it('should handle multiple parameter changes', () => {
      const adapter = new ResultAdapter<any>();
      const cached = {
        message: 'Created function with 3 parameters returning string',
      };
      const fromKey: SemanticKey = {
        intent: 'function-create',
        target: 'utils.ts',
        context: ['typescript'],
        params: { count: 3, type: 'string' },
      };
      const toKey: SemanticKey = {
        intent: 'function-create',
        target: 'utils.ts',
        context: ['typescript'],
        params: { count: 5, type: 'number' },
      };

      const result = adapter.adapt(cached, fromKey, toKey);

      expect(result.success).toBe(true);
      expect(result.result.message).toContain('5');
      expect(result.result.message).toContain('number');
      expect(result.transformations.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Context Merging', () => {
    it('should merge new context tags', () => {
      const adapter = new ResultAdapter<any>();
      const cached = {
        solution: 'Fixed async error',
      };
      const fromKey: SemanticKey = {
        intent: 'error-fix',
        target: 'handler.ts',
        context: ['typescript'],
        params: {},
      };
      const toKey: SemanticKey = {
        intent: 'error-fix',
        target: 'handler.ts',
        context: ['typescript', 'async', 'nodejs'],
        params: {},
      };

      const result = adapter.adapt(cached, fromKey, toKey);

      expect(result.success).toBe(true);
      expect(result.result._metadata).toBeDefined();
      expect(result.result._metadata.context).toContain('async');
      expect(result.result._metadata.context).toContain('nodejs');
      expect(result.transformations.some((t) => t.type === 'context-merge')).toBe(true);
    });

    it('should not create transformation if no new context', () => {
      const adapter = new ResultAdapter<any>();
      const cached = { solution: 'Fixed error' };
      const fromKey: SemanticKey = {
        intent: 'error-fix',
        target: 'file.ts',
        context: ['typescript'],
        params: {},
      };
      const toKey: SemanticKey = {
        intent: 'error-fix',
        target: 'file.ts',
        context: ['typescript'],
        params: {},
      };

      const result = adapter.adapt(cached, fromKey, toKey);

      expect(result.success).toBe(true);
      expect(result.transformations.some((t) => t.type === 'context-merge')).toBe(false);
    });
  });

  describe('Confidence Calculation', () => {
    it('should have high confidence for same intent and similar target', () => {
      const adapter = new ResultAdapter();
      const fromKey: SemanticKey = {
        intent: 'borrow-fix',
        target: 'src/lib.rs',
        context: ['rust'],
        params: {},
      };
      const toKey: SemanticKey = {
        intent: 'borrow-fix',
        target: 'src/main.rs',
        context: ['rust'],
        params: {},
      };

      expect(adapter.canAdapt(fromKey, toKey)).toBe(true);
    });

    it('should have low confidence for different intents', () => {
      const adapter = new ResultAdapter();
      const fromKey: SemanticKey = {
        intent: 'borrow-fix',
        target: 'src/lib.rs',
        context: ['rust'],
        params: {},
      };
      const toKey: SemanticKey = {
        intent: 'component-create',
        target: 'Component.tsx',
        context: ['react'],
        params: {},
      };

      expect(adapter.canAdapt(fromKey, toKey)).toBe(false);
    });

    it('should adjust confidence based on target similarity', () => {
      const adapter = new ResultAdapter<string>();
      const cached = 'Fixed error in UserService';

      // Same basename
      const fromKey1: SemanticKey = {
        intent: 'error-fix',
        target: 'src/services/UserService.ts',
        context: ['typescript'],
        params: {},
      };
      const toKey1: SemanticKey = {
        intent: 'error-fix',
        target: 'UserService.ts',
        context: ['typescript'],
        params: {},
      };

      const result1 = adapter.adapt(cached, fromKey1, toKey1);
      expect(result1.confidence).toBeGreaterThan(0.8);

      // Different file
      const toKey2: SemanticKey = {
        intent: 'error-fix',
        target: 'ProfileService.ts',
        context: ['typescript'],
        params: {},
      };

      const result2 = adapter.adapt(cached, fromKey1, toKey2);
      expect(result2.confidence).toBeLessThan(result1.confidence);
    });
  });

  describe('Configuration', () => {
    it('should respect minimum confidence threshold', () => {
      const adapter = new ResultAdapter({ minConfidence: 0.9 });
      const cached = 'Fixed error';
      const fromKey: SemanticKey = {
        intent: 'error-fix',
        target: 'FileA.ts',
        context: ['typescript'],
        params: {},
      };
      const toKey: SemanticKey = {
        intent: 'error-fix',
        target: 'CompletelyDifferentFile.rs',
        context: ['rust'],
        params: {},
      };

      const result = adapter.adapt(cached, fromKey, toKey);

      expect(result.success).toBe(false);
      expect(result.failureReason).toContain('below threshold');
    });

    it('should disable specific transformations when configured', () => {
      const adapter = new ResultAdapter({ enableFileRename: false });
      const cached = 'Fixed error in src/lib.rs';
      const fromKey: SemanticKey = {
        intent: 'error-fix',
        target: 'src/lib.rs',
        context: ['rust'],
        params: {},
      };
      const toKey: SemanticKey = {
        intent: 'error-fix',
        target: 'src/main.rs',
        context: ['rust'],
        params: {},
      };

      const result = adapter.adapt(cached, fromKey, toKey);

      expect(result.transformations.some((t) => t.type === 'file-rename')).toBe(false);
    });

    it('should enforce max transformations limit', () => {
      const adapter = new ResultAdapter({ maxTransformations: 2 });
      const cached = {
        message: 'Created component with 5 props in UserService.ts',
      };
      const fromKey: SemanticKey = {
        intent: 'component-create',
        target: 'UserService.ts',
        context: ['typescript'],
        params: { count: 5 },
      };
      const toKey: SemanticKey = {
        intent: 'component-create',
        target: 'ProfileService.ts',
        context: ['typescript', 'react', 'async'],
        params: { count: 10 },
      };

      const result = adapter.adapt(cached, fromKey, toKey);

      // Should succeed if under limit, fail if over
      if (result.transformations.length > 2) {
        expect(result.success).toBe(false);
        expect(result.failureReason).toContain('Too many transformations');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined gracefully', () => {
      const adapter = new ResultAdapter();
      const cached = null;
      const fromKey: SemanticKey = {
        intent: 'test',
        target: 'file.ts',
        context: [],
        params: {},
      };
      const toKey: SemanticKey = {
        intent: 'test',
        target: 'file.ts',
        context: [],
        params: {},
      };

      const result = adapter.adapt(cached, fromKey, toKey);

      expect(result.success).toBe(true);
      expect(result.result).toBeNull();
    });

    it('should handle empty strings', () => {
      const adapter = new ResultAdapter<string>();
      const cached = '';
      const fromKey: SemanticKey = {
        intent: 'test',
        target: '',
        context: [],
        params: {},
      };
      const toKey: SemanticKey = {
        intent: 'test',
        target: '',
        context: [],
        params: {},
      };

      const result = adapter.adapt(cached, fromKey, toKey);

      expect(result.success).toBe(true);
      expect(result.result).toBe('');
    });

    it('should handle nested objects and arrays', () => {
      const adapter = new ResultAdapter<any>();
      const cached = {
        files: [
          { path: 'src/lib.rs', content: 'fn main() {}' },
          { path: 'src/lib.rs', content: 'mod test;' },
        ],
        summary: 'Updated src/lib.rs',
      };
      const fromKey: SemanticKey = {
        intent: 'update',
        target: 'src/lib.rs',
        context: ['rust'],
        params: {},
      };
      const toKey: SemanticKey = {
        intent: 'update',
        target: 'src/main.rs',
        context: ['rust'],
        params: {},
      };

      const result = adapter.adapt(cached, fromKey, toKey);

      expect(result.success).toBe(true);
      expect(result.result.files[0].path).toBe('src/main.rs');
      expect(result.result.files[1].path).toBe('src/main.rs');
      expect(result.result.summary).toContain('src/main.rs');
    });

    it('should not modify original cached result', () => {
      const adapter = new ResultAdapter<any>();
      const cached = {
        message: 'Fixed error in UserService',
        file: 'UserService.ts',
      };
      const original = JSON.parse(JSON.stringify(cached));

      const fromKey: SemanticKey = {
        intent: 'error-fix',
        target: 'UserService.ts',
        context: ['typescript'],
        params: {},
      };
      const toKey: SemanticKey = {
        intent: 'error-fix',
        target: 'ProfileService.ts',
        context: ['typescript'],
        params: {},
      };

      adapter.adapt(cached, fromKey, toKey);

      expect(cached).toEqual(original);
    });
  });

  describe('Convenience Functions', () => {
    it('should provide adaptResult convenience function', () => {
      const cached = 'Fixed error in src/lib.rs';
      const fromKey: SemanticKey = {
        intent: 'error-fix',
        target: 'src/lib.rs',
        context: ['rust'],
        params: {},
      };
      const toKey: SemanticKey = {
        intent: 'error-fix',
        target: 'src/main.rs',
        context: ['rust'],
        params: {},
      };

      const result = adaptResult(cached, fromKey, toKey);

      expect(result.success).toBe(true);
      expect(result.result).toContain('src/main.rs');
    });

    it('should provide canAdaptResult convenience function', () => {
      const fromKey: SemanticKey = {
        intent: 'error-fix',
        target: 'file.ts',
        context: ['typescript'],
        params: {},
      };
      const toKey: SemanticKey = {
        intent: 'error-fix',
        target: 'other.ts',
        context: ['typescript'],
        params: {},
      };

      const canAdapt = canAdaptResult(fromKey, toKey);

      expect(typeof canAdapt).toBe('boolean');
    });

    it('should batch adapt to multiple targets', () => {
      const cached = 'Fixed error';
      const fromKey: SemanticKey = {
        intent: 'error-fix',
        target: 'file1.ts',
        context: ['typescript'],
        params: {},
      };
      const toKeys: SemanticKey[] = [
        {
          intent: 'error-fix',
          target: 'file2.ts',
          context: ['typescript'],
          params: {},
        },
        {
          intent: 'error-fix',
          target: 'file3.ts',
          context: ['typescript'],
          params: {},
        },
      ];

      const results = batchAdaptResults(cached, fromKey, toKeys, { minConfidence: 0.5 });

      expect(results.size).toBe(2);
      expect(results.get(toKeys[0])?.success).toBe(true);
      expect(results.get(toKeys[1])?.success).toBe(true);
    });
  });

  describe('TrackedResultAdapter', () => {
    it('should track adaptation statistics', () => {
      const adapter = new TrackedResultAdapter<string>({ minConfidence: 0.5 });
      const cached = 'Fixed error in file.ts';
      const fromKey: SemanticKey = {
        intent: 'error-fix',
        target: 'file.ts',
        context: ['typescript'],
        params: {},
      };

      // Successful adaptations
      for (let i = 0; i < 3; i++) {
        const toKey: SemanticKey = {
          intent: 'error-fix',
          target: `file${i}.ts`,
          context: ['typescript'],
          params: {},
        };
        adapter.adapt(cached, fromKey, toKey);
      }

      // Failed adaptation
      const badKey: SemanticKey = {
        intent: 'component-create',
        target: 'Component.tsx',
        context: ['react'],
        params: {},
      };
      adapter.adapt(cached, fromKey, badKey);

      const stats = adapter.getStats();

      expect(stats.attempts).toBe(4);
      expect(stats.successes).toBe(3);
      expect(stats.failures).toBe(1);
      expect(stats.successRate).toBe(0.75);
      expect(stats.avgConfidence).toBeGreaterThan(0);
    });

    it('should track transformation breakdown', () => {
      // More realistic scenario
      const adapter = new TrackedResultAdapter<any>({ minConfidence: 0.5 });
      const cached = {
        message: 'Fixed error in src/utils/helper.ts with 5 params',
        files: ['src/utils/helper.ts'],
      };
      const fromKey: SemanticKey = {
        intent: 'error-fix',
        target: 'src/utils/helper.ts',
        context: ['typescript'],
        params: { count: 5 },
      };
      const toKey: SemanticKey = {
        intent: 'error-fix',
        target: 'src/core/helper.ts',
        context: ['typescript', 'async'],
        params: { count: 10 },
      };

      adapter.adapt(cached, fromKey, toKey);

      const stats = adapter.getStats();

      expect(stats.totalTransformations).toBeGreaterThan(0);
      expect(
        stats.transformationBreakdown['file-rename'] +
          stats.transformationBreakdown['parameter-interpolation'] +
          stats.transformationBreakdown['context-merge']
      ).toBe(stats.totalTransformations);
    });

    it('should reset statistics', () => {
      const adapter = new TrackedResultAdapter<string>();
      const cached = 'test';
      const fromKey: SemanticKey = {
        intent: 'test',
        target: 'file.ts',
        context: [],
        params: {},
      };
      const toKey: SemanticKey = {
        intent: 'test',
        target: 'other.ts',
        context: [],
        params: {},
      };

      adapter.adapt(cached, fromKey, toKey);
      expect(adapter.getStats().attempts).toBeGreaterThan(0);

      adapter.resetStats();
      expect(adapter.getStats().attempts).toBe(0);
      expect(adapter.getStats().successes).toBe(0);
      expect(adapter.getStats().failures).toBe(0);
    });
  });
});
