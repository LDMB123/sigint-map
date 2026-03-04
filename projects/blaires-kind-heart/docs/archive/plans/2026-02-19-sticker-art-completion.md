# Wave 6: Sticker Art Completion Implementation Plan

- Archive Path: `docs/archive/plans/2026-02-19-sticker-art-completion.md`
- Normalized On: `2026-03-04`
- Source Title: `Wave 6: Sticker Art Completion Implementation Plan`

## Summary
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Context
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Generate 22 missing sticker illustrations via Imagen 3 and wire them into the rewards panel, making every sticker fully illustrated.

**Architecture:** Node.js batch script (adapted from `scripts/generate-story-illustrations.js`) generates 22 PNG sticker images via Gemini 3 Pro Image Preview / Vertex AI. Then update `rewards.rs` image fields and SW precache list.

**Tech Stack:** Node.js script, Imagen 3 via `imagen-experiments/scripts/experiments/nanobanana-direct.js`, Rust (rewards.rs field updates), Service Worker precache.

---

### Task 1: Create sticker illustration generation script

**Files:**
- Create: `scripts/generate-sticker-illustrations.js`

**Step 1: Create the generation script**

Adapt `scripts/generate-story-illustrations.js` for sticker images. Key differences:
- Output dir: `assets/illustrations/stickers/`
- Image size: `512x512` (not 1K)
- Aspect ratio: `1:1` (not 4:3)
- Style prefix: `"Cute watercolor sticker illustration, soft pastel palette, circular shape, white outline border, kid-friendly, no text"`

The script must define all 22 stickers with their filenames and prompts:

```javascript
const STICKERS = [
  // Celebration
  { filename: 'confetti-ball.png', prompt: 'colorful confetti ball bursting with rainbow sparkles and streamers' },
  { filename: 'tanabata-tree.png', prompt: 'decorated wish tree with colorful paper strips and ribbons hanging from branches' },
  // Star/Heart
  { filename: 'glowing-star.png', prompt: 'bright golden star with warm glow rays radiating outward' },
  { filename: 'heart-ribbon.png', prompt: 'purple heart wrapped in a pink ribbon bow' },
  // Nature
  { filename: 'bird.png', prompt: 'cute small bluebird singing with music notes floating around' },
  { filename: 'sunshine.png', prompt: 'happy warm sun with gentle golden rays' },
  { filename: 'tulip.png', prompt: 'pink tulip flower in full bloom with green stem' },
  // Achievement
  { filename: 'garden-hero.png', prompt: 'sunflower wearing a tiny golden trophy crown, garden champion' },
  { filename: 'kindness-champion.png', prompt: 'glowing star with a small golden trophy, kindness award badge' },
  { filename: 'super-helper.png', prompt: 'purple heart with a gold star overlay, helper badge' },
  // Bronze Mastery
  { filename: 'mastery-bronze-sharing.png', prompt: 'bronze medal with two small hands sharing a gift, warm copper tones' },
  { filename: 'mastery-bronze-helping.png', prompt: 'bronze medal with two small hands reaching out to help, warm copper tones' },
  { filename: 'mastery-bronze-hug.png', prompt: 'bronze medal with two small arms hugging a heart, warm copper tones' },
  { filename: 'mastery-bronze-love.png', prompt: 'bronze medal with a glowing pink heart, warm copper tones' },
  // Silver Mastery
  { filename: 'mastery-silver-sharing.png', prompt: 'silver medal with two small hands sharing a gift, cool silver and white tones' },
  { filename: 'mastery-silver-helping.png', prompt: 'silver medal with two small hands reaching out to help, cool silver and white tones' },
  { filename: 'mastery-silver-hug.png', prompt: 'silver medal with two small arms hugging a heart, cool silver and white tones' },
  { filename: 'mastery-silver-love.png', prompt: 'silver medal with a glowing pink heart, cool silver and white tones' },
  // Gold Mastery
  { filename: 'mastery-gold-sharing.png', prompt: 'golden trophy with two small hands sharing a gift, rich gold and amber tones' },
  { filename: 'mastery-gold-helping.png', prompt: 'golden trophy with two small hands reaching out to help, rich gold and amber tones' },
  { filename: 'mastery-gold-hug.png', prompt: 'golden trophy with two small arms hugging a heart, rich gold and amber tones' },
  { filename: 'mastery-gold-love.png', prompt: 'golden trophy with a glowing pink heart, rich gold and amber tones' },
];
```

