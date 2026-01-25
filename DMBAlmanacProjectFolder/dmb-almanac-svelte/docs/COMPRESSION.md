# Data Compression System

## Overview

The DMB Almanac uses aggressive compression for static JSON data files to reduce bundle size from 26MB to under 1MB. This dramatically improves initial load time and reduces bandwidth costs.

## Compression Results

| Format | Size | Reduction | Browser Support |
|--------|------|-----------|-----------------|
| **Original** | 26.05 MB | - | All |
| **Gzip** | 1.36 MB | 94.8% | All browsers |
| **Brotli** | 682 KB | 97.4% | Chrome 50+, Firefox 44+ |

### File Breakdown

| File | Original | Gzip | Brotli | Gzip Ratio | Brotli Ratio |
|------|----------|------|--------|------------|--------------|
| setlist-entries.json | 21.17 MB | 992 KB | 440 KB | 95.4% | 98.0% |
| shows.json | 2.09 MB | 110 KB | 59 KB | 94.8% | 97.2% |
| venues.json | 1.13 MB | 113 KB | 56 KB | 90.2% | 95.1% |
| songs.json | 804 KB | 118 KB | 88 KB | 85.3% | 89.1% |
| song-statistics.json | 653 KB | 30 KB | 19 KB | 95.4% | 97.1% |
| guests.json | 196 KB | 21 KB | 17 KB | 89.2% | 91.5% |
| liberation-list.json | 39 KB | 4 KB | 3 KB | 89.9% | 92.2% |
| tours.json | 8 KB | 763 B | 547 B | 90.3% | 93.1% |

## Architecture

### 1. Build-Time Compression

**Script:** `scripts/compress-data.ts`

Runs during `npm run build` to create both gzip and Brotli versions of all JSON files in `static/data/`.

```bash
# Manual compression
npm run compress:data

# Automatic during build
npm run build  # runs prebuild → compress:data
```

**Features:**
- Maximum compression level (gzip level 9, Brotli quality 11)
- Parallel processing for speed
- Detailed statistics output
- Skips `manifest.json` (kept uncompressed for discoverability)

### 2. Service Worker Compression Negotiation

**File:** `static/sw.js`

The service worker automatically serves the best compression format:

```javascript
// Request flow:
// 1. Client requests /data/shows.json
// 2. SW checks Accept-Encoding header
// 3. SW tries: shows.json.br → shows.json.gz → shows.json
// 4. SW caches the compressed version
// 5. SW returns with proper Content-Encoding header
```

**Strategy:** CacheFirst
- Compressed files are cached after first fetch
- Subsequent requests served instantly from cache
- Automatic format negotiation (Brotli > gzip > uncompressed)

### 3. Client-Side Decompression

**File:** `src/lib/db/dexie/data-loader.ts`

The data loader transparently handles compressed files:

```typescript
// Fetch flow:
// 1. Detect browser compression support
// 2. Try Brotli (.br) first (best compression)
// 3. Fall back to gzip (.gz) if Brotli unavailable
// 4. Fall back to uncompressed (.json) if all fail
// 5. Decompress using DecompressionStream API
// 6. Parse JSON and return to caller
```

**Browser APIs used:**
- `DecompressionStream` (Chrome 80+, Firefox 65+)
- Automatic decompression when `Content-Encoding` header set
- Manual decompression for pre-compressed files

## Usage

### Development

During development, compressed files are automatically created:

```bash
npm run dev
# Compression happens in prebuild
```

### Production Build

```bash
npm run build
# 1. Builds WASM modules
# 2. Compresses data files (compress:data)
# 3. Builds Svelte app
# 4. Service worker configured for compression
```

### Testing Compression

```bash
# Compress data files
npm run compress:data

# View compression statistics
# (automatically shown during compression)

# Test in browser
npm run preview
# Open DevTools → Network tab
# Check Content-Encoding header: br or gzip
```

## Performance Impact

### Initial Load Time

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Data download (3G) | ~45s | ~2.5s | **94% faster** |
| Data download (4G) | ~8s | ~0.4s | **95% faster** |
| Data download (WiFi) | ~1.5s | ~0.08s | **95% faster** |
| Parse time | ~500ms | ~500ms | Same |
| IndexedDB load | ~3s | ~3s | Same |

**Total improvement:** ~40-50s saved on slow connections

