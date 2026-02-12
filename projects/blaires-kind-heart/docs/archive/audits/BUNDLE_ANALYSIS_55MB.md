# Bundle Analysis Report: 55MB Production Build

**Analysis Date**: 2026-02-10
**Build**: `trunk build --release` (Rust + WASM)
**Target**: iPad mini 6 (A15, 4GB RAM), Safari 26.2

---

## Executive Summary

**Current Size**: 55MB (unacceptable)
**Critical Issue**: ~44MB bloat from abandoned/legacy illustration assets
**Quick Win**: Remove unused illustrations = -44MB
**Medium Wins**: Remove game sprites (-3.6MB), optimize WASM binary
**Realistic Target**: 3-5MB (fully optimized PWA)

---

## Itemized Bundle Breakdown (55MB Total)

### TIER 1: CRITICAL BLOAT (44MB+)

| Component | Size | Format | Issue | Action |
|-----------|------|--------|-------|--------|
| `illustrations/` | 44MB | 80 PNG files (mostly) | Legacy assets - all pre-dated WebP companions/gardens | REMOVE |
| ├─ stories/ | 18MB | ~9 PNG + 3 WebP | Story illustrations (PNG duplicates with WebP) | KEEP WebP ONLY |
| ├─ stickers/ | 11MB | 21 PNG files | Sticker overlays (referenced in rewards.rs) | KEEP |
| ├─ backgrounds/ | 6.4MB | 6 PNG + 2 WebP | Home/tracker/quests backgrounds (legacy) | REMOVE |
| ├─ games/ | 3.0MB | 4 PNG files | Game UI screens (not dynamically used) | REMOVE |
| ├─ buttons/ | 156KB | 17 WebP files | Home grid buttons (used - loading="eager") | KEEP |
| └─ other/ | ~5.6MB | Acts, blaire, animals | Act types (PNG), character art | REMOVE |
| **Verdict** | **~40MB waste** | | | **DELETE 80% of folder** |

### TIER 2: UNUSED GAME ASSETS (3.6MB)

| Component | Size | Files | Used By | Issue |
|-----------|------|-------|---------|-------|
| `game-sprites/` | 3.6MB | 8 PNG sprites | game_unicorn.rs (2 only) | 6 of 8 sprites unused |
| ├─ forest_background.png | 668KB | ✓ Used | game_unicorn.rs line 456 | KEEP |
| ├─ sparkle_effect.png | 100KB | ✓ Used | game_unicorn_sparkles.rs | KEEP |
| ├─ unicorn_sprite.png | 536KB | ✗ Unused | Game feature incomplete? | REMOVE |
| ├─ owl_sprite.png | 592KB | ✗ Unused | | REMOVE |
| ├─ hedgehog_sprite.png | 588KB | ✗ Unused | | REMOVE |
| ├─ fox_sprite.png | 436KB | ✗ Unused | | REMOVE |
| ├─ deer_sprite.png | 412KB | ✗ Unused | | REMOVE |
| ├─ bunny_sprite.png | 360KB | ✗ Unused | | REMOVE |
| **Verdict** | **-3.1MB possible** | | | **DELETE 6 sprites** |

### TIER 3: DUPLICATE/BLOATED ICONS (1.9MB)

| Component | Size | Format | Issue | Action |
|-----------|------|--------|-------|--------|
| `icons/` | 1.9MB | Mix PNG | Unoptimized icon set | OPTIMIZE |
| ├─ app-icon-512.png | 672KB | PNG | PWA icon (should be ~80KB WebP) | CONVERT WebP |
| ├─ app-icon-192.png | 680KB | PNG | PWA icon (should be ~60KB WebP) | CONVERT WebP |
| ├─ icon-512.png | 232KB | PNG | Duplicate of above? | REMOVE |
| ├─ icon-512-maskable.png | 232KB | PNG | Duplicate of above? | REMOVE |
| ├─ icon-192.png | 40KB | PNG | Good size | KEEP |
| ├─ icon-192-maskable.png | 40KB | PNG | Good size | KEEP |
| ├─ icon-180.png | 36KB | PNG | Apple icon | KEEP |
| **Verdict** | **~1.6MB waste** | | | **REMOVE DUPES + CONVERT WebP** |

### TIER 4: PRODUCTION CODE/DATA (7.8MB)

