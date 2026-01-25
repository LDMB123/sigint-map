---
name: rollback-plan
description: Generate rollback plan for UI changes
trigger: /rollback-plan
used_by: [lead-orchestrator, all-specialists]
---

# Rollback Plan Generator

Create reversible change strategy before making modifications.

## When to Use
- Before any implementation batch
- For high-risk changes
- Gate requirement for all changes

## Required Inputs
- Files to be changed
- Nature of changes
- Dependencies affected

## Step-by-Step Procedure

### 1. Create Git Checkpoint

```bash
# Create a named commit before changes
git add .
git commit -m "checkpoint: before [batch-name] changes"

# Note the commit hash
git rev-parse HEAD
# Example: abc123def456
```

### 2. Document File Backup Points

```markdown
## Rollback Points: [Batch Name]

### Git Checkpoint
- Commit: `abc123def456`
- Branch: `main` (or feature branch)
- Date: [timestamp]

### Files Modified
| File | Backup Location |
|------|-----------------|
| src/components/ui/dialog.tsx | .migration/backups/dialog.tsx.bak |
| src/app/globals.css | .migration/backups/globals.css.bak |
```

### 3. Create Manual Backups (If Needed)

```bash
# For critical files
mkdir -p .migration/backups/[batch-name]
cp src/components/ui/dialog.tsx .migration/backups/[batch-name]/
cp src/app/globals.css .migration/backups/[batch-name]/
```

### 4. Document Rollback Steps

```markdown
## Rollback Procedure

### Option 1: Git Revert (Recommended)
```bash
# Revert to checkpoint
git checkout abc123def456 -- src/components/ui/dialog.tsx
git checkout abc123def456 -- src/app/globals.css

# Or revert entire batch commit
git revert HEAD
```

### Option 2: Manual File Restore
```bash
# Restore from backups
cp .migration/backups/[batch-name]/dialog.tsx src/components/ui/
cp .migration/backups/[batch-name]/globals.css src/app/
```

### Option 3: Full Branch Reset
```bash
# If everything is broken
git reset --hard abc123def456
```
```

### 5. Test Rollback Procedure

```bash
# Verify rollback works (on test branch)
git checkout -b test-rollback
# Make change
git checkout abc123def456 -- src/components/ui/dialog.tsx
# Verify it compiles and works
npm run build
npm test
# Delete test branch
git checkout main
git branch -D test-rollback
```

### 6. Document Dependencies

```markdown
### Dependencies to Consider

| Change | Affects | Rollback Impact |
|--------|---------|-----------------|
| dialog.tsx | show-actions.tsx, settings-modal.tsx | Must also rollback consumers |
| globals.css | All components | Visual changes everywhere |
```

### 7. Identify Rollback Triggers

```markdown
### When to Rollback

**Immediate Rollback (P0)**:
- Build fails
- Critical tests fail
- App doesn't start
- Accessibility completely broken

**Consider Rollback (P1)**:
- Significant visual regression
- Interaction broken on major flow
- Performance degraded >20%

**Continue with Fix (P2)**:
- Minor visual difference
- Edge case interaction issue
- Non-critical lint warning
```

## Rollback Plan Template

```markdown
# Rollback Plan: [Batch Name]

**Created**: [timestamp]
**Author**: [agent name]

## Checkpoint

| Item | Value |
|------|-------|
| Git Commit | `abc123def456` |
| Branch | `feature/batch-name` |
| Date | [timestamp] |

## Files Changed

| File | Type of Change | Backup |
|------|---------------|--------|
| src/components/ui/dialog.tsx | Major refactor | .migration/backups/... |
| src/app/globals.css | CSS additions | .migration/backups/... |

## Rollback Commands

### Quick Rollback (Single File)
```bash
git checkout abc123def456 -- [file-path]
```

### Full Batch Rollback
```bash
git revert [batch-commit-hash]
# or
git reset --hard abc123def456
```

### Manual Restore
```bash
cp .migration/backups/[batch-name]/* src/components/ui/
```

## Verification After Rollback

```bash
npm run build
npm test
npm run lint
```

## Dependencies

Files that depend on changed files:
- [list of files]

Rollback may require also reverting:
- [dependent changes]

## Rollback Triggers

| Condition | Action |
|-----------|--------|
| Build fails | Immediate rollback |
| Tests fail | Investigate, likely rollback |
| Visual regression | Fix or rollback |
| Performance regression | Fix or rollback |

## Contact

If unsure about rollback:
1. Check with lead-orchestrator
2. Consult original change author
```

## Expected Artifacts

| Artifact | Location |
|----------|----------|
| Rollback plan | `.migration/rollback/[batch-name].md` |
| File backups | `.migration/backups/[batch-name]/` |
| Git checkpoint | Commit hash noted in plan |

## Success Criteria
- Git checkpoint created
- All changed files documented
- Rollback commands ready
- Verification steps defined
- Dependencies mapped