Use `imageSize: '512'` and `aspectRatio: '1:1'` in the `generateImage()` call. Same retry/backoff/skip-if-exists logic as the story script.

**Step 2: Commit the script**

```bash
git add scripts/generate-sticker-illustrations.js
git commit -m "feat: add sticker illustration generation script (22 images)"
```

---

### Task 2: Run the generation script

**Files:**
- Output: `assets/illustrations/stickers/` (22 new PNG files)

**Step 1: Run the script in background**

```bash
node scripts/generate-sticker-illustrations.js
```

Expected runtime: ~24 minutes (22 images × 65s delay). Script prints progress per image. If rate-limited, it retries automatically (3 attempts with exponential backoff).

**Step 2: Verify all 22 files were created**

```bash
for f in confetti-ball tanabata-tree glowing-star heart-ribbon bird sunshine tulip garden-hero kindness-champion super-helper mastery-bronze-sharing mastery-bronze-helping mastery-bronze-hug mastery-bronze-love mastery-silver-sharing mastery-silver-helping mastery-silver-hug mastery-silver-love mastery-gold-sharing mastery-gold-helping mastery-gold-hug mastery-gold-love; do
  ls -la assets/illustrations/stickers/${f}.png 2>/dev/null || echo "MISSING: ${f}.png"
done
```

Expected: All 22 files exist, sizes between 50KB-2MB each.

**Step 3: If any are missing, re-run the script** (skip-if-exists makes it safe)

**Step 4: Commit the images**

```bash
git add assets/illustrations/stickers/
git commit -m "feat: generate 22 Imagen sticker illustrations"
```

---

### Task 3: Update rewards.rs with image paths

**Files:**
- Modify: `rust/rewards.rs` (line 3 — the `STICKER_DESIGNS` array)

**Step 1: Update all 22 `image: None` entries to `image: Some(...)`**

The mapping is:

| Sticker Name | Filename |
|---|---|
| Confetti Ball | `./illustrations/stickers/confetti-ball.png` |
| Tanabata Tree | `./illustrations/stickers/tanabata-tree.png` |
| Glowing Star | `./illustrations/stickers/glowing-star.png` |
| Heart Ribbon | `./illustrations/stickers/heart-ribbon.png` |
| Bird | `./illustrations/stickers/bird.png` |
| Sunshine | `./illustrations/stickers/sunshine.png` |
| Tulip | `./illustrations/stickers/tulip.png` |
| Garden Hero | `./illustrations/stickers/garden-hero.png` |
| Kindness Champion | `./illustrations/stickers/kindness-champion.png` |
| Super Helper | `./illustrations/stickers/super-helper.png` |
| Bronze Sharing Master | `./illustrations/stickers/mastery-bronze-sharing.png` |
| Bronze Helping Master | `./illustrations/stickers/mastery-bronze-helping.png` |
| Bronze Hug Master | `./illustrations/stickers/mastery-bronze-hug.png` |
| Bronze Love Master | `./illustrations/stickers/mastery-bronze-love.png` |
| Silver Sharing Expert | `./illustrations/stickers/mastery-silver-sharing.png` |
| Silver Helping Expert | `./illustrations/stickers/mastery-silver-helping.png` |
| Silver Hug Expert | `./illustrations/stickers/mastery-silver-hug.png` |
| Silver Love Expert | `./illustrations/stickers/mastery-silver-love.png` |
| Gold Sharing Champion | `./illustrations/stickers/mastery-gold-sharing.png` |
| Gold Helping Champion | `./illustrations/stickers/mastery-gold-helping.png` |
| Gold Hug Champion | `./illustrations/stickers/mastery-gold-hug.png` |
| Gold Love Champion | `./illustrations/stickers/mastery-gold-love.png` |

