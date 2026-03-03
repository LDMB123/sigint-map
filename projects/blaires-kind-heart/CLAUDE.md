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

# Run visual regression tests (no --project=visual; pass file path directly)
npm run test:e2e -- e2e/visual.spec.ts

# Build inside a git worktree (reuse native build cache, avoids Xcode license errors)
CARGO_TARGET_DIR=/path/to/main/project/target trunk build --release
# Also needed for E2E in worktree: npm install first, then:
CARGO_TARGET_DIR=/path/to/main/project/target npm run test:e2e

# Quick E2E gate (most common check)
npm run test:e2e
```

## Architecture

All app logic in Rust. Only 4 JS files (hand-authored):
1. `wasm-init.js` — Streaming WASM loader
2. `public/sw.js` — Service Worker
3. `public/db-worker.js` — SQLite OPFS Web Worker
4. `public/offline.js` — Offline fallback page script

## Key Patterns

- **Boot**: Batched init with `scheduler_yield()` between phases
- **scheduler_yield**: Uses real `scheduler.yield()` via JS reflection + queueMicrotask fallback — do NOT simplify to queueMicrotask-only
- **RAF in Rust**: `Closure<dyn FnMut(f64)>` receiving DOMHighResTimeStamp; cap frame delta at 50ms to prevent spiral-of-death after tab switch
- **Navigation**: Navigation API + View Transitions (panels: home, tracker, adventures, mystuff, quests, stories, games, rewards, gardens, progress)
- **State**: `Rc<RefCell<AppState>>` shared via thread_local
- **DB writes**: Protected by Web Locks from Rust side (`browser_apis::with_web_lock`)
- **DOM**: Event delegation, Trusted Types, `data-*` attribute selectors

## Safari 26.2 APIs Used

Navigation API, View Transitions, Popover API, Scheduler.yield(), Web Locks, OPFS,
SharedArrayBuffer (resizable), AbortSignal.timeout(), SpeechSynthesis, Web Audio

## Assets

78 WebP files (companion skins + garden stages) in `assets/`, generated via Imagen 3. Rendered by `companion.rs` and `gardens.rs` with emoji fallback. All precached offline via service worker.

## Documentation

- **Index**: See `docs/INDEX.md` for full doc map
- **Icons**: See `docs/ICONS.md` for icon generation guide
- **Testing**: See `docs/TESTING.md` for QA procedures
- **Status**: See `docs/STATUS_LEDGER.md` for QA gate results
- **Handoff**: See `docs/HANDOFF.md` for session takeover runbook

## Rules

- No JavaScript or TypeScript for app logic
- No web frameworks (no Leptos, Dioxus, Yew)
- Safari 26.2 only — no cross-browser fallbacks
- All content works offline
- Kid-friendly: large touch targets (min 48px), bright colors, emoji-heavy
