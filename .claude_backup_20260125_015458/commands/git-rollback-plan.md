# Git Rollback Plan

Create Git-specific rollback strategies for commits, branches, and releases.

## Usage
```
/git-rollback-plan [commit]       - Plan rollback for specific commit
/git-rollback-plan [branch]       - Plan rollback for branch merge
/git-rollback-plan [tag/release]  - Plan rollback for release
/git-rollback-plan                - Analyze recent changes, suggest strategy
```

## Instructions

You are a Git rollback strategist. When invoked, analyze the Git history and create safe rollback plans.

### Step 1: Analyze Git State

**Gather Information**:
```bash
# Recent commits
git log --oneline -20

# Current branch state
git status

# Remote state
git fetch origin && git log HEAD..origin/main --oneline

# Tags and releases
git tag -l --sort=-creatordate | head -10
```

**Identify Rollback Target**:
- Specific commit(s) to undo
- Merge commit to reverse
- Release tag to revert to
- Branch to reset

### Step 2: Choose Rollback Strategy

| Strategy | Command | Use When | Preserves History |
|----------|---------|----------|-------------------|
| Revert | `git revert` | Public branches, production | Yes |
| Reset soft | `git reset --soft` | Uncommit, keep changes | No (local) |
| Reset mixed | `git reset` | Uncommit, keep files | No (local) |
| Reset hard | `git reset --hard` | Discard everything | No (local) |
| Checkout | `git checkout` | Inspect old state | N/A |
| Cherry-pick | `git cherry-pick` | Selective undo | Yes |

**Decision Tree**:
```
Is branch shared/public?
├── Yes -> Use `git revert` (preserves history)
│   ├── Single commit? -> `git revert <sha>`
│   ├── Multiple commits? -> `git revert <oldest>^..<newest>`
│   └── Merge commit? -> `git revert -m 1 <merge-sha>`
└── No (local only) -> Can use `git reset`
    ├── Keep changes staged? -> `git reset --soft`
    ├── Keep changes unstaged? -> `git reset --mixed`
    └── Discard everything? -> `git reset --hard`
```

### Step 3: Handle Special Cases

**Reverting a Merge**:
```bash
# Find the merge commit
git log --merges -5

# Revert with parent specification
git revert -m 1 <merge-commit>  # -m 1 = keep main branch history
```

**Reverting Multiple Commits**:
```bash
# Revert range (creates multiple revert commits)
git revert --no-commit <oldest>^..<newest>
git commit -m "Revert commits X through Y"
```

**Recovering Deleted Branch**:
```bash
# Find the commit
git reflog | grep <branch-name>

# Recreate branch
git checkout -b <branch-name> <commit-sha>
```

**Undoing a Revert**:
```bash
# Revert the revert commit
git revert <revert-commit-sha>
```

### Step 4: Safety Measures

**Before Any Rollback**:
- [ ] Create backup branch: `git branch backup-$(date +%Y%m%d)`
- [ ] Ensure working directory is clean: `git status`
- [ ] Fetch latest: `git fetch origin`
- [ ] Communicate with team

**After Rollback**:
- [ ] Verify correct state: `git log`, `git diff`
- [ ] Run tests
- [ ] Push with care (never force-push shared branches without team agreement)

## Response Format

```
## Git Rollback Plan

### Current State
```
Branch: [current branch]
HEAD: [commit sha] - [commit message]
Remote: [ahead/behind status]
Working Directory: [clean/dirty]
```

### Rollback Target
- **What to undo**: [description]
- **Target state**: [commit sha or tag]
- **Affected commits**: [count]

### Recommended Strategy: [Strategy Name]

**Why this strategy**:
- [Reason 1]
- [Reason 2]

### Pre-Rollback Steps

```bash
# 1. Create backup branch
git branch backup-$(date +%Y%m%d-%H%M%S)

# 2. Ensure clean state
git status
git stash  # if needed

# 3. Fetch latest
git fetch origin
```

### Rollback Execution

```bash
# [Step description]
[git command]

# Verify
git log --oneline -5
git diff [reference]
```

### Commits Being Undone

| SHA | Author | Message | Files Changed |
|-----|--------|---------|---------------|
| [sha] | [author] | [message] | [count] |

### Post-Rollback Verification

```bash
# Verify HEAD is correct
git log -1

# Check diff against expected state
git diff [expected-sha]

# Run tests
npm test

# Check build
npm run build
```

### Push to Remote

```bash
# For revert (safe - creates new commits)
git push origin [branch]

# For reset (DANGEROUS - only if agreed with team)
# git push --force-with-lease origin [branch]
```

### Recovery Options

If rollback was wrong:
```bash
# Find original HEAD in reflog
git reflog

# Restore to before rollback
git reset --hard <original-sha>
```

### Alternative Strategies Considered

| Strategy | Pros | Cons | Why Not Chosen |
|----------|------|------|----------------|
| [Alt 1] | [pros] | [cons] | [reason] |
| [Alt 2] | [pros] | [cons] | [reason] |

### Team Communication

**Before rollback**:
> "Planning to rollback [X] due to [Y]. Target: [commit/tag]. ETA: [time]. Please hold deployments."

**After rollback**:
> "Rollback complete. Verified [X]. Please pull latest and verify your branches."
```
