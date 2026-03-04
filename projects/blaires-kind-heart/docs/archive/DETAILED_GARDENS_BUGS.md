# Gardens Panel Rendering Bugs - Phase 3 Analysis

- Archive Path: `docs/archive/DETAILED_GARDENS_BUGS.md`
- Normalized On: `2026-03-04`
- Source Title: `Gardens Panel Rendering Bugs - Phase 3 Analysis`

## Summary
Gardens panel has **5 critical bugs** preventing proper rendering and interaction:

| Bug | Severity | Category | Impact |
|-----|----------|----------|--------|
| #1 | CRITICAL | Asset Loading | All gardens show broken image |
| #2 | CRITICAL | Stage Display | Wrong stage text (off by 1) |
| #3 | CRITICAL | Asset Mapping | Incorrect asset-to-stage mapping |
| #4 | HIGH | Event Handler | Emoji fallback selector too broad |
| #5 | MEDIUM | CSS Layout | Grid centered but may overflow on iPad |

---

### Bug #1: Missing Garden Assets in Build Output

**Location**: `index.html`, line 29-31
**Severity**: CRITICAL - All gardens show broken image icon

### Problem
Gardens assets directory is NOT included in Trunk build configuration. Assets are copied for icons, illustrations, and game-sprites, but NOT for gardens.

### Evidence
```html
<!-- index.html lines 28-31 -->
<!-- Generated visual assets (Imagen 3 Pro) -->
<link data-trunk rel="copy-dir" href="assets/icons" />
<link data-trunk rel="copy-dir" href="assets/illustrations" />
<link data-trunk rel="copy-dir" href="assets/game-sprites" />
<!-- gardens missing! -->
```

| Bug # | File | Line | Type | Fix Effort |
|-------|------|------|------|-----------|
| 1 | `index.html` | 31 | Build config | 1 line |
| 2 | `gardens.rs` | 447 | Logic | 2 lines |
| 3 | `gardens.rs` | 416 | Logic | 2 lines |
| 4 | `gardens.rs` | 433 | Event handler | 3 lines |
| 5 | `gardens.css` | 14-22 | Optional | 2 lines |

---

## Context
**Status**: Critical blocking issues identified
**Tested on**: Safari 26.2, iPad mini 6
**Last Updated**: 2026-02-10

---

## Actions
_No actions recorded._

