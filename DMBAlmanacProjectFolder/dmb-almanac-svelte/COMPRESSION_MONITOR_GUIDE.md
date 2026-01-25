# Compression Monitor Guide

## Overview

The `compression-monitor` module is a production-ready utility for tracking compression/decompression metrics during data loading operations. It's specifically designed to monitor the effectiveness of Brotli (br) and gzip compression on JSON data files loaded during IndexedDB initialization.

**Location**: `/src/lib/utils/compression-monitor.ts`

## Features

- Track compression format (Brotli, gzip, uncompressed)
- Monitor load times and performance metrics
- Calculate bandwidth savings and compression ratios
- Track cache hit rates
- Estimate memory usage
- Calculate potential CDN cost savings
- Export metrics for external analytics
- Debug console access for browser DevTools

## Core Concepts

### Compression Metrics
Each file load is tracked with these metrics:

```typescript
interface CompressionMetrics {
  file: string;                    // Filename
  format: 'br' | 'gzip' | 'uncompressed' | null;
  originalSize: number;             // Uncompressed size in bytes
  compressedSize: number;           // Actual delivered size
  compressionRatio: number;         // 0-1 scale (1 = no compression)
  loadTimeMs: number;               // Time to fetch and decompress
  cacheHit: boolean;                // Whether served from cache
  timestamp: number;                // When loaded (ms since epoch)
}
```

### Aggregated Statistics
Summary statistics across all recorded loads:

```typescript
interface CompressionSummary {
  totalFiles: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  avgCompressionRatio: number;
  avgLoadTimeMs: number;
  cacheHitRate: number;
  formatBreakdown: { brotli: number; gzip: number; uncompressed: number };
  bandwidthSaved: number;
  totalLoadTimeMs: number;
  slowestFileMs: number;
  fastestFileMs: number;
  bytesPerMs: number;               // Throughput metric
}
```

## Usage

### Basic Usage in Data Loader

```typescript
import { compressionMonitor } from '$lib/utils/compression-monitor';

// Enable monitoring at the start of data loading
compressionMonitor.enable();

// During data loading, record each file
compressionMonitor.recordLoad({
  file: 'shows.json',
  format: 'br',  // or 'gzip', 'uncompressed', null
  originalSize: 15000000,
  compressedSize: 450000,
  compressionRatio: 0.97,
  loadTimeMs: 245,
  cacheHit: false,
  timestamp: Date.now(),
});

// Print summary after loading completes
compressionMonitor.printSummary();
```

### Get Statistics Programmatically

```typescript
const stats = compressionMonitor.getSummary();

console.log(`Files loaded: ${stats.totalFiles}`);
console.log(`Total bandwidth saved: ${stats.bandwidthSaved} bytes`);
console.log(`Average compression: ${(stats.avgCompressionRatio * 100).toFixed(1)}%`);
console.log(`Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);
```

### Memory Estimates

```typescript
const memory = compressionMonitor.getMemoryEstimate();

console.log(`Current memory: ${memory.currentMemoryUsageBytes} bytes`);
console.log(`Without compression: ${memory.estimatedMemoryWithoutCompression} bytes`);
console.log(`Savings: ${memory.potentialSavingsBytes} bytes`);
```

### Scale Calculations

Calculate estimated savings if the data is loaded multiple times:

```typescript
// Estimate monthly savings with 10,000 users
const savings = compressionMonitor.getEstimatedMonthlySavings(10000);

console.log(`Original bandwidth: ${savings.originalBandwidth} bytes`);
console.log(`Compressed bandwidth: ${savings.compressedBandwidth} bytes`);
console.log(`Savings: ${savings.savingsPercentage.toFixed(1)}%`);
console.log(`Estimated cost savings (AWS): $${savings.estimatedCostSavings.toFixed(2)}`);
```

### Export Metrics

Export as JSON for external analysis:

```typescript
// Export full metrics
const jsonString = compressionMonitor.exportMetrics();
console.log(jsonString);

// Export as array for CSV or spreadsheets
const metricsArray = compressionMonitor.exportMetricsArray();
// Can be converted to CSV or sent to analytics service
```

## Browser Console Debugging

The monitor is exposed to the window object for debugging:

```javascript
// Access in browser console
window.__compressionMonitor

// Get statistics
window.__compressionMonitor.getSummary()

