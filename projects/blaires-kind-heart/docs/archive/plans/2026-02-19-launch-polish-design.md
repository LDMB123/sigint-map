# Wave 5: Launch Polish — Blaire's Kind Heart

- Archive Path: `docs/archive/plans/2026-02-19-launch-polish-design.md`
- Normalized On: `2026-03-04`
- Source Title: `Wave 5: Launch Polish — Blaire's Kind Heart`

## Summary
Pre-launch polish wave for a Rust/WASM kindness-tracker PWA built for Blaire (age 4). iPad mini 6, Safari 26.2, fully offline.

## Context
Pre-launch polish wave for a Rust/WASM kindness-tracker PWA built for Blaire (age 4). iPad mini 6, Safari 26.2, fully offline.

**Waves 1-4 complete:** 62 Rust modules (1,877 lines), 5 games, 15 stories, companion system (6 skins × 3 expressions, conversations, time awareness, session wind-down), 6 gardens (60 WebP stages), celebration system, karaoke engine, game music, daily kindness card, achievements, code hardening. 86 Imagen illustrations.

**Design north star:** Complete what exists to launch quality. Polish beats scope.

**Approach chosen:** "Launch Polish" — story illustrations, family board, garden timeline, sparkle mail, UX polish. No new games or treehouse this wave.

---

### Section 1: Story Illustration Generation

**Goal:** Give the 10 emoji-only stories full Imagen illustrations.

**Current state:** 5 of 15 stories have cover + interior images (lost-bunny, rainy-day, garden-surprise, new-kid, sharing-lunch). The remaining 10 use emoji fallbacks.

**Stories needing art:**
1. unicorn-forest (4 pages)
2. lonely-dragon (4 pages)
3. fairy-village (4 pages)
4. sibling-adventure (4 pages)
5. grandpa-day (4 pages)
6. new-neighbor (4 pages)
7. lost-puppy (4 pages)
8. library-helper (4 pages)
9. park-cleanup (4 pages)
10. birthday-surprise (4 pages)

**Scope:** ~30-40 images total (1 cover + 1-2 interior per story)

**Implementation:**
- Generate via `google-mcp-server` Imagen 3 pipeline
- Match existing art style in `illustrations/stories/`
- Output to `assets/illustrations/stories/<story-id>-<desc>.png`
- Update `story_data.rs` — fill `illustration_image: Some(...)` fields
- Add to SW precache list in `public/sw.js`
- No Rust logic changes — existing rendering handles `Option<&str>` image fields

---

### Section 2: Family Kindness Board

**Goal:** Blaire logs kind acts she sees family members do. Deepens "family connection" parent goal.

### Architecture

- **New module:** `rust/family_board.rs`
- **New DB table:** `family_acts (id TEXT, member TEXT, category TEXT, created_at INTEGER, day_key TEXT)`
- **DB migration:** Add via `db-worker.js` schema init
- **Register:** `mod family_board;` in `lib.rs`, call `family_board::init()` during boot

### Members

7 preset family members, each with emoji avatar:
- 👩 Mommy
- 👨 Daddy
- 👦 Brother
- 👧 Sister
- 👵 Grandma
- 👴 Grandpa
- 🧑‍🤝‍🧑 Friend

### UI Flow

