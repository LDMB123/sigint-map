/**
 * DMB Almanac - Compression Performance Monitor
 *
 * Production-ready monitoring utility for tracking compression/decompression metrics.
 * Provides comprehensive statistics on:
 * - Compression format used (Brotli, gzip, uncompressed)
 * - Load times and performance
 * - Bandwidth saved
 * - Cache hit rates
 * - Memory usage estimates
 * - Cost analysis (for cloud CDN scenarios)
 *
 * Used during IndexedDB data loading to track the effectiveness of
 * Brotli (br) and gzip compression on JSON data files.
 */

/**
 * Extend window type to include our debug flags
 */
declare global {
  interface Window {
    __debug_compression?: boolean;
    __compressionMonitor?: CompressionMonitor;
  }
}

/**
 * Compression metrics for a single file load
 * Compatible with data-loader.ts usage pattern
 */
export interface CompressionMetrics {
  file: string;
  format: 'br' | 'gzip' | 'uncompressed' | null; // null or 'uncompressed' both mean uncompressed
  originalSize: number; // Uncompressed size in bytes
  compressedSize: number; // Actual delivered size in bytes
  compressionRatio: number; // 0-1, where 1 = minimal compression, 0 = perfect
  loadTimeMs: number; // Total time to fetch and decompress
  cacheHit: boolean; // Whether served from cache
  timestamp: number; // ms since epoch
}

/**
 * Aggregated compression statistics
 */
export interface CompressionSummary {
  totalFiles: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  avgCompressionRatio: number;
  avgLoadTimeMs: number;
  cacheHitRate: number;
  formatBreakdown: {
    brotli: number;
    gzip: number;
    uncompressed: number;
  };
  bandwidthSaved: number;
  totalLoadTimeMs: number;
  slowestFileMs: number;
  fastestFileMs: number;
  bytesPerMs: number; // Throughput metric
}

/**
 * Memory and usage estimates
 */
export interface MemoryEstimate {
  currentMemoryUsageBytes: number;
  potentialSavingsBytes: number;
  estimatedMemoryWithoutCompression: number;
}

class CompressionMonitor {
  private metrics: CompressionMetrics[] = [];
  private enabled: boolean = false;

  /**
   * Enable compression monitoring
   * Resets previous metrics
   */
  enable(): void {
    this.enabled = true;
    this.metrics = [];
    if (typeof window !== 'undefined' && window.__debug_compression) {
      console.debug('[CompressionMonitor] Monitoring enabled');
    }
  }

  /**
   * Disable compression monitoring
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Check if monitoring is active
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Record a file load event
   * Handles format being 'uncompressed', null, or 'br'/'gzip'
   */
  recordLoad(metrics: CompressionMetrics): void {
    if (!this.enabled) return;

    // Normalize format: null or 'uncompressed' -> 'uncompressed'
    const normalizedMetrics: CompressionMetrics = {
      ...metrics,
      format: metrics.format === null ? 'uncompressed' : metrics.format,
    };

    this.metrics.push(normalizedMetrics);

    // Log to console in development
    // Check for debug flag or if we're in development
    const isDev = typeof window !== 'undefined' && window.__debug_compression;
    if (isDev) {
      const ratio = (normalizedMetrics.compressionRatio * 100).toFixed(1);
      const saved = this.formatBytes(
        normalizedMetrics.originalSize - normalizedMetrics.compressedSize
      );
      const format = normalizedMetrics.format || 'uncompressed';
      const cacheInfo = normalizedMetrics.cacheHit ? ' (cached)' : '';
      console.debug(
        `[CompressionMonitor] ${normalizedMetrics.file}: ${format} (${ratio}% reduction, saved ${saved}, ${normalizedMetrics.loadTimeMs.toFixed(0)}ms)${cacheInfo}`
      );
    }
  }

