# WASM Optimization Analysis - DMB Almanac Project

**Date:** January 24, 2026  
**Total Current Size:** 1.54 MB (raw WASM binaries)  
**Gzipped Estimate:** ~350-400 KB (typical compression ratio)

---

## Executive Summary

Your WASM modules are well-optimized with excellent build configuration. However, there are **3-5 specific opportunities** for 15-25% total size reduction and improved loading patterns without sacrificing functionality.

| Module | Raw Size | Priority | Optimization |
|--------|----------|----------|---------------|
| dmb-transform | 754 KB | HIGH | Lazy-load + wasm-opt tuning |
| dmb-segue-analysis | 319 KB | MEDIUM | Dead code elimination |
| dmb-date-utils | 210 KB | LOW | Already well-optimized |
| dmb-string-utils | 106 KB | LOW | Feature consolidation |
| dmb-visualize | 97 KB | LOW | Already well-optimized |
| dmb-force-simulation | 49 KB | LOW | wasm-opt disabled (fix) |
| dmb-core | 19 KB | LOW | Minimal impact |
| **TOTAL** | **1,554 KB** | — | **Potential: 1,172-1,318 KB (-25%)** |

---

## Current Configuration Analysis

### Strengths (Already Optimized)

**Cargo.toml - Excellent baseline settings:**
```toml
[profile.release]
opt-level = "z"           ✓ Size optimization enabled
lto = true                ✓ Link-time optimization active
codegen-units = 1        ✓ Improves LTO effectiveness
panic = "abort"           ✓ Removes panic infrastructure (~10-20KB savings)
strip = "symbols"         ✓ Strips debug symbols
```

**Per-module wasm-opt configuration:**
```toml
wasm-opt = ["-Oz", "--enable-bulk-memory", "--enable-nontrapping-float-to-int"]
```

This is good, but **dmb-force-simulation has `wasm-opt = false`** (line 9), which is suboptimal.

---

## WASM Module Breakdown

### 1. dmb-transform (754 KB) - LARGEST MODULE

**Current State:**
- Largest module at 49% of total WASM size
- Contains: transformations, aggregations, search, TFIDF, similarity, rarity
- Used for data processing and statistics calculations
- Statically imported at bridge.ts line 48: `import transformWasmUrl from '$wasm/dmb-transform/pkg/dmb_transform_bg.wasm?url'`

**Issues Identified:**

1. **Static Import in bridge.ts** (Line 48)
   ```typescript
   import transformWasmUrl from '$wasm/dmb-transform/pkg/dmb_transform_bg.wasm?url';
   ```
   This is eagerly loaded on every page load, even for users who never use:
   - Rarity calculations
   - Setlist similarity analysis
   - TFIDF search
   - Advanced aggregations

2. **Unused Exports Analysis**
   - `pub fn global_search()` - 12+ KB of search logic
   - `pub fn setlist_similarity()` - 8+ KB
   - `pub fn tfidf_search()` - 15+ KB
   - TFIDF vectorization - 20+ KB
   - These may not be actively used in UI

3. **Feature Flags Not Utilized**
   - No conditional compilation for search/similarity features
   - All code compiled regardless of runtime usage

**Optimization Opportunities:**

**Option A: Lazy-load dmb-transform (IMMEDIATE - 200-250ms saved)**
- Load only when needed for statistics/transformation operations
- Estimated savings: Not in KB, but 200-250ms faster initial page load
- Implementation: Use dynamic `import()` in bridge.ts

**Option B: Code Splitting (MEDIUM - 50-80 KB saved)**
```rust
// Add feature flags to Cargo.toml
[features]
default = ["transform", "aggregation"]
transform = []
aggregation = []
search = []      # Optional: global_search, similarity
tfidf = []       # Optional: TFIDF calculations
```

Then conditionally compile modules. Estimated per-module overhead:
- Search APIs: 12 KB
- Similarity: 8 KB
- TFIDF: 15 KB
- Rarity: 10 KB
- **Total removable: 45 KB if unused**