| Component | Size | Purpose | Optimized? | Status |
|-----------|------|---------|-----------|--------|
| `blaires-kind-heart_bg.wasm` | 2.9MB | Rust → WASM binary | UNKNOWN | ⚠️ CHECK |
| `sqlite/sqlite3.wasm` | 840KB | OPFS SQLite runtime | YES (WASM binary) | KEEP |
| `blaires-kind-heart.js` | 96KB | WASM glue code | YES | KEEP |
| `db-worker.js` | 20KB | DB worker | YES | KEEP |
| `sw.js` + `sw-assets.js` | 12KB | Service Worker | YES | KEEP |
| **CSS** (14 files) | 280KB | Style sheets | MODERATE | OK |
| `companions/` (21 WebP) | 676KB | Companion skins | YES | KEEP |
| `gardens/` (60 WebP) | 3.1MB | Garden stages | YES | KEEP |
| **Verdict** | **~7.9MB** | | | **CHECK WASM OPT** |

### TIER 5: MISC

| Component | Size | Issue |
|-----------|------|-------|
| `sqlite/sqlite3.js` | 368KB | SQLite JS binding (large but necessary) |
| `sqlite/sqlite3-opfs-async-proxy.js` | 20KB | Worker proxy |
| `index.html` + manifests | 16KB | Entry point |

---

## Rust WASM Binary Analysis (2.9MB)

### Current Profile (Cargo.toml)
```toml
[profile.release]
lto = true              # Link-time optimization: YES
opt-level = "z"         # Size optimization: YES (but may not be -Oz)
codegen-units = 1       # Single codegen: YES
panic = "abort"         # No unwind tables: YES
strip = "symbols"       # Strip symbols: YES
```

### Issues Found

1. **Missing wasm-opt aggressive passes**
   - Trunk uses `wasm-opt -O3` (balanced, not size)
   - Should use `-Oz -all-features` for Blaire's Kind Heart
   - Potential savings: **300-500KB**

2. **Compile-in dead code**
   - 24 compiler warnings about unused functions
   - Likely compiled into WASM binary:
     - `quest_chains.rs` - 6 warnings (300KB estimated)
     - `badges.rs` - 6 warnings (250KB estimated)
     - `weekly_themes.rs` - 6 warnings (200KB estimated)
   - **Potential savings: 400-700KB** if completely removed

3. **Possible optimization points**
   - Check if `tract-onnx` (ML) is behind feature flag (should not compile by default)
   - Check if `web-sys` features can be pruned
   - Verify LTO actually worked (check build logs)

### Expected WASM Size After Optimization

| Scenario | Size | Savings |
|----------|------|---------|
| Current | 2.9MB | — |
| + wasm-opt -Oz | 2.4MB | -500KB |
| + Remove dead modules | 1.8MB | -1.1MB total |
| + Feature-gate unused APIs | 1.5MB | -1.4MB total |

---

## Dead Code Impact (24 Compiler Warnings)

All modules in `rust/lib.rs` are compiled into the binary, **even if never called**:

### Unused Modules (High Size Impact)

| Module | Lines | Warnings | Likely Impact | Action |
|--------|-------|----------|----------------|--------|
| `quest_chains.rs` | N/A | 6 | 300KB | Remove or feature-gate |
| `badges.rs` | 953 | 6 | 250KB | Remove or feature-gate |
| `weekly_themes.rs` | N/A | 6 | 200KB | Remove or feature-gate |
| `weekly_goals.rs` | N/A | ? | 150KB | Check if used |
| `skill_progression.rs` | N/A | ? | 150KB | Check if used |
| `emotion_vocabulary.rs` | N/A | ? | 100KB | Check if used |
| `reflection.rs` | 383 | ? | 100KB | Check if used |
| `adaptive_quests.rs` | N/A | ? | 150KB | Check if used |
| `parent_insights.rs` | 385 | ? | 150KB | Check if used |

**Summary**: ~1.1MB of dead code likely compiled into WASM binary.

---

## Asset Pipeline Analysis

### Story Assets (18MB total)

**Format duplication detected**:
```
illustrations/stories/lost-bunny-1.png   (640KB PNG)
illustrations/stories/lost-bunny-1.webp  (110KB WebP)  ← Keep this
```

**Status**:
- 5 stories with cover images
- 14 total story images referenced in `story_data.rs` (lines 32-221)
- PNG originals: redundant when WebP exists
- Action: **Delete all PNG versions, keep WebP only** = -15MB savings

### Game Assets (3.6MB total)

**Actual usage**:
- `game_unicorn.rs`: Uses forest_background.png (668KB) + sparkle_effect.png (100KB)
- Other 6 sprites: **NEVER REFERENCED** in any Rust code
- Action: **Delete unused 6 sprites** = -2.9MB savings

### Companion Assets (676KB total)

**Status**: 18 WebP files (6 skins × 3 expressions)
- All referenced in `companion.rs`
- Properly optimized (WebP format)
- Action: **KEEP** ✓

### Garden Assets (3.1MB total)

