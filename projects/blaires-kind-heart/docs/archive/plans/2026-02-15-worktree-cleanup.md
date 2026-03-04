# Worktree Cleanup Implementation Plan

- Archive Path: `docs/archive/plans/2026-02-15-worktree-cleanup.md`
- Normalized On: `2026-03-04`
- Source Title: `Worktree Cleanup Implementation Plan`

## Summary
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Context
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Commit all blaires-kind-heart code quality improvements while excluding other projects

**Architecture:** Single atomic commit containing today's warning cleanup + pre-existing quality improvements. All changes verified by passing quality gates.

**Tech Stack:** Git, npm scripts (quality gates)

---

### Task 1: Stage Blaires Kind Heart Files Only

**Files:**
- Stage: `projects/blaires-kind-heart/` (all modified files)
- Verify: Exclusion of `../dmb-almanac/`, `../emerson-violin-pwa`

**Step 1: Stage all blaires-kind-heart changes**

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart
git add .
```

**Step 2: Verify staging - check what's staged**

Run: `git diff --cached --stat`

Expected: Only files under `projects/blaires-kind-heart/` should appear. Should see ~29 files including:
- `rust/errors/types.rs`
- `rust/metrics/performance.rs`
- `rust/metrics/web_vitals.rs`
- `scripts/qa-baselines/rust-warning-count.txt`
- `docs/APP_STATUS.md`
- `HANDOFF_SUMMARY_2026-02-15.md`
- And others

**Step 3: Verify NO other projects staged**

Run: `git diff --cached --name-only | grep -E "(dmb-almanac|emerson-violin)" || echo "✓ No other projects staged"`

Expected: Output should be "✓ No other projects staged"

If other projects appear, unstage them:
```bash
git reset HEAD ../dmb-almanac ../emerson-violin-pwa
```

**Step 4: Double-check with status**

Run: `git status --short`

Expected:
- Staged files (green `M` or `A`) should all be in current directory
- Unstaged files (red `M`) should include `../dmb-almanac/` and `../emerson-violin-pwa` if they exist

---

### Task 2: Create Comprehensive Commit

**Files:**
- Commit: All staged files from Task 1

**Step 1: Create commit with detailed message**

```bash
git commit -m "$(cat <<'EOF'
chore(blaires-kind-heart): code quality improvements + warning cleanup

### Rust Warning Cleanup (Today's Session)
- Added #[allow(dead_code)] to 3 debug utility functions
  * rust/metrics/performance.rs: get_marks()
  * rust/metrics/web_vitals.rs: get_vitals()
  * rust/errors/types.rs: title() method
- Updated warning baseline: 4 → 3
- All gates passing post-cleanup

### Pre-existing Code Quality Improvements
- Refactored badges.rs: extracted helper functions
  * extract_count_i64(): reduce duplication
  * extract_bool_flag(): consistent boolean extraction
- Optimized db-worker.js:
  * Added statement cache size limit (128)
  * Added API version validation
  * Cached column names for query performance
- Removed dead code: hydrate_completed_quest() in quests.rs
- Minor refactorings: mom_mode, db_client, db_messages

### Documentation Updates
- Updated APP_STATUS.md: added warning cleanup to status
- Updated PROJECT_STANDING.md: updated verification snapshot
- Updated STATUS_LEDGER.md: added change entry
- Created HANDOFF_SUMMARY_2026-02-15.md: complete session summary
- Created docs/HANDOFF.md: handoff instructions

## Actions
**Executed:** 2026-02-15

**Commit:** [insert commit hash from git rev-parse HEAD]

**Files Committed:** 29 files in projects/blaires-kind-heart/

**Categories:**
- Today's session: 9 files (warning cleanup + docs)
- Pre-existing improvements: 11 files (refactorings + optimizations)
- Build artifacts: 9 files (auto-generated, passing gates)

**Verification Status:** ✅ All gates passing

**Worktree Status:** Clean for blaires-kind-heart

**Excluded:** Other projects (dmb-almanac, emerson-violin-pwa) remain unstaged

**Success Criteria Met:**
- ✅ All blaires-kind-heart changes committed
- ✅ Worktree shows clean status for project files
- ✅ Quality gates still passing
- ✅ Other projects remain untouched
- ✅ Clear commit message documenting all changes
```

**Step 2: Commit the design doc update**

```bash
git add docs/plans/2026-02-15-worktree-cleanup-design.md
git commit -m "docs: record worktree cleanup implementation results"
```

---

### Rollback Plan (If Issues Found)

If any verification step fails:

```bash
git reset --soft HEAD~1

git reset HEAD~1

git status
```

### Final State

**Expected after completion:**
- ✅ One new commit with all blaires-kind-heart improvements
- ✅ Worktree clean for blaires-kind-heart files
- ✅ Other projects' changes remain unstaged
- ✅ All quality gates passing
- ✅ Design document updated with results

## Validation
- PWA contract: PASS
- Runtime diagnostics: PASS (1 test)
- DB contract: PASS (2 tests)
- E2E tests: PASS (39 passed, 1 skipped)
- Docs links: PASS
- Rust warnings: PASS (3/3 baseline, improved from 4)
- Docs budget: PASS (24,543/25,000 tokens)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

**Step 2: Verify commit was created**

Run: `git log -1 --oneline`

Expected: Should show new commit with message starting "chore(blaires-kind-heart): code quality improvements"

**Step 3: Verify commit contents**

Run: `git show --stat HEAD`

Expected: Should show ~29 files changed, all under `projects/blaires-kind-heart/`

---

**Files:**
- Verify: Worktree status
- Verify: Quality gates still passing

**Step 1: Check worktree status**

Run: `git status`

Expected for blaires-kind-heart: "nothing to commit, working tree clean"
Expected to still see: Unstaged changes in `../dmb-almanac/` and `../emerson-violin-pwa` (ignored)

**Step 2: Run quick gate verification**

Run: `npm run qa:rust-warning-drift && npm run qa:docs-budget`

Expected:
```
[rust-warning-drift] PASS (warning_count=3, baseline=3)
[doc-token-budget] PASS (active_est_tokens=24543, budget=25000)
```

**Step 3: Run E2E smoke test**

Run: `npm run test:e2e 2>&1 | grep -E "(passed|failed|skipped)" | tail -3`

Expected:
```
  1 skipped
  39 passed (1-2m)
```

**Step 4: Confirm success**

If all gates pass, print success message:
```bash
echo "✅ Worktree cleanup complete!"
echo "✅ Commit: $(git rev-parse --short HEAD)"
echo "✅ All quality gates passing"
echo "✅ Blaires Kind Heart: CLEAN"
```

---

### Task 4: Update Design Document Status

**Files:**
- Modify: `docs/plans/2026-02-15-worktree-cleanup-design.md`

**Step 1: Append implementation results**

Add to end of design doc:

```markdown

## References
_No references recorded._

