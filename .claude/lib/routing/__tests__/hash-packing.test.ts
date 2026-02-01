/**
 * Hash Packing with BigInt - Comprehensive Test Suite
 *
 * Tests verify correct 64-bit value generation, bit manipulation,
 * and boundary conditions for semantic hash packing.
 *
 * Coverage:
 * - BigInt hash packing fix (verify 64-bit correctness)
 * - packHash/unpackHash roundtrip integrity
 * - Bit field isolation and masking
 * - Edge cases and boundary conditions
 */

import { describe, it, expect, test } from 'vitest';
import { hashRequest, unpackHash } from '../semantic-hash.js';
import type { SemanticHash } from '../semantic-hash.js';

// Helper to pack hash (mirrors implementation)
function packHash(hash: SemanticHash): bigint {
  const domain = BigInt(hash.domain & 0xFF);
  const complexity = BigInt(hash.complexity & 0x0F);
  const action = BigInt(hash.action & 0xFF);
  const subtype = BigInt(hash.subtype & 0xFFF);
  const confidence = BigInt(hash.confidence & 0x0F);
  const reserved = BigInt(hash.reserved & 0x0FFFFFFF);

  return (
    (domain << 56n) |
    (complexity << 52n) |
    (action << 44n) |
    (subtype << 32n) |
    (confidence << 28n) |
    reserved
  );
}

