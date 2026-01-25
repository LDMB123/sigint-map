# Skill: WASM Binary Size Optimization

**ID**: `wasm-size-optimization`
**Category**: WASM Optimization
**Agent**: Full-Stack Developer

---

## When to Use

- Reducing WASM binary size for faster downloads
- Optimizing bundle size for web applications
- Meeting bandwidth constraints
- Improving initial load time
- Analyzing code bloat

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| wasm_file | string | Yes | Path to .wasm binary |
| target_size | number | No | Target size in KB |

---

## Steps

### Step 1: Configure Cargo Profile

```toml
# Cargo.toml
[profile.release]
opt-level = "z"           # Optimize for size
lto = true                # Enable Link Time Optimization
codegen-units = 1         # Better optimization, slower compile
panic = "abort"           # Remove panic unwinding code
strip = true              # Strip debug symbols

[profile.release.package."*"]
opt-level = "z"
```

**Size Impact:**
- `opt-level = "z"`: 15-30% reduction vs "3"
- `lto = true`: 10-20% additional reduction
- `codegen-units = 1`: 5-10% reduction
- `panic = "abort"`: 5-15% reduction

### Step 2: Minimize Feature Flags

```toml
# Cargo.toml
[dependencies]
serde = { version = "1.0", default-features = false, features = ["derive"] }
wasm-bindgen = { version = "0.2", default-features = false }

# Disable default features globally
[profile.release]
inherits = "release"

[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-Oz"]
```

**Checklist:**
- [ ] Disable `default-features` for all deps
- [ ] Only enable needed features
- [ ] Audit transitive dependencies
- [ ] Use `cargo tree` to find bloat

### Step 3: Use wasm-opt

```bash
# Install Binaryen
npm install -g binaryen

# Aggressive size optimization
wasm-opt -Oz input.wasm -o output.wasm

# Additional passes for maximum compression
wasm-opt -Oz --strip-debug --strip-producers \
         --vacuum --flatten --rereloop \
         input.wasm -o output.wasm

# Benchmark different optimization levels
wasm-opt -O0 input.wasm -o debug.wasm      # No optimization
wasm-opt -O2 input.wasm -o balanced.wasm   # Balanced
wasm-opt -O3 input.wasm -o speed.wasm      # Speed
wasm-opt -Oz input.wasm -o size.wasm       # Size
```

**Expected Reductions:**
- `-O2`: Baseline optimized
- `-O3`: ~5% larger, 10-15% faster
- `-Oz`: 15-25% smaller than `-O2`

### Step 4: Analyze with twiggy

```bash
# Install twiggy
cargo install twiggy

# Top largest items
twiggy top input.wasm

# Dominators (what pulls in bloat)
twiggy dominators input.wasm

# Paths (why is this included)
twiggy paths input.wasm some_function

# Monos (monomorphized generics)
twiggy monos input.wasm

# Generate report
twiggy top -n 20 input.wasm > size-report.txt
```

**Analysis Pattern:**
```bash
# Find the biggest culprits
twiggy top -n 10 input.wasm

# Example output:
#  Shallow Bytes │ Shallow % │ Item
# ───────────────┼───────────┼────────────────────
#         145234 │    23.45% │ data[0]
#          89234 │    14.40% │ std::fmt::write
#          45123 │     7.28% │ serde::de::deserialize
```

### Step 5: Remove Dead Code with wasm-snip

```bash
# Install wasm-snip
cargo install wasm-snip

# Remove specific functions
wasm-snip input.wasm -o output.wasm \
  std::panicking::begin_panic \
  std::fmt::write

# Snip with pattern matching
wasm-snip input.wasm -o output.wasm \
  --snip-rust-panicking-code \
  --snip-rust-fmt-code

# Combine with wasm-opt
wasm-snip input.wasm | wasm-opt -Oz - -o output.wasm
```

**Common Functions to Snip:**
- `std::panicking::*` (if using `panic = "abort"`)
- `std::fmt::*` (if not using formatting)
- Unused trait impls
- Debug/test code accidentally included

### Step 6: Use cargo-bloat

```bash
# Install cargo-bloat
cargo install cargo-bloat

# Analyze WASM target
cargo bloat --release --target wasm32-unknown-unknown

# Find bloat from crates
cargo bloat --release --crates --target wasm32-unknown-unknown

# Filter by function
cargo bloat --release --filter fmt --target wasm32-unknown-unknown
```

### Step 7: Compression

