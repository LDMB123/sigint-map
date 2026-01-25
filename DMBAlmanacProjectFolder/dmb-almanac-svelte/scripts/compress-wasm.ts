#!/usr/bin/env tsx
/**
 * WASM Compression Script
 * Compresses all WASM modules with Brotli for maximum size reduction
 *
 * Expected savings: 75% reduction (1.54 MB → ~385 KB)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { brotliCompressSync } from 'zlib';

const WASM_DIRS = [
  'wasm/dmb-transform/pkg',
  'wasm/dmb-core/pkg',
  'wasm/dmb-date-utils/pkg',
  'wasm/dmb-string-utils/pkg',
  'wasm/dmb-segue-analysis/pkg',
  'wasm/dmb-force-simulation/pkg',
  'wasm/dmb-visualize/pkg',
];

const BROTLI_OPTIONS = {
  params: {
    [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_GENERIC,
    [constants.BROTLI_PARAM_QUALITY]: 11, // Maximum compression
    [constants.BROTLI_PARAM_SIZE_HINT]: 0,
  },
};

interface CompressionStats {
  file: string;
  original: number;
  compressed: number;
  ratio: string;
}

const stats: CompressionStats[] = [];
let totalOriginal = 0;
let totalCompressed = 0;

console.log('🗜️  Compressing WASM modules with Brotli-11...\n');

for (const dir of WASM_DIRS) {
  try {
    const files = readdirSync(dir);
    const wasmFile = files.find((f) => f.endsWith('.wasm'));

    if (!wasmFile) {
      console.warn(`⚠️  No WASM file found in ${dir}`);
      continue;
    }

    const filePath = join(dir, wasmFile);
    const original = readFileSync(filePath);
    const originalSize = statSync(filePath).size;

    // Compress with Brotli
    const compressed = brotliCompressSync(original, BROTLI_OPTIONS);
    const compressedPath = `${filePath}.br`;

    writeFileSync(compressedPath, compressed);

    const compressedSize = compressed.length;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    stats.push({
      file: basename(dir),
      original: originalSize,
      compressed: compressedSize,
      ratio: `${ratio}%`,
    });

    totalOriginal += originalSize;
    totalCompressed += compressedSize;

    console.log(`✓ ${basename(dir).padEnd(25)} ${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (-${ratio}%)`);
  } catch (error) {
    console.error(`❌ Error compressing ${dir}:`, error);
  }
}

console.log('\n' + '='.repeat(80));
console.log(`📊 Total: ${formatBytes(totalOriginal)} → ${formatBytes(totalCompressed)} (-${((1 - totalCompressed / totalOriginal) * 100).toFixed(1)}%)`);
console.log('='.repeat(80));

// Also compress JavaScript files
console.log('\n🗜️  Compressing WASM JavaScript bindings...\n');

for (const dir of WASM_DIRS) {
  try {
    const files = readdirSync(dir);
    const jsFile = files.find((f) => f.endsWith('.js') && !f.includes('_bg'));

    if (!jsFile) continue;

    const filePath = join(dir, jsFile);
    const original = readFileSync(filePath);
    const compressed = brotliCompressSync(original, BROTLI_OPTIONS);

    writeFileSync(`${filePath}.br`, compressed);

    const originalSize = original.length;
    const compressedSize = compressed.length;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    console.log(`✓ ${basename(dir).padEnd(25)} ${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (-${ratio}%)`);
  } catch (error) {
    // Ignore JS compression errors
  }
}

console.log('\n✅ WASM compression complete!\n');

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Import constants for Brotli
import { constants } from 'zlib';
