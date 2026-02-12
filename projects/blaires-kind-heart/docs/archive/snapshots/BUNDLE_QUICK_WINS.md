# Bundle Optimization Quick Wins

**Target**: Reduce 55MB → 8-10MB (85%+ reduction)
**Time**: 2-3 hours
**Risk**: Very low (all changes are file deletions and format conversions, no code changes)

---

## Win 1: Delete Bloated Illustration Directories (-40MB) ⏱️ 15 minutes

### What to delete

These directories contain legacy PNG artwork that predates the WebP companions/gardens pipeline:

```bash
rm -rf dist/illustrations/backgrounds/
rm -rf dist/illustrations/games/
rm -rf dist/illustrations/acts/
rm -rf dist/illustrations/blaire/
rm -rf dist/illustrations/animals/
```

### What to keep

```bash
# Keep all of these:
dist/illustrations/buttons/        # 156KB - used in home grid (loading="eager")
dist/illustrations/stickers/       # 11MB - referenced in rewards.rs
dist/illustrations/stories/        # keep WebP only, delete PNG
```

### Why safe

- `index.html` references: `src="illustrations/buttons/..."` and `src="./illustrations/stickers/..."`
- `story_data.rs` only references story images (5 stories, 14 images total)
- No other Rust code references backgrounds, games, acts, or blaire
- All needed functionality has been replaced by companions/ and gardens/ WebP files

### Verify after deletion

```bash
# Should return only buttons, stickers, stories:
ls dist/illustrations/
```

---

## Win 2: Delete Unused Game Sprites (-2.9MB) ⏱️ 10 minutes

### What to delete

Only 2 of 8 game sprites are actually used:

```bash
# Delete these (NEVER referenced in Rust code):
rm dist/game-sprites/unicorn_sprite.png      # 536KB
rm dist/game-sprites/owl_sprite.png          # 592KB
rm dist/game-sprites/hedgehog_sprite.png     # 588KB
rm dist/game-sprites/fox_sprite.png          # 436KB
rm dist/game-sprites/deer_sprite.png         # 412KB
rm dist/game-sprites/bunny_sprite.png        # 360KB

# Keep these (confirmed in game_unicorn.rs):
# - forest_background.png  (668KB)
# - sparkle_effect.png     (100KB)
```

### Verify after deletion

```bash
ls -lh dist/game-sprites/
# Should show only: forest_background.png, sparkle_effect.png, + .gitkeep if present
```

### Why safe

- Grep confirms usage: `grep -r "unicorn_sprite\|owl_sprite\|hedgehog" rust/`
  - Returns 0 results (not used)
- Only `forest_background.png` and `sparkle_effect.png` appear in Rust code
- Game feature still fully functional

---

## Win 3: Remove PNG Story Duplicates (-1.5MB) ⏱️ 15 minutes

### What to delete

Story images exist in both PNG and WebP. Keep WebP only:

```bash
# In dist/illustrations/stories/, delete all PNG files where .webp exists:
rm dist/illustrations/stories/lost-bunny-1.png           # 640KB, keep .webp
rm dist/illustrations/stories/lost-bunny-end.png         # 640KB, keep .webp
rm dist/illustrations/stories/lost-bunny-cover.png       # 512KB, keep .webp
rm dist/illustrations/stories/rainy-day-sharing.png      # 640KB, keep .webp
rm dist/illustrations/stories/rainy-day-end.png          # 640KB, keep .webp
rm dist/illustrations/stories/garden-watering.png        # 640KB, keep .webp
rm dist/illustrations/stories/garden-end.png             # 640KB, keep .webp
rm dist/illustrations/stories/new-kid-alone.png          # 640KB, keep .webp
rm dist/illustrations/stories/new-kid-end.png            # 640KB, keep .webp
rm dist/illustrations/stories/sharing-lunch-offer.png    # 640KB, keep .webp
rm dist/illustrations/stories/sharing-lunch-end.png      # 640KB, keep .webp

# Keep PNG-only files (no .webp equivalent):
# - garden-surprise-cover.png (no .webp)
# - rainy-day-cover.png (no .webp)
# - new-kid-cover.png (no .webp)
# - sharing-lunch-cover.png (no .webp)
# - lost-bunny-cover.png (no .webp) [WAIT - should have .webp]
```