## Validation
- Source assets exist: `/assets/gardens/*.webp` (12 gardens × 5 stages = 60 files)
- Example file: `bunny_stage_1.webp` (48 KB) ✓
- Distributed in `/dist/`: NO ✗ (checked dist/assets/ - directory doesn't exist)
- CSS compiled: YES ✓ (`/dist/gardens.css` exists)

### Root Cause
Trunk only copies directories listed in `copy-dir` links. `assets/gardens` was never added to index.html.

### Suggested Fix
Add missing copy-dir directive to index.html (line 31, after game-sprites):

```html
<link data-trunk rel="copy-dir" href="assets/gardens" />
```

### Impact
- All garden card images fail to load (HTTP 404)
- Browser fallback: broken image placeholder
- Emoji fallback triggered (line 433-435): queries `.garden-image-container` but `container` will be the WRONG element

---

### Bug #2: Stage Display Shows "Stage X of 5" Where X > 5

**Location**: `rust/gardens.rs`, line 447
**Severity**: CRITICAL - Wrong user-facing text

### Problem
Growth stage ranges from 0-5 (6 possible values), but display adds 1 to growth_stage without clamping.

### Evidence
```rust
// Line 257-260: Max growth is 5 (checked)
if current_stage >= 5 {
    console::log_1(&format!("[gardens] Garden {} already at max growth", garden_id).into());
    return;
}

// Line 447: Display logic is WRONG
stage_text.set_text_content(Some(&format!("Stage {} of 5", growth_stage + 1)));
```

### Examples
| DB growth_stage | Display Text | Issue |
|-----------------|--------------|-------|
| 0 | "Stage 1 of 5" | ✓ Correct |
| 1 | "Stage 2 of 5" | ✓ Correct |
| 2 | "Stage 3 of 5" | ✓ Correct |
| 3 | "Stage 4 of 5" | ✓ Correct |
| 4 | "Stage 5 of 5" | ✓ Correct |
| 5 | "Stage 6 of 5" | ✗ WRONG (impossible state) |

### Root Cause
DB stores growth_stage as 0-5, but display uses `growth_stage + 1` without validation. Stage 5 is the MAX but shows as "Stage 6 of 5" which is confusing.

### Suggested Fix
Option A (Recommended): Clamp display
```rust
let display_stage = std::cmp::min(growth_stage + 1, 5);
stage_text.set_text_content(Some(&format!("Stage {} of 5", display_stage)));
```

Option B: Use 0-based display (less kid-friendly)
```rust
stage_text.set_text_content(Some(&format!("Stage {} of 5", growth_stage)));
```

---

### Bug #3: Growth Stage to Asset Index Mapping is Wrong

**Location**: `rust/gardens.rs`, lines 411-420
**Severity**: CRITICAL - Shows wrong garden image

### Problem
Mapping from DB stage (0-5) to asset array index (0-4) is INCORRECT. Current code:

```rust
// Line 411-420
let stage_index = if growth_stage == 0 {
    0
} else {
    std::cmp::min((growth_stage - 1) as usize, 4)
};
```

### Mapping Table
| DB Stage | Code Calculates | Should Be | Asset Used | Problem |
|----------|-----------------|-----------|-----------|---------|
| 0 (newly unlocked) | 0 | 0 | stage_1.webp ✓ | OK |
| 1 | 0 | 1 | stage_1.webp ✗ | Wrong! Shows stage 1 not stage 2 |
| 2 | 1 | 2 | stage_2.webp ✗ | Off by one |
| 3 | 2 | 3 | stage_3.webp ✗ | Off by one |
| 4 | 3 | 4 | stage_4.webp ✗ | Off by one |
| 5 | 4 | 5 | stage_5.webp ✓ | OK only for max |

### Why It Fails
The `std::cmp::min((growth_stage - 1), 4)` logic assumes:
- Stage 1 = index 0 (asset[0] = stage_1)
- Stage 5 = index 4 (asset[4] = stage_5)

But DB stores stage 0-5, not 1-5! So:
- Stage 0 → should show stage_1 (index 0) ✓
- Stage 1 → currently shows stage_1 (index 0) but should show stage_2 (index 1) ✗
- Stage 5 → currently shows stage_5 (index 4) ✓

### Root Cause
Mismatch between DB scheme (0-indexed growth stages 0-5) and asset array expectations (1-indexed stages 1-5).

### Suggested Fix
```rust
// Correct: DB stage 0-5 maps directly to asset index 0-4
// Stage 0 = index 0 (stage_1 asset)
// Stage 5 = index 4 (stage_5 asset)
let stage_index = (growth_stage as usize).min(4);

let asset_path = garden.stage_assets.get(stage_index)
    .unwrap_or(&garden.stage_assets[0]);
```

**Why this works**:
- `growth_stage` already ranges 0-5
- `.min(4)` clamps to valid array index
- Maps 0→0, 1→1, 2→2, 3→3, 4→4, 5→4 (clamp to last)

---

### Bug #4: Emoji Fallback Selector is Too Broad

**Location**: `rust/gardens.rs`, lines 433-435
**Severity**: HIGH - Event listener leak, wrong element selected

### Problem
When image fails to load, error handler queries `.garden-image-container` (class selector) instead of the parent-specific element.

```rust
// Line 433-435: WRONG - queries ALL elements with this class
if let Some(container) = dom::query(".garden-image-container") {
    container.set_inner_html(&format!(r#"<div class="garden-emoji-fallback">{}</div>"#, emoji));
}
```

### Issues

**Issue A: Selects FIRST matching element globally**
- Multiple gardens rendered → multiple `.garden-image-container` elements
- When ANY image fails, replaces content in FIRST matching container
- Consequence: All gardens with failed images show emoji for FIRST garden only

**Issue B: Event listener lifetime leak**
- `Closure::once(move || {...})` + `error_closure.forget()`
- Multiple gardens = multiple closures bound to same selector
- No scope isolation per-card

### Example Failure Scenario
1. User has 3 gardens: Bunny, Hug, Share
2. Bunny image loads OK
3. Hug image fails (404 due to bug #1)
4. Error handler fires: `dom::query(".garden-image-container")` → returns Bunny's container (first match)
5. Sets Bunny's content to Hug's emoji
6. Share's container shows nothing (content lost)

### Root Cause
Using global class selector instead of DOM-relative selector or stored reference.

### Suggested Fix
Use `img_container` reference directly:

```rust
// Line 428-439: Scoped to current card
use wasm_bindgen::JsCast;
if let Ok(html_img) = img.clone().dyn_into::<web_sys::HtmlImageElement>() {
    let emoji = garden.theme_emoji.to_string();
    let img_container_clone = img_container.clone();  // Capture reference
    let error_closure = Closure::once(move || {
        img_container_clone.set_inner_html(&format!(r#"<div class="garden-emoji-fallback">{}</div>"#, emoji));
    });
    let _ = html_img.set_onerror(Some(error_closure.as_ref().unchecked_ref()));
    error_closure.forget();
}
```

**Why this works**:
- Each card's closure captures ITS OWN img_container
- No global selector ambiguity
- Emoji fallback isolated to failed image's container

---

### Bug #5: CSS Grid May Overflow on iPad Mini 6

**Location**: `src/styles/gardens.css`, lines 14-22
**Severity**: MEDIUM - Layout issue on landscape iPad

### Problem
Grid uses `max-width: 1200px` with `margin: 0 auto` centering, but iPad mini 6 landscape is 1024px wide. Grid could be narrower than viewport on smaller iPads.

```css
/* Line 14-22 */
.gardens-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  padding: 1rem;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}
```

### Analysis
- iPad mini 6: 1024px landscape (with safe area)
- Grid max-width: 1200px
- `width: 100%` means grid takes full parent width
- On iPad, 1024px < 1200px, so grid expands to viewport ✓

However:
- Cards need minimum 280px + gaps
- Landscape with 2 columns (1024px):
  - 2 × 280px = 560px + 1.5rem gap = ~588px ✓ fits
- But if cards are 300px wide (from render_garden_card line 424):
  - 2 × 300px = 600px + 1.5rem gap = ~644px ✓ still fits (with padding: 1rem)

**Actually OK** on iPad mini, but tight. Could cause layout shift if grid gap increases or card width changes.

### Root Cause
Not a critical bug, but fragile. Width management should be more explicit for iPad.

### Suggested Fix (Optional)
Make grid more responsive:

```css
.gardens-grid {
  display: grid;
  /* Auto-fit respects device width better than auto-fill */
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
  padding: 1rem;
  width: 100%;
  /* No max-width—let grid size naturally per device */
}
```

Or keep current but add landscape breakpoint:

```css
@media (max-width: 768px) {
  .gardens-grid {
    grid-template-columns: 1fr;  /* Single column on narrow screens */
  }
```

---

After fixes, verify:

- [ ] `npm run build` includes `/dist/assets/gardens/*.webp` files
- [ ] Each garden shows correct image (stage 0 → bunny_stage_1.webp, etc.)
- [ ] Stage text reads "Stage 1 of 5" to "Stage 5 of 5" (never "Stage 6 of 5")
- [ ] All 12 gardens render without overlap
- [ ] Emoji fallback only affects failed image (not other gardens)
- [ ] iPad mini 6 landscape: grid renders 2 columns, no overflow
- [ ] Open DevTools → Application → Console: no "Grid element not found" errors

---

### Related Components

- **Database**: `/public/db-worker.js` line 253-260 (gardens table schema ✓)
- **Module**: `/rust/lib.rs` line 133 (gardens::init() called ✓)
- **Panel HTML**: `/index.html` line 224-231 (structure correct ✓)
- **Init function**: `/rust/gardens.rs` line 182-212 (setup code review below)

### Init Function Review
```rust
// Line 182-212: gardens::init()
pub fn init() {
    console::log_1(&"[gardens] Module initialized".into());

    // Navigation API listener for panel open
    // Calls populate_gardens_grid() when panel becomes visible
    // ISSUE: Only populates on navigate event, not on initial panel-open
}
```

**Minor issue**: Gardens grid only populates when Navigation API fires "navigate" event. On first open, grid may be empty until navigation occurs. Should also trigger on initial panel visibility.

---

### Recommendations

**Priority 1 (CRITICAL)**: Fix bugs #1-3 before next test
- Bug #1: One-line fix with major impact
- Bug #2: Display correctness for 4.5-year-old user
- Bug #3: Asset mapping is core feature

**Priority 2 (HIGH)**: Fix bug #4
- Prevents emoji fallback regression
- Clean up event handlers

**Priority 3 (OPTIONAL)**: Bug #5 + init optimization
- CSS is working but could be cleaner
- init() function doesn't populate on first open

---

### Files to Modify

1. **index.html** - Add gardens assets to Trunk build
2. **rust/gardens.rs** - Fix stage logic and event handlers
3. **src/styles/gardens.css** - Optional: improve responsive behavior

## References
_No references recorded._

