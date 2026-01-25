#!/usr/bin/env tsx
/**
 * DMB Almanac - Data Compression Script
 *
 * Compresses static JSON data files with both gzip and Brotli compression.
 * Reduces ~26MB of JSON to ~5-7MB (73-81% reduction).
 *
 * Usage:
 *   npm run compress:data
 *   npx tsx scripts/compress-data.ts
 *
 * Creates:
 *   - .gz files (gzip) - universal browser support
 *   - .br files (Brotli) - better compression ratio (10-20% smaller than gzip)
 *
 * @author DMB Almanac DevOps Team
 */

import { gzipSync, brotliCompressSync, constants as zlibConstants } from 'node:zlib';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

// ==================== CONFIGURATION ====================

interface CompressionStats {
  file: string;
  originalSize: number;
  gzipSize: number;
  brotliSize: number;
  gzipRatio: number;
  brotliRatio: number;
}

const DATA_DIR = 'static/data';
const COMPRESSION_LEVEL = 9; // Max compression (slower but smaller)

// File patterns to compress
const COMPRESS_EXTENSIONS = ['.json'];

// File patterns to skip
const SKIP_FILES = ['manifest.json']; // Keep manifest uncompressed for discoverability

// ==================== UTILITIES ====================

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Calculate compression ratio as percentage
 */
function compressionRatio(original: number, compressed: number): number {
  return ((1 - compressed / original) * 100);
}

/**
 * Get all JSON files in data directory
 */
function getJsonFiles(dir: string): string[] {
  const files: string[] = [];

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isFile()) {
        const ext = entry.substring(entry.lastIndexOf('.'));
        if (COMPRESS_EXTENSIONS.includes(ext) && !SKIP_FILES.includes(entry)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`[Compress] Error reading directory ${dir}:`, error);
    process.exit(1);
  }

  return files;
}

// ==================== COMPRESSION ====================

/**
 * Compress a single file with gzip and Brotli
 */
function compressFile(filePath: string): CompressionStats {
  const fileName = basename(filePath);
  console.log(`[Compress] Processing: ${fileName}`);

  try {
    // Read original file
    const data = readFileSync(filePath);
    const originalSize = data.length;

    // Gzip compression (level 9)
    const gzipData = gzipSync(data, {
      level: COMPRESSION_LEVEL,
    });
    const gzipSize = gzipData.length;
    writeFileSync(`${filePath}.gz`, gzipData);

    // Brotli compression (quality 11, max compression)
    const brotliData = brotliCompressSync(data, {
      params: {
        [zlibConstants.BROTLI_PARAM_QUALITY]: zlibConstants.BROTLI_MAX_QUALITY,
        [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
      },
    });
    const brotliSize = brotliData.length;
    writeFileSync(`${filePath}.br`, brotliData);

    const stats: CompressionStats = {
      file: fileName,
      originalSize,
      gzipSize,
      brotliSize,
      gzipRatio: compressionRatio(originalSize, gzipSize),
      brotliRatio: compressionRatio(originalSize, brotliSize),
    };

    console.log(`  Original: ${formatBytes(originalSize)}`);
    console.log(`  Gzip:     ${formatBytes(gzipSize)} (${stats.gzipRatio.toFixed(1)}% reduction)`);
    console.log(`  Brotli:   ${formatBytes(brotliSize)} (${stats.brotliRatio.toFixed(1)}% reduction)`);

    return stats;
  } catch (error) {
    console.error(`[Compress] Failed to compress ${fileName}:`, error);
    process.exit(1);
  }
}

// ==================== MAIN ====================

async function main(): Promise<void> {
  console.log('='.repeat(70));
  console.log('DMB Almanac - Static Data Compression');
  console.log('='.repeat(70));
  console.log('');

  const startTime = Date.now();

  // Get all JSON files
  const files = getJsonFiles(DATA_DIR);

  if (files.length === 0) {
    console.log('[Compress] No files to compress');
    return;
  }

  console.log(`[Compress] Found ${files.length} files to compress`);
  console.log('');

  // Compress all files
  const allStats: CompressionStats[] = [];

  for (const file of files) {
    const stats = compressFile(file);
    allStats.push(stats);
    console.log('');
  }

  // Summary statistics
  const totalOriginal = allStats.reduce((sum, s) => sum + s.originalSize, 0);
  const totalGzip = allStats.reduce((sum, s) => sum + s.gzipSize, 0);
  const totalBrotli = allStats.reduce((sum, s) => sum + s.brotliSize, 0);

  console.log('='.repeat(70));
  console.log('COMPRESSION SUMMARY');
  console.log('='.repeat(70));
  console.log('');
  console.log(`Files processed:     ${files.length}`);
  console.log(`Total original size: ${formatBytes(totalOriginal)}`);
  console.log(`Total gzip size:     ${formatBytes(totalGzip)} (${compressionRatio(totalOriginal, totalGzip).toFixed(1)}% reduction)`);
  console.log(`Total Brotli size:   ${formatBytes(totalBrotli)} (${compressionRatio(totalOriginal, totalBrotli).toFixed(1)}% reduction)`);
  console.log('');

  // File breakdown table
  console.log('File Breakdown:');
  console.log('-'.repeat(70));
  console.log(
    'File'.padEnd(30) +
    'Original'.padStart(12) +
    'Gzip'.padStart(12) +
    'Brotli'.padStart(12)
  );
  console.log('-'.repeat(70));

  // Sort by original size descending
  allStats.sort((a, b) => b.originalSize - a.originalSize);

  for (const stat of allStats) {
    console.log(
      stat.file.padEnd(30) +
      formatBytes(stat.originalSize).padStart(12) +
      formatBytes(stat.gzipSize).padStart(12) +
      formatBytes(stat.brotliSize).padStart(12)
    );
  }

  console.log('-'.repeat(70));
  console.log(
    'TOTAL'.padEnd(30) +
    formatBytes(totalOriginal).padStart(12) +
    formatBytes(totalGzip).padStart(12) +
    formatBytes(totalBrotli).padStart(12)
  );
  console.log('='.repeat(70));

  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('');
  console.log(`[Compress] Completed in ${elapsedTime}s`);
  console.log('');

  // Next steps
  console.log('Next Steps:');
  console.log('  1. Service worker will automatically serve compressed versions');
  console.log('  2. Gzip used for broad compatibility (all browsers)');
  console.log('  3. Brotli used when supported (Chrome 50+, Firefox 44+)');
  console.log('  4. Fallback to uncompressed JSON if needed');
  console.log('');
}

main().catch((error) => {
  console.error('[Compress] Fatal error:', error);
  process.exit(1);
});