```bash
# Gzip (standard)
gzip -9 -c output.wasm > output.wasm.gz

# Brotli (better compression)
brotli -9 -c output.wasm > output.wasm.br

# Zstandard (fast decompression)
zstd -19 output.wasm -o output.wasm.zst
```

**Compression Ratios (typical):**
- Gzip: 60-70% of original
- Brotli: 55-65% of original
- Zstandard: 58-68% of original

---

## Advanced Techniques

### Dynamic Linking (Experimental)

```toml
# Cargo.toml - Share std between modules
[dependencies]
wasm-bindgen = { version = "0.2", features = ["std"] }

[profile.release]
lto = "thin"  # Faster than full LTO, still good size
```

### Custom Allocator

```rust
// Use a smaller allocator
use wee_alloc;

#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;
```

**Size Impact:** 5-10KB reduction for simple programs

### Minimize String Formatting

```rust
// Before: Pulls in std::fmt (20-40KB)
format!("Error: {}", error);

// After: Use static strings where possible
const ERROR_MSG: &str = "Error occurred";

// Or use lightweight formatting
// Only format when necessary
```

### Avoid Panics in Hot Paths

```rust
// Before: panic adds bloat
let value = vec[index];

// After: Use unsafe if bounds checked elsewhere
let value = unsafe { *vec.get_unchecked(index) };

// Or explicitly handle
let value = vec.get(index).unwrap_or(&default);
```

---

## Benchmarks

### Size Reduction Pipeline

| Stage | Size (KB) | Reduction | Cumulative |
|-------|-----------|-----------|------------|
| Initial build | 450 | - | - |
| + Cargo profile | 315 | 30% | 30% |
| + Feature flags | 280 | 11% | 38% |
| + wasm-opt -Oz | 210 | 25% | 53% |
| + wasm-snip | 195 | 7% | 57% |
| + Brotli | 110 | 44% | 76% |

### Real-World Examples

**Simple Calculator:**
- Before: 180KB → After: 45KB (75% reduction)
- Profile + wasm-opt + Brotli

**Image Processing:**
- Before: 890KB → After: 320KB (64% reduction)
- LTO + opt-level="z" + wasm-opt + wasm-snip

**Data Visualization:**
- Before: 1.2MB → After: 380KB (68% reduction)
- All techniques + removed unused chart types

---

## Measurement Commands

```bash
# Size comparison
ls -lh *.wasm | awk '{print $5, $9}'

# Detailed analysis
wasm-objdump -h input.wasm

# Section sizes
wasm-objdump -s input.wasm

# Function count
wasm-objdump -x input.wasm | grep -c "func\["

# Import/export count
wasm-objdump -x input.wasm | grep -E "import|export" | wc -l
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| optimized.wasm | ./ | Size-optimized binary |
| size-report.txt | ./ | twiggy analysis |
| comparison.txt | ./ | Before/after metrics |

---

## Output Template

```markdown
## Size Optimization Report

### Original Size
- Uncompressed: [size]KB
- Gzipped: [size]KB

### Optimizations Applied
- [ ] Cargo profile: opt-level="z", LTO
- [ ] Feature flags minimized
- [ ] wasm-opt -Oz
- [ ] wasm-snip (functions: ...)
- [ ] Custom allocator

### Final Size
- Uncompressed: [size]KB ([reduction]% reduction)
- Brotli: [size]KB ([reduction]% total reduction)

### Top Size Contributors (twiggy)
| Item | Size | Percentage |
|------|------|------------|
| ... | ...KB | ...% |

### Recommendations
1. [Further optimization opportunity]
2. [Code change suggestion]

### Build Commands
```bash
cargo build --release --target wasm32-unknown-unknown
wasm-opt -Oz target/wasm32-unknown-unknown/release/app.wasm -o optimized.wasm
brotli -9 optimized.wasm
```
```

---

## Best Practices

1. **Measure First**: Use twiggy before optimizing
2. **Iterative**: Apply one technique at a time
3. **Test Functionality**: Ensure aggressive optimization doesn't break code
4. **Profile Binary**: Balance size vs performance
5. **CI Integration**: Automate size checks
6. **Budget Tracking**: Set size budgets and alert on regression

---

## Common Pitfalls

- Over-optimization breaking functionality
- Stripping needed debug info for production errors
- Not testing compressed size (what users download)
- Optimizing before measuring
- Forgetting to enable LTO
- Including unused dependencies