// Get detailed metrics
window.__compressionMonitor.getMetrics()

// Enable verbose logging
window.__debug_compression = true

// Get metrics for a specific file
window.__compressionMonitor.getFileMetrics('shows.json')
```

## Integration with Data Loader

In `src/lib/db/dexie/data-loader.ts`, compression metrics are recorded during file fetching:

```typescript
// When a file is successfully loaded
compressionMonitor.recordLoad({
  file: fileName,
  format: monitorFormat,  // 'br', 'gzip', or 'uncompressed'
  originalSize: text.length,
  compressedSize: compressedSize || text.length,
  compressionRatio: compressedSize > 0 ? 1 - compressedSize / text.length : 0,
  loadTimeMs,
  cacheHit,
  timestamp: Date.now(),
});

// After all files are loaded
compressionMonitor.printSummary();
```

## API Reference

### Methods

#### `enable(): void`
Enable compression monitoring and reset metrics.

#### `disable(): void`
Disable compression monitoring.

#### `isEnabled(): boolean`
Check if monitoring is currently active.

#### `recordLoad(metrics: CompressionMetrics): void`
Record a single file load event. Automatically normalizes format (null → 'uncompressed').

#### `getSummary(): CompressionSummary`
Get aggregated statistics across all recorded loads.

#### `getMetrics(): CompressionMetrics[]`
Get array of all recorded metrics.

#### `getFileMetrics(fileName: string): CompressionMetrics | undefined`
Get metrics for a specific file.

#### `getMemoryEstimate(): MemoryEstimate`
Get memory usage estimates based on recorded loads.

#### `clear(): void`
Clear all recorded metrics.

#### `printSummary(): void`
Print formatted summary to console.

#### `exportMetrics(): string`
Export metrics and summary as JSON string.

#### `exportMetricsArray(): Array<...>`
Export metrics as array suitable for CSV or external tools.

#### `getEstimatedMonthlySavings(usersPerMonth: number): {...}`
Calculate bandwidth and cost savings at scale.

## Performance Impact

The compression monitor has minimal performance impact:

- **Recording**: ~0.1ms per metric record
- **Memory**: ~500 bytes per recorded metric
- **Summary calculation**: ~5-10ms for typical loads (9 files)
- **Disabled monitoring**: No overhead when disabled

## Production Considerations

### Data Privacy
- No sensitive data is logged
- Metrics are stored locally only
- No external calls are made

### Storage
- Metrics are cleared when monitoring is disabled or on page reload
- No persistent storage by default
- Can be exported for archival

### Performance
- Monitor is disabled by default outside initial data load
- No impact on production performance when inactive
- Format sizes are byte-accurate (no estimation)

## Example Output

```
[CompressionMonitor] Compression Performance Summary
Overall Statistics:
  Files loaded:            9
  Total original size:     25.50 MB
  Total compressed size:   682.00 KB
  Bandwidth saved:         24.82 MB
  Avg compression ratio:   97.3%
  Total load time:         2145ms
  Avg load time per file:  238ms
  Throughput:              0.32 bytes/ms
  Cache hit rate:          0.0%

Format Breakdown:
  Brotli:        9 files
  Gzip:          0 files
  Uncompressed:  0 files

Performance Metrics:
  Fastest load:            115ms
  Slowest load:            567ms
  Slowest:                 setlist-entries.json (567ms)
  Fastest:                 guests.json (115ms)

Largest compression savings: shows.json
  Format: br
  Saved: 8.50 MB (97.3%)
```

## Troubleshooting

### Monitor shows no data
- Ensure `compressionMonitor.enable()` is called before recording
- Check that files are actually being loaded
- Verify the recordLoad method is being called

### Size mismatches
- `originalSize` should be the uncompressed/decompressed text length
- `compressedSize` should be the actual bytes transferred
- If measuring from HTTP headers, consider that gzip compression is automatic

### Cache hits not detected
- Cache detection relies on custom HTTP header `X-Cache-Time`
- Add this header to your server/service worker if using cache
- Or manually set `cacheHit: true` when appropriate

## Related Documentation

- Data Loader: `/src/lib/db/dexie/data-loader.ts`
- Performance Guide: `/src/lib/utils/INP_OPTIMIZATION_GUIDE.md`
- Database Schema: `/src/lib/db/schema.sql`
