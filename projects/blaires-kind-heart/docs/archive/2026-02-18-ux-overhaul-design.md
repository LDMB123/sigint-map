# UI/UX Overhaul Design — Blaire's Kind Heart

## Context

Pre-launch UX polish for a Rust/WASM kindness-tracker PWA built for Blaire (age 4). iPad mini 6, Safari 26.2, fully offline. She hasn't used the app yet.

**Current problems:** 8 home buttons (overwhelming), 3-step text reflection (too complex), single-dialog onboarding (too basic), competing CSS systems (`tokens.css` vs `demo-overhaul.css`).

**Design north star:** "I know what to do!" on first impression. "Can I play more?" after 5 minutes.

**Blaire's profile:** 4 years old, very comfortable iPad user, recognizes some words but can't read, loves unicorns + princesses + pink, competitive, creative, imaginative. Extended 10-20min play sessions.

**Parent goals (equal weight):** Kindness habit + joyful play + family connection.

---

## Architecture Decisions

### Home: 3 buttons replace 8
- "Be Kind!" (pink) → tracker
- "Adventures!" (purple) → quests/stories/games tabs
- "My Stuff!" (gold) → stickers/gardens tabs
- Games hidden in Adventures tab; parent mode via long-press Sparkle (PIN)

### Navigation: 10 improvements
- Emoji breadcrumbs, directional view transitions, swipe-back, panel signature sounds, haptic feedback, Sparkle flies between panels, first-visit guidance

### Reflection: 3-step → single screen
- 3 big face buttons (Happy/Proud/Loving, 120x120px each) → tap → mini-celebration → done in under 5s
- Replaces: text question → text choices → story toast → 16-emotion grid (15-20s)

### Onboarding: Multi-step Sparkle-guided
- 4 steps with spotlight overlay: Welcome → First kind act → See your stuff → Done
- Companion naming: choose Sparkle, Rainbow, or Twinkle

### Categories: 6 → 4
- Keep: Hugs, Sharing, Helping, Love
- Drop: Nice Words (too abstract), Unicorn Magic (too vague)

### Gardens: 12 → 6
- Deeper per garden: watering animation, named creatures, decorating

### CSS: Delete `demo-overhaul.css`
- Keep warm pink palette from `tokens.css`, merge only shadow/spacing improvements

---

## New Features

### 4 new games (replace all 4 existing)
1. **Dress-Up Sparkle** — drag accessories onto Sparkle, outfits persist everywhere
2. **Kindness Coloring** — flood fill + free paint, 20 templates, magical palette, stamps
3. **Garden Decorating** — sandbox → send to real gardens
4. **Heart Catcher** — 1-min rounds, moderate speed, power-ups, game-exclusive rewards

### Stories overhaul
- 15 stories, 5-6 pages each, Blaire is the hero
- Full Imagen illustrations, 2 picture choices per page, karaoke word highlighting
- Unlock by reading (start with 5), hidden sparkle spots for re-reads

### Companion enhancement
- 8 expressions (up from 3), time-aware moods
- Dress-up accessories persist everywhere in app (start 5, earn rest)
- Mini conversations (50+ responses, seasonal), unicorn knock-knock jokes
- Cloud treehouse room (fully decoratable)

### Family kindness board
- Blaire logs acts she sees family members do
- 7 preset members: Mommy, Daddy, Brother, Sister, Grandma, Grandpa, Friend

### Progressive feedback
- Celebration escalation (1-2 acts: nice → 5+: amazing → 10+: epic)
- Visual streak fire (growing flame, no punishment for breaking)
- Personal bests + hidden achievement badges
- Major milestones only (1st act, 10/25/50/100 hearts, 1-week streak)
- Session wind-down after 20-30 min (Sparkle gets sleepy)

### Time-of-day awareness
- Morning (bright) → Afternoon (default) → Evening (warm) → Night (calm, bedtime stories)

### Weekly Sparkle mail
- Surprise sticker/accessory/fact once per week

### Visual garden timeline
- Scrollable flower history (bigger flowers = more acts that day)

### Full narration
- Sparkle speaks every label, button, celebration. Safari enhanced voice.

---

## Art & Assets

**~530+ Imagen illustrations** via existing `generate-images.mjs` pipeline.

| Art Category | Style | Count |
|-------------|-------|-------|
| Stories (pages + covers + choices) | Storybook illustration | ~188 |
| Stickers | Glossy badge/sticker | 56 |
| Companion (expressions + accessories + room) | Consistent Sparkle | ~47 |
| Games (all 4) | Playful cartoon | ~55 |
| Home/Nav/UI | Whimsical kawaii watercolor | ~25 |
| Gardens (creatures + decorations) | Nature watercolor | ~25 |
| Quests | Storybook | ~15 |
| Other (seasonal, family, timeline, etc.) | Mixed | ~100+ |

**Style over consistency:** Each illustration should look its best. Different art styles per section make the app feel rich.

**Progressive caching:** Precache ~50 core assets on install → background-fetch ~460 while she plays → cache-on-access fallback with emoji placeholders.

---

## Economy

- 1 heart per kind act, bonus heart for reflection
- Sticker unlocked every 5 hearts
- Gardens grow from acts (automatic rotation across 6)
- Game rewards are game-exclusive (separate from hearts)
- Album page completion → decoration for room/gardens

---

## Key Constraints

- Finger only (no Apple Pencil)
- No undo on logged acts
- 100% in-world immersion (even errors: "Sparkle got confused!")
- Parent settings: minimal (timer, volume, reset onboarding)
- Background music: games only (Web Audio synth loops)
- No explicit educational content beyond kindness + incidental reading

---

## Timeline

- **Wave 1 (Week 1):** Foundation — home, nav, reflection, CSS, loading screen
- **Wave 2 (Week 2-3):** Stories + quests + core assets (~80 illustrations)
- **Wave 3 (Week 4+):** Games, companion, galleries, seasonal content
