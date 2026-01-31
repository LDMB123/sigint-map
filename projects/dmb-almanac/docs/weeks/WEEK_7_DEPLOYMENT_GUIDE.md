# Week 7: Production Deployment Guide

**Date**: January 29, 2026
**Agent**: Agent 3 - Production Integration
**Status**: Ready for Production Deployment

---

## Executive Summary

This guide provides step-by-step instructions for deploying all 7 WASM aggregation functions to production in the DMB Almanac application. All functions have been integrated into the 3-tier compute pipeline (GPU → WASM → JavaScript) with automatic fallback, comprehensive telemetry tracking, and production-ready error handling.

---

## Pre-Deployment Checklist

### 1. Verify WASM Module Build

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac
./scripts/build-wasm.sh
```

**Expected Output**:
- ✅ WASM module compiled successfully
- ✅ Binary size: ~30 KB raw, ~13 KB gzipped
- ✅ Files generated:
  - `app/static/wasm/dmb-aggregations.wasm`
  - `app/static/wasm/dmb-aggregations.js`

### 2. Run Integration Tests

```bash
cd app
npm test tests/integration/wasm-production.test.js
```

**Expected Output**:
- ✅ All 20+ integration tests passing
- ✅ Performance budgets met:
  - `aggregateShowsByYear`: < 100ms
  - `aggregateUniqueSongsPerYear`: < 150ms
  - `getTopSongs`: < 50ms
  - `getSongDebuts`: < 80ms
  - `getMultiFieldAggregation`: < 100ms

### 3. Run Full Test Suite

```bash
npm test
```

**Expected Output**:
- ✅ 316+ tests passing
- ✅ 0 ESLint errors
- ✅ 0 ESLint warnings

---

## Deployment Steps

### Step 1: Build WASM Module for Production

```bash
cd rust/aggregations
cargo build --release --target wasm32-unknown-unknown
wasm-bindgen target/wasm32-unknown-unknown/release/dmb_aggregations.wasm \
  --out-dir ../../app/static/wasm \
  --target web \
  --no-typescript