Each change is:
```rust
// Before:
StickerDesign { emoji: "🎊", name: "Confetti Ball", image: None },
// After:
StickerDesign { emoji: "🎊", name: "Confetti Ball", image: Some("./illustrations/stickers/confetti-ball.png") },
```

**Step 2: Verify build passes**

```bash
cargo build --release --target wasm32-unknown-unknown
```

Expected: 0 errors, 0 warnings relevant to rewards.rs.

**Step 3: Verify no `image: None` entries remain**

```bash
grep 'image: None' rust/rewards.rs
```

Expected: No matches (all 45 stickers now have images).

**Step 4: Commit**

```bash
git add rust/rewards.rs
git commit -m "feat: wire 22 sticker illustrations into rewards.rs"
```

---

### Task 4: Update SW precache and bump cache version

**Files:**
- Modify: `public/sw-assets.js` (add 22 sticker paths to DEFERRED_ASSETS)
- Modify: `public/sw.js` (bump CACHE_NAME to v9)

**Step 1: Add 22 new sticker paths to DEFERRED_ASSETS in `sw-assets.js`**

Add these lines after the existing sticker entries (after `'/illustrations/stickers/unicorn-queen.png'`):

```javascript
  // Wave 6: Sticker art completion (22 new illustrations):
  '/illustrations/stickers/confetti-ball.png',
  '/illustrations/stickers/tanabata-tree.png',
  '/illustrations/stickers/glowing-star.png',
  '/illustrations/stickers/heart-ribbon.png',
  '/illustrations/stickers/bird.png',
  '/illustrations/stickers/sunshine.png',
  '/illustrations/stickers/tulip.png',
  '/illustrations/stickers/garden-hero.png',
  '/illustrations/stickers/kindness-champion.png',
  '/illustrations/stickers/super-helper.png',
  '/illustrations/stickers/mastery-bronze-sharing.png',
  '/illustrations/stickers/mastery-bronze-helping.png',
  '/illustrations/stickers/mastery-bronze-hug.png',
  '/illustrations/stickers/mastery-bronze-love.png',
  '/illustrations/stickers/mastery-silver-sharing.png',
  '/illustrations/stickers/mastery-silver-helping.png',
  '/illustrations/stickers/mastery-silver-hug.png',
  '/illustrations/stickers/mastery-silver-love.png',
  '/illustrations/stickers/mastery-gold-sharing.png',
  '/illustrations/stickers/mastery-gold-helping.png',
  '/illustrations/stickers/mastery-gold-hug.png',
  '/illustrations/stickers/mastery-gold-love.png',
```

**Step 2: Bump CACHE_NAME in `sw.js`**

```javascript
// Before:
const CACHE_NAME = 'kindheart-v8'; // Wave 5: family board, garden timeline, sparkle mail, UX polish
// After:
const CACHE_NAME = 'kindheart-v9'; // Wave 6: sticker art completion (22 illustrations)
```

**Step 3: Verify release build passes**

```bash
git checkout -- public/asset-manifest.js public/asset-manifest.json
trunk build --release
```

Expected: Build succeeds with 0 errors.

**Step 4: Commit**

```bash
git add public/sw-assets.js public/sw.js
git commit -m "feat: add 22 sticker illustrations to SW precache, bump to v9"
```

---

## Actions
_No actions recorded._

## Validation
**Step 1: Run full release build**

```bash
cargo build --release --target wasm32-unknown-unknown
```

Expected: 0 errors.

**Step 2: Verify all 45 stickers have images**

```bash
grep -c 'image: Some' rust/rewards.rs
```

Expected: 45

```bash
grep -c 'image: None' rust/rewards.rs
```

Expected: 0

**Step 3: Verify all 22 new files are on disk**

```bash
ls assets/illustrations/stickers/ | wc -l
```

Expected: 45 files total (23 existing + 22 new).

**Step 4: Request code review via `superpowers:requesting-code-review`**

Review should verify:
- All 22 image paths in `rewards.rs` match actual filenames on disk
- All 22 paths added to `sw-assets.js` DEFERRED_ASSETS
- SW cache bumped to v9
- No orphan files (every file on disk is referenced in code)
- Build passes

**Step 5: Apply any review fixes and commit**

## References
_No references recorded._

