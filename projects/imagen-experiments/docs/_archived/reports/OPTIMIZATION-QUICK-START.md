# Token Optimization Quick Start

## TL;DR

198,400 tokens can be reduced to 44,300 tokens (77.7% savings) with 2 hours of work.

## Three Major Issues

1. **Vegas Scripts Duplication** (8,000 tokens waste)
   - v12-exotic.js and v13-two-piece.js share identical physics blocks
   - Fix: Extract to `scripts/lib/physics-engine.js`

2. **Session Doc Explosion** (85,000 tokens waste)
   - 7 versions of same session context (SESSION-MASTER, SESSION-RECOVERY, etc.)
   - Fix: Keep only SESSION-MASTER-2026-02-02.md, delete other 6

3. **Redundant Compressed Files** (40,000+ tokens waste)
   - Files like SULTRY-VEGAS-FINAL-181-210.md AND SULTRY-VEGAS-FINAL-181-210-COMPRESSED.md
   - Fix: Delete compressed variants if original is already concise

## Do This First (30 minutes)

1. Delete from `docs/`:
   - SESSION-RECOVERY-2026-02-01.md
   - SESSION-2026-02-01-V10-V11-COMPRESSED.md
   - SESSION-STATE-COMPRESSED.md
   - SESSION-CONTEXT-COMPRESSED.md
   - SESSION-CONTEXT-MASTER-COMPRESSED-2026-02-01.md
   - SESSION-2026-02-01-IMAGEN-GENERATION.md
   - ULTIMATE-SESSION-BREAKTHROUGH.md

2. Extract physics to `scripts/lib/physics-engine.js` from v12-exotic.js

3. Update v12-exotic.js and v13-two-piece.js to import physics

## Then Do This (30 minutes)

4. Delete compressed variants that duplicate existing files
5. Archive `docs/plans/` → `docs/archived-plans/`
6. Create `docs/README.md` pointing to active docs

## Result

- Session reading cost: 40% of current
- Single source of truth for session context
- Physics blocks reusable for future Vegas scripts
- Token budget extends 4-5x

See full report: TOKEN-OPTIMIZATION-2026-02-02.md
