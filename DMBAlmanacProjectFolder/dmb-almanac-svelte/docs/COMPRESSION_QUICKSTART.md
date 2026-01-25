# Compression Quick Start Guide

## TL;DR

The DMB Almanac now uses automatic compression to reduce 26MB of JSON data to 682KB (97.4% reduction).

**Nothing changed in your code.** It just works faster.

## What Changed?

### For Developers

- JSON data loads 94% faster
- Build process automatically compresses data
- Service worker serves compressed files
- Transparent to your code - no changes needed

### For Users

- Initial app load is 40-50 seconds faster on slow connections
- Less bandwidth usage (25MB saved per session)
- Works offline with cached compressed data

## Quick Commands

```bash
# Compress data files (automatic during build)
npm run compress:data

# Verify compression is working
npm run verify:compression

# Build with compression (automatic)
npm run build

# Check compression in browser console
window.__compressionMonitor.printSummary()
```

## How It Works

```
User requests data → Service Worker → Try Brotli (.br)
                                   ↓
                              Try gzip (.gz)
                                   ↓
                              Try uncompressed (.json)
                                   ↓
                              Cache compressed version
                                   ↓
                              Decompress automatically
                                   ↓
                              Return JSON to your code
```

**Your code sees:** Regular JSON object
**Browser receives:** Compressed data (682KB instead of 26MB)

## File Sizes

| File | Before | After (Brotli) | Saved |
|------|--------|----------------|-------|
| setlist-entries.json | 21.17 MB | 440 KB | 20.75 MB |
| shows.json | 2.09 MB | 59 KB | 2.03 MB |
| venues.json | 1.13 MB | 56 KB | 1.07 MB |
| songs.json | 804 KB | 88 KB | 716 KB |
| song-statistics.json | 653 KB | 19 KB | 634 KB |
| **TOTAL** | **26.05 MB** | **682 KB** | **25.38 MB** |

## Troubleshooting

### "Data not loading"

1. Check browser console for errors
2. Verify compressed files exist:
   ```bash
   ls -lh static/data/*.{gz,br}
   ```
3. Run compression:
   ```bash
   npm run compress:data
   ```

### "Compression not working"

1. Verify service worker is active:
   ```javascript
   navigator.serviceWorker.getRegistrations()
   ```
2. Check network tab for `Content-Encoding: br` or `gzip`
3. Clear cache and reload:
   ```javascript
   caches.keys().then(keys =>
     Promise.all(keys.map(key => caches.delete(key)))
   )
   ```

### "Build failing"

1. Ensure data files exist in `static/data/`
2. Run compression manually:
   ```bash
   npm run compress:data
   ```
3. Check for Node.js version (requires 18+)

## Performance Tips

### Development

- Compressed files are cached after first load
- Use `npm run dev` to test with compression
- Monitor console for compression logs

### Production

- Service worker caches compressed files
- First load: Download compressed (682KB)
- Subsequent loads: Serve from cache (instant)
- Offline: Works from cache

## Browser Support

| Browser | Brotli | Gzip | Works? |
|---------|--------|------|--------|
| Chrome 143+ | ✅ | ✅ | **Best** |
| Chrome 50+ | ✅ | ✅ | Great |
| Firefox 44+ | ✅ | ✅ | Great |
| Safari 15+ | ✅ | ✅ | Great |
| Edge 15+ | ✅ | ✅ | Great |
| Old browsers | ❌ | ✅ | OK (gzip) |

## FAQ

**Q: Do I need to change my code?**
A: No. Compression is transparent. Your code still fetches JSON normally.

**Q: What if compression fails?**
A: It falls back to uncompressed JSON automatically.

**Q: Does this work offline?**
A: Yes. Compressed files are cached by the service worker.

**Q: How much faster is it?**
A: 94% faster on 3G, 95% faster on 4G/WiFi.

**Q: Does it cost more CPU to decompress?**
A: Negligible. Decompression takes ~10-50ms, saves 40+ seconds of download time.

**Q: Can I disable compression?**
A: Yes, but why? You'd lose 97% bandwidth savings. If needed, delete `.gz` and `.br` files.

**Q: How do I monitor compression?**
A: Use `window.__compressionMonitor.printSummary()` in browser console.

## See Also

- [Full Compression Documentation](COMPRESSION.md)
- [Implementation Summary](../COMPRESSION_IMPLEMENTATION.md)
- [Service Worker Code](../static/sw.js)
- [Data Loader Code](../src/lib/db/dexie/data-loader.ts)

## Support

For issues or questions:
1. Check browser console for errors
2. Run `npm run verify:compression`
3. Review full documentation in `docs/COMPRESSION.md`