describe('Hash Packing with BigInt', () => {
  describe('64-bit Value Generation', () => {
    it('should generate valid 64-bit BigInt values', () => {
      const hash = hashRequest('Fix borrow checker error');

      // Verify it's a BigInt
      expect(typeof hash).toBe('bigint');

      // Verify it fits in 64 bits (0 to 2^64 - 1)
      expect(hash).toBeGreaterThanOrEqual(0n);
      expect(hash).toBeLessThan(2n ** 64n);
    });

    it('should handle maximum field values without overflow', () => {
      const maxHash: SemanticHash = {
        domain: 0xFF,        // 8 bits max
        complexity: 0x0F,    // 4 bits max
        action: 0xFF,        // 8 bits max
        subtype: 0xFFF,      // 12 bits max
        confidence: 0x0F,    // 4 bits max
        reserved: 0x0FFFFFFF // 28 bits max
      };

      const packed = (
        (BigInt(maxHash.domain) << 56n) |
        (BigInt(maxHash.complexity) << 52n) |
        (BigInt(maxHash.action) << 44n) |
        (BigInt(maxHash.subtype) << 32n) |
        (BigInt(maxHash.confidence) << 28n) |
        BigInt(maxHash.reserved)
      );

      expect(packed).toBeLessThan(2n ** 64n);

      const unpacked = unpackHash(packed);
      expect(unpacked.domain).toBe(maxHash.domain);
      expect(unpacked.complexity).toBe(maxHash.complexity);
      expect(unpacked.action).toBe(maxHash.action);
      expect(unpacked.subtype).toBe(maxHash.subtype);
      expect(unpacked.confidence).toBe(maxHash.confidence);
      expect(unpacked.reserved).toBe(maxHash.reserved);
    });

    it('should handle minimum field values', () => {
      const minHash: SemanticHash = {
        domain: 0x00,
        complexity: 0x00,
        action: 0x00,
        subtype: 0x000,
        confidence: 0x00,
        reserved: 0x00000000
      };

      const packed = (
        (BigInt(minHash.domain) << 56n) |
        (BigInt(minHash.complexity) << 52n) |
        (BigInt(minHash.action) << 44n) |
        (BigInt(minHash.subtype) << 32n) |
        (BigInt(minHash.confidence) << 28n) |
        BigInt(minHash.reserved)
      );

      expect(packed).toBe(0n);

      const unpacked = unpackHash(packed);
      expect(unpacked.domain).toBe(0);
      expect(unpacked.complexity).toBe(0);
      expect(unpacked.action).toBe(0);
      expect(unpacked.subtype).toBe(0);
      expect(unpacked.confidence).toBe(0);
      expect(unpacked.reserved).toBe(0);
    });

    it('should correctly position bits in 64-bit layout', () => {
      // Test individual field isolation
      const testCases = [
        { field: 'domain', value: 0x42, shift: 56n, mask: 0xFFn },
        { field: 'complexity', value: 0x0A, shift: 52n, mask: 0x0Fn },
        { field: 'action', value: 0x15, shift: 44n, mask: 0xFFn },
        { field: 'subtype', value: 0x3E8, shift: 32n, mask: 0xFFFn },
        { field: 'confidence', value: 0x0C, shift: 28n, mask: 0x0Fn }
      ];

      testCases.forEach(({ field, value, shift, mask }) => {
        const hash = BigInt(value) << shift;
        const extracted = Number((hash >> shift) & mask);
        expect(extracted).toBe(value);
      });
    });

    it('should not lose precision with large values', () => {
      const largeHash: SemanticHash = {
        domain: 0xAB,
        complexity: 0x0E,
        action: 0xCD,
        subtype: 0xEF0,
        confidence: 0x0D,
        reserved: 0x0FEDCBA9
      };

      const packed = (
        (BigInt(largeHash.domain) << 56n) |
        (BigInt(largeHash.complexity) << 52n) |
        (BigInt(largeHash.action) << 44n) |
        (BigInt(largeHash.subtype) << 32n) |
        (BigInt(largeHash.confidence) << 28n) |
        BigInt(largeHash.reserved)
      );

      const unpacked = unpackHash(packed);
      expect(unpacked).toEqual(largeHash);
    });
  });

  describe('Bit Masking and Extraction', () => {
    it('should correctly mask domain field (8 bits at position 56)', () => {
      const packed = 0xAB_0_00_000_0_0000000n;
      const domain = Number((packed >> 56n) & 0xFFn);
      expect(domain).toBe(0xAB);
    });

    it('should correctly mask complexity field (4 bits at position 52)', () => {
      const packed = 0x00_C_00_000_0_0000000n;
      const complexity = Number((packed >> 52n) & 0x0Fn);
      expect(complexity).toBe(0x0C);
    });

    it('should correctly mask action field (8 bits at position 44)', () => {
      const packed = 0x00_0_DE_000_0_0000000n;
      const action = Number((packed >> 44n) & 0xFFn);
      expect(action).toBe(0xDE);
    });

    it('should correctly mask subtype field (12 bits at position 32)', () => {
      const packed = 0x00_0_00_ABC_0_0000000n;
      const subtype = Number((packed >> 32n) & 0xFFFn);
      expect(subtype).toBe(0xABC);
    });

    it('should correctly mask confidence field (4 bits at position 28)', () => {
      const packed = 0x00_0_00_000_F_0000000n;
      const confidence = Number((packed >> 28n) & 0x0Fn);
      expect(confidence).toBe(0x0F);
    });

    it('should correctly mask reserved field (28 bits at position 0)', () => {
      const packed = 0x00_0_00_000_0_FEDCBAn;
      const reserved = Number(packed & 0x0FFFFFFFn);
      expect(reserved).toBe(0x0FEDCBA);
    });

    it('should isolate fields without interference', () => {
      const packed = 0xAB_C_DE_FED_E_0123456n;

      expect(Number((packed >> 56n) & 0xFFn)).toBe(0xAB);
      expect(Number((packed >> 52n) & 0x0Fn)).toBe(0x0C);
      expect(Number((packed >> 44n) & 0xFFn)).toBe(0xDE);
      expect(Number((packed >> 32n) & 0xFFFn)).toBe(0xFED);
      expect(Number((packed >> 28n) & 0x0Fn)).toBe(0x0E);
      expect(Number(packed & 0x0FFFFFFFn)).toBe(0x0123456);
    });
  });

  describe('Pack/Unpack Roundtrip', () => {
    it('should maintain data integrity through pack/unpack cycle', () => {
      const testHashes: SemanticHash[] = [
        { domain: 0x01, complexity: 0x0C, action: 0x02, subtype: 0x042, confidence: 0x0F, reserved: 0 },
        { domain: 0x03, complexity: 0x08, action: 0x01, subtype: 0x215, confidence: 0x0D, reserved: 0 },
        { domain: 0x04, complexity: 0x0B, action: 0x08, subtype: 0x315, confidence: 0x0E, reserved: 0 },
        { domain: 0xFF, complexity: 0x0F, action: 0xFF, subtype: 0xFFF, confidence: 0x0F, reserved: 0x0FFFFFFF }
      ];

      testHashes.forEach(original => {
        const packed = (
          (BigInt(original.domain) << 56n) |
          (BigInt(original.complexity) << 52n) |
          (BigInt(original.action) << 44n) |
          (BigInt(original.subtype) << 32n) |
          (BigInt(original.confidence) << 28n) |
          BigInt(original.reserved)
        );

        const unpacked = unpackHash(packed);
        expect(unpacked).toEqual(original);
      });
    });

    it('should handle multiple pack/unpack cycles', () => {
      const original: SemanticHash = {
        domain: 0x42,
        complexity: 0x09,
        action: 0x0A,
        subtype: 0x123,
        confidence: 0x0C,
        reserved: 0x0ABCDEF
      };

      let current = (
        (BigInt(original.domain) << 56n) |
        (BigInt(original.complexity) << 52n) |
        (BigInt(original.action) << 44n) |
        (BigInt(original.subtype) << 32n) |
        (BigInt(original.confidence) << 28n) |
        BigInt(original.reserved)
      );

      for (let i = 0; i < 10; i++) {
        const unpacked = unpackHash(current);
        current = (
          (BigInt(unpacked.domain) << 56n) |
          (BigInt(unpacked.complexity) << 52n) |
          (BigInt(unpacked.action) << 44n) |
          (BigInt(unpacked.subtype) << 32n) |
          (BigInt(unpacked.confidence) << 28n) |
          BigInt(unpacked.reserved)
        );
      }

      const final = unpackHash(current);
      expect(final).toEqual(original);
    });

    it('should handle real-world hash requests', () => {
      const requests = [
        'Fix borrow checker error in Rust',
        'Create Leptos SSR application',
        'Optimize database query performance',
        'Review XSS vulnerabilities',
        'Test React component with TypeScript'
      ];

      requests.forEach(request => {
        const hash1 = hashRequest(request);
        const unpacked = unpackHash(hash1);
        const hash2 = (
          (BigInt(unpacked.domain) << 56n) |
          (BigInt(unpacked.complexity) << 52n) |
          (BigInt(unpacked.action) << 44n) |
          (BigInt(unpacked.subtype) << 32n) |
          (BigInt(unpacked.confidence) << 28n) |
          BigInt(unpacked.reserved)
        );

        expect(hash2).toBe(hash1);
      });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle overflow protection for domain field', () => {
      const hash: SemanticHash = {
        domain: 0x1FF, // Intentionally exceed 8 bits
        complexity: 0,
        action: 0,
        subtype: 0,
        confidence: 0,
        reserved: 0
      };

      const packed = (
        (BigInt(hash.domain & 0xFF) << 56n) | // Mask to 8 bits
        (BigInt(hash.complexity) << 52n) |
        (BigInt(hash.action) << 44n) |
        (BigInt(hash.subtype) << 32n) |
        (BigInt(hash.confidence) << 28n) |
        BigInt(hash.reserved)
      );

      const unpacked = unpackHash(packed);
      expect(unpacked.domain).toBe(0xFF); // Should be masked
    });

    it('should handle all zeros', () => {
      const packed = 0n;
      const unpacked = unpackHash(packed);

      expect(unpacked.domain).toBe(0);
      expect(unpacked.complexity).toBe(0);
      expect(unpacked.action).toBe(0);
      expect(unpacked.subtype).toBe(0);
      expect(unpacked.confidence).toBe(0);
      expect(unpacked.reserved).toBe(0);
    });

    it('should handle all ones (within field sizes)', () => {
      const packed = 0xFFFF_FFFF_FFFF_FFFFn;
      const unpacked = unpackHash(packed);

      expect(unpacked.domain).toBe(0xFF);
      expect(unpacked.complexity).toBe(0x0F);
      expect(unpacked.action).toBe(0xFF);
      expect(unpacked.subtype).toBe(0xFFF);
      expect(unpacked.confidence).toBe(0x0F);
      expect(unpacked.reserved).toBe(0x0FFFFFFF);
    });

    it('should handle single bit set in each field', () => {
      const testCases = [
        { name: 'domain bit 0', packed: 0x01_0_00_000_0_0000000n, field: 'domain', expected: 0x01 },
        { name: 'complexity bit 0', packed: 0x00_1_00_000_0_0000000n, field: 'complexity', expected: 0x01 },
        { name: 'action bit 0', packed: 0x00_0_01_000_0_0000000n, field: 'action', expected: 0x01 },
        { name: 'subtype bit 0', packed: 0x00_0_00_001_0_0000000n, field: 'subtype', expected: 0x001 },
        { name: 'confidence bit 0', packed: 0x00_0_00_000_1_0000000n, field: 'confidence', expected: 0x01 },
        { name: 'reserved bit 0', packed: 0x00_0_00_000_0_0000001n, field: 'reserved', expected: 0x01 }
      ];

      testCases.forEach(({ name, packed, field, expected }) => {
        const unpacked = unpackHash(packed);
        expect(unpacked[field as keyof SemanticHash], name).toBe(expected);
      });
    });

    it('should verify no bit bleeding between fields', () => {
      // Set each field to all 1s individually and verify others remain 0
      const tests = [
        { domain: 0xFF, complexity: 0, action: 0, subtype: 0, confidence: 0, reserved: 0 },
        { domain: 0, complexity: 0x0F, action: 0, subtype: 0, confidence: 0, reserved: 0 },
        { domain: 0, complexity: 0, action: 0xFF, subtype: 0, confidence: 0, reserved: 0 },
        { domain: 0, complexity: 0, action: 0, subtype: 0xFFF, confidence: 0, reserved: 0 },
        { domain: 0, complexity: 0, action: 0, subtype: 0, confidence: 0x0F, reserved: 0 },
        { domain: 0, complexity: 0, action: 0, subtype: 0, confidence: 0, reserved: 0x0FFFFFFF }
      ];

      tests.forEach(hash => {
        const packed = (
          (BigInt(hash.domain) << 56n) |
          (BigInt(hash.complexity) << 52n) |
          (BigInt(hash.action) << 44n) |
          (BigInt(hash.subtype) << 32n) |
          (BigInt(hash.confidence) << 28n) |
          BigInt(hash.reserved)
        );

        const unpacked = unpackHash(packed);
        expect(unpacked).toEqual(hash);
      });
    });
  });

  describe('Performance and Consistency', () => {
    it('should pack/unpack efficiently (< 0.001ms per operation)', () => {
      const hash: SemanticHash = {
        domain: 0x42,
        complexity: 0x0A,
        action: 0x15,
        subtype: 0x3E8,
        confidence: 0x0C,
        reserved: 0
      };

      const iterations = 10000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const packed = (
          (BigInt(hash.domain) << 56n) |
          (BigInt(hash.complexity) << 52n) |
          (BigInt(hash.action) << 44n) |
          (BigInt(hash.subtype) << 32n) |
          (BigInt(hash.confidence) << 28n) |
          BigInt(hash.reserved)
        );
        unpackHash(packed);
      }

      const elapsed = performance.now() - start;
      const avgTime = elapsed / iterations;

      expect(avgTime).toBeLessThan(0.001);
    });

    it('should produce consistent hashes for same input', () => {
      const request = 'Fix borrow checker error';
      const hashes = Array.from({ length: 100 }, () => hashRequest(request));

      const first = hashes[0];
      hashes.forEach(hash => {
        expect(hash).toBe(first);
      });
    });

    it('should produce different hashes for different inputs', () => {
      const requests = [
        'Fix borrow checker error',
        'Create React component',
        'Optimize database query',
        'Review security vulnerabilities',
        'Test API endpoints'
      ];

      const hashes = requests.map(r => hashRequest(r));
      const uniqueHashes = new Set(hashes.map(h => h.toString()));

      expect(uniqueHashes.size).toBe(requests.length);
    });
  });
});
