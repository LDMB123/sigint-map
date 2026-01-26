/**
 * Tests for Semantic Encoder
 * Validates 90%+ semantic similarity matching for cache hits
 */

import { describe, it, expect } from 'vitest';
import {
  extractSemanticKey,
  hashSemanticKey,
  calculateSimilarity,
  findSimilar,
  normalizeSemanticKey,
  semanticKeyToString,
  type SemanticKey,
} from './semantic-encoder';

describe('extractSemanticKey', () => {
  describe('intent extraction', () => {
    it('should extract borrow-fix intent from various phrasings', () => {
      const requests = [
        'Fix the borrow error in src/lib.rs',
        'Resolve borrow checker issue in src/lib.rs',
        'Fix borrowing problem in src/lib.rs',
        'Help with borrow error src/lib.rs',
      ];

      const keys = requests.map(extractSemanticKey);

      // All should have the same intent
      expect(keys.every(k => k.intent === 'borrow-fix')).toBe(true);

      // All should have the same target
      expect(keys.every(k => k.target === 'src/lib.rs')).toBe(true);
    });

    it('should extract component-create intent', () => {
      const requests = [
        'Create a new React component',
        'Add a component for user profile',
        'Generate a new widget',
      ];

      const keys = requests.map(extractSemanticKey);

      expect(keys.every(k => k.intent === 'component-create')).toBe(true);
    });

    it('should extract error-fix intent', () => {
      const requests = [
        'Fix the error in main.ts',
        'Resolve this issue',
        'Debug the problem',
        'Solve this bug',
      ];

      const keys = requests.map(extractSemanticKey);

      expect(keys.every(k => k.intent === 'error-fix')).toBe(true);
    });

    it('should extract performance-optimize intent', () => {
      const requests = [
        'Optimize performance in UserService',
        'Improve speed of the query',
        'Enhance performance',
      ];

      const keys = requests.map(extractSemanticKey);

      expect(keys.every(k => k.intent === 'performance-optimize')).toBe(true);
    });

    it('should extract test-create intent', () => {
      const requests = [
        'Create tests for UserService',
        'Add unit tests',
        'Generate test spec',
        'Write tests',
      ];

      const keys = requests.map(extractSemanticKey);

      expect(keys.every(k => k.intent === 'test-create')).toBe(true);
    });
  });

  describe('target extraction', () => {
    it('should extract file paths', () => {
      const tests: Array<[string, string]> = [
        ['Fix error in src/lib.rs', 'src/lib.rs'],
        ['Update `app/main.ts`', 'app/main.ts'],
        ['Refactor file src/components/Header.tsx', 'src/components/Header.tsx'],
        ['Check ./utils/helper.js', 'utils/helper.js'],
        ['"src/app/page.tsx" has an error', 'src/app/page.tsx'],
      ];

      for (const [request, expected] of tests) {
        const key = extractSemanticKey(request);
        expect(key.target).toBe(expected);
      }
    });

    it('should extract module/class names', () => {
      const tests: Array<[string, string]> = [
        ['Refactor UserService', 'UserService'],
        ['Update AuthController', 'AuthController'],
        ['Optimize DataProvider', 'DataProvider'],
      ];

      for (const [request, expected] of tests) {
        const key = extractSemanticKey(request);
        expect(key.target).toBe(expected);
      }
    });

    it('should extract function names', () => {
      const tests: Array<[string, string]> = [
        ['Explain function calculateTotal', 'calculateTotal'],
        ['Update method handleSubmit', 'handleSubmit'],
      ];

      for (const [request, expected] of tests) {
        const key = extractSemanticKey(request);
        expect(key.target).toBe(expected);
      }
    });

    it('should handle missing targets', () => {
      const key = extractSemanticKey('Explain React hooks');
      expect(key.target).toBe('');
    });
  });

  describe('context extraction', () => {
    it('should extract language context from file extensions', () => {
      const tests: Array<[string, string[]]> = [
        ['Fix src/lib.rs', ['rust']],
        ['Update app/main.ts', ['typescript']],
        ['Refactor component.tsx', ['typescript', 'react']],
        ['Debug script.py', ['python']],
      ];

      for (const [request, expectedContext] of tests) {
        const key = extractSemanticKey(request);
        expect(key.context).toEqual(expect.arrayContaining(expectedContext));
      }
    });

    it('should extract framework context', () => {
      const tests: Array<[string, string[]]> = [
        ['Create React component', ['react', 'javascript']],
        ['Setup Next.js project', ['nextjs', 'react', 'javascript']],
        ['Configure NestJS module', ['nestjs', 'typescript']],
      ];

      for (const [request, expectedContext] of tests) {
        const key = extractSemanticKey(request);
        expect(key.context).toEqual(expect.arrayContaining(expectedContext));
      }
    });

    it('should extract domain context', () => {
      const tests: Array<[string, string[]]> = [
        ['Fix borrow error', ['memory-management', 'rust']],
        ['Handle async operation', ['async']],
        ['Optimize database query', ['database']],
        ['Create REST API endpoint', ['api']],
      ];

      for (const [request, expectedContext] of tests) {
        const key = extractSemanticKey(request);
        expect(key.context).toEqual(expect.arrayContaining(expectedContext));
      }
    });

    it('should remove duplicate context entries', () => {
      // "React" mentioned twice, file is .tsx (adds react+typescript)
      const key = extractSemanticKey('Create React component in component.tsx using React hooks');
      const uniqueContext = [...new Set(key.context)];
      expect(key.context.length).toBe(uniqueContext.length);
    });
  });

  describe('parameter extraction', () => {
    it('should extract boolean flags from create/generate commands', () => {
      const key1 = extractSemanticKey('Create component with tests');
      expect(key1.params.flags).toEqual({ tests: true });

      const key2 = extractSemanticKey('Generate docs without examples');
      expect(key2.params.flags).toEqual({ examples: false });

      // Should not extract flags from "help with" or other non-creation verbs
      const key3 = extractSemanticKey('Help with borrow error');
      expect(key3.params.flags).toBeUndefined();
    });

    it('should extract counts', () => {
      const key = extractSemanticKey('Show 10 lines of code');
      expect(key.params.count).toBe(10);
    });

    it('should extract priority', () => {
      const key = extractSemanticKey('Fix high priority bug');
      expect(key.params.priority).toBe('high');
    });

    it('should extract versions', () => {
      const key = extractSemanticKey('Update to version 2.5.1');
      expect(key.params.version).toBe('2.5.1');
    });
  });
});

