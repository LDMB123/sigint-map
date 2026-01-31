/**
 * ReDoS Protection Test Suite
 *
 * Tests for regex-safe.ts utilities that prevent Regular Expression Denial of Service attacks
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  safeRegexTest,
  safeRegexMatch,
  fastSafeRegexTest,
  fastSafeRegexMatch,
  validateRegexPattern,
  boundRegexQuantifiers,
  escapeRegex,
  RegexTimeoutError,
  RegexInputTooLargeError,
} from './regex-safe';

describe('ReDoS Protection - safeRegexTest', () => {
  it('should handle normal input correctly', () => {
    const result = safeRegexTest(/\d+/, '12345');
    expect(result).toBe(true);
  });

  it('should handle non-matching input', () => {
    const result = safeRegexTest(/\d+/, 'abc');
    expect(result).toBe(false);
  });

  it('should truncate oversized input', () => {
    const hugeInput = 'a'.repeat(10000);
    const result = safeRegexTest(/^a+$/, hugeInput, { maxInputSize: 100 });
    expect(result).toBe(false); // Truncated input won't match ^a+$
  });

  it('should throw on oversized input when throwOnTimeout is true', () => {
    const hugeInput = 'a'.repeat(10000);
    expect(() => {
      safeRegexTest(/a+/, hugeInput, {
        maxInputSize: 100,
        throwOnTimeout: true,
      });
    }).toThrow(RegexInputTooLargeError);
  });

  it('should handle potentially malicious patterns safely', () => {
    // This pattern can cause catastrophic backtracking: (a+)+
    const maliciousPattern = /^(a+)+$/;
    const maliciousInput = 'a'.repeat(50) + '!'; // Input that forces backtracking

    const start = Date.now();
    const result = safeRegexTest(maliciousPattern, maliciousInput, {
      timeout: 100,
    });
    const duration = Date.now() - start;

    expect(result).toBe(false); // Should timeout or fail quickly
    expect(duration).toBeLessThan(200); // Should timeout within 200ms
  });

  it('should return false on timeout by default', () => {
    const slowPattern = /^(a+)+$/;
    const slowInput = 'a'.repeat(30) + '!';

    const result = safeRegexTest(slowPattern, slowInput, { timeout: 50 });
    expect(result).toBe(false);
  });

  it('should throw RegexTimeoutError when throwOnTimeout is true', () => {
    const slowPattern = /^(a+)+$/;
    const slowInput = 'a'.repeat(30) + '!';

    expect(() => {
      safeRegexTest(slowPattern, slowInput, {
        timeout: 50,
        throwOnTimeout: true,
      });
    }).toThrow(RegexTimeoutError);
  });
});

describe('ReDoS Protection - safeRegexMatch', () => {
  it('should match normal input correctly', () => {
    const result = safeRegexMatch(/(\d+)/, 'abc123def');
    expect(result).not.toBeNull();
    expect(result?.[1]).toBe('123');
  });

  it('should return null for non-matching input', () => {
    const result = safeRegexMatch(/\d+/, 'abc');
    expect(result).toBeNull();
  });

  it('should truncate large match results', () => {
    const longString = 'a'.repeat(1000);
    const pattern = /(a+)/;

    const result = safeRegexMatch(pattern, longString, {
      maxMatchSize: 100,
    });

    expect(result).not.toBeNull();
    expect(result?.[1].length).toBeLessThanOrEqual(100);
  });

  it('should truncate oversized input', () => {
    const hugeInput = 'prefix:' + 'a'.repeat(10000);

    const result = safeRegexMatch(/prefix:(.+)/, hugeInput, {
      maxInputSize: 100,
    });

    expect(result).not.toBeNull();
    expect(result?.[0].length).toBeLessThanOrEqual(100);
  });

  it('should handle malicious nested quantifier patterns', () => {
    const maliciousPattern = /^(a+)+b$/;
    const maliciousInput = 'a'.repeat(50) + 'c'; // Forces backtracking

    const start = Date.now();
    const result = safeRegexMatch(maliciousPattern, maliciousInput, {
      timeout: 100,
    });
    const duration = Date.now() - start;

    expect(result).toBeNull(); // Should timeout
    expect(duration).toBeLessThan(200);
  });

  it('should return null on timeout', () => {
    const slowPattern = /^(a*)*b$/;
    const slowInput = 'a'.repeat(30) + 'c';

    const result = safeRegexMatch(slowPattern, slowInput, { timeout: 50 });
    expect(result).toBeNull();
  });
});

describe('ReDoS Protection - fastSafeRegexTest', () => {
  it('should handle normal input quickly', () => {
    const result = fastSafeRegexTest(/\d+/, '12345');
    expect(result).toBe(true);
  });

  it('should truncate oversized input', () => {
    const hugeInput = 'a'.repeat(10000);
    const result = fastSafeRegexTest(/^a+$/, hugeInput, 100);
    expect(result).toBe(false); // Truncated input won't match
  });

  it('should be faster than full safeRegexTest (no timeout overhead)', () => {
    const input = 'test123';
    const pattern = /\d+/;

    const start1 = Date.now();
    for (let i = 0; i < 1000; i++) {
      fastSafeRegexTest(pattern, input);
    }
    const duration1 = Date.now() - start1;

    const start2 = Date.now();
    for (let i = 0; i < 1000; i++) {
      safeRegexTest(pattern, input);
    }
    const duration2 = Date.now() - start2;

    // fastSafeRegexTest should be faster (or at least not significantly slower)
    expect(duration1).toBeLessThanOrEqual(duration2 * 1.5);
  });
});

describe('ReDoS Protection - fastSafeRegexMatch', () => {
  it('should match normal input quickly', () => {
    const result = fastSafeRegexMatch(/(\d+)/, 'abc123def');
    expect(result).not.toBeNull();
    expect(result?.[1]).toBe('123');
  });

  it('should truncate large match results', () => {
    const longString = 'a'.repeat(1000);
    const result = fastSafeRegexMatch(/(a+)/, longString, 1024, 100);

    expect(result).not.toBeNull();
    expect(result?.[1].length).toBeLessThanOrEqual(100);
  });

  it('should truncate input larger than maxInputSize', () => {
    const hugeInput = 'a'.repeat(10000);
    const result = fastSafeRegexMatch(/(a+)/, hugeInput, 100, 500);

    expect(result).not.toBeNull();
    expect(result?.[0].length).toBeLessThanOrEqual(100);
  });
});

describe('ReDoS Protection - validateRegexPattern', () => {
  it('should detect nested quantifiers', () => {
    const pattern = /^(a+)+$/;
    const result = validateRegexPattern(pattern);

    expect(result.safe).toBe(false);
    expect(result.warnings).toContain(
      expect.stringContaining('Nested quantifiers')
    );
  });

  it('should detect excessive unbounded quantifiers', () => {
    const pattern = /a+b*c+d*e+f*g+/;
    const result = validateRegexPattern(pattern);

    expect(result.safe).toBe(false);
    expect(result.warnings).toContain(
      expect.stringContaining('unbounded quantifiers')
    );
  });

  it('should detect alternation with quantifiers', () => {
    const pattern = /(a|b)+/;
    const result = validateRegexPattern(pattern);

    expect(result.safe).toBe(false);
    expect(result.warnings).toContain(expect.stringContaining('Alternation'));
  });

  it('should detect greedy dot quantifiers', () => {
    const pattern = /.*test.+/;
    const result = validateRegexPattern(pattern);

    expect(result.safe).toBe(false);
    expect(result.warnings).toContain(expect.stringContaining('Greedy dot'));
  });

  it('should validate safe patterns', () => {
    const pattern = /^[a-z]{1,10}$/;
    const result = validateRegexPattern(pattern);

    expect(result.safe).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('should validate word boundary patterns as safe', () => {
    const pattern = /\b(rust|wasm|svelte)\b/i;
    const result = validateRegexPattern(pattern);

    expect(result.safe).toBe(true);
  });
});

describe('ReDoS Protection - boundRegexQuantifiers', () => {
  it('should convert * to {0,N}', () => {
    const pattern = /a*/;
    const bounded = boundRegexQuantifiers(pattern, 10);

    expect(bounded.source).toBe('a{0,10}');
    expect(bounded.flags).toBe(pattern.flags);
  });

  it('should convert + to {1,N}', () => {
    const pattern = /a+/;
    const bounded = boundRegexQuantifiers(pattern, 10);

    expect(bounded.source).toBe('a{1,10}');
  });

  it('should handle multiple quantifiers', () => {
    const pattern = /a+b*c+/;
    const bounded = boundRegexQuantifiers(pattern, 5);

    expect(bounded.source).toBe('a{1,5}b{0,5}c{1,5}');
  });

  it('should preserve regex flags', () => {
    const pattern = /a+/gi;
    const bounded = boundRegexQuantifiers(pattern);

    expect(bounded.flags).toBe('gi');
  });

  it('should use custom max repetitions', () => {
    const pattern = /a*/;
    const bounded = boundRegexQuantifiers(pattern, 20);

    expect(bounded.source).toBe('a{0,20}');
  });

  it('should handle complex patterns', () => {
    const pattern = /tier:\s*(opus|sonnet|haiku)/i;
    const bounded = boundRegexQuantifiers(pattern, 50);

    expect(bounded.source).toBe('tier:\\s{0,50}(opus|sonnet|haiku)');
    expect(bounded.flags).toBe('i');
  });
});

