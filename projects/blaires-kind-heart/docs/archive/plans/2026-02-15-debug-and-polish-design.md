# Debug & Polish Pass — Blaire's Kind Heart

- Archive Path: `docs/archive/plans/2026-02-15-debug-and-polish-design.md`
- Normalized On: `2026-03-04`
- Source Title: `Debug & Polish Pass — Blaire's Kind Heart`

## Summary
Full audit and polish of the entire PWA. Fixes 1 critical bug (CSS loading gap), 3 high-priority issues, 4 medium polish items, and 4 low cosmetic improvements.

### Critical: CSS Loading Gap

**Problem**: Only 4 of 16 CSS files are loaded. `index.html` links `tokens.css`, `app.css`, `home.css`, `animations.css` via Trunk. The remaining 12 panel-specific CSS files (`tracker.css`, `quests.css`, `stories.css`, `rewards.css`, `games.css`, `mom.css`, `progress.css`, `gardens.css`, `particles.css`, `scroll-effects.css`, `particle-effects.css`, `demo-overhaul.css`) are listed in `sw-assets.js` as DEFERRED_ASSETS but:
- Never linked in `index.html` with `<link data-trunk rel="css">` tags
- Never built by Trunk into `dist/`
- No dynamic CSS injection mechanism exists in Rust or JS

**Fix**: Add all 12 CSS files as `<link data-trunk rel="css">` in `index.html`. Trunk will bundle and hash them. Remove the broken DEFERRED_ASSETS CSS entries from `sw-assets.js` since they'll now be in the main bundle.

**Files**: `index.html`, `public/sw-assets.js`

### High Priority Fixes

### H1: `contrast-color()` CSS function

**Problem**: `tracker.css` uses `contrast-color()` (lines 82, 99, 116, 133, 150, 167) — a CSS draft spec that may not be supported in Safari 26.2.

**Fix**: Replace with explicit white/dark text colors per button. Use `color: var(--color-white)` for dark backgrounds (pink, blue, green, purple, orange) and `color: var(--color-text)` for light backgrounds (yellow).

**Files**: `src/styles/tracker.css`

### H2: Game container DOM accumulation

**Problem**: Game arenas created dynamically but never removed when game ends. Repeated plays accumulate DOM nodes.

**Fix**: Add cleanup in each game's exit/end handler — call `.remove()` on the game arena element. Store game timer closures on the arena element (not `.forget()`) so they're GC'd with the element.

**Files**: `rust/game_catcher.rs`, `rust/game_memory.rs`, `rust/game_hug.rs`, `rust/game_paint.rs`

### H3: Game timer closure leaks

**Problem**: 7 game timer closures use `.forget()`. On game restart, old closures are never cleaned up.

**Fix**: Store closures as JS properties on the game arena element (same pattern as `companion_skins.rs` line 190-191). When arena is removed, closures are GC'd.

**Files**: Same as H2

### Medium Priority Polish

### M1: Missing sound effects

Add `synth_audio::play()` calls:
- Emotion check-in button tap → `tap` sound
- Quest completion → `sparkle` sound
- Reflection prompt appearance → `gentle` sound

**Files**: `rust/reflection.rs`, `rust/quests.rs`, `rust/tracker.rs`

### M2: Loading skeleton shimmer

Add `animation: shimmer-loading 1.5s infinite` to skeleton cells in quest and reward panels. Change game stats placeholder from `""` to `"..."`.

**Files**: `src/styles/quests.css`, `rust/games.rs`

### M3: Design token consistency

Replace hardcoded sizes with CSS custom properties:
- Emotion buttons: `80px` → `var(--touch-comfortable)`
- Emoji font sizes: hardcoded `rem` → `var(--font-size-*)`
- Milestone badge: `90px` → token

**Files**: `src/styles/tracker.css`, `src/styles/quests.css`, `src/styles/stories.css`, `src/styles/rewards.css`

### M4: Focus-visible states

Add `:focus-visible` styling to emotion grid buttons and other interactive elements for external keyboard a11y.

**Files**: `src/styles/tracker.css`

### Low Priority Cosmetic

### L1: Z-index scale

Add CSS custom properties: `--z-game: 10; --z-modal: 100; --z-confetti: 1000; --z-toast: 2000; --z-loading: 3000` to `tokens.css`. Reference in relevant files.

### L2: Bloom animation performance

Replace `filter: blur(4px)` in bloom animation with pre-blurred shadow or `backdrop-filter` to reduce GPU cost.

### L3: SW image fallback

Change `fetch(dataURI)` to `new Response(blob)` for offline image fallback.

### L4: PIN storage TODO

Move PIN check in `progress.rs:287` to secure storage (or document as intentional for v1).

## Context
_Context not recorded in source archive document._

## Actions
```
Batch 1: CSS Loading (Critical)  — index.html, sw-assets.js
Batch 2: Code Fixes (High)      — game_*.rs, tracker.css
Batch 3: UX Polish (Medium)     — reflection.rs, quests.rs, tracker.rs, games.rs, CSS files
Batch 4: Cosmetic (Low)         — tokens.css, animations.css, sw.js, progress.rs
```

### Scope

- ~15 files modified
- ~80 lines of new Rust code
- ~60 lines of CSS changes
- ~20 lines of JS changes
- 0 new files
- 0 new dependencies

## Validation
_Validation details not recorded._

## References
_No references recorded._

