# Emotion System (Operational Summary)

- Archive Path: `docs/archive/phase-docs/EMOTION_SYSTEM.md`
- Normalized On: `2026-03-04`
- Source Title: `Emotion System (Operational Summary)`

## Summary
Last updated: 2026-02-15

## Context
Last updated: 2026-02-15
Full reference: `../reference-full/EMOTION_SYSTEM.full.md`

### Purpose
The app captures a child-selected emotion after a kind act reflection to reinforce emotional vocabulary and self-awareness.

### Runtime Contract
- Reflection prompt appears after kind act flow.
- Emotion selection is optional and non-blocking.
- Selected emotion is persisted with the corresponding kind act record.
- Parent insights aggregate emotion usage by week.

### Current Scope
- Four conceptual tiers are supported in content design.
- Active behavior is a direct selectable set (no live tier unlock gate in current production flow).
- Storage field of interest: `emotion_selected` on `kind_acts`.

### Key Files
- `rust/emotion_vocabulary.rs`
- `rust/story_engine.rs`
- `rust/parent_insights.rs`

### QA Expectations
- Emotion tap persists once per act.
- Skipped reflections do not write emotion values.
- Weekly parent insights include top emotions and stable aggregation.

### Change Guidance
Any schema, selection logic, or parent-insight changes must be revalidated through:
1. `npm run qa:db-contract`
2. `npm run qa:runtime`
3. targeted E2E checks in `e2e/db-contract.spec.ts`

## Actions
_No actions recorded._

## Validation
_Validation details not recorded._

## References
_No references recorded._