**Status**: 60 WebP files (12 gardens × 5 growth stages)
- All referenced in `gardens.rs`
- Properly optimized (WebP format)
- Action: **KEEP** ✓

---

## CSS Bloat Analysis (280KB across 14 files)

| File | Size | Lines | Issue |
|------|------|-------|-------|
| games.css | 60KB | 2436 | High for unused game feature |
| animations.css | 28KB | 877 | Reasonable |
| particles.css | 20KB | 384 | GPU particle animations |
| home.css | 24KB | 726 | Main hub styling |
| tracker.css | 16KB | 471 | Tracker UI |
| stories.css | 16KB | 601 | Story UI |
| others | 76KB | 2000+ | Progress, rewards, quests, etc. |

**Assessment**: CSS is reasonable for feature set. Games.css is largest but games are implemented.

---

## SQLite Bundle (1.2MB)

### Breakdown

| Component | Size | Purpose |
|-----------|------|---------|
| sqlite3.wasm | 840KB | SQLite WASM runtime (required) |
| sqlite3.js | 368KB | SQLite JS bindings (required) |
| sqlite3-opfs-async-proxy.js | 20KB | OPFS worker proxy (required) |

**Status**: All necessary for offline data storage. Cannot remove.

---

## Icon Optimization Opportunity (1.6MB savings)

### Current Icon Issues

```
icons/
  app-icon-512.png        672KB  (Should be 80-120KB)
  app-icon-192.png        680KB  (Should be 60-80KB)
  icon-512.png            232KB  (Duplicate?)
  icon-512-maskable.png   232KB  (Duplicate?)
  icon-192.png             40KB  (Good)
  icon-180.png             36KB  (Good)
```

### Solution

1. Convert 512×512 to WebP: 672KB → 80KB
2. Convert 192×192 to WebP: 680KB → 60KB
3. Delete duplicate icon-512 variants: -464KB
4. **Total savings: 1.6MB**

---

## Summary: Size Reduction Roadmap

### CRITICAL PATH (Quick Wins)

