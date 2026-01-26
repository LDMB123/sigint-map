/**
 * Tests for Semantic Hash Generator
 */

import { describe, it, expect } from 'vitest';
import {
  hashRequest,
  unpackHash,
  formatHash,
  analyzeRequest,
  DOMAIN,
  ACTION,
  SUBTYPE,
} from './semantic-hash';

describe('Semantic Hash Generator', () => {
  describe('hashRequest', () => {
    it('should hash Rust borrow checker error requests', () => {
      const hash = hashRequest('Fix borrow checker error in async function');
      const unpacked = unpackHash(hash);

      expect(unpacked.domain).toBe(DOMAIN.RUST);
      expect(unpacked.action).toBe(ACTION.DEBUG);
      expect(unpacked.subtype).toBe(SUBTYPE.BORROW_CHECKER);
      expect(unpacked.confidence).toBeGreaterThan(10);
    });

    it('should hash Leptos SSR creation requests', () => {
      const hash = hashRequest('Create a new Leptos SSR application');
      const unpacked = unpackHash(hash);

      expect(unpacked.domain).toBe(DOMAIN.WASM);
      expect(unpacked.action).toBe(ACTION.CREATE);
      expect(unpacked.subtype).toBe(SUBTYPE.LEPTOS_SSR);
      expect(unpacked.confidence).toBeGreaterThan(10);
    });

    it('should hash security vulnerability requests', () => {
      const hash = hashRequest('Review code for XSS vulnerabilities');
      const unpacked = unpackHash(hash);

      expect(unpacked.domain).toBe(DOMAIN.SECURITY);
      expect(unpacked.action).toBe(ACTION.REVIEW);
      expect(unpacked.subtype).toBe(SUBTYPE.XSS);
    });

    it('should hash database migration requests', () => {
      const hash = hashRequest('Create Prisma migration for user table');
      const unpacked = unpackHash(hash);

      expect(unpacked.domain).toBe(DOMAIN.PRISMA);
      expect(unpacked.action).toBe(ACTION.CREATE);
      expect(unpacked.subtype).toBe(SUBTYPE.MIGRATION);
    });

    it('should hash TypeScript generics requests', () => {
      const hash = hashRequest('Fix TypeScript generic type inference error');
      const unpacked = unpackHash(hash);

      expect(unpacked.domain).toBe(DOMAIN.TYPESCRIPT);
      expect(unpacked.action).toBe(ACTION.DEBUG);
      expect(unpacked.subtype).toBe(SUBTYPE.GENERICS);
    });

    it('should hash tRPC router requests', () => {
      const hash = hashRequest('Create tRPC router for user authentication');
      const unpacked = unpackHash(hash);

      expect(unpacked.domain).toBe(DOMAIN.TRPC);
      expect(unpacked.action).toBe(ACTION.CREATE);
      expect(unpacked.subtype).toBe(SUBTYPE.TRPC_ROUTER);
    });
  });

  describe('complexity calculation', () => {
    it('should assign higher complexity to architectural requests', () => {
      const simple = hashRequest('Fix typo');
      const complex = hashRequest(
        'Design scalable distributed architecture with microservices and event sourcing'
      );

      const simpleUnpacked = unpackHash(simple);
      const complexUnpacked = unpackHash(complex);

      expect(complexUnpacked.complexity).toBeGreaterThan(simpleUnpacked.complexity);
    });

    it('should assign higher complexity to multi-step requests', () => {
      const simple = hashRequest('Create a component');
      const complex = hashRequest(
        'First create the schema, then migrate the database, next implement the API, and finally update the frontend'
      );

      const simpleUnpacked = unpackHash(simple);
      const complexUnpacked = unpackHash(complex);

      expect(complexUnpacked.complexity).toBeGreaterThan(simpleUnpacked.complexity);
    });

    it('should reduce complexity for explicitly simple requests', () => {
      const normal = hashRequest('Create a React component');
      const simple = hashRequest('Just create a simple basic React component');

      const normalUnpacked = unpackHash(normal);
      const simpleUnpacked = unpackHash(simple);

      expect(simpleUnpacked.complexity).toBeLessThanOrEqual(normalUnpacked.complexity);
    });
  });

  describe('pack and unpack', () => {
    it('should correctly pack and unpack hash values', () => {
      const requests = [
        'Fix borrow checker error',
        'Create Leptos SSR app',
        'Optimize database queries',
        'Test React component',
        'Deploy to production',
      ];

      requests.forEach((request) => {
        const hash = hashRequest(request);
        const unpacked = unpackHash(hash);

        // Re-pack and verify
        const repacked =
          (BigInt(unpacked.domain) << 56n) |
          (BigInt(unpacked.complexity) << 52n) |
          (BigInt(unpacked.action) << 44n) |
          (BigInt(unpacked.subtype) << 32n) |
          (BigInt(unpacked.confidence) << 28n) |
          BigInt(unpacked.reserved);

        expect(repacked).toBe(hash);
      });
    });

    it('should handle all field value ranges', () => {
      const testCases = [
        { domain: 0xFF, complexity: 0x0F, action: 0xFF, subtype: 0xFFF, confidence: 0x0F },
        { domain: 0x00, complexity: 0x00, action: 0x00, subtype: 0x000, confidence: 0x00 },
        { domain: 0x01, complexity: 0x0C, action: 0x02, subtype: 0x042, confidence: 0x0F },
      ];

      testCases.forEach((testCase) => {
        const packed =
          (BigInt(testCase.domain) << 56n) |
          (BigInt(testCase.complexity) << 52n) |
          (BigInt(testCase.action) << 44n) |
          (BigInt(testCase.subtype) << 32n) |
          (BigInt(testCase.confidence) << 28n);

        const unpacked = unpackHash(packed);

        expect(unpacked.domain).toBe(testCase.domain);
        expect(unpacked.complexity).toBe(testCase.complexity);
        expect(unpacked.action).toBe(testCase.action);
        expect(unpacked.subtype).toBe(testCase.subtype);
        expect(unpacked.confidence).toBe(testCase.confidence);
      });
    });
  });

  describe('formatHash', () => {
    it('should format hash as hex string', () => {
      const hash = hashRequest('Fix borrow checker error');
      const formatted = formatHash(hash);

      expect(formatted).toMatch(/^0x[0-9A-F]{2}_[0-9A-F]_[0-9A-F]{2}_[0-9A-F]{3}_[0-9A-F]_[0-9]{7}$/);
    });

    it('should format the example from spec', () => {
      // Manually create the hash from spec example
      const hash =
        (BigInt(DOMAIN.RUST) << 56n) |
        (BigInt(12) << 52n) |
        (BigInt(ACTION.DEBUG) << 44n) |
        (BigInt(SUBTYPE.BORROW_CHECKER) << 32n) |
        (BigInt(15) << 28n);

      const formatted = formatHash(hash);
      expect(formatted).toContain('0x01_C_02_042_F');
    });
  });

  describe('analyzeRequest', () => {
    it('should provide detailed analysis', () => {
      const analysis = analyzeRequest('Fix borrow checker error in Rust async code');

      expect(analysis.request).toBe('Fix borrow checker error in Rust async code');
      expect(analysis.hash).toBeDefined();
      expect(analysis.formatted).toBeDefined();
      expect(analysis.breakdown.domain.name).toBe('RUST');
      expect(analysis.breakdown.action.name).toContain('DEBUG');
      expect(analysis.breakdown.subtype.name).toContain('BORROW_CHECKER');
      expect(analysis.breakdown.confidence).toBeGreaterThan(10);
    });
  });

  describe('performance', () => {
    it('should hash requests in under 1ms on average', () => {
      const requests = [
        'Fix borrow checker error',
        'Create Leptos SSR application',
        'Optimize database queries',
        'Test React component',
        'Deploy to production',
        'Review security vulnerabilities',
        'Implement tRPC router',
        'Design system architecture',
        'Migrate Prisma schema',
        'Debug TypeScript generics',
      ];

      const iterations = 100;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        requests.forEach((request) => {
          hashRequest(request);
        });
      }

      const end = performance.now();
      const avgTime = (end - start) / (iterations * requests.length);

      console.log(`Average hash time: ${avgTime.toFixed(3)}ms`);
      expect(avgTime).toBeLessThan(1.0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const hash = hashRequest('');
      const unpacked = unpackHash(hash);

      expect(unpacked.domain).toBe(DOMAIN.UNKNOWN);
      expect(unpacked.action).toBe(ACTION.UNKNOWN);
    });

    it('should handle single word', () => {
      const hash = hashRequest('rust');
      const unpacked = unpackHash(hash);

      expect(unpacked.domain).toBe(DOMAIN.RUST);
    });

    it('should handle very long requests', () => {
      const longRequest = 'Fix borrow checker error '.repeat(100);
      const hash = hashRequest(longRequest);
      const unpacked = unpackHash(hash);

      expect(unpacked.domain).toBe(DOMAIN.RUST);
      expect(unpacked.action).toBe(ACTION.DEBUG);
    });

    it('should handle mixed case', () => {
      const requests = [
        'FIX BORROW CHECKER ERROR',
        'fix borrow checker error',
        'Fix Borrow Checker Error',
      ];

      const hashes = requests.map((r) => hashRequest(r));
      const unpacked = hashes.map((h) => unpackHash(h));

      // All should produce same domain/action/subtype
      unpacked.forEach((u) => {
        expect(u.domain).toBe(DOMAIN.RUST);
        expect(u.action).toBe(ACTION.DEBUG);
        expect(u.subtype).toBe(SUBTYPE.BORROW_CHECKER);
      });
    });

    it('should handle special characters', () => {
      const hash = hashRequest('Fix borrow-checker error in `async fn`!!!');
      const unpacked = unpackHash(hash);

      expect(unpacked.domain).toBe(DOMAIN.RUST);
      expect(unpacked.action).toBe(ACTION.DEBUG);
    });
  });

  describe('confidence scoring', () => {
    it('should have high confidence for specific requests', () => {
      const hash = hashRequest('Fix Rust borrow checker lifetime error');
      const unpacked = unpackHash(hash);

      expect(unpacked.confidence).toBeGreaterThanOrEqual(12);
    });

    it('should have lower confidence for vague requests', () => {
      const hash = hashRequest('Fix something');
      const unpacked = unpackHash(hash);

      expect(unpacked.confidence).toBeLessThan(10);
    });

    it('should have medium confidence for partially specific requests', () => {
      const hash = hashRequest('Create a React app');
      const unpacked = unpackHash(hash);

      expect(unpacked.confidence).toBeGreaterThan(5);
      expect(unpacked.confidence).toBeLessThan(15);
    });
  });
});