describe('ReDoS Protection - escapeRegex', () => {
  it('should escape special regex characters', () => {
    const input = 'a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o';
    const escaped = escapeRegex(input);

    expect(escaped).toBe('a\\.b\\*c\\+d\\?e\\^f\\$g\\{h\\}i\\(j\\)k\\|l\\[m\\]n\\\\o');
  });

  it('should allow escaped string to match literally', () => {
    const input = 'hello.world';
    const escaped = escapeRegex(input);
    const pattern = new RegExp(escaped);

    expect(pattern.test('hello.world')).toBe(true);
    expect(pattern.test('helloXworld')).toBe(false);
  });

  it('should handle empty string', () => {
    const escaped = escapeRegex('');
    expect(escaped).toBe('');
  });

  it('should handle string with no special characters', () => {
    const input = 'hello123';
    const escaped = escapeRegex(input);
    expect(escaped).toBe('hello123');
  });
});

describe('ReDoS Protection - Real-world Attack Scenarios', () => {
  it('should handle malicious tier extraction pattern', () => {
    // Attack: tier: followed by 10,000 spaces and invalid value
    const malicious = 'tier:' + ' '.repeat(10000) + 'invalid';

    const start = Date.now();
    const result = safeRegexMatch(/tier:\s{0,50}(opus|sonnet|haiku)/i, malicious, {
      maxInputSize: 1024,
      timeout: 100,
    });
    const duration = Date.now() - start;

    expect(result).toBeNull(); // Should not match
    expect(duration).toBeLessThan(200); // Should complete quickly
  });

  it('should handle malicious description extraction pattern', () => {
    // Attack: description: followed by 100,000 character string
    const malicious = 'description:' + 'a'.repeat(100000);

    const start = Date.now();
    const result = safeRegexMatch(/description:\s{0,20}(.{0,500})/i, malicious, {
      maxInputSize: 1024,
      maxMatchSize: 500,
      timeout: 100,
    });
    const duration = Date.now() - start;

    expect(result).not.toBeNull();
    expect(result?.[1].length).toBeLessThanOrEqual(500);
    expect(duration).toBeLessThan(200);
  });

  it('should handle alternation-based ReDoS attack', () => {
    // Pattern: (a|a)*
    const maliciousPattern = /^(a|a)*b$/;
    const maliciousInput = 'a'.repeat(50) + 'c';

    const start = Date.now();
    const result = safeRegexTest(maliciousPattern, maliciousInput, {
      timeout: 100,
    });
    const duration = Date.now() - start;

    expect(result).toBe(false);
    expect(duration).toBeLessThan(200);
  });

  it('should handle nested group ReDoS attack', () => {
    // Pattern: (a*)*
    const maliciousPattern = /^(a*)*b$/;
    const maliciousInput = 'a'.repeat(40) + 'c';

    const start = Date.now();
    const result = safeRegexTest(maliciousPattern, maliciousInput, {
      timeout: 100,
    });
    const duration = Date.now() - start;

    expect(result).toBe(false);
    expect(duration).toBeLessThan(200);
  });

  it('should handle exponential backtracking attack', () => {
    // Pattern that causes exponential backtracking
    const maliciousPattern = /^(a+)+b$/;
    const maliciousInput = 'a'.repeat(25) + 'c'; // Small input can cause massive backtracking

    const start = Date.now();
    const result = safeRegexMatch(maliciousPattern, maliciousInput, {
      timeout: 100,
    });
    const duration = Date.now() - start;

    expect(result).toBeNull();
    expect(duration).toBeLessThan(200);
  });
});

describe('ReDoS Protection - Performance Benchmarks', () => {
  it('should handle legitimate patterns efficiently', () => {
    const pattern = /tier:\s{0,50}(opus|sonnet|haiku)/i;
    const input = 'tier: sonnet';

    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      fastSafeRegexMatch(pattern, input);
    }
    const duration = Date.now() - start;

    // 1000 operations should complete in under 100ms
    expect(duration).toBeLessThan(100);
  });

  it('should have minimal overhead for safe patterns', () => {
    const pattern = /\b(rust|wasm|svelte)\b/i;
    const input = 'Fix rust borrow checker error';

    // Native regex
    const start1 = Date.now();
    for (let i = 0; i < 1000; i++) {
      pattern.test(input);
    }
    const nativeDuration = Date.now() - start1;

    // Safe regex
    const start2 = Date.now();
    for (let i = 0; i < 1000; i++) {
      fastSafeRegexTest(pattern, input);
    }
    const safeDuration = Date.now() - start2;

    // Overhead should be less than 2x
    expect(safeDuration).toBeLessThan(nativeDuration * 2);
  });
});