  /**
   * Get summary statistics
   */
  getSummary(): CompressionSummary {
    if (this.metrics.length === 0) {
      return {
        totalFiles: 0,
        totalOriginalSize: 0,
        totalCompressedSize: 0,
        avgCompressionRatio: 0,
        avgLoadTimeMs: 0,
        cacheHitRate: 0,
        formatBreakdown: { brotli: 0, gzip: 0, uncompressed: 0 },
        bandwidthSaved: 0,
        totalLoadTimeMs: 0,
        slowestFileMs: 0,
        fastestFileMs: 0,
        bytesPerMs: 0,
      };
    }

    const totalFiles = this.metrics.length;

    // Single-pass aggregation instead of multiple filter/reduce passes
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;
    let totalLoadTimeMs = 0;
    let totalCompressionRatio = 0;
    let cacheHits = 0;
    let brotliCount = 0;
    let gzipCount = 0;
    let uncompressedCount = 0;
    let slowestFileMs = 0;
    let fastestFileMs = Infinity;

    for (const m of this.metrics) {
      totalOriginalSize += m.originalSize;
      totalCompressedSize += m.compressedSize;
      totalLoadTimeMs += m.loadTimeMs;
      totalCompressionRatio += m.compressionRatio;

      if (m.cacheHit) cacheHits++;

      switch (m.format) {
        case 'br': brotliCount++; break;
        case 'gzip': gzipCount++; break;
        case 'uncompressed': uncompressedCount++; break;
      }

      if (m.loadTimeMs > slowestFileMs) slowestFileMs = m.loadTimeMs;
      if (m.loadTimeMs < fastestFileMs) fastestFileMs = m.loadTimeMs;
    }

    const avgLoadTimeMs = totalLoadTimeMs / totalFiles;
    const avgCompressionRatio = totalCompressionRatio / totalFiles;
    const cacheHitRate = cacheHits / totalFiles;

    const formatBreakdown = {
      brotli: brotliCount,
      gzip: gzipCount,
      uncompressed: uncompressedCount,
    };

    const bandwidthSaved = totalOriginalSize - totalCompressedSize;
    const bytesPerMs = totalCompressedSize / totalLoadTimeMs || 0;

    return {
      totalFiles,
      totalOriginalSize,
      totalCompressedSize,
      avgCompressionRatio,
      avgLoadTimeMs,
      cacheHitRate,
      formatBreakdown,
      bandwidthSaved,
      totalLoadTimeMs,
      slowestFileMs,
      fastestFileMs,
      bytesPerMs,
    };
  }

  /**
   * Get detailed metrics
   */
  getMetrics(): CompressionMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get metrics for a specific file
   */
  getFileMetrics(fileName: string): CompressionMetrics | undefined {
    return this.metrics.find((m) => m.file === fileName);
  }

