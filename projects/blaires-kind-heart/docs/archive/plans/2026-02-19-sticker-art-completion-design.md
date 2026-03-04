# Wave 6: Sticker Art Completion — Blaire's Kind Heart

- Archive Path: `docs/archive/plans/2026-02-19-sticker-art-completion-design.md`
- Normalized On: `2026-03-04`
- Source Title: `Wave 6: Sticker Art Completion — Blaire's Kind Heart`

## Summary
Sticker art completion wave for a Rust/WASM kindness-tracker PWA built for Blaire (age 4). iPad mini 6, Safari 26.2, fully offline.

## Context
Sticker art completion wave for a Rust/WASM kindness-tracker PWA built for Blaire (age 4). iPad mini 6, Safari 26.2, fully offline.

**Waves 1-5 complete:** 78 Rust modules, 5 games, 15 illustrated stories, companion system, 12 gardens, family board, garden timeline, sparkle mail, 116 Imagen illustrations. 3.3MB WASM binary. SW cache v8.

**Design north star:** Complete the rewards panel so every sticker has a proper illustration. No new features.

**Approach chosen:** Scripted batch generation — same pipeline as Wave 5 story illustrations.

---

### Current State

- 45 total stickers in `STICKER_DESIGNS` array (`rewards.rs`)
- 23 stickers have illustrations on disk (`assets/illustrations/stickers/`)
- 22 stickers use emoji fallback (`image: None`)

### Stickers With Art (23)

Rainbow Unicorn, Sparkle Unicorn, Magic Unicorn, Star Unicorn, Purple Unicorn, Red Balloon, Double Balloon, Party Popper, Purple Heart, Gold Star, Sparkling Heart, Bunny, Puppy, Kitty, Butterfly, Sunflower, Rainbow, Cherry Blossom, 3 Day Fire, 7 Day Gem, 14 Day Crown, 30 Day Trophy, Unicorn Queen

### Stickers Needing Art (22)

**Celebration (2):**
1. Confetti Ball
2. Tanabata Tree

**Star/Heart (2):**
3. Glowing Star
4. Heart Ribbon

**Nature (3):**
5. Bird
6. Sunshine
7. Tulip

**Achievement (3):**
8. Garden Hero
9. Kindness Champion
10. Super Helper

**Bronze Mastery (4):**
11. Bronze Sharing Master
12. Bronze Helping Master
13. Bronze Hug Master
14. Bronze Love Master

**Silver Mastery (4):**
15. Silver Sharing Expert
16. Silver Helping Expert
17. Silver Hug Expert
18. Silver Love Expert

**Gold Mastery (4):**
19. Gold Sharing Champion
20. Gold Helping Champion
21. Gold Hug Champion
22. Gold Love Champion

---

### Image Specs

- **Size:** 512×512px (sticker cells are small — no need for 1K)
- **Format:** PNG (matching existing sticker assets)
- **Style prefix:** "Cute watercolor sticker illustration, soft pastel palette, circular shape, white outline border, kid-friendly"
- **Output:** `assets/illustrations/stickers/<filename>.png`

---

### Prompt Designs

### Unique Stickers (10)

| # | Filename | Prompt suffix |
|---|----------|--------------|
| 1 | confetti-ball.png | colorful confetti ball bursting with rainbow sparkles and streamers |
| 2 | tanabata-tree.png | decorated wish tree with colorful paper strips and ribbons hanging from branches |
| 3 | glowing-star.png | bright golden star with warm glow rays radiating outward |
| 4 | heart-ribbon.png | purple heart wrapped in a pink ribbon bow |
| 5 | bird.png | cute small bluebird singing with music notes floating around |
| 6 | sunshine.png | happy warm sun with gentle golden rays |
| 7 | tulip.png | pink tulip flower in full bloom with green stem |
| 8 | garden-hero.png | sunflower wearing a tiny golden trophy crown, garden champion |
| 9 | kindness-champion.png | glowing star with a small golden trophy, kindness award badge |
| 10 | super-helper.png | purple heart with a gold star overlay, helper badge |

### Bronze Mastery (4)

Bronze medal style — warm bronze/copper tones with skill symbol.

| # | Filename | Prompt suffix |
|---|----------|--------------|
| 11 | mastery-bronze-sharing.png | bronze medal with two small hands sharing a gift, warm copper tones |
| 12 | mastery-bronze-helping.png | bronze medal with two small hands reaching out to help, warm copper tones |
| 13 | mastery-bronze-hug.png | bronze medal with two small arms hugging a heart, warm copper tones |
| 14 | mastery-bronze-love.png | bronze medal with a glowing pink heart, warm copper tones |

### Silver Mastery (4)

Silver medal style — cool silver/white tones with skill symbol.

| # | Filename | Prompt suffix |
|---|----------|--------------|
| 15 | mastery-silver-sharing.png | silver medal with two small hands sharing a gift, cool silver and white tones |
| 16 | mastery-silver-helping.png | silver medal with two small hands reaching out to help, cool silver and white tones |
| 17 | mastery-silver-hug.png | silver medal with two small arms hugging a heart, cool silver and white tones |
| 18 | mastery-silver-love.png | silver medal with a glowing pink heart, cool silver and white tones |

### Gold Mastery (4)

Gold trophy style — rich gold/amber tones with skill symbol.

| # | Filename | Prompt suffix |
|---|----------|--------------|
| 19 | mastery-gold-sharing.png | golden trophy with two small hands sharing a gift, rich gold and amber tones |
| 20 | mastery-gold-helping.png | golden trophy with two small hands reaching out to help, rich gold and amber tones |
| 21 | mastery-gold-hug.png | golden trophy with two small arms hugging a heart, rich gold and amber tones |
| 22 | mastery-gold-love.png | golden trophy with a glowing pink heart, rich gold and amber tones |

---

## Actions
### `rewards.rs`

Update 22 `image: None` fields to `image: Some("./illustrations/stickers/<filename>.png")`.

### `public/sw-assets.js`

Add 22 new paths to `DEFERRED_ASSETS` array.

### `public/sw.js`

Bump `CACHE_NAME` from `'kindheart-v8'` to `'kindheart-v9'`.

---

### Script

- Reuse/adapt `scripts/generate-story-illustrations.js` pipeline
- Imagen 3 via `google-mcp-server` / Vertex AI
- Skip-if-exists for idempotent reruns
- Retry on 429 (3 attempts with exponential backoff)
- 65s delay between API calls
- Estimated runtime: ~24 minutes for 22 images

---

### Critical Files

| File | Changes |
|------|---------|
| `scripts/generate-sticker-illustrations.js` | NEW — batch generation script |
| `rust/rewards.rs` | Update 22 `image: None` → `image: Some(...)` |
| `public/sw-assets.js` | Add 22 sticker paths to DEFERRED_ASSETS |
| `public/sw.js` | Bump cache to v9 |
| `assets/illustrations/stickers/` | 22 new PNG files |

---

### Constraints

- Same Imagen 3 API pipeline as Wave 5
- PNG format, 512×512px
- Matching existing sticker art style (watercolor, pastel, circular)
- All precached offline via service worker
- No new Rust modules — only `rewards.rs` field updates

## Validation
_Validation details not recorded._

## References
_No references recorded._