# Optimize with wasm-opt
wasm-opt ../../app/static/wasm/dmb_aggregations_bg.wasm -Oz -o ../../app/static/wasm/dmb-aggregations.wasm
```

**Verification**:
```bash
ls -lh app/static/wasm/
# Should show:
# - dmb-aggregations.wasm (~30 KB)
# - dmb-aggregations.js (~15 KB)
```

### Step 2: Build SvelteKit Application

```bash
cd app
npm run build
```

**Verification**:
```bash
ls -lh build/
# Should contain production build
```

### Step 3: Deploy to Production Environment

#### Option A: Vercel Deployment

```bash
cd app
vercel --prod
```

#### Option B: Static Hosting (Cloudflare Pages, Netlify, etc.)

```bash
cd app
npm run build
# Upload `build/` directory to hosting provider
```

### Step 4: Configure CDN/Cache Headers

Ensure these cache headers are set for WASM files:

**For WASM module**:
```
Cache-Control: public, max-age=31536000, immutable
Content-Type: application/wasm
```

**For WASM JS glue**:
```
Cache-Control: public, max-age=31536000, immutable
Content-Type: application/javascript
```

**Example Cloudflare configuration** (`_headers` file):
```
/wasm/*.wasm
  Cache-Control: public, max-age=31536000, immutable
  Content-Type: application/wasm

/wasm/*.js
  Cache-Control: public, max-age=31536000, immutable
  Content-Type: application/javascript
```

**Example Netlify configuration** (`netlify.toml`):
```toml
[[headers]]
  for = "/wasm/*.wasm"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
    Content-Type = "application/wasm"

[[headers]]
  for = "/wasm/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
    Content-Type = "application/javascript"
```

### Step 5: Verify Production Deployment

**Browser Console Tests**:
```javascript
// 1. Check WASM availability
await window.__wasmTelemetry?.getStats();
// Should show telemetry data

// 2. Test WASM function
const shows = [{date: '2024-01-15', year: 2024}];
// (Would need database access to test properly)

// 3. Check backend selection
console.log(await ComputeOrchestrator.getPreferredBackend());
// Should show: 'webgpu', 'wasm', or 'javascript'
```

**Test Production URL**:
Visit: `https://your-domain.com/test-wasm`

Expected:
- ✅ WASM module loads successfully
- ✅ All 7 functions pass validation
- ✅ Performance benchmarks meet targets
- ✅ Telemetry tracking active

---

## Production Monitoring

### 1. Enable Telemetry Dashboard

Access telemetry at: `https://your-domain.com/telemetry`

**Key Metrics to Monitor**:
- Total WASM function calls
- Backend distribution (GPU vs WASM vs JavaScript)
- Average execution time per function
- Error rate

### 2. Browser Console Telemetry

```javascript
// Get usage summary
window.__wasmTelemetry.getSummary();
// => {totalCalls: 123, avgSpeed: "15.32ms", preferredBackend: "wasm", errorRate: 0}

// Get backend distribution
window.__wasmTelemetry.getBackendDistribution();
// => {webgpu: 20, wasm: 75, javascript: 5}

// Export telemetry data
window.__wasmTelemetry.exportJSON();
// Download JSON report
```

### 3. Performance Monitoring

**Track these metrics in production**:
- Dashboard render time (target: < 200ms)
- User interaction latency (target: < 50ms)
- WASM module load time (target: < 50ms)
- Memory usage (target: < 50 MB)

---

## Rollback Procedure

If issues arise in production, follow this rollback procedure:

### Quick Rollback (Force JavaScript Fallback)

**Option 1: Client-side override**
```javascript
// Add to app initialization
ComputeOrchestrator.forceBackend('javascript');
```

**Option 2: Disable WASM loader**
```javascript
// In loader.js
WasmRuntime.enabled = false;
```

### Full Rollback (Previous Version)

```bash
# Revert to previous deployment
git revert <commit-hash>
npm run build
vercel --prod
```

---

## Troubleshooting

### Issue: WASM Module Fails to Load

**Symptoms**:
- Console error: "Failed to load WASM module"
- All functions fall back to JavaScript

**Solutions**:
1. Verify WASM file is accessible:
   ```bash
   curl https://your-domain.com/wasm/dmb-aggregations.wasm -I
   # Should return 200 OK
   ```

2. Check MIME type:
   ```bash
   curl -I https://your-domain.com/wasm/dmb-aggregations.wasm | grep Content-Type
   # Should show: Content-Type: application/wasm
   ```

3. Check browser console for CORS errors

### Issue: Poor Performance

**Symptoms**:
- Aggregations taking > 200ms
- Telemetry shows high JavaScript usage

**Solutions**:
1. Check if WASM is actually being used:
   ```javascript
   window.__wasmTelemetry.getBackendDistribution();
   // WASM usage should be > 70%
   ```

2. Verify backend selection:
   ```javascript
   await ComputeOrchestrator.getPreferredBackend();
   // Should preferably show 'wasm' or 'webgpu'
   ```

3. Clear browser cache and reload

### Issue: High Error Rate

**Symptoms**:
- Telemetry shows errorRate > 5%
- Functions frequently falling back

**Solutions**:
1. Check telemetry for error details:
   ```javascript
   window.__wasmTelemetry.getRecentEvents(50).filter(e => !e.success);
   ```

2. Review browser console for WASM errors

3. Consider forcing JavaScript fallback temporarily

---

## Performance Baselines

**Expected performance on M4 Mac, Chrome 143+**:

| Function | JavaScript | WASM | GPU | Speedup |
|----------|-----------|------|-----|---------|
| `aggregateByYear` | 10-15ms | 2-3ms | 0.5-1ms | 5-10x |
| `uniqueSongsPerYear` | 10-20ms | 2-4ms | N/A | 5-10x |
| `topSongs` | 15-30ms | 5-10ms | N/A | 3-6x |
| `songDebuts` | 30-50ms | 8-15ms | N/A | 3-6x |
| `multiFieldAggregate` | 40-80ms | 10-20ms | N/A | 4-8x |
| `percentile` | <0.1ms | <0.1ms | N/A | ~1x |

---

## Post-Deployment Validation

### Week 1 Post-Deployment
- [ ] Monitor telemetry dashboard daily
- [ ] Track error rate (should be < 1%)
- [ ] Verify WASM usage percentage (target: > 70%)
- [ ] Review user-reported issues

### Week 2 Post-Deployment
- [ ] Analyze performance impact on Lighthouse scores
- [ ] Review Core Web Vitals (INP, LCP, CLS)
- [ ] Collect user feedback on dashboard speed
- [ ] Optimize any underperforming functions

### Week 3 Post-Deployment
- [ ] Review telemetry trends
- [ ] Identify optimization opportunities
- [ ] Plan next iteration improvements
- [ ] Document lessons learned

---

## Success Metrics

**Deployment is successful if**:
- ✅ All 7 WASM functions operational
- ✅ Error rate < 1%
- ✅ WASM usage > 70% (where supported)
- ✅ Dashboard render time < 200ms
- ✅ User interaction latency < 50ms
- ✅ Lighthouse Performance score > 85
- ✅ No critical user-reported bugs

---

## Additional Resources

### Documentation
- **WASM API Reference**: `WASM_API_REFERENCE.md`
- **WASM Performance Guide**: `WASM_PERFORMANCE_GUIDE.md`
- **WASM Developer Guide**: `WASM_DEVELOPER_GUIDE.md`
- **Integration Examples**: `WASM_INTEGRATION_EXAMPLES.md`

### Testing
- **Browser Validation**: `/test-wasm` route
- **Integration Tests**: `tests/integration/wasm-production.test.js`
- **Performance Tests**: `tests/performance/wasm-regression.test.js`

### Support
- **Telemetry Dashboard**: `/telemetry` route
- **Browser Console**: `window.__wasmTelemetry`
- **Performance Marks**: Browser DevTools > Performance

---

## Contact & Support

For issues or questions:
1. Check browser console for errors
2. Review telemetry data
3. Consult documentation
4. Open GitHub issue with:
   - Browser version
   - Error messages
   - Telemetry export
   - Steps to reproduce

---

**Deployment Guide Version**: 1.0
**Last Updated**: January 29, 2026
**Status**: ✅ Ready for Production