  /**
   * Get memory usage estimate
   */
  getMemoryEstimate(): MemoryEstimate {
    const summary = this.getSummary();
    return {
      currentMemoryUsageBytes: summary.totalCompressedSize,
      potentialSavingsBytes: summary.bandwidthSaved,
      estimatedMemoryWithoutCompression: summary.totalOriginalSize,
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Print summary to console
   * Designed for development and debugging
   */
  printSummary(): void {
    const summary = this.getSummary();

    if (summary.totalFiles === 0) {
      console.log('[CompressionMonitor] No compression data recorded');
      return;
    }

    console.group('[CompressionMonitor] Compression Performance Summary');

    // Overall statistics
    console.log('Overall Statistics:');
    console.log(`  Files loaded:           ${summary.totalFiles}`);
    console.log(`  Total original size:    ${this.formatBytes(summary.totalOriginalSize)}`);
    console.log(`  Total compressed size:  ${this.formatBytes(summary.totalCompressedSize)}`);
    console.log(`  Bandwidth saved:        ${this.formatBytes(summary.bandwidthSaved)}`);
    console.log(`  Avg compression ratio:  ${(summary.avgCompressionRatio * 100).toFixed(1)}%`);
    console.log(`  Total load time:        ${summary.totalLoadTimeMs.toFixed(0)}ms`);
    console.log(`  Avg load time per file: ${summary.avgLoadTimeMs.toFixed(0)}ms`);
    console.log(`  Throughput:             ${summary.bytesPerMs.toFixed(2)} bytes/ms`);
    console.log(`  Cache hit rate:         ${(summary.cacheHitRate * 100).toFixed(1)}%`);

    // Format breakdown
    console.log('\nFormat Breakdown:');
    if (summary.formatBreakdown.brotli > 0) {
      console.log(`  Brotli:        ${summary.formatBreakdown.brotli} files`);
    }
    if (summary.formatBreakdown.gzip > 0) {
      console.log(`  Gzip:          ${summary.formatBreakdown.gzip} files`);
    }
    if (summary.formatBreakdown.uncompressed > 0) {
      console.log(`  Uncompressed:  ${summary.formatBreakdown.uncompressed} files`);
    }

    // Performance metrics
    console.log('\nPerformance Metrics:');
    console.log(`  Fastest load:           ${summary.fastestFileMs.toFixed(0)}ms`);
    console.log(`  Slowest load:           ${summary.slowestFileMs.toFixed(0)}ms`);

    // Slowest and fastest files
    const slowestFile = this.metrics.reduce((max, m) =>
      m.loadTimeMs > max.loadTimeMs ? m : max
    );
    const fastestFile = this.metrics.reduce((min, m) =>
      m.loadTimeMs < min.loadTimeMs ? m : min
    );

    if (slowestFile) {
      console.log(`  Slowest:                ${slowestFile.file} (${slowestFile.loadTimeMs.toFixed(0)}ms)`);
    }
    if (fastestFile) {
      console.log(`  Fastest:                ${fastestFile.file} (${fastestFile.loadTimeMs.toFixed(0)}ms)`);
    }

    // Compression effectiveness
    const largestSavingsFile = this.metrics.reduce((max, m) => {
      const savings = m.originalSize - m.compressedSize;
      const maxSavings = max.originalSize - max.compressedSize;
      return savings > maxSavings ? m : max;
    });

    if (largestSavingsFile) {
      const savings = largestSavingsFile.originalSize - largestSavingsFile.compressedSize;
      const savingsPercent = ((savings / largestSavingsFile.originalSize) * 100).toFixed(1);
      console.log(`\nLargest compression savings: ${largestSavingsFile.file}`);
      console.log(`  Format: ${largestSavingsFile.format}`);
      console.log(`  Saved: ${this.formatBytes(savings)} (${savingsPercent}%)`);
    }

    console.groupEnd();
  }

  /**
   * Format bytes to human-readable string
   * Examples: 1024 -> "1.00 KB", 1048576 -> "1.00 MB"
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Export all metrics and summary as JSON
   * Useful for external analytics or reporting
   */
  exportMetrics(): string {
    return JSON.stringify(
      {
        summary: this.getSummary(),
        memory: this.getMemoryEstimate(),
        metrics: this.metrics,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }

  /**
   * Get metrics as an array suitable for logging or external tools
   */
  exportMetricsArray(): Array<{
    file: string;
    format: string;
    originalSize: number;
    compressedSize: number;
    bytesSaved: number;
    compressionPercent: string;
    loadTimeMs: number;
    throughputBytesPerMs: number;
    cacheHit: boolean;
    timestamp: number;
  }> {
    return this.metrics.map((m) => ({
      file: m.file,
      format: m.format || 'uncompressed',
      originalSize: m.originalSize,
      compressedSize: m.compressedSize,
      bytesSaved: m.originalSize - m.compressedSize,
      compressionPercent: ((1 - m.compressionRatio) * 100).toFixed(1),
      loadTimeMs: parseFloat(m.loadTimeMs.toFixed(2)),
      throughputBytesPerMs: parseFloat((m.compressedSize / m.loadTimeMs).toFixed(2)),
      cacheHit: m.cacheHit,
      timestamp: m.timestamp,
    }));
  }

  /**
   * Estimate bandwidth savings at scale
   * Useful for demonstrating CDN efficiency
   *
   * Example: compressionMonitor.getEstimatedMonthlySavings(10000)
   * Returns savings if 10,000 users each loaded this data once per month
   */
  getEstimatedMonthlySavings(usersPerMonth: number): {
    originalBandwidth: number;
    compressedBandwidth: number;
    savings: number;
    savingsPercentage: number;
    estimatedCostSavings: number; // Assumes $0.085/GB (AWS CloudFront)
  } {
    const summary = this.getSummary();

    const originalBandwidth = summary.totalOriginalSize * usersPerMonth;
    const compressedBandwidth = summary.totalCompressedSize * usersPerMonth;
    const savings = originalBandwidth - compressedBandwidth;
    const savingsPercentage =
      originalBandwidth > 0 ? (savings / originalBandwidth) * 100 : 0;

    // AWS CloudFront pricing: ~$0.085/GB for US/Europe
    // Calculate potential cost savings from bandwidth reduction
    const costPerGB = 0.085;
    const savingsGB = savings / (1024 * 1024 * 1024);
    const estimatedCostSavings = savingsGB * costPerGB;

    return {
      originalBandwidth,
      compressedBandwidth,
      savings,
      savingsPercentage,
      estimatedCostSavings,
    };
  }
}

// ==================== SINGLETON INSTANCE ====================

/**
 * Global compression monitor instance
 * Used throughout the application to track compression metrics
 * during data loading and other operations
 */
const compressionMonitor = new CompressionMonitor();

// ==================== EXPORTS ====================

export { compressionMonitor };
export { CompressionMonitor };

// ==================== DEBUGGING ====================

/**
 * Expose monitor to window for debugging in browser console
 * Access via: window.__compressionMonitor
 * Enable debug logging via: window.__debug_compression = true
 */
if (typeof window !== 'undefined') {
  window.__compressionMonitor = compressionMonitor;
  // Users can enable verbose logging by setting this flag
  // window.__debug_compression = true
}
