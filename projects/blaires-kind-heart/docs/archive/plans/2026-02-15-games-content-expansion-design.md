# Games Content Expansion + Polish — Design

- Archive Path: `docs/archive/plans/2026-02-15-games-content-expansion-design.md`
- Normalized On: `2026-03-04`
- Source Title: `Games Content Expansion + Polish — Design`

## Summary
Add theme pickers and new content variants to all 5 games for daily replayability. Also execute the existing 17-task debug-and-polish plan (CSS loading, memory leaks, UX fixes).

### Scope

- **New content**: Theme pickers + content variants for all 5 games
- **Bug fixes**: Execute `2026-02-15-debug-and-polish-impl.md` (17 tasks)
- **Target**: ~800-1000 lines new Rust, ~50 lines CSS
- **No new files**: All changes in existing game modules + games.css
- **No new dependencies**: Pure data additions + small picker UI

### Core Pattern: Theme Picker

Each game shows a theme selection screen before gameplay. Reuses existing `.game-card` button styling with color variants. Flow:

```
Hub card tap -> Theme picker (3-4 big buttons) -> Game starts with chosen theme
```

Implementation: Each game's `start()` renders picker first. On button tap, game launches with selected theme. Picker HTML follows Memory Match's existing difficulty/theme select pattern.

### Game 1: Kindness Catcher — 4 Theme Packs

Extract current items into `CatcherTheme` struct. Picker shows 4 options.

| Theme | Catch Items | Hazards | BG Gradient |
|-------|------------|---------|-------------|
| Classic (existing) | Hearts, Stars, Sparkles | Rain clouds | Blue sky |
| Garden Party | Flowers, Butterflies, Ladybugs | Mud puddles | Green meadow |
| Sweet Treats | Cupcakes, Cookies, Ice cream | Broccoli, Peppers | Pink bakery |
| Starry Night | Moons, Shooting stars, Planets | Asteroids | Dark purple/navy |

Each theme: emoji array for catch items, emoji for hazards, CSS gradient string for background. Power-ups and scoring unchanged.

Estimate: ~80 lines data, ~30 lines picker, ~20 lines theme application.

### Game 2: Memory Match — 3 New Card Themes (Total 6)

Add 3 entries to existing `THEMES` array. Existing picker handles N themes — just needs wider grid.

| Theme | Emoji Pairs | Card Color |
|-------|------------|------------|
| Magical Forest (existing) | Trees, animals, mushrooms | Green |
| Ocean Friends (existing) | Fish, shells, waves | Blue |
| Space Adventure (existing) | Rockets, stars, aliens | Purple |
| Garden Bugs | Butterfly, Ladybug, Bee, Caterpillar, Snail, Ant, Dragonfly, Cricket | Pink/green |
| Yummy Food | Pizza, Cookie, Ice Cream, Watermelon, Banana, Cupcake, Donut, Strawberry | Yellow/orange |
| Music Party | Guitar, Drums, Piano, Trumpet, Violin, Maracas, Microphone, Saxophone | Coral/red |

Estimate: ~40 lines data, ~10 lines CSS for new color variants.

### Game 3: Hug Machine — 4 New Stages + Mood Picker

Add 4 new variants to `HugStage` enum. Replace random selection with mood-based picker.

### New Stages

| Stage | Gesture | Sparkle Reaction |
|-------|---------|-----------------|
| PeekaBoo | Tap to hide/reveal | Giggles, hides behind paws, pops out |
| PattyKake | Alternating left/right taps | Claps paws, bounces |
| BlowKisses | Quick taps send kiss emojis | Blushes, catches kisses |
| MagicSpell | Circle gesture | Transforms colors, grows wings temporarily |

### Mood Picker

3 moods control which stages appear:
- **Gentle**: GentlePat, SleepyLullaby, GentleRock, WakeUpKiss, BlowKisses
- **Silly**: TickleTime, HighFive, NoseBoops, PeekaBoo, PattyKake
- **Surprise**: Random mix of all 15

Estimate: ~120 lines per new stage (4 = ~480), ~40 lines mood picker.

### Game 4: Magic Painting — New Stamps, Templates, Patterns

Add content to existing arrays. Category picker groups templates/stamps.

### New Content

- **6 stamps**: Castle, Butterfly, Dinosaur, Car, Crown, Rocket (total 24)
- **3 templates**: Castle, Butterfly, Dinosaur outlines (total 9)
- **3 patterns**: Clouds, Polka dots, Zigzag (total 9)

### Category Picker

"What do you want to paint today?": Free Draw, Animals, Fantasy, Food, Space. Groups related templates/stamps. On selection, auto-selects first stamp from that category.

Estimate: ~60 lines stamp/template data, ~40 lines picker, ~30 lines template rendering.

### Game 5: Unicorn Adventure — 3 New Biomes (Total 4)

Extract friends/colors into `Biome` struct. Biome picker before game start.

| Biome | Friends (emoji) | Special Collectible | BG Colors |
|-------|----------------|-------------------|-----------|
| Enchanted Forest (existing) | Bunny, Deer, Fox, Bird, Butterfly, Squirrel, Hedgehog, Owl | Flowers | Green |
| Crystal Cave | Bat, Glowworm, Crystal Spider, Cave Fish, Mushroom Sprite, Gem Dragon, Mole, Firefly | Crystals | Purple/blue |
| Cloud Kingdom | Cloud Bunny, Sky Fish, Rainbow Bird, Wind Sprite, Star Mouse, Moon Cat, Sun Bear, Thunder Pup | Stars | White/sky blue |
| Ocean Shore | Crab, Starfish, Seahorse, Dolphin, Turtle, Octopus, Jellyfish, Clownfish | Shells | Teal/sand |

Each biome: friend emoji array, friend display names, background gradient, ambient audio tone variant.

Estimate: ~150 lines data, ~40 lines picker, ~30 lines audio per biome.

### Hub Updates

Update `games.rs` hub cards to show theme count: "4 themes" under the game description. When kid returns to hub after playing a theme, update the stat line to include "Last: Garden Party" or similar.

### Bug Fix Plan

Execute all 17 tasks from `2026-02-15-debug-and-polish-impl.md`:
- Critical: CSS loading gap (12 missing CSS links)
- High: contrast-color() replacement, game timer closure leaks (catcher, memory, hug)
- Medium: sound effects, loading skeleton shimmer, design token consistency, focus-visible states
- Low: z-index scale, bloom perf, SW fallback, PIN docs, game stats placeholder

## Context
_Context not recorded in source archive document._

## Actions
```
Phase 1: Bug fixes (Tasks 1-6 from polish plan) — unblocks visual testing
Phase 2: Theme picker system — shared picker component
Phase 3: Catcher themes
Phase 4: Memory themes
Phase 5: Hug stages + mood picker
Phase 6: Paint content + category picker
Phase 7: Unicorn biomes
Phase 8: Hub updates + remaining polish tasks (7-17)
```

### Non-Goals

- No new unlock/progression system
- No new mini-games
- No daily rotation (kid chooses themes manually)
- No WebP asset generation (all content is emoji-based)
- No DB schema changes

## Validation
_Validation details not recorded._

## References
_No references recorded._

