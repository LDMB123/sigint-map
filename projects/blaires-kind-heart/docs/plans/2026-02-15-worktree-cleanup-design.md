# Worktree Cleanup Design - 2026-02-15

## Context

Current branch: `codex/dmb-almanac-handoff-20260215`
Working directory contains uncommitted changes from multiple sessions:
- Today's session: Rust warning cleanup (4→3)
- Pre-existing: Database optimizations, code refactorings

## Goal

Clean worktree by committing all blaires-kind-heart improvements while excluding:
- Other projects (dmb-almanac, emerson-violin-pwa)
- Workspace-level files outside project scope

## Analysis

### Changes Categorized

**Category 1: Today's Session (Primary)**
- `rust/errors/types.rs` - Added `#[allow(dead_code)]` to `title()` method
- `rust/metrics/performance.rs` - Added `#[allow(dead_code)]` to `get_marks()`
- `rust/metrics/web_vitals.rs` - Added `#[allow(dead_code)]` to `get_vitals()`
- `scripts/qa-baselines/rust-warning-count.txt` - Updated baseline 4→3
- `docs/APP_STATUS.md` - Updated status snapshot
- `docs/PROJECT_STANDING.md` - Updated standing
- `docs/STATUS_LEDGER.md` - Added change entry
- `HANDOFF_SUMMARY_2026-02-15.md` - New handoff summary
- `docs/HANDOFF.md` - New handoff instructions

**Category 2: Pre-existing Improvements**
- `rust/badges.rs` - Extracted helper functions (`extract_count_i64`, `extract_bool_flag`)
- `rust/quests.rs` - Removed unused `hydrate_completed_quest()` function
- `public/db-worker.js` - Added cache size limits, API versioning, column name caching
- `rust/mom_mode.rs`, `rust/db_client.rs`, `rust/db_messages.rs` - Minor refactorings
- Build artifacts (auto-generated, passing gates)

**Category 3: Excluded**
- `../dmb-almanac/*` - Different project
- `../emerson-violin-pwa` - Different project (appears as submodule change)

### Verification Status

All quality gates passing:
```
✅ qa:pwa-contract       (PWA health)
✅ qa:runtime            (1 test)
✅ qa:db-contract        (2 tests)
✅ test:e2e              (39 passed, 1 skipped)
✅ qa:docs-links         (all links valid)
✅ qa:rust-warning-drift (3/3 baseline)
✅ qa:docs-budget        (24,543/25,000 tokens)
```

## Decision: Single Atomic Commit

**Approach:** Commit all blaires-kind-heart changes together

**Rationale:**
1. All changes are quality improvements
2. Thematically cohesive (code cleanup + optimization)
3. All gates pass as a unit
4. Creates clean checkpoint for future work
5. Pre-existing changes complement today's work

**Alternative rejected:** Separate commits would complicate history without benefit

## Implementation Plan

1. **Stage blaires-kind-heart files only**
   ```bash
   git add projects/blaires-kind-heart/
   ```

2. **Verify staging** - Ensure no other-project files staged

3. **Commit with comprehensive message**
   ```
   chore(blaires-kind-heart): code quality improvements + warning cleanup

   ## Rust Warning Cleanup (Today)
   - Added #[allow(dead_code)] to 3 debug utility functions
   - Updated warning baseline: 4 → 3
   - All gates passing post-cleanup

   ## Pre-existing Improvements
   - Refactored badges.rs: extracted helper functions
   - Optimized db-worker.js: cache limits, API versioning
   - Removed dead code: hydrate_completed_quest()
   - Minor refactorings in mom_mode, db_client, db_messages

   ## Documentation
   - Updated APP_STATUS, PROJECT_STANDING, STATUS_LEDGER
   - Added HANDOFF_SUMMARY_2026-02-15.md
   - Added docs/HANDOFF.md

   ## Verification
   - PWA contract: PASS
   - Runtime: PASS (1 test)
   - DB contract: PASS (2 tests)
   - E2E: PASS (39 passed, 1 skipped)
   - Rust warnings: PASS (3/3 baseline)
   - Docs budget: PASS (24,543/25,000)

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
   ```

4. **Post-commit verification**
   - Confirm worktree clean for blaires-kind-heart
   - Run quick gate check

## Success Criteria

- ✅ All blaires-kind-heart changes committed
- ✅ Worktree shows clean status for project files
- ✅ Quality gates still passing
- ✅ Other projects remain untouched
- ✅ Clear commit message documenting all changes

## Risk Mitigation

- Pre-commit: Verify no unintended files staged
- Post-commit: Run gate verification
- Fallback: `git reset --soft HEAD~1` if issues found
