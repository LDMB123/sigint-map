# Blaire's Kind Heart

## Project Scope

**This project is ONLY Blaire's Kind Heart.** Do not reference, suggest, or pull context from any other workspace project (dmb-almanac, emerson-violin-pwa, imagen-experiments, gemini-mcp-server). All Rust/WASM work here is scoped exclusively to this repository.

Fully offline kindness PWA for a 4-year-old. iPad mini 6 (A15, 4GB RAM), iPadOS 26.2, Safari 26.2.

## Tech Stack

- **Language**: Rust -> WASM via `wasm-bindgen` + `web-sys` (zero JS frameworks)
- **Build**: Trunk
- **Storage**: SQLite in OPFS via JS Web Worker
- **AI**: `tract-onnx` with SmolLM-135M behind `ml-onnx` feature flag
- **Target**: Safari 26.2 only

## Commands

```bash
# Development
trunk serve

# Production build
trunk build --release

# Serve over local network (iPad testing)
trunk serve --address 0.0.0.0
```

## Architecture

All app logic in Rust. Only 3 JS files (spec-required):
1. `wasm-init.js` - Streaming WASM loader
2. `public/sw.js` - Service Worker
3. `public/db-worker.js` - SQLite OPFS Web Worker

## Key Patterns

- **Boot**: Batched init with `scheduler_yield()` between phases
- **Navigation**: Navigation API + View Transitions (5 panels: home, tracker, quests, stories, rewards)
- **State**: `Rc<RefCell<AppState>>` shared via thread_local
- **DB writes**: Protected by Web Locks (`navigator.locks.request`)
- **DOM**: Event delegation, Trusted Types, `data-*` attribute selectors

## Safari 26.2 APIs Used

Navigation API, View Transitions, Popover API, Scheduler.yield(), Web Locks, OPFS,
SharedArrayBuffer (resizable), AbortSignal.timeout(), SpeechSynthesis, Web Audio

## Asset Pipeline (Weeks 2-3)

### Week 2: Asset Generation (Complete ✅)
- **Companion skins**: 18 WebP files (6 skins × 3 expressions)
- **Garden stages**: 60 WebP files (12 gardens × 5 growth stages)
- **Generator**: Google Imagen 3 API via `google-mcp-server`
- **Total**: 78 WebP files, 3.8MB, all precached offline

### Week 3: Code Integration (Complete ✅)
- **Rendering**: Rust queries DB → selects asset → renders via `render::create_img()`
- **Companion**: `companion.rs` renders skin WebP based on active skin + expression
- **Gardens**: `gardens.rs` populates grid with stage-based WebP images
- **Fallbacks**: Emoji if WebP fails to load
- **Animations**: Safari 26.2 View Transitions API for smooth skin changes
- **Service Worker**: Cache-first strategy for offline asset serving

## Documentation

- **Icons**: See `docs/ICONS.md` for icon generation guide
  - Quick start: `cd assets && python3 generate_icons.py`
  - Archive: `docs/archive/ICON_*.md` for detailed specs
- **Testing**: See `docs/testing/week3-manual-test-plan.md` for browser testing
- **Validation**: See `docs/testing/week3-validation-report.md` for build verification

## Rules

- No JavaScript or TypeScript for app logic
- No web frameworks (no Leptos, Dioxus, Yew)
- Safari 26.2 only — no cross-browser fallbacks
- All content works offline
- Kid-friendly: large touch targets (min 48px), bright colors, emoji-heavy
