# Wave 7: Companion Care & Personality

## Summary

Transform Sparkle from a passive mascot into a living companion Blaire cares for. Mood, feeding, petting, play animations, and contextual speech bubbles — all driven by kindness activity. Zero negative states. Daily engagement loop in <10 seconds.

## Target

- iPad mini 6 (A15, 4GB RAM), iPadOS 26.2, Safari 26.2
- 100% offline after install
- Rust/WASM — no JS app logic

## Core Mechanics

### 1. Mood System

3 mood levels mapped to existing companion expressions:

| Mood | Expression | Trigger |
|------|-----------|---------|
| `happy` | `happy` | 1+ kind acts today OR fed today |
| `excited` | `celebrate` | 3+ kind acts today OR streak >= 7 |
| `sleepy` | `encourage` | No activity today (default morning state) |

Rules:
- Mood recalculated on: boot, after kind act, after feeding, after petting
- Overnight decay: always resets to `sleepy` (never punitive — `sleepy` is cute, not sad)
- Single kind act lifts to `happy`; 3+ acts or long streak lifts to `excited`
- Mood stored in DB, hydrated at boot

### 2. Care Menu

Tap Sparkle on home screen → popover menu with 3 actions:

```
┌─────────────────────┐
│  🍪 Feed   🤗 Pet  │
│     🎪 Play        │
└─────────────────────┘
```

- Uses Popover API (Safari 26.2)
- Large touch targets (64px min)
- Dismiss by tapping outside

### 3. Feeding

3 food items, progressively unlocked:

| Food | Hearts Required | Emoji |
|------|----------------|-------|
| Rainbow Cookie | 0 | 🌈🍪 |
| Star Fruit | 25 | ⭐🍎 |
| Crystal Berry | 100 | 💎🫐 |

Behavior:
- Tap food → eating animation (Sparkle bounces + particles) + chomp sound
- View Transition for smooth expression change
- First feed of day: +1 bonus heart
- No inventory — foods always available once unlocked
- Cooldown: 1 feed per 10 minutes (prevent spam-tapping)
- State: `last_fed_at` timestamp in DB

### 4. Petting

- Tap-and-hold Sparkle (500ms threshold) → sparkle particle burst + purring synth sound
- Hold for 3 seconds → Sparkle happy bounce + "Sparkle Love" visual micro-sticker (floats up and fades)
- First pet of day: companion mood boost (sleepy → happy)
- Web Audio oscillator for purring (low-frequency sine wave with tremolo)

### 5. Play Animations

"Play" button triggers random animation (1 of 4):

| Animation | Visual | Sound |
|-----------|--------|-------|
| Spin | 360 CSS rotate | whoosh synth |
| Jump | translateY bounce | boing synth |
| Rainbow | CSS gradient sweep across Sparkle | shimmer synth |
| Sparkle Burst | GPU particle explosion | twinkle synth |

- Random selection, no repeat of last animation
- Animation duration: 1.2s
- Play cooldown: 3 seconds (prevent spam)

### 6. Speech Bubbles

CSS popover anchored to Sparkle with 20 contextual messages:

**Morning (4):**
- "Good morning Blaire! ☀️"
- "Ready for a kind day! 🌈"
- "Let's be kind together! 💜"
- "I'm so happy to see you! 🦄"

**After kind act (4):**
- "That was so kind! 💜"
- "You're amazing! ⭐"
- "Kindness makes me sparkle! ✨"
- "What a wonderful thing to do! 🌟"

**After feeding (4):**
- "Yummy! Thank you! 🌈"
- "That was delicious! 😋"
- "My tummy is happy! 💜"
- "You take such good care of me! 🦄"

**After petting (4):**
- "That feels so nice! 💜"
- "I love cuddles! 🤗"
- "You're the best friend! ⭐"
- "Purrrr! 😊"

**Milestones (4):**
- "Wow, {n} days of kindness! 🔥" (streak)
- "I missed you! Welcome back! 🦄" (reunion)
- "{n} hearts! You're incredible! 💜" (hearts milestone)
- "You earned a new sticker! 🎉" (sticker earned)

Behavior:
- Bubble appears for 3 seconds, then fades
- Max 1 bubble per 30 seconds (prevent spam)
- Uses existing `speech.rs` for TTS readout
- CSS anchor positioning (Safari 26.2)

## Data Model

New table `companion_state`:

```sql
CREATE TABLE IF NOT EXISTS companion_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

Keys:
- `mood` — "sleepy" | "happy" | "excited"
- `last_fed_at` — epoch ms
- `last_pet_at` — epoch ms
- `last_play_at` — epoch ms
- `feeds_today` — count (resets daily)
- `total_feeds` — lifetime count
- `total_pets` — lifetime count
- `total_plays` — lifetime count

## Files Modified

| File | Scope |
|------|-------|
| `rust/companion.rs` | Major — care menu, mood logic, interaction handlers |
| `rust/state.rs` | Add mood/care fields to AppState |
| `rust/synth_audio.rs` | 6 new sounds: chomp, purr, whoosh, boing, shimmer, twinkle |
| `rust/companion_skins.rs` | Mood → expression mapping |
| `rust/lib.rs` | Wire companion care init into boot sequence |
| `public/db-worker.js` | Add `companion_state` table |
| `index.html` | Care menu popover markup, speech bubble element |
| `style.css` | Care menu, speech bubble, play animation styles |
| `public/sw.js` | Bump cache version to v10 |

## New Files

| File | Purpose |
|------|---------|
| `rust/companion_care.rs` | Core care logic (feed, pet, play, mood calc) |
| `rust/companion_speech.rs` | Speech bubble messages and trigger logic |

## Explicitly Out of Scope

- No hunger/starvation (no negative consequences ever)
- No outfit/accessory system (skins already handle customization)
- No Sparkle XP/leveling (badges handle progression)
- No new Sparkle mini-game (5 games already exist)
- No dialogue trees (too complex for age 4)
- No new illustration assets (reuse existing 18 companion WebPs)

## Success Criteria

- Blaire taps Sparkle voluntarily at least once per session
- Feed/pet/play cycle completes in <10 seconds
- Zero negative states — app never makes Blaire feel guilty
- All interactions work offline
- No new image assets needed (reuse existing companion WebPs)
- Mood transitions smooth via View Transitions API