### Bandwidth Costs

| Users/month | Before | After | Savings/month |
|-------------|--------|-------|---------------|
| 1,000 | 26 GB | 1.36 GB | **94.8%** |
| 10,000 | 260 GB | 13.6 GB | **94.8%** |
| 100,000 | 2.6 TB | 136 GB | **94.8%** |

**Estimated cost savings:** $20-40/month per 10k users (AWS CloudFront pricing)

### Cache Storage

Compressed files are stored in Cache API:

```javascript
// Cache sizes
CACHES_CONFIG.STATIC_ASSETS
  - Before: ~26 MB
  - After (Brotli): ~682 KB (97.4% reduction)
  - After (gzip): ~1.36 MB (94.8% reduction)
```

## Browser Compatibility

### Compression Format Support

| Browser | Brotli | Gzip | DecompressionStream |
|---------|--------|------|---------------------|
| Chrome 143+ | ✅ | ✅ | ✅ |
| Chrome 80+ | ✅ | ✅ | ✅ |
| Chrome 50-79 | ✅ | ✅ | ❌ (fallback) |
| Firefox 44+ | ✅ | ✅ | ✅ (65+) |
| Safari 15+ | ✅ | ✅ | ✅ |
| Edge 15+ | ✅ | ✅ | ✅ (80+) |

**Graceful degradation:**
- Browsers without Brotli support use gzip
- Browsers without gzip support use uncompressed (unlikely)
- Browsers without DecompressionStream use server-side decompression

## Troubleshooting

### Compressed files not being served

1. Check service worker is active:
```javascript
navigator.serviceWorker.getRegistrations()
```

2. Check network tab for Content-Encoding header:
```
Content-Encoding: br  // or gzip
```

3. Force service worker update:
```javascript
navigator.serviceWorker.getRegistrations()
  .then(regs => regs.forEach(reg => reg.update()))
```

### Data not loading

1. Check browser console for errors
2. Verify compressed files exist in `static/data/`
3. Try clearing cache and reloading:
```javascript
caches.keys().then(keys =>
  Promise.all(keys.map(key => caches.delete(key)))
)
```

### Compression ratio lower than expected

JSON files with high entropy (random data) compress poorly. Our data compresses well because:
- Repetitive structure (same keys repeated)
- Long strings (venue names, song titles)
- Predictable patterns (dates, IDs)

Expected compression ratios:
- **High repetition** (setlists, shows): 94-98%
- **Medium repetition** (songs, venues): 85-95%
- **Low repetition** (statistics): 90-95%

## Future Optimizations

### Potential Improvements

1. **Delta compression:** Only download changes since last sync
2. **Chunked loading:** Split large files into smaller chunks
3. **LZMA compression:** Even better ratio than Brotli (5-10% smaller)
4. **Shared dictionary:** Pre-train Brotli with common patterns
5. **Binary format:** Replace JSON with Protocol Buffers or MessagePack

### Estimated Additional Savings

| Optimization | Additional Reduction | Implementation Effort |
|--------------|---------------------|----------------------|
| Delta compression | 50-90% (updates only) | Medium |
| Chunked loading | 20-30% (parallel fetch) | Low |
| LZMA | 5-10% | Medium |
| Shared dictionary | 10-20% | High |
| Binary format | 30-50% | High |

## Monitoring

### Metrics to Track

1. **Compression ratio:** Monitor file sizes over time
2. **Cache hit rate:** Percentage of requests served from cache
3. **Load time:** Time to fetch and decompress data
4. **Storage usage:** IndexedDB + Cache API size
5. **Bandwidth costs:** Total data transfer per month

### Recommended Alerts

- Compression ratio drops below 90% (data structure changed?)
- Cache hit rate below 80% (service worker issues?)
- Load time exceeds 5s on 4G (compression failing?)
- Storage quota exceeded (need cleanup?)

## References

- [Brotli Compression Format (RFC 7932)](https://tools.ietf.org/html/rfc7932)
- [Gzip Compression (RFC 1952)](https://tools.ietf.org/html/rfc1952)
- [DecompressionStream API](https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream)
- [Service Worker Caching Strategies](https://developer.chrome.com/docs/workbox/caching-strategies-overview/)
- [Web Performance Working Group](https://www.w3.org/webperf/)