1. Small "Family" button on tracker panel (below Blaire's 4 act buttons)
2. Tap → slide out family member grid (7 emoji buttons, 3.5rem each)
3. Tap member → show same 4 kindness categories (Hug, Sharing, Helping, Love)
4. Tap category → log act, mini celebration
5. Sparkle says "Mommy gave a hug! That's so kind!"
6. No hearts earned (hearts are Blaire's own acts only)
7. Auto-dismiss after 5s if no selection

### Integration

- `progress.rs` Mom's View: show family act counts per week
- `parent_insights.rs`: include family act data in weekly insights
- Reuse: `render::create_button()`, `dom::on()`, `synth_audio::sparkle()`, `speech::speak()`

### CSS

- Add `.family-board` styles to `src/styles/tracker.css`
- Grid layout for members, reuse existing button patterns
- Slide-in animation for member grid

---

### Section 3: Visual Garden Timeline

**Goal:** Scrollable horizontal strip showing daily garden growth over time.

### Architecture

- **New module:** `rust/garden_timeline.rs`
- **No new DB tables** — queries existing `kind_acts` grouped by `day_key`
- **Register:** `mod garden_timeline;` in `lib.rs`

### Data

```sql
SELECT day_key, COUNT(*) as act_count FROM kind_acts GROUP BY day_key ORDER BY day_key DESC LIMIT 30
```

### Rendering

- Horizontal scroll strip on progress panel (below garden grid)
- Last 30 days, scrollable with CSS snap
- Each day tile shows:
  - Abbreviated day label (Mon, Tue...)
  - Growth emoji scaled by act count:
    - 0 acts: 🌱 (seed)
    - 1-2 acts: 🌿 (sprout)
    - 3-4 acts: 🌻 (flower)
    - 5+ acts: 🌸🌺🌷 (blooming garden)
- Tap a day → tooltip bubble "3 kind acts on Tuesday!"
- Today highlighted with accent border

### CSS

```css
.garden-timeline {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: 0.75rem;
}

.timeline-day {
  scroll-snap-align: center;
  min-width: 3.5rem;
  text-align: center;
  /* growth stage class varies emoji size */
}
```

### Integration

- Render on progress panel open (existing `EVENT_PANEL_OPENED` listener)
- After garden grid, before Mom's View section

---

### Section 4: Weekly Sparkle Mail

**Goal:** Once-per-week surprise delivery that creates anticipation for returning.

### Architecture

- **New module:** `rust/sparkle_mail.rs`
- **No new DB tables** — uses existing `settings` table (`key: "last_sparkle_mail_week"`)
- **Register:** `mod sparkle_mail;` in `lib.rs`

### Delivery Logic

```rust
pub async fn check_and_deliver() {
    let current_week = utils::current_week_key();
    let last = db_client::query("SELECT value FROM settings WHERE key = 'last_sparkle_mail_week'", vec![]).await;
    if last == current_week { return; } // Already delivered this week

    // Save immediately to prevent double delivery
    db_client::exec("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_sparkle_mail_week', ?1)", vec![current_week]).await;

    deliver_mail();
}
```

### Mail Content Pool

~20 rotating messages, cycling by week number:

```rust
const SPARKLE_MAIL: &[SparkleMailEntry] = &[
    SparkleMailEntry { message: "You're the kindest friend ever!", has_sticker: false },
    SparkleMailEntry { message: "Sparkle is SO proud of you!", has_sticker: true },
    SparkleMailEntry { message: "Did you know? Hugging makes everyone feel better!", has_sticker: false },
    // ... ~20 total
];
```

### Delivery Animation

1. On home panel open → check week
2. If new week: Sparkle flies to center with ✉️ envelope emoji
3. Speech bubble: "You have Sparkle Mail!"
4. Toast with mail message
5. If mail has sticker: `rewards::award_sticker("sparkle-mail")`
6. Celebration via `confetti::burst_unicorn()`

### CSS

- Reuse companion bubble + toast patterns
- Envelope entrance animation (float down + wobble)

---

### Section 5: UX Polish Pass

### 5a: Touch Target Audit

- Verify all interactive elements ≥ 48px on iPad mini 6
- Check: game buttons, story choice buttons, sticker cells, nav buttons
- Fix any undersized targets

### 5b: Animation Continuity

- All panel transitions use View Transitions API
- Game open/close animations smooth
- No jarring transitions between panels
- Verify `scheduler_yield()` between heavy renders

### 5c: Empty State Messages

Audit all panels for friendly empty states:
- Tracker: "Let's do your first kind act today!"
- Stories: Already has content (15 stories)
- Quests: "New quests coming soon!"
- Rewards: "Earn hearts to unlock stickers!"
- Progress/Garden: "Do some kind acts to grow your garden!"
- Family board: "Tap a family member when you see them being kind!"
- Garden timeline: "Your garden history will grow here!"

### 5d: Error Recovery UX

- All error paths show in-world messages ("Sparkle got confused!")
- Verify `errors::report()` covers all async boundaries
- Check `spawn_local_logged` coverage is complete

### 5e: Accessibility Pass

- All buttons: `aria-label` with descriptive text
- Progress bars: `role="progressbar"` + `aria-valuenow`
- Live regions: celebrations announced via `dom::announce_live()`
- Focus management: trap focus in modals/overlays

### 5f: Performance Audit

- WASM binary size check (currently 3.4MB)
- Service worker precache list current
- No unnecessary re-renders
- Memory: verify no closure leaks remain

---

### Critical Files

| File | Changes |
|------|---------|
| `rust/family_board.rs` | NEW — family kindness board |
| `rust/garden_timeline.rs` | NEW — visual garden timeline |
| `rust/sparkle_mail.rs` | NEW — weekly sparkle mail |
| `rust/story_data.rs` | Update illustration_image fields for 10 stories |
| `rust/lib.rs` | Register 3 new modules, init calls |
| `rust/tracker.rs` | Add family board button |
| `rust/progress.rs` | Wire garden timeline + family stats |
| `public/db-worker.js` | Add family_acts table |
| `public/sw.js` | Update precache list with new illustrations |
| `src/styles/tracker.css` | Family board styles |
| `src/styles/progress.css` | Garden timeline styles |
| `assets/illustrations/stories/` | ~30-40 new story illustrations |

### Existing utilities to reuse

- `render::create_button()`, `create_el_with_data()`, `create_el_with_class()`
- `dom::on()`, `dom::query()`, `dom::toast()`, `dom::announce_live()`
- `db_client::query()`, `exec()`, `exec_fire_and_forget()`
- `speech::speak()`, `narrate()`, `celebrate()`
- `synth_audio::sparkle()`, `level_up()`, `fanfare()`
- `confetti::burst_unicorn()`, `burst_party()`
- `rewards::award_sticker()`
- `utils::today_key()`, `current_week_key()`, `create_id()`, `now_epoch_ms()`
- `browser_apis::spawn_local_logged()`

---

### Constraints

- Finger only (no Apple Pencil)
- Safari 26.2 only
- 100% offline after install
- All new images precached via service worker
- No new JS files — all logic in Rust/WASM
- Kid-friendly: large touch targets (min 48px), bright colors, emoji-heavy

## Actions
_No actions recorded._

## Validation
_Validation details not recorded._

## References
_No references recorded._

