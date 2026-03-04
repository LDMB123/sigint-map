# iPad Regression Testing Template

Copy this file as `IPAD_REGRESSION_RUN_YYYY-MM-DD.md` for each testing session.

## Setup

- [ ] iPad mini 6, iPadOS 26.2, Safari 26.2
- [ ] Host: `trunk serve --address 0.0.0.0`
- [ ] Navigate to `http://<HOST_IP>:8080` in Safari
- [ ] Confirm service worker installs (check console)
- [ ] Perf controls verified: `?perf=throughput`, `?perf=quality`, `?gpu=off` all apply expected body attrs

## Core Navigation

- [ ] Home screen loads — title, heart counter, 3 buttons, streak, companion visible
- [ ] Tap each home button — tracker, adventures, mystuff panels open
- [ ] Back navigation works (swipe or breadcrumb home button)
- [ ] View Transitions animate between panels
- [ ] Show Mom button visible and tappable on home

## Tracker Flow

- [ ] Tap "Be Kind!" — tracker panel opens
- [ ] Log a Hug — reflection prompt appears
- [ ] Select emotion — toast confirms, hearts increment
- [ ] Heart counter pop animation plays on increment
- [ ] Log acts for all 4 categories (Hug, Sharing, Helping, Love)
- [ ] Early dismissal: tap "Maybe later" within 500ms — no follow-up toast

## Companion (Sparkle)

- [ ] Sparkle renders with skin image (not just emoji)
- [ ] Single tap — conversation menu appears
- [ ] 5 rapid taps — tickle reaction
- [ ] Speech bubble with typewriter effect
- [ ] Feed/Pet/Play from care menu — Sparkle reacts with speech

## Games

- [ ] All 5 game cards visible in Games panel
- [ ] Kindness Catcher — plays, catches items, score updates
- [ ] Memory Match — cards flip, match detection works
- [ ] Hug Machine — hug interaction, mood feedback
- [ ] Magic Painting — drawing works, style selection
- [ ] Unicorn Adventure — world navigation, collectibles

## Quests & Stories

- [ ] 3 daily quests displayed
- [ ] Complete a quest — Sparkle celebrates, hearts awarded
- [ ] Stories panel — story cards load with images
- [ ] Read a story — text and illustrations render

## Rewards & Gardens

- [ ] Sticker collection displays earned stickers
- [ ] Streak calendar shows correct day markers
- [ ] Gardens panel — 6 garden themes visible
- [ ] Garden stages render WebP images (not just emoji)

## Show Mom Celebration

- [ ] Tap "Show Mom!" button on home screen
- [ ] Fullscreen dialog opens with stats
- [ ] Confetti burst plays
- [ ] Fanfare audio plays
- [ ] Sparkle quote appropriate to progress
- [ ] Share button works (if Web Share API available)
- [ ] Tap anywhere to close — dialog dismisses cleanly

## Offline Behavior

- [ ] Disable WiFi after initial load
- [ ] All panels still navigate
- [ ] Log a kind act offline — queues successfully
- [ ] Games still playable
- [ ] Re-enable WiFi — offline queue processes

## Touch & Gestures

- [ ] All buttons have 48px+ touch targets
- [ ] No accidental taps on small targets
- [ ] Scroll performance smooth on all panels
- [ ] No tap delay (touch-action: manipulation working)
- [ ] Long-press does not trigger context menu on buttons

## Performance

- [ ] App boots within 3 seconds
- [ ] No janky animations
- [ ] Panel transitions under 180ms
- [ ] No memory warnings during 10-minute play session

## Apple Silicon Trace Evidence

- [ ] Capture baseline A/B traces (`perf=quality`, `perf=throughput`) with `scripts/apple-silicon-profile-iterate.sh`
- [ ] Archive both summary CSV files under `artifacts/apple-silicon-profile/`
- [ ] Run `npm run qa:apple-silicon-trace-budget -- --candidate <candidate-summary.csv>`
- [ ] Attach comparator PASS output to release evidence pack

## Visual

- [ ] All WebP images load (companion skins, gardens, buttons)
- [ ] Colors bright and kid-appropriate
- [ ] Text readable at viewing distance
- [ ] No overflow or clipping on iPad mini screen

## Notes

_Record any issues, screenshots, or observations here._