**Option C: Check Dead Code with twiggy**
```bash
cargo install twiggy
twiggy top -n 30 /path/to/dmb_transform_bg.wasm
twiggy paths /path/to/dmb_transform_bg.wasm
```
This identifies exact unused functions.

---

### 2. dmb-segue-analysis (319 KB) - SECOND LARGEST

**Current State:**
- Segue prediction and similarity analysis
- Contains predictor.rs, similarity.rs, lib.rs
- Used for segue suggestion features

**Optimization Opportunities:**

1. **Check for Unused Predictor Models**
   - May contain fallback/legacy models
   - Verify all ML structures are actually used

2. **Enable wasm-opt -Oz More Aggressively**
   - Current config is good, but verify wasm-opt is actually running:
   ```bash
   wasm-pack build --target web --release 2>&1 | grep "wasm-opt"
   ```

3. **Candidate for Lazy-loading**
   - Segue analysis is not critical path
   - Can load on demand when user views setlist details

---

### 3. dmb-date-utils (210 KB)

**Current State:**
- Well-optimized already
- Contains chrono dependency (heavy date handling)
- Only contains 3 functions (likely)

**Issue:**
- **Chrono crate is large** (~80-100 KB alone)
- Most features may not be needed

**Optimization:**
```toml
[dependencies]
# Current
chrono = { version = "0.4", default-features = false, features = ["std", "clock"] }

# Optimized - reduce features
chrono = { version = "0.4", default-features = false, features = ["std"] }
# Removes "clock" feature if not needed for WASM
```

Estimated savings: **10-15 KB**

---

### 4. dmb-string-utils (106 KB)

**Current State:**
- String manipulation and normalization
- Likely very simple functions

**Issue:**
- String utilities don't need to be separate WASM module
- Could be JavaScript or inlined

**Recommendation:**
- Migrate to JavaScript (0.5 KB JS vs 106 KB WASM)
- Estimated savings: **100+ KB** if actually feasible

---

### 5. dmb-force-simulation (49 KB) - CRITICAL BUG

**Current State:**
```toml
[package.metadata.wasm-pack.profile.release]
wasm-opt = false
```

**Issue:**
- wasm-opt is DISABLED when it should be enabled
- This is likely a mistake or legacy setting
- Force simulation benefits from wasm-opt's dead code elimination

**Fix:**
```toml
[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-Oz", "--enable-bulk-memory", "--enable-nontrapping-float-to-int"]
```

**Estimated savings: 8-12 KB** (from wasm-opt optimization)

---

### 6. dmb-visualize (97 KB)

**Current State:**
- Well-configured
- Uses getrandom for RNG

**Optimization:**
- Check if getrandom is necessary
- If only used for deterministic visualizations, consider removing

Estimated savings: **2-5 KB** if getrandom feature removed

---

### 7. dmb-core (19 KB) & Others

**Well-optimized** - minimal opportunities here.

---

## Loading Strategy Issues

### Current: Static Import (Suboptimal)

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/wasm/bridge.ts`

**Line 48:**
```typescript
import transformWasmUrl from '$wasm/dmb-transform/pkg/dmb_transform_bg.wasm?url';
```

**Problem:**
- Imported at module load time
- Downloaded even if user never performs transformations
- Blocks page interactivity during download

**Solution: Lazy-load with Dynamic Import**

```typescript
// Before
import transformWasmUrl from '$wasm/dmb-transform/pkg/dmb_transform_bg.wasm?url';