describe('hashSemanticKey', () => {
  it('should generate consistent hashes for identical keys', () => {
    const key: SemanticKey = {
      intent: 'borrow-fix',
      target: 'src/lib.rs',
      context: ['rust'],
      params: {},
    };

    const hash1 = hashSemanticKey(key);
    const hash2 = hashSemanticKey(key);

    expect(hash1).toBe(hash2);
  });

  it('should generate same hash regardless of context order', () => {
    const key1: SemanticKey = {
      intent: 'component-create',
      target: 'Header.tsx',
      context: ['react', 'typescript', 'ui'],
      params: {},
    };

    const key2: SemanticKey = {
      intent: 'component-create',
      target: 'Header.tsx',
      context: ['typescript', 'ui', 'react'], // Different order
      params: {},
    };

    expect(hashSemanticKey(key1)).toBe(hashSemanticKey(key2));
  });

  it('should generate same hash regardless of param key order', () => {
    const key1: SemanticKey = {
      intent: 'test-create',
      target: 'service.ts',
      context: ['typescript'],
      params: { count: 5, priority: 'high' },
    };

    const key2: SemanticKey = {
      intent: 'test-create',
      target: 'service.ts',
      context: ['typescript'],
      params: { priority: 'high', count: 5 }, // Different order
    };

    expect(hashSemanticKey(key1)).toBe(hashSemanticKey(key2));
  });

  it('should generate different hashes for different intents', () => {
    const key1: SemanticKey = {
      intent: 'borrow-fix',
      target: 'src/lib.rs',
      context: ['rust'],
      params: {},
    };

    const key2: SemanticKey = {
      intent: 'error-fix',
      target: 'src/lib.rs',
      context: ['rust'],
      params: {},
    };

    expect(hashSemanticKey(key1)).not.toBe(hashSemanticKey(key2));
  });
});

