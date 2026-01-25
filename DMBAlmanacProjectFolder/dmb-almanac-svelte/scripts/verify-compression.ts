#!/usr/bin/env tsx
/**
 * DMB Almanac - Compression Verification Script
 *
 * Verifies that all JSON files have been compressed properly
 * and reports any missing or corrupted compressed files.
 *
 * Usage:
 *   npm run verify:compression
 *   npx tsx scripts/verify-compression.ts
 *
 * @author DMB Almanac DevOps Team
 */

import { existsSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync, brotliDecompressSync } from 'node:zlib';

const DATA_DIR = 'static/data';

interface VerificationResult {
  file: string;
  hasGzip: boolean;
  hasBrotli: boolean;
  gzipValid: boolean;
  brotliValid: boolean;
  gzipSize: number;
  brotliSize: number;
  originalSize: number;
  errors: string[];
}

/**
 * Verify a single JSON file
 */
function verifyFile(fileName: string): VerificationResult {
  const result: VerificationResult = {
    file: fileName,
    hasGzip: false,
    hasBrotli: false,
    gzipValid: false,
    brotliValid: false,
    gzipSize: 0,
    brotliSize: 0,
    originalSize: 0,
    errors: [],
  };

  const filePath = join(DATA_DIR, fileName);
  const gzipPath = `${filePath}.gz`;
  const brotliPath = `${filePath}.br`;

  // Check original file
  if (!existsSync(filePath)) {
    result.errors.push('Original file not found');
    return result;
  }

  try {
    const originalData = readFileSync(filePath, 'utf-8');
    result.originalSize = Buffer.byteLength(originalData, 'utf-8');

    // Parse to ensure valid JSON
    JSON.parse(originalData);
  } catch (error) {
    result.errors.push(`Invalid JSON: ${error}`);
    return result;
  }

  // Check gzip file
  result.hasGzip = existsSync(gzipPath);
  if (result.hasGzip) {
    try {
      const gzipData = readFileSync(gzipPath);
      result.gzipSize = gzipData.length;

      // Try to decompress
      const decompressed = gunzipSync(gzipData).toString('utf-8');
      JSON.parse(decompressed);
      result.gzipValid = true;
    } catch (error) {
      result.errors.push(`Gzip invalid: ${error}`);
    }
  } else {
    result.errors.push('Gzip file not found');
  }

  // Check Brotli file
  result.hasBrotli = existsSync(brotliPath);
  if (result.hasBrotli) {
    try {
      const brotliData = readFileSync(brotliPath);
      result.brotliSize = brotliData.length;

      // Try to decompress
      const decompressed = brotliDecompressSync(brotliData).toString('utf-8');
      JSON.parse(decompressed);
      result.brotliValid = true;
    } catch (error) {
      result.errors.push(`Brotli invalid: ${error}`);
    }
  } else {
    result.errors.push('Brotli file not found');
  }

  return result;
}

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
 * Main verification
 */
async function main(): Promise<void> {
  console.log('='.repeat(70));
  console.log('DMB Almanac - Compression Verification');
  console.log('='.repeat(70));
  console.log('');

  const jsonFiles = [
    'guest-appearances.json',
    'guests.json',
    'liberation-list.json',
    'setlist-entries.json',
    'shows.json',
    'song-statistics.json',
    'songs.json',
    'tours.json',
    'venues.json',
  ];

  const results: VerificationResult[] = [];
  let totalErrors = 0;

  for (const file of jsonFiles) {
    const result = verifyFile(file);
    results.push(result);

    if (result.errors.length > 0) {
      totalErrors += result.errors.length;
    }
  }

  // Print results
  console.log('Verification Results:');
  console.log('-'.repeat(70));
  console.log(
    'File'.padEnd(30) +
    'Gzip'.padStart(10) +
    'Brotli'.padStart(10) +
    'Status'.padStart(15)
  );
  console.log('-'.repeat(70));

  for (const result of results) {
    const gzipStatus = result.gzipValid ? '✓' : '✗';
    const brotliStatus = result.brotliValid ? '✓' : '✗';
    const status = result.errors.length === 0 ? 'OK' : 'ERRORS';

    console.log(
      result.file.padEnd(30) +
      gzipStatus.padStart(10) +
      brotliStatus.padStart(10) +
      status.padStart(15)
    );
  }

  console.log('-'.repeat(70));
  console.log('');

  // Print errors if any
  if (totalErrors > 0) {
    console.log('ERRORS DETECTED:');
    console.log('-'.repeat(70));

    for (const result of results) {
      if (result.errors.length > 0) {
        console.log(`${result.file}:`);
        for (const error of result.errors) {
          console.log(`  - ${error}`);
        }
      }
    }

    console.log('-'.repeat(70));
    console.log('');
    console.log(`Total errors: ${totalErrors}`);
    console.log('');
    console.log('Run "npm run compress:data" to fix compression issues');
    process.exit(1);
  }

  // Print summary
  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalGzip = results.reduce((sum, r) => sum + r.gzipSize, 0);
  const totalBrotli = results.reduce((sum, r) => sum + r.brotliSize, 0);

  const gzipRatio = ((1 - totalGzip / totalOriginal) * 100).toFixed(1);
  const brotliRatio = ((1 - totalBrotli / totalOriginal) * 100).toFixed(1);

  console.log('SUMMARY:');
  console.log('-'.repeat(70));
  console.log(`Files verified:      ${results.length}`);
  console.log(`Total original size: ${formatBytes(totalOriginal)}`);
  console.log(`Total gzip size:     ${formatBytes(totalGzip)} (${gzipRatio}% reduction)`);
  console.log(`Total Brotli size:   ${formatBytes(totalBrotli)} (${brotliRatio}% reduction)`);
  console.log(`Bandwidth saved:     ${formatBytes(totalOriginal - totalBrotli)}`);
  console.log('-'.repeat(70));
  console.log('');
  console.log('✓ All compression files verified successfully!');
  console.log('');
}

main().catch((error) => {
  console.error('[Verify] Fatal error:', error);
  process.exit(1);
});