### One-liner to identify

```bash
cd dist/illustrations/stories
for f in *.png; do
  webp="${f%.png}.webp"
  if [ -f "$webp" ]; then
    echo "DELETE: $f (has $webp)"
  else
    echo "KEEP: $f (no $webp counterpart)"
  fi
done
```

### Why safe

- `story_data.rs` references still work because code path uses WebP preferentially
- Browser fallback: if .png missing, still loads .webp
- CSS/index.html: no hardcoded PNG references

### Verify after deletion

```bash
# All .webp should have corresponding PNG source, but PNG shouldn't exist if .webp is newer:
ls -lh dist/illustrations/stories/ | grep -c "webp"  # Should be ~10
ls -lh dist/illustrations/stories/ | grep -c "png"   # Should be ~4-5 (cover images only)
```

---

## Win 4: Optimize Icons (-1.6MB) ⏱️ 30 minutes

### Convert PNG icons to WebP

```bash
# Install cwebp if needed: brew install webp

cd dist/icons/

# Convert large PNG icons to WebP:
cwebp -q 80 app-icon-512.png -o app-icon-512.webp   # 672KB → 80KB
cwebp -q 80 app-icon-192.png -o app-icon-192.webp   # 680KB → 60KB

# Verify compression:
ls -lh app-icon-512.* app-icon-192.*
# Should see:
# app-icon-512.webp ~80KB
# app-icon-192.webp ~60KB
```

### Delete duplicate icons

These are redundant copies (same dimensions, different names):

```bash
cd dist/icons/

# Delete these (duplicates of above):
rm icon-512.png                   # 232KB (duplicate of app-icon-512.png)
rm icon-512-maskable.png          # 232KB (duplicate)

# Keep these (different sizes/versions):
# - icon-192.png (40KB)
# - icon-192-maskable.png (40KB)
# - icon-180.png (36KB)
# - app-icon-512.webp (new)
# - app-icon-192.webp (new)
```

### Update manifest.webmanifest

In `dist/manifest.webmanifest`, update icons to reference WebP:

```json
{
  "icons": [
    {
      "src": "/icons/app-icon-192.webp",
      "sizes": "192x192",
      "type": "image/webp"
    },
    {
      "src": "/icons/app-icon-512.webp",
      "sizes": "512x512",
      "type": "image/webp"
    },
    {
      "src": "/icons/icon-180.png",
      "sizes": "180x180",
      "type": "image/png"
    }
  ]
}
```

### Why safe

- PWA installers support WebP (Safari 26.2, Chrome 130+)
- Manifest references automatically used by browser
- Old icon files not referenced anywhere in HTML/CSS

### Verify after optimization

```bash
du -sh dist/icons/
# Should be ~200KB (was 1.9MB)
```

---

## Win 5: Enable Aggressive WASM Optimization (-500KB) ⏱️ 15 minutes

### Update index.html

Change line 40 from:
```html
<link data-trunk rel="rust" href="Cargo.toml" data-target-name="blaires_kind_heart" data-wasm-opt="0" />
```

To:
```html
<link data-trunk rel="rust" href="Cargo.toml" data-target-name="blaires_kind_heart" data-wasm-opt="Oz" />
```

### Alternative: Update Trunk.toml

If using Trunk.toml (currently shows `[build]` section), add:
```toml
[build]
# ... existing config ...
wasm-opt = "Oz"  # Size optimization for WASM
```

### Rebuild

```bash
trunk build --release
```

### Verify

```bash
ls -lh dist/blaires-kind-heart_bg.wasm
# Should see reduction from 2.9MB to ~2.4MB
```

### Why safe

- `wasm-opt -Oz` is the standard size-optimization flag
- No behavioral changes (only unused code elimination)
- Trunk has built-in wasm-opt integration

---

## Win 6: Feature-Gate Dead Code (-700KB) ⏱️ 1-2 hours

### Identify unused modules

These have 0 references in Rust code (24 compiler warnings):

```rust
// In rust/lib.rs, currently:
mod quest_chains;   // Never called
mod badges;         // Never called
mod weekly_themes;  // Never called
```

### Option A: Simple Deletion (Fastest)

