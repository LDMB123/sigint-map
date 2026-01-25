# WASM Toolchain - Quick Fixes Guide
**Estimated Time: 1.5 hours | Maximum Impact**

---

## Quick Fix #1: Re-enable wasm-opt for dmb-force-simulation
**Time: 10 minutes | Savings: 13 KB**

### File: `/wasm/dmb-force-simulation/Cargo.toml`

**BEFORE**:
```toml
[package.metadata.wasm-pack.profile.release]
wasm-opt = false
```

**AFTER**:
```toml
[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-Oz", "--enable-bulk-memory", "--enable-nontrapping-float-to-int"]
```

**Test**:
```bash
cd wasm/dmb-force-simulation
wasm-pack build --target web --release
# Then test force-directed graph layout in UI - should be identical performance
```

---

## Quick Fix #2: Add LICENSE files
**Time: 5 minutes | Impact: Removes warnings**

### Step 1: Create root LICENSE file
**File: `/LICENSE`**

```
MIT License

Copyright (c) 2026 DMB Almanac Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

### Step 2: Update workspace Cargo.toml
**File: `/wasm/Cargo.toml`**

Add or update:
```toml
[workspace.package]
version = "0.1.0"
edition = "2021"
authors = ["DMB Almanac Team"]
license = "MIT"  # ← ADD THIS LINE
```

---

## Quick Fix #3: Add npm compression scripts
**Time: 15 minutes | Savings: 1.34 MB network transfer**

### File: `/package.json`

In the `"scripts"` section, add these three lines:

```json
"wasm:compress": "echo 'Compressing WASM binaries...' && for f in wasm/*/pkg/*_bg.wasm; do echo \"Compressing $f\"; brotli -j -11 \"$f\" -o \"$f.br\"; gzip -9 \"$f\" -c > \"$f.gz\"; done && echo 'Done'",
"wasm:size-total": "echo '=== WASM Bundle Sizes ===' && ls -lh wasm/*/pkg/*_bg.wasm* 2>/dev/null | awk '{print $5, $9}' | sort -k2",
"wasm:build:prod": "npm run wasm:build && npm run wasm:compress && npm run wasm:size-total",
```

**Usage**:
```bash
npm run wasm:build:prod        # Build + compress in one go
npm run wasm:size-total        # Show all WASM sizes
```

**Requirements**:
```bash
# Install compression tools (if not already installed)
brew install brotli            # macOS
# or: sudo apt-get install brotli  # Linux
```

---

## Quick Fix #4: Add size reporting script
**Time: 5 minutes | Impact: Visibility**

### File: `/package.json`

Add to `"scripts"`:
```json
"wasm:stats": "echo '=== WASM Module Breakdown ===' && echo 'WASM Files:' && du -sh wasm/*/pkg/ 2>/dev/null && echo '' && echo 'Individual Modules:' && ls -lh wasm/*/pkg/*_bg.wasm 2>/dev/null | awk '{printf \"%-35s %8s\\n\", $9, $5}' && echo '' && echo 'Total:' && du -sh wasm/ 2>/dev/null | tail -1",
```

**Usage**:
```bash
npm run wasm:stats
```

**Output**:
```
=== WASM Module Breakdown ===
WASM Files:
 728K wasm/dmb-transform/pkg
 308K wasm/dmb-segue-analysis/pkg
 ...

Individual Modules:
wasm/dmb-transform/pkg/dmb_transform_bg.wasm  736 KB
wasm/dmb-segue-analysis/pkg/dmb_segue_analysis_bg.wasm  312 KB
...
```

---

## Quick Fix #5: Configure Vite for Compression
**Time: 20 minutes | Savings: 75% network transfer**

### Option A: Brotli Compression Plugin (Recommended)

**File: `/vite.config.ts`**

Step 1: Install plugin
```bash
npm install -D vite-plugin-compression
```

Step 2: Update vite.config.ts
```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import compression from 'vite-plugin-compression';  // ← ADD THIS
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

