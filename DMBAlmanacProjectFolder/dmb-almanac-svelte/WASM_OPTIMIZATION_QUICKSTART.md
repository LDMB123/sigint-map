# WASM Optimization - Quick Start Guide

## Phase 1: Quick Wins (15 minutes)

### Step 1: Fix dmb-force-simulation wasm-opt Bug

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-force-simulation/Cargo.toml`

**Current (Line 8-9):**
```toml
[package.metadata.wasm-pack.profile.release]
wasm-opt = false
```

**Change to:**
```toml
[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-Oz", "--enable-bulk-memory", "--enable-nontrapping-float-to-int"]
```

**Expected savings:** 8-12 KB

---

### Step 2: Optimize dmb-date-utils Chrono Features

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-date-utils/Cargo.toml`

**Current (Line 16):**
```toml
chrono.workspace = true
```

**Check workspace definition in `/wasm/Cargo.toml` (Line 33-34) and change to:**
```toml
chrono = { version = "0.4", default-features = false, features = ["std"] }
```

**Expected savings:** 10-15 KB

---

### Step 3: Rebuild and Measure

```bash
cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm

# Clean old builds
./build-all.sh clean

# Rebuild all modules
./build-all.sh release

# Show sizes
echo "=== WASM Sizes ==="
ls -lh dmb-*/pkg/*_bg.wasm | awk '{printf "%-30s %8s\n", $9, $5}'

# Total
du -ch dmb-*/pkg/*_bg.wasm | tail -1
```

**Expected result before Phase 1:** ~1,554 KB  
**Expected result after Phase 1:** ~1,524 KB (20-30 KB saved)

---

## Phase 2: Lazy-Load dmb-transform (30 minutes)

### What is lazy-loading?

Instead of downloading the 754 KB dmb-transform module on every page load, load it only when the user actually needs data transformation.

### Step 1: Update Bridge Initialization

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/wasm/bridge.ts`

**Remove Line 48:**
```typescript
// DELETE THIS LINE:
import transformWasmUrl from '$wasm/dmb-transform/pkg/dmb_transform_bg.wasm?url';
```

**Modify `initializeDirect()` method (around line 160):**

**Current:**
```typescript
private async initializeDirect(): Promise<void> {
    const startTime = performance.now();

    this.loadStateStore.set({ status: 'loading', progress: 25 });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.operationTimeout);

    try {
        this.loadStateStore.set({ status: 'loading', progress: 50 });

        const wasmModule = await import('$wasm/dmb-transform/pkg/dmb_transform.js');
        await wasmModule.default(transformWasmUrl);
        // ... rest of method
    }
}
```

**Change to:**
```typescript
private async initializeDirect(): Promise<void> {
    const startTime = performance.now();

    this.loadStateStore.set({ status: 'loading', progress: 25 });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.operationTimeout);

    try {
        this.loadStateStore.set({ status: 'loading', progress: 50 });

        // Dynamic import - loads only when first needed
        const wasmModule = await import('$wasm/dmb-transform/pkg/dmb_transform.js');
        
        // Call default export which auto-resolves the WASM binary
        await wasmModule.default();

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

### Step 2: Test Initialization

```typescript
// In any component that uses WASM
import { WasmBridge } from '$lib/wasm/bridge';

onMount(async () => {
    const bridge = WasmBridge.getInstance();
    
    // This now triggers download only when called
    const result = await bridge.calculateSongStatistics(songs);
    console.log(result);
});
```

### Expected Benefits

- **Initial page load:** 200-250ms faster (754 KB deferred)
- **First Interaction:** ~100-150ms slower (when WASM is first used)
- **Net gain:** Significant for users who never perform transformations

---

## Phase 3: Code Splitting dmb-transform (2-3 hours)

### Only do this if twiggy analysis shows 40+ KB of dead code.

### Step 1: Add Feature Flags

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-transform/Cargo.toml`

**Add to [features] section (around line 10):**
```toml
[features]
default = ["transform", "aggregation"]
transform = []           # Core transformations
aggregation = []         # Year/venue/song aggregations
search = []              # globalSearch, advanced search
similarity = []          # setlist_similarity, segue prediction
tfidf = []              # TFIDF vectorization (large)
rarity = []             # Rarity calculation
```

### Step 2: Conditionally Compile Modules

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-transform/src/lib.rs`

**Wrap unused modules with #[cfg(...)]:**

```rust
#[cfg(feature = "search")]
mod search;
#[cfg(feature = "search")]
mod search_index;
#[cfg(feature = "search")]
mod tfidf_search;

#[cfg(feature = "similarity")]
mod setlist_similarity;

#[cfg(feature = "rarity")]
mod rarity;

// Re-export only if feature enabled
#[cfg(feature = "search")]
pub use search::*;
#[cfg(feature = "search")]
pub use search_index::*;
#[cfg(feature = "search")]
pub use tfidf_search::*;

#[cfg(feature = "similarity")]
pub use setlist_similarity::*;

#[cfg(feature = "rarity")]
pub use rarity::*;
```

### Step 3: Build With/Without Features

```bash
# Standard build (all features)
./build.sh release

# Minimal build (transformations only)
wasm-pack build --target web --release -- --features transform,aggregation

# Custom build (add search but not TFIDF)
wasm-pack build --target web --release -- --features transform,aggregation,search
```

### Expected Savings

- Removing search: -12 KB
- Removing similarity: -8 KB
- Removing TFIDF: -15 KB
- Removing rarity: -10 KB
- **Total: -45 KB** if building minimal version

---

## Phase 4: Measurement & Validation

### Before Each Phase, Record:

```bash
# 1. WASM Module Sizes
cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm

echo "=== Individual Module Sizes ==="
ls -lh dmb-*/pkg/*_bg.wasm | awk '{
    module = $9; 
    gsub(/.*\//, "", module); 
    gsub(/_bg.wasm/, "", module); 
    printf "%-25s %8s\n", module, $5
}'

echo ""
echo "=== Total Size ==="
du -sh dmb-*/pkg/*_bg.wasm | tail -1

# 2. Gzipped Size
echo ""
echo "=== Gzipped Size (estimate) ==="
tar czf wasm-all.tar.gz dmb-*/pkg/*_bg.wasm
ls -lh wasm-all.tar.gz | awk '{print "Total gzipped: " $5}'
rm wasm-all.tar.gz

# 3. Build Time
echo ""
echo "=== Build Time ==="
time ./build-all.sh release
```

### Expected Progression

| Phase | Raw Size | Gzipped | Page Load | Status |
|-------|----------|---------|-----------|--------|
| Baseline | 1,554 KB | ~370 KB | T+0ms | Starting point |
| Phase 1 | 1,524 KB | ~360 KB | T+0ms | Fix bugs |
| Phase 2 | 1,524 KB | ~360 KB | T-200ms | Lazy-load |
| Phase 3 | 1,474 KB | ~350 KB | T-200ms | Code split |
| **Final** | **1,474 KB** | **~350 KB** | **T-200ms** | **-5% size, -13% load** |

---

## Debugging & Rollback

### If Something Breaks

```bash
# Rebuild from scratch
cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm
./build-all.sh clean
./build-all.sh release

# Check for TypeScript errors
cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte
npm run build
```

### Common Issues

**Issue:** `wasm-opt not found`  
**Solution:**
```bash
cargo install wasm-opt
```

**Issue:** Module import fails  
**Solution:**
- Verify all imports use `import('...')` not static `import`
- Check that .wasm file exists in pkg/ directory
- Test in development mode first: `npm run dev`

**Issue:** WASM initialization times out  
**Solution:**
- Increase `operationTimeout` in bridge.ts config
- Check if network is slow
- Add more loading logging: `console.debug()` calls

---

## Verification Checklist

After each phase:

- [ ] All WASM modules build without errors
- [ ] TypeScript compiles without errors
- [ ] Dev server starts: `npm run dev`
- [ ] Page loads and renders correctly
- [ ] Data transformation works (check console for errors)
- [ ] Search functionality works (if applicable)
- [ ] No memory leaks in DevTools
- [ ] File sizes decreased as expected
- [ ] Gzip size decreased as expected

---

## Next Steps

1. **Run Phase 1 immediately** - Easy wins, no risk
2. **Test Phase 2** - Measure page load improvement
3. **Decide on Phase 3** - Only if twiggy shows dead code
4. **Document final baseline** - For future optimization reference

**Estimated total effort:** 2-3 hours for all phases  
**Expected benefit:** 15-25% size reduction + 200ms faster initial load