describe('calculateSimilarity', () => {
  it('should return 1.0 for identical keys', () => {
    const key: SemanticKey = {
      intent: 'borrow-fix',
      target: 'src/lib.rs',
      context: ['rust'],
      params: {},
    };

    const similarity = calculateSimilarity(key, key);
    expect(similarity).toBe(1.0);
  });

  it('should return high similarity for same intent and target', () => {
    const key1: SemanticKey = {
      intent: 'borrow-fix',
      target: 'src/lib.rs',
      context: ['rust'],
      params: {},
    };

    const key2: SemanticKey = {
      intent: 'borrow-fix',
      target: 'src/lib.rs',
      context: ['rust', 'memory-management'],
      params: {},
    };

    const similarity = calculateSimilarity(key1, key2);
    expect(similarity).toBeGreaterThan(0.85); // Should trigger cache hit
  });

  it('should return moderate similarity for same intent, different target in same directory', () => {
    const key1: SemanticKey = {
      intent: 'borrow-fix',
      target: 'src/lib.rs',
      context: ['rust'],
      params: {},
    };

    const key2: SemanticKey = {
      intent: 'borrow-fix',
      target: 'src/main.rs',
      context: ['rust'],
      params: {},
    };

    const similarity = calculateSimilarity(key1, key2);
    // Intent: 1.0 * 0.5 = 0.5
    // Target: 0.4 * 0.3 = 0.12 (same directory)
    // Context: 1.0 * 0.2 = 0.2
    // Total: 0.82
    expect(similarity).toBeGreaterThan(0.5);
    expect(similarity).toBeLessThan(0.85); // Shouldn't trigger cache hit at 0.85 threshold
  });

  it('should return low similarity for completely different intents', () => {
    const key1: SemanticKey = {
      intent: 'borrow-fix',
      target: 'src/lib.rs',
      context: ['rust'],
      params: {},
    };

    const key2: SemanticKey = {
      intent: 'component-create',
      target: 'src/lib.rs',
      context: ['rust'],
      params: {},
    };

    const similarity = calculateSimilarity(key1, key2);
    // Intent: 0.0 * 0.5 = 0.0 (different categories)
    // Target: 1.0 * 0.3 = 0.3 (same target)
    // Context: 1.0 * 0.2 = 0.2 (same context)
    // Total: 0.5
    expect(similarity).toBeLessThanOrEqual(0.5);
  });

  it('should give higher weight to intent than target', () => {
    // Same intent, different target
    const key1: SemanticKey = {
      intent: 'borrow-fix',
      target: 'src/lib.rs',
      context: ['rust'],
      params: {},
    };

    const key2: SemanticKey = {
      intent: 'borrow-fix',
      target: 'src/main.rs',
      context: ['rust'],
      params: {},
    };

    const sim1 = calculateSimilarity(key1, key2);

    // Different intent, same target
    const key3: SemanticKey = {
      intent: 'error-fix',
      target: 'src/lib.rs',
      context: ['rust'],
      params: {},
    };

    const sim2 = calculateSimilarity(key1, key3);

    expect(sim1).toBeGreaterThan(sim2);
  });

  it('should return high similarity for same basename', () => {
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

    const similarity = calculateSimilarity(key1, key2);
    expect(similarity).toBeGreaterThan(0.85); // Should trigger cache hit
  });
});

describe('findSimilar', () => {
  it('should find similar keys above threshold', () => {
    const targetKey: SemanticKey = {
      intent: 'borrow-fix',
      target: 'src/lib.rs',
      context: ['rust'],
      params: {},
    };

    const candidates: SemanticKey[] = [
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
      {
        intent: 'component-create',
        target: 'Header.tsx',
        context: ['react'],
        params: {},
      },
    ];

    const similar = findSimilar(targetKey, candidates, 0.85);

    expect(similar.length).toBeGreaterThan(0);
    expect(similar[0].score).toBeGreaterThanOrEqual(0.85);
  });

  it('should sort results by similarity score (descending)', () => {
    const targetKey: SemanticKey = {
      intent: 'borrow-fix',
      target: 'src/lib.rs',
      context: ['rust'],
      params: {},
    };

    const candidates: SemanticKey[] = [
      {
        intent: 'borrow-fix',
        target: 'src/main.rs',
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
        intent: 'borrow-fix',
        target: 'lib.rs',
        context: ['rust'],
        params: {},
      },
    ];

    const similar = findSimilar(targetKey, candidates, 0.7);

    // Should be sorted descending
    for (let i = 0; i < similar.length - 1; i++) {
      expect(similar[i].score).toBeGreaterThanOrEqual(similar[i + 1].score);
    }
  });

  it('should filter out results below threshold', () => {
    const targetKey: SemanticKey = {
      intent: 'borrow-fix',
      target: 'src/lib.rs',
      context: ['rust'],
      params: {},
    };

    const candidates: SemanticKey[] = [
      {
        intent: 'component-create',
        target: 'Header.tsx',
        context: ['react'],
        params: {},
      },
    ];

    const similar = findSimilar(targetKey, candidates, 0.85);

    expect(similar.length).toBe(0);
  });
});