export default defineConfig(({ mode }) => ({
	plugins: [
		wasm(),
		topLevelAwait(),
		// ← ADD THIS BLOCK
		compression({
			algorithm: 'brotli',
			ext: '.br',
			compressionOptions: {
				level: 11,  // Maximum compression (0-11)
			},
			threshold: 10240,  // Only compress files > 10KB
			deleteOriginFile: false,  // Keep original + .br version
		}),
		// END NEW BLOCK
		sveltekit()
	],
	// ... rest of config
}));
```

Step 3: Update nginx/server config to serve .br files

**Nginx example** (in your nginx config):
```nginx
http {
    # Enable Brotli
    brotli on;
    brotli_types application/wasm application/javascript text/css;
    brotli_static on;  # Serve pre-compressed .br files
    
    # Enable gzip as fallback
    gzip on;
    gzip_types application/wasm application/javascript text/css;
    gzip_static on;
}
```

### Option B: Manual Compression Step (No Plugin)

If you prefer not to add dependencies, add to `build-all.sh`:

```bash
# Add to end of build-all.sh before print_success
echo ""
echo "Compressing WASM files..."
for wasm_file in wasm/*/pkg/*_bg.wasm; do
    if [ -f "$wasm_file" ]; then
        brotli -j -11 "$wasm_file" -o "$wasm_file.br"
        gzip -9 "$wasm_file" -c > "$wasm_file.gz"
    fi
done
echo "Brotli/gzip compression complete!"
```

---

## Summary Table

| Fix | Time | Impact | Status |
|-----|------|--------|--------|
| Re-enable dmb-force-simulation wasm-opt | 10 min | 13 KB saving | 🔴 Do ASAP |
| Add LICENSE files | 5 min | Remove warnings | 🟠 Do ASAP |
| Add compression npm scripts | 15 min | 75% transfer save | 🔴 Do ASAP |
| Add size reporting | 5 min | Visibility | 🟢 Nice to have |
| Configure Vite compression | 20 min | 75% transfer save | 🔴 Do ASAP |
| **TOTAL** | **~1.5 hours** | **1.34 MB + 13 KB savings** | ✅ High Priority |

---

## Verification Commands

After implementing fixes:

```bash
# 1. Verify dmb-force-simulation compiles
cd wasm/dmb-force-simulation && wasm-pack build --target web --release

# 2. Verify all modules build
npm run wasm:build

# 3. Check compression results
npm run wasm:size-total

# 4. Show total savings
npm run wasm:stats

# 5. Check file sizes
ls -lh wasm/*/pkg/*_bg.wasm*
```

---

## Expected Results

**Before Fixes**:
```
WASM modules (uncompressed):  1.51 MB
Transfer size:                1.79 MB
Download time (4G):           3.6 seconds
```

**After Fixes**:
```
WASM modules (uncompressed):  1.50 MB (13 KB less)
Transfer size (Brotli):       0.45 MB (75% reduction)
Download time (4G):           0.9 seconds (4x faster)
```

---

## Next Steps

After these quick fixes:

1. **Commit changes**:
   ```bash
   git add wasm/ package.json vite.config.ts LICENSE
   git commit -m "WASM: Enable dmb-force-simulation wasm-opt, add compression pipeline"
   ```

2. **Create GitHub Actions workflow** (see full audit report Section 5)

3. **Monitor compression metrics** in production with:
   ```
   npm run wasm:stats
   ```

---

## Troubleshooting

**"brotli: command not found"**
```bash
brew install brotli  # macOS
sudo apt-get install brotli  # Ubuntu/Debian
```

**Compression not working in browser**
- Check server sends `Content-Encoding: br` header
- Verify `.br` files exist alongside `.wasm` files
- Check nginx/server config has Brotli enabled

**Build fails after dmb-force-simulation change**
- Verify wasm32 target is installed: `rustup target list --installed`
- Clean and rebuild: `cargo clean && npm run wasm:build`

---

## Questions?

See the full report: `WASM_TOOLCHAIN_AUDIT_REPORT.md`
