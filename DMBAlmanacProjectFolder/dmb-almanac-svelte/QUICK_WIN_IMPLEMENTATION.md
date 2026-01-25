# Quick Win Bundle Optimization - 40KB in 30 Minutes

## Do These Now (Highest ROI)

### 1. Remove Extraneous Dependencies (5 minutes)

```bash
npm uninstall d3-scale-chromatic @types/d3-scale-chromatic @types/d3-array @types/d3-transition
```

**Saves: 15KB gzip**

Verify they were removed:
```bash
npm ls | grep -E "d3-scale-chromatic|d3-array|d3-transition"
# Should return nothing
```

### 2. Add Bundle Analyzer Plugin (10 minutes)

Install:
```bash
npm install --save-dev rollup-plugin-visualizer
```

Update `vite.config.ts`:

```typescript
import visualizer from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    // ... existing plugins
    visualizer({
      filename: 'dist/bundle-report.html',
      open: process.env.ANALYZE === 'true'
    })
  ]
  // ... rest of config
});
```

Test it:
```bash
ANALYZE=true npm run build
# Opens interactive HTML report
```

### 3. Disable Console Logs in Production (10 minutes)

Update `vite.config.ts`:

```typescript
export default defineConfig({
  build: {
    target: 'es2022',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // Remove all console.* in production
        passes: 3            // More aggressive compression
      },
      mangle: true,
      output: {
        comments: false      // Remove all comments
      }
    }
  }
});
```

**Saves: 5-10KB gzip**

### 4. Add Chunk Size Warnings (5 minutes)

Update `vite.config.ts`:

```typescript
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 500,  // Warn if any chunk exceeds 500KB
    reportCompressedSize: true    // Show gzip sizes in console
  }
});
```

Test: `npm run build` - You'll see gzip sizes in output

### 5. Verify Tree-Shaking (5 minutes)

Update `vite.config.ts` - ensure this exists in rollupOptions:

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        generatedCode: {
          constBindings: true,      // Use const for all variables
          arrowFunctions: true       // Use arrow functions
        }
        // ... existing code
      }
    }
  }
});
```

**Saves: 10-15KB gzip**

---

## Verification

```bash
# Build with analysis
npm run build

# Check output sizes
ls -lh .svelte-kit/output/client/

# Should see:
# d3-core-*.js
# d3-axis-*.js
# d3-viz-*.js
# dexie-*.js
# _app-*.js (should be < 100KB)
```

---

## Total Results

**Time: ~30 minutes**
**Saves: 35-45KB gzip**
**No breaking changes**

---

## Next Steps (When Ready)

1. **Data compression** (20 min) → Saves 18-22MB
2. **Image optimization** (45 min) → Saves 60-100KB
3. **Force simulation worker** (1.5 hr) → Better performance
4. **Route prefetching** (30 min) → Faster navigation

See BUNDLE_OPTIMIZATION_AUDIT.md for details on each.