describe('normalizeSemanticKey', () => {
  it('should normalize key components', () => {
    const key: SemanticKey = {
      intent: 'BORROW-FIX',
      target: '  src/lib.rs  ',
      context: ['Rust', 'MEMORY-MANAGEMENT', 'rust'],
      params: {},
    };

    const normalized = normalizeSemanticKey(key);

    expect(normalized.intent).toBe('borrow-fix');
    expect(normalized.target).toBe('src/lib.rs');
    expect(normalized.context).toEqual(['memory-management', 'rust']);
  });

  it('should remove duplicate contexts and sort', () => {
    const key: SemanticKey = {
      intent: 'test-create',
      target: 'service.ts',
      context: ['typescript', 'testing', 'typescript', 'async'],
      params: {},
    };

    const normalized = normalizeSemanticKey(key);

    expect(normalized.context).toEqual(['async', 'testing', 'typescript']);
  });
});

describe('semanticKeyToString', () => {
  it('should convert key to readable string', () => {
    const key: SemanticKey = {
      intent: 'borrow-fix',
      target: 'src/lib.rs',
      context: ['rust', 'memory-management'],
      params: { priority: 'high' },
    };

    const str = semanticKeyToString(key);

    expect(str).toContain('Intent: borrow-fix');
    expect(str).toContain('Target: src/lib.rs');
    expect(str).toContain('Context: [rust, memory-management]');
    expect(str).toContain('Params:');
    expect(str).toContain('priority');
  });

  it('should handle minimal key', () => {
    const key: SemanticKey = {
      intent: 'generic',
      target: '',
      context: [],
      params: {},
    };

    const str = semanticKeyToString(key);

    expect(str).toContain('Intent: generic');
    expect(str).not.toContain('Target:');
    expect(str).not.toContain('Context:');
    expect(str).not.toContain('Params:');
  });
});

describe('cache hit rate simulation', () => {
  it('should achieve 90%+ hit rate on similar requests', () => {
    // Simulate 100 requests with variations
    const requestVariations = [
      // Borrow error variations (20 requests)
      ...Array(5).fill('Fix the borrow error in src/lib.rs'),
      ...Array(5).fill('Resolve borrow checker issue in src/lib.rs'),
      ...Array(5).fill('Fix borrowing problem in src/lib.rs'),
      ...Array(5).fill('Help with borrow error src/lib.rs'),

      // Component creation variations (20 requests)
      ...Array(5).fill('Create a new React component'),
      ...Array(5).fill('Add a React component'),
      ...Array(5).fill('Generate a new component'),
      ...Array(5).fill('Make a component'),

      // Performance optimization variations (20 requests)
      ...Array(5).fill('Optimize performance in UserService'),
      ...Array(5).fill('Improve speed in UserService'),
      ...Array(5).fill('Enhance performance of UserService'),
      ...Array(5).fill('Speed up UserService'),

      // Test creation variations (20 requests)
      ...Array(5).fill('Create tests for UserService'),
      ...Array(5).fill('Add unit tests for UserService'),
      ...Array(5).fill('Generate test spec for UserService'),
      ...Array(5).fill('Write tests for UserService'),

      // Error fixes variations (20 requests)
      ...Array(5).fill('Fix error in main.ts'),
      ...Array(5).fill('Resolve issue in main.ts'),
      ...Array(5).fill('Debug problem in main.ts'),
      ...Array(5).fill('Solve bug in main.ts'),
    ];

    // Extract semantic keys
    const keys = requestVariations.map(extractSemanticKey);

    // Track unique semantic hashes (cache entries)
    const uniqueHashes = new Set(keys.map(hashSemanticKey));

    // Calculate hit rate
    const cacheEntries = uniqueHashes.size;
    const totalRequests = requestVariations.length;
    const hitRate = (totalRequests - cacheEntries) / totalRequests;

    console.log(`Cache simulation:
      Total requests: ${totalRequests}
      Unique cache entries: ${cacheEntries}
      Cache hit rate: ${(hitRate * 100).toFixed(1)}%
    `);

    // Should achieve 90%+ hit rate
    expect(hitRate).toBeGreaterThanOrEqual(0.90);
  });

  it('should handle fuzzy matching for near-identical requests', () => {
    const request1 = 'Fix borrow error in src/lib.rs';
    const request2 = 'Fix borrow error in lib.rs'; // Same file basename

    const key1 = extractSemanticKey(request1);
    const key2 = extractSemanticKey(request2);

    const similarity = calculateSimilarity(key1, key2);

    // Should be similar enough for cache hit (threshold typically 0.85)
    expect(similarity).toBeGreaterThan(0.85);
  });
});
