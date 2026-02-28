# Token Optimization Plan

Last updated: 2026-02-15

## Goal
Keep active documentation below 25k estimated tokens while preserving clear operational guidance.

## Current Baseline
From `npm run token:baseline` on 2026-02-15:
- Active files: `31`
- Active estimated tokens: `24,465`
- Archive files: `83`
- Archive estimated tokens: `193,665`

## Actions Completed
1. Removed duplicate active docs from `docs/testing/` (archive copies retained).
2. Removed duplicate active report from `docs/reports/` (archive copy retained).
3. Added canonical status docs:
   - `docs/PROJECT_STANDING.md`
   - `docs/APP_STATUS.md`
   - `docs/STATUS_LEDGER.md`
4. Moved non-runtime root screenshots to `docs/archive/assets/root-screenshots/`.

## Optimization Status
1. High-size active docs were compressed to summary + archive pattern:
   - `docs/EMOTION_SYSTEM.md` -> full copy in `docs/archive/reference-full/EMOTION_SYSTEM.full.md`
   - `docs/ICONS.md` -> full copy in `docs/archive/reference-full/ICONS.full.md`
   - `docs/TESTING.md` -> full copy in `docs/archive/reference-full/TESTING.full.md`
   - `docs/TROUBLESHOOTING.md` -> full copy in `docs/archive/reference-full/TROUBLESHOOTING.full.md`
2. Keep one source of truth per concern:
   - Project state: `PROJECT_STANDING.md`
   - Verification evidence: `STATUS_LEDGER.md`
   - Operational readiness: `APP_STATUS.md`
3. Docs budget gate enforced in CI with budget `25000` tokens.
4. Re-baseline after each doc batch edit.

## Governance Rule
Any new long-form investigation should default to `docs/archive/` with a short index note in active docs.
