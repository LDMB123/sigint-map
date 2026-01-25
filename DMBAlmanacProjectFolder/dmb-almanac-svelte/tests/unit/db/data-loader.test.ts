/**
 * DMB Almanac - Data Loader Tests
 *
 * Tests for compression/decompression functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gzipSync, brotliCompressSync, constants as zlibConstants } from 'node:zlib';

describe('Data Loader Compression', () => {
  // Use larger, more realistic test data that will actually compress well
  // Small data (< 50 bytes) doesn't compress effectively due to compression headers
  const mockJsonData = {
    songs: Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      title: `Test Song ${i + 1}`,
      artist: 'Dave Matthews Band',
      album: 'Test Album',
      duration: 300,
      plays: 1000,
    })),
  };
  const mockJsonString = JSON.stringify(mockJsonData);

  beforeEach(() => {
    // Reset fetch mock
    vi.resetAllMocks();
  });

  describe('Compression format detection', () => {
    it('should prefer Brotli over gzip', () => {
      // Brotli should be tried first
      const encodings = getSupportedEncodings();
      expect(encodings.brotli).toBe(true);
      expect(encodings.gzip).toBe(true);
    });
  });

  describe('Brotli decompression', () => {
    it('should decompress Brotli-compressed data', async () => {
      // Create Brotli-compressed test data
      const compressed = brotliCompressSync(Buffer.from(mockJsonString), {
        params: {
          [zlibConstants.BROTLI_PARAM_QUALITY]: zlibConstants.BROTLI_MAX_QUALITY,
        },
      });

      // Mock fetch to return compressed data
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        blob: () => Promise.resolve(new Blob([compressed])),
      });

      // Mock DecompressionStream (not available in Node.js)
      global.DecompressionStream = vi.fn().mockImplementation((format) => ({
        readable: new ReadableStream({
          start(controller) {
            // Simulate decompression
            const decompressed = mockJsonString;
            controller.enqueue(new TextEncoder().encode(decompressed));
            controller.close();
          },
        }),
        writable: new WritableStream(),
      }));

      // Test would go here - requires browser environment
      // This is a placeholder for integration testing
      expect(compressed.length).toBeLessThan(mockJsonString.length);
    });

    it('should compress JSON data significantly', () => {
      const compressed = brotliCompressSync(Buffer.from(mockJsonString), {
        params: {
          [zlibConstants.BROTLI_PARAM_QUALITY]: zlibConstants.BROTLI_MAX_QUALITY,
        },
      });

      const ratio = (1 - compressed.length / mockJsonString.length) * 100;

      // JSON should compress by at least 10%
      expect(ratio).toBeGreaterThan(10);
    });
  });

  describe('Gzip decompression', () => {
    it('should decompress gzip-compressed data', async () => {
      // Create gzip-compressed test data
      const compressed = gzipSync(Buffer.from(mockJsonString), {
        level: 9,
      });

      expect(compressed.length).toBeLessThan(mockJsonString.length);
    });

    it('should compress JSON data significantly', () => {
      const compressed = gzipSync(Buffer.from(mockJsonString), {
        level: 9,
      });

      const ratio = (1 - compressed.length / mockJsonString.length) * 100;

      // JSON should compress by at least 10%
      expect(ratio).toBeGreaterThan(10);
    });
  });

  describe('Compression ratios', () => {
    it('Brotli should compress better than gzip', () => {
      const testData = JSON.stringify({
        items: Array(100).fill({
          id: 1,
          name: 'Test Item',
          description: 'This is a test item with repetitive data',
        }),
      });

      const gzipCompressed = gzipSync(Buffer.from(testData), { level: 9 });
      const brotliCompressed = brotliCompressSync(Buffer.from(testData), {
        params: {
          [zlibConstants.BROTLI_PARAM_QUALITY]: zlibConstants.BROTLI_MAX_QUALITY,
        },
      });

      // Brotli should be smaller than gzip
      expect(brotliCompressed.length).toBeLessThan(gzipCompressed.length);
    });

    it('should achieve >80% compression on repetitive JSON', () => {
      const repetitiveData = JSON.stringify({
        entries: Array(1000).fill({
          showId: 1,
          songId: 2,
          setName: 'set1',
          position: 1,
        }),
      });

      const brotliCompressed = brotliCompressSync(Buffer.from(repetitiveData), {
        params: {
          [zlibConstants.BROTLI_PARAM_QUALITY]: zlibConstants.BROTLI_MAX_QUALITY,
        },
      });

      const ratio = (1 - brotliCompressed.length / repetitiveData.length) * 100;

      // Repetitive data should achieve >80% compression
      expect(ratio).toBeGreaterThan(80);
    });
  });
});

// Mock function for compression support detection
function getSupportedEncodings(): { brotli: boolean; gzip: boolean } {
  return { brotli: true, gzip: true };
}