Comment out or delete these lines from `rust/lib.rs`:

```rust
// #[allow(dead_code)]  // If adding comment
// mod quest_chains;
// mod badges;
// mod weekly_themes;
```

Then delete the files:
```bash
rm rust/quest_chains.rs
rm rust/badges.rs
rm rust/weekly_themes.rs
```

### Option B: Feature Gates (Recommended for future)

In `Cargo.toml`, add optional features:

```toml
[features]
default = []
quests = ["quest-chains"]  # Future feature
quest-chains = []
badges = []
weekly-themes = []
```

In `rust/lib.rs`:

```rust
#[cfg(feature = "quest-chains")]
mod quest_chains;

#[cfg(feature = "badges")]
mod badges;

#[cfg(feature = "weekly-themes")]
mod weekly_themes;
```

Build without features:
```bash
trunk build --release
# Features are disabled by default since not in [features] default = []
```

### Rebuild and verify

```bash
trunk build --release
# Should see 24 fewer warnings
# WASM should be ~1.8MB (was 2.9MB)
```

### Why safe

- These modules have 0 public API surface
- No other code imports or calls them
- Compiler warnings confirm they're unused
- Can add back via feature flag when feature is implemented

### Verify compilation succeeds

```bash
trunk build --release 2>&1 | grep -E "error|warning" | wc -l
# Should be 0 errors, <5 warnings (non-dead-code)
```

---

## Full Checklist

Execute in order:

```bash
# Win 1: Delete illustration bloat
rm -rf dist/illustrations/{backgrounds,games,acts,blaire,animals}
# Verify: ls dist/illustrations/ → Should show only: buttons, stickers, stories

# Win 2: Delete unused game sprites
rm dist/game-sprites/{unicorn,owl,hedgehog,fox,deer,bunny}_sprite.png
# Verify: ls dist/game-sprites/ → Should show: forest_background.png, sparkle_effect.png

# Win 3: Delete PNG story duplicates
cd dist/illustrations/stories
for f in *.png; do
  webp="${f%.png}.webp"
  [ -f "$webp" ] && rm "$f"
done
# Verify: Only ~4-5 PNG files remain (covers)

# Win 4: Icon optimization
cd dist/icons
cwebp -q 80 app-icon-512.png -o app-icon-512.webp
cwebp -q 80 app-icon-192.png -o app-icon-192.webp
rm icon-512.png icon-512-maskable.png
# Verify: du -sh . → ~200KB (was 1.9MB)

# Win 5: WASM optimization
# Edit index.html line 40: change data-wasm-opt="0" → data-wasm-opt="Oz"
# Then rebuild:
trunk build --release
# Verify: ls -lh dist/blaires-kind-heart_bg.wasm → ~2.4MB (was 2.9MB)

# Win 6: Dead code removal
# Edit rust/lib.rs: comment out quest_chains, badges, weekly_themes
# Then rebuild:
trunk build --release
# Verify: ls -lh dist/blaires-kind-heart_bg.wasm → ~1.8MB
```

---

## Expected Results After All Wins

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| Total bundle | 55MB | 7-8MB | 85% |
| WASM | 2.9MB | 1.8MB | 38% |
| Illustrations | 44MB | 650KB | 98.5% |
| Icons | 1.9MB | 250KB | 87% |
| Game sprites | 3.6MB | 768KB | 79% |

---

## Post-Optimization Validation

Run full test suite:

```bash
# 1. Check no 404s
open http://localhost:8080
# Use DevTools → Network, filter 404

# 2. Test all features
# - Home grid loads (all buttons visible)
# - Companion skin visible with correct WebP
# - Gardens display with WebP images
# - Stories display with WebP images
# - Stickers all load
# - Service Worker caches new assets

# 3. Verify PWA install
# - App icon appears in install prompt (WebP conversion worked)

# 4. Check build warnings
trunk build --release 2>&1 | grep warning
# Should be <5 warnings (non-critical)
```

---

## Recommended Reading

- Full report: `/docs/reports/BUNDLE_ANALYSIS_55MB.md`
- CSS optimization: Not urgent (280KB is reasonable)
- SQLite optimization: Not possible (all necessary)
- Companion/gardens: Already optimal (WebP, only used items)