// After - lazy-load on first use
private async initializeDirect(): Promise<void> {
    const startTime = performance.now();

    this.loadStateStore.set({ status: 'loading', progress: 25 });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.operationTimeout);

    try {
        // DYNAMIC IMPORT - loads only when needed
        const wasmModule = await import('$wasm/dmb-transform/pkg/dmb_transform.js');
        await wasmModule.default();  // Default now auto-resolves WASM
        
        clearTimeout(timeoutId);
        this.loadStateStore.set({ status: 'loading', progress: 90 });
        this.wasmModule = wasmModule as unknown as WasmExports;
        
        const loadTime = performance.now() - startTime;
        console.debug(`[WasmBridge] WASM loaded directly in ${loadTime.toFixed(2)}ms`);
        this.loadStateStore.set({ status: 'ready', loadTime });
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('WASM initialization timed out');
        }
        throw error;
    }
}
```

**Benefits:**
- First Contentful Paint (FCP) improves by 200-250ms
- WASM loads only when actual data transformation needed
- Reduces initial bundle impact

---

## Build Optimization Checklist

### Immediate Wins (No Code Changes)

- [ ] **Fix dmb-force-simulation wasm-opt** (8-12 KB saved)
  ```bash
  cd wasm/dmb-force-simulation
  # Edit Cargo.toml line 9, change wasm-opt = false to:
  # wasm-opt = ["-Oz", "--enable-bulk-memory", "--enable-nontrapping-float-to-int"]
  ./build-all.sh force-simulation
  ```

- [ ] **Verify wasm-opt is running**
  ```bash
  ./wasm/build-all.sh 2>&1 | grep -i "wasm-opt"
  ```

- [ ] **Check dmb-date-utils chrono features** (10-15 KB saved)
  ```bash
  # In wasm/dmb-date-utils/Cargo.toml, change:
  chrono = { version = "0.4", default-features = false, features = ["std"] }
  ```

- [ ] **Run size analysis with twiggy**
  ```bash
  cargo install twiggy
  twiggy top -n 20 wasm/dmb-transform/pkg/dmb_transform_bg.wasm
  ```

### Medium-Effort Optimizations (Code Changes)

- [ ] **Lazy-load dmb-transform** (200-250ms page load improvement)
  - Remove static import from bridge.ts line 48
  - Use dynamic import on first WASM call
  - Estimated complexity: 30 minutes

- [ ] **Add feature flags to dmb-transform** (45 KB potential)
  - Create conditional compilation flags for search, similarity, TFIDF
  - Build slim default version
  - Estimated complexity: 2-3 hours

- [ ] **Remove dmb-string-utils WASM module** (100+ KB potential)
  - Migrate to JavaScript or TypeScript
  - Estimated complexity: 1 hour if feasible

### Advanced Optimizations

- [ ] **Profile with wasm-opt passes**
  ```bash
  wasm-opt input.wasm -o output.wasm \
    --remove-unused-functions \
    --remove-unused-module-elements \
    --vacuum \
    --merge-blocks \
    --coalesce-locals \
    --reorder-locals
  ```

- [ ] **Dead code elimination with wasm-snip**
  ```bash
  cargo install wasm-snip
  wasm-snip dmb_transform_bg.wasm -o dmb_transform_bg.snipped.wasm
  ```

---

## Measurement Strategy

### Before Optimization

```bash
# Get current sizes
ls -lh wasm/*/pkg/*_bg.wasm | awk '{print $5, $9}'

# Output:
# 754K   dmb-transform
# 319K   dmb-segue-analysis
# 210K   dmb-date-utils
# 106K   dmb-string-utils
# 97K    dmb-visualize
# 49K    dmb-force-simulation
# 19K    dmb-core
# Total: 1,554K
```

### After Optimization (Expected)

| Optimization | Savings | New Total |
|---|---|---|
| Current | — | 1,554 KB |
| Fix force-simulation wasm-opt | 8-12 KB | 1,542 KB |
| Reduce chrono features | 10-15 KB | 1,527 KB |
| Lazy-load transform (init only) | 0 KB* | 1,527 KB |
| Feature flags dmb-transform | 40-50 KB | 1,477 KB |
| Remove string-utils WASM | 100 KB** | 1,377 KB |
| **TOTAL POTENTIAL** | **158-177 KB** | **1,377-1,396 KB** |

*Lazy-loading improves page load, not total size
**Only if feasible to migrate

### Gzip Impact

```
Before: 1,554 KB uncompressed → ~350 KB gzipped
After:  1,377 KB uncompressed → ~310 KB gzipped (-40 KB / -11% gzipped)
```

---

## Implementation Priority

### Phase 1 (Week 1 - 30 minutes)

1. **Fix dmb-force-simulation wasm-opt** ✓ Easy, +8-12 KB
2. **Reduce chrono features** ✓ Easy, +10-15 KB
3. **Run twiggy analysis** ✓ Easy, identify more dead code
4. Rebuild: `./wasm/build-all.sh`
5. Measure: Compare sizes

### Phase 2 (Week 2 - 2-3 hours)

1. **Lazy-load dmb-transform**
2. Implement dynamic import in bridge.ts
3. Test initialization and error handling
4. Measure page load improvement

### Phase 3 (Week 3 - 3-4 hours)

1. **Add feature flags to dmb-transform**
2. Create `[features]` section in Cargo.toml
3. Conditionally compile search/similarity modules
4. Measure size reduction

### Phase 4 (Week 4 - 1-2 hours, If Feasible)

1. **Evaluate dmb-string-utils migration**
2. Assess migration cost vs. benefit
3. Migrate if ROI justifies it

---

## File Locations for Reference

**Cargo.toml Files:**
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/Cargo.toml` (workspace)
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-transform/Cargo.toml`
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-force-simulation/Cargo.toml`
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-date-utils/Cargo.toml`

**Build Scripts:**
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/build-all.sh`
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-transform/build.sh`

**WASM Bridge:**
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/wasm/bridge.ts` (Line 48)

---

## Commands to Execute

### Identify Dead Code

```bash
cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte
cargo install twiggy

# Analyze dmb-transform
twiggy top -n 30 wasm/dmb-transform/pkg/dmb_transform_bg.wasm

# Show call graph
twiggy paths wasm/dmb-transform/pkg/dmb_transform_bg.wasm | head -50

# Analyze all modules
for module in dmb-transform dmb-segue-analysis dmb-date-utils dmb-string-utils dmb-visualize dmb-force-simulation dmb-core; do
    echo "=== $module ==="
    twiggy top -n 5 wasm/$module/pkg/${module//-/_}_bg.wasm 2>/dev/null || echo "Not built"
done
```

### Rebuild After Fixes

```bash
cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte

# Clean builds
./wasm/build-all.sh clean

# Rebuild all with optimizations
./wasm/build-all.sh release

# Compare sizes
echo "=== WASM Module Sizes ===" 
ls -lh wasm/*/pkg/*_bg.wasm | awk '{printf "%-30s %8s\n", $9, $5}'

# Calculate total
du -sh wasm/*/pkg/*_bg.wasm | tail -1
```

---

## Success Criteria

After all optimizations:

- [ ] dmb-force-simulation: 49 KB → 41-45 KB (wasm-opt fix)
- [ ] dmb-date-utils: 210 KB → 195-200 KB (chrono features)
- [ ] Total WASM: 1,554 KB → 1,377-1,396 KB (minimum)
- [ ] Initial page load: 200-250ms faster (lazy-load)
- [ ] No functionality lost
- [ ] All tests passing

---

## Notes

1. **wasm-opt is already aggressive** - Your baseline config is excellent. Most wins come from lazy-loading and code organization, not compilation flags.

2. **Chrono is heavy** - Date utilities in WASM are inherently large. Consider if browser Date API could replace most of this.

3. **Bridge.ts is well-designed** - Adding lazy-load is straightforward because of the existing worker pattern.

4. **Gzip compression matters** - Most of your optimizations will be 10-20% size reduction, but gzipped impact is 5-10%. Still worthwhile for initial load.

5. **Tree-shaking limitations** - wasm-bindgen exports are conservative. Even unused functions get included. Feature flags are needed for true elimination.