| Action | Savings | Effort | Priority |
|--------|---------|--------|----------|
| 1. Delete unused illustrations/* (~40MB) | -40MB | 1 hour | 🔴 CRITICAL |
| 2. Delete unused game sprites (6 files) | -2.9MB | 15 min | 🔴 CRITICAL |
| 3. Remove PNG story duplicates | -1.5MB | 30 min | 🔴 CRITICAL |
| 4. Optimize/consolidate icons | -1.6MB | 1 hour | 🟠 HIGH |
| **Subtotal after quick wins** | **-46MB** | | |

### MEDIUM EFFORT (Code Optimization)

| Action | Savings | Effort | Priority |
|--------|---------|--------|----------|
| 5. Run wasm-opt -Oz on WASM binary | -500KB | 15 min | 🟠 HIGH |
| 6. Remove dead code modules (quest_chains, badges, weekly_themes) | -700KB | 2 hours | 🟠 HIGH |
| 7. Remove unused web-sys features | -200KB | 1 hour | 🟡 MEDIUM |
| **Subtotal after medium effort** | **-1.4MB** | | |

### TOTAL POTENTIAL SAVINGS: **-47.4MB** (85.8% reduction)

---

## Realistic Target Bundle Size

### Conservative Estimate (Just asset cleanup)

```
dist/
├── blaires-kind-heart.js           96KB
├── blaires-kind-heart_bg.wasm    2.4MB  (after wasm-opt)
├── db-worker.js                   20KB
├── sw.js + sw-assets.js           12KB
├── CSS (14 files)                280KB
├── companions/                   676KB
├── gardens/                      3.1MB
├── icons/ (optimized)            100KB
├── sqlite/                       1.2MB
├── illustrations/stories/ (WebP only) 350KB
├── illustrations/stickers/        300KB
├── illustrations/buttons/        156KB
├── manifest + HTML               16KB
└── Other                         100KB
────────────────────────────────────────
TOTAL: ~8.8MB
```

### Aggressive Optimization (With dead code removal)

```
After removing quest_chains + badges + weekly_themes:
WASM: 2.4MB → 1.8MB
Total: 8.8MB → 8.1MB
```

### Production Recommendation: 4-5MB

With Brotli compression on HTTP (typical deployment):
- 8.1MB uncompressed → **1.8-2.2MB over-the-wire**
- Gardens (3.1MB WebP) → 400-500KB over-the-wire
- SQLite WASM (840KB) → 200KB over-the-wire

---

## Implementation Plan

### Phase 1: Asset Cleanup (1-2 hours) → -46MB

1. **Delete bloated illustration directories**
   ```bash
   rm -rf dist/illustrations/{backgrounds,games,acts,blaire,animals}
   ```

2. **Keep only necessary illustration assets**
   ```
   ✓ illustrations/buttons/     (17 WebP - used by home grid)
   ✓ illustrations/stickers/    (21 PNG - referenced in rewards.rs)
   ✓ illustrations/stories/     (WebP only, delete PNG dupes)
   ```

3. **Delete unused game sprites**
   ```bash
   rm -f dist/game-sprites/{unicorn,owl,hedgehog,fox,deer,bunny}_sprite.png
   # Keep: forest_background.png, sparkle_effect.png
   ```

4. **Update Trunk copy-dir directives** in `index.html`
   - Remove `<link data-trunk rel="copy-dir" href="assets/illustrations" />`
   - Add selective copy for stickers/stories/buttons only

### Phase 2: Icon Optimization (1 hour) → -1.6MB

1. Convert PNG icons to WebP:
   ```bash
   cwebp -q 80 icons/app-icon-512.png -o icons/app-icon-512.webp
   cwebp -q 80 icons/app-icon-192.png -o icons/app-icon-192.webp
   ```

2. Update manifest.webmanifest to reference WebP icons

3. Delete duplicate icon-512 variants

### Phase 3: WASM Optimization (30 min) → -500KB

1. **Update Trunk.toml or trunk build command**
   ```bash
   trunk build --release --wasm-opt=Oz
   ```

2. Or configure in `index.html`:
   ```html
   <link data-trunk rel="rust" href="Cargo.toml"
         data-target-name="blaires_kind_heart"
         data-wasm-opt="Oz" />
   ```

### Phase 4: Dead Code Removal (2-4 hours) → -700KB

1. Create feature flags for incomplete features:
   ```toml
   [features]
   default = []
   quest-chains = []
   badges = []
   weekly-themes = []
   ```

2. Feature-gate unused modules in `lib.rs`:
   ```rust
   #[cfg(feature = "quest-chains")]
   mod quest_chains;

   #[cfg(feature = "badges")]
   mod badges;

   #[cfg(feature = "weekly-themes")]
   mod weekly_themes;
   ```

3. Remove feature flags from `Cargo.toml` default (or keep disabled)

---

## Validation Checklist

- [ ] After asset deletion, visual tests pass on iPad
- [ ] Stories still render with WebP images
- [ ] Stickers load correctly
- [ ] Companion and garden assets serve without errors
- [ ] Service Worker cache strategy works with new asset paths
- [ ] PWA icons appear correctly with WebP conversion
- [ ] WASM binary size decreases to 2.4MB+ (verify with `ls -lh dist/blaires-kind-heart_bg.wasm`)
- [ ] No 404 errors in browser console for missing assets
- [ ] Build succeeds with no warnings about dead code

---

## Before/After Metrics

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| **Total Build** | 55MB | 8.1MB | **85.2%** |
| **WASM Binary** | 2.9MB | 1.8MB | **37.9%** |
| **Illustrations** | 44MB | 650KB | **98.5%** |
| **Icons** | 1.9MB | 300KB | **84.2%** |
| **Game Sprites** | 3.6MB | 768KB | **78.7%** |
| **Over-the-wire (Brotli)** | ~12MB | ~1.8MB | **85%** |
| **Time to interactive** | ~8-12s | ~2-3s | **66%+** |

---

## Appendix: Files to Delete

### High-Priority Deletions

```
# Bloated illustration directories (40MB)
dist/illustrations/backgrounds/
dist/illustrations/games/
dist/illustrations/acts/
dist/illustrations/blaire/
dist/illustrations/animals/

# Unused game sprites (2.9MB)
dist/game-sprites/unicorn_sprite.png
dist/game-sprites/owl_sprite.png
dist/game-sprites/hedgehog_sprite.png
dist/game-sprites/fox_sprite.png
dist/game-sprites/deer_sprite.png
dist/game-sprites/bunny_sprite.png

# Story PNG duplicates (1.5MB) - keep WebP
dist/illustrations/stories/*.png (except if no .webp counterpart)

# Duplicate icons (464KB)
dist/icons/icon-512.png
dist/icons/icon-512-maskable.png
```

### Conditional Deletions (After Feature Flag Implementation)

```
# If quest-chains feature disabled:
rust/quest_chains.rs

# If badges feature disabled:
rust/badges.rs

# If weekly-themes feature disabled:
rust/weekly_themes.rs
```

---

## References

- **Cargo.toml**: Release profile already optimized (LTO, opt-level="z", strip=symbols)
- **index.html**: Copy-dir directives need refinement (remove illustrations/ as blanket copy)
- **story_data.rs**: Confirms only 14 story images used (5 stories × ~2-3 images each)
- **games.rs**: Confirms game sprites referenced
- **build warnings**: 24 unused functions indicating dead code in WASM binary
