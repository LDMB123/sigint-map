# Compression Monitor - Quick Reference

## Import
```typescript
import { compressionMonitor } from '$lib/utils/compression-monitor';
```

## Enable/Disable
```typescript
compressionMonitor.enable();      // Start monitoring
compressionMonitor.disable();     // Stop monitoring
compressionMonitor.isEnabled();   // Check status
```

## Record Metric
```typescript
compressionMonitor.recordLoad({
  file: 'shows.json',
  format: 'br',                                    // 'br' | 'gzip' | 'uncompressed' | null
  originalSize: 15000000,
  compressedSize: 450000,
  compressionRatio: 0.97,                         // 1 - (compressed / original)
  loadTimeMs: 245,
  cacheHit: false,
  timestamp: Date.now(),
});
```

## Get Statistics
```typescript
const stats = compressionMonitor.getSummary();
// Returns: totalFiles, totalOriginalSize, totalCompressedSize,
//          avgCompressionRatio, avgLoadTimeMs, cacheHitRate,
//          formatBreakdown, bandwidthSaved, totalLoadTimeMs,
//          slowestFileMs, fastestFileMs, bytesPerMs
```

## Get Memory Info
```typescript
const memory = compressionMonitor.getMemoryEstimate();
// Returns: currentMemoryUsageBytes, potentialSavingsBytes,
//          estimatedMemoryWithoutCompression
```

## Calculate Savings at Scale
```typescript
const savings = compressionMonitor.getEstimatedMonthlySavings(10000);
// usersPerMonth: 10000
// Returns: originalBandwidth, compressedBandwidth,
//          savings, savingsPercentage, estimatedCostSavings
```

## Export
```typescript
compressionMonitor.exportMetrics();       // JSON string
compressionMonitor.exportMetricsArray();  // Array for CSV
```

## Print Report
```typescript
compressionMonitor.printSummary();        // Formatted console output
```

## Get Details
```typescript
compressionMonitor.getMetrics();          // Array of all metrics
compressionMonitor.getFileMetrics('shows.json');  // Single file metrics
```

## Clear Data
```typescript
compressionMonitor.clear();
```

## Browser Console
```javascript
// In browser DevTools console:
window.__compressionMonitor.getSummary()
window.__compressionMonitor.printSummary()
window.__debug_compression = true         // Enable verbose logging
window.__compressionMonitor.exportMetrics() // Export as JSON
```

## Example Usage in Data Loader

```typescript
import { compressionMonitor } from '../../utils/compression-monitor';

export async function loadInitialData(onProgress) {
  try {
    // Enable monitoring
    compressionMonitor.enable();

    // ... fetch data files ...

    // Record each file
    compressionMonitor.recordLoad({
      file: fileName,
      format: 'br',
      originalSize: text.length,
      compressedSize: responseSize,
      compressionRatio: responseSize > 0 ? 1 - responseSize / text.length : 0,
      loadTimeMs: loadTime,
      cacheHit: cacheHit,
      timestamp: Date.now(),
    });

    // ... load to database ...

    // Print summary when complete
    compressionMonitor.printSummary();
  } catch (error) {
    console.error('Load failed:', error);
  }
}
```

## Common Calculations

### Compression Ratio
```typescript
const ratio = (1 - compressedSize / originalSize) * 100;
// ratio = 97.3 means 97.3% compression
```

### Throughput
```typescript
const bytesPerMs = totalCompressedSize / totalLoadTimeMs;
```

### Savings at Scale
```typescript
const monthlySavings = totalSavedBytes * usersPerMonth;
const costSavings = monthlySavings / (1024 * 1024 * 1024) * 0.085;  // AWS rate
```

## Expected Output

For 9 JSON files (26 MB → 682 KB):

```
Files loaded: 9
Total original: 25.50 MB
Total compressed: 682.00 KB
Bytes saved: 24.82 MB
Avg compression: 97.3%
Cache hit rate: 0.0%
Total load time: 2145ms
Avg per file: 238ms
Throughput: 0.32 bytes/ms
```

## Tips

- Format can be 'br', 'gzip', 'uncompressed', or null (null is treated as uncompressed)
- compressionRatio: 0-1 scale where 1 = no compression, 0 = perfect compression
- Enable monitoring before recording to capture data
- Call printSummary() after data load completes for instant feedback
- Use exportMetrics() to save for later analysis
- Set window.__debug_compression = true to see each record logged
- Monitor has zero overhead when disabled
