# Advanced Git Workflow

Execute advanced git operations for the specified task.

## Target: $ARGUMENTS

## Common Operations

### Rebasing

```bash
# Rebase current branch onto main
git fetch origin
git rebase origin/main

# Interactive rebase (squash, reorder, edit)
git rebase -i HEAD~5  # Last 5 commits

# Rebase with autosquash (for fixup commits)
git rebase -i --autosquash origin/main

# Continue after resolving conflicts
git rebase --continue

# Abort rebase
git rebase --abort

# Skip problematic commit
git rebase --skip
```

### Interactive Rebase Commands
```
pick   = use commit as-is
reword = edit commit message
edit   = stop for amending
squash = meld into previous commit (keep message)
fixup  = meld into previous (discard message)
drop   = remove commit
```

### Cherry-Picking

```bash
# Cherry-pick a single commit
git cherry-pick <commit-hash>

# Cherry-pick without committing
git cherry-pick --no-commit <commit-hash>

# Cherry-pick a range of commits
git cherry-pick A^..B  # A through B inclusive

# Cherry-pick from another branch
git cherry-pick feature-branch~3..feature-branch

# Continue after resolving conflicts
git cherry-pick --continue

# Abort cherry-pick
git cherry-pick --abort
```

### Conflict Resolution

```bash
# See conflicted files
git status

# See conflict markers
git diff

# Accept current branch version (ours)
git checkout --ours <file>

# Accept incoming branch version (theirs)
git checkout --theirs <file>

# Use merge tool
git mergetool

# Mark as resolved
git add <file>

# After resolving all conflicts
git rebase --continue  # or
git merge --continue   # or
git cherry-pick --continue
```

### Stashing

```bash
# Stash changes (including staged)
git stash

# Stash with message
git stash push -m "Work in progress on feature X"

# Stash including untracked files
git stash -u

# List stashes
git stash list

# Apply most recent stash (keep in stash list)
git stash apply

# Apply and remove from stash list
git stash pop

# Apply specific stash
git stash apply stash@{2}

# Create branch from stash
git stash branch new-branch stash@{0}

# Drop a stash
git stash drop stash@{0}

# Clear all stashes
git stash clear
```

### Undoing Changes

```bash
# Unstage file (keep changes)
git restore --staged <file>

# Discard changes in working directory
git restore <file>

# Undo last commit (keep changes staged)
git reset --soft HEAD~1

# Undo last commit (keep changes unstaged)
git reset HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Revert a commit (create new commit)
git revert <commit-hash>

# Revert merge commit
git revert -m 1 <merge-commit-hash>
```

### Branch Management

```bash
# Create and switch to new branch
git switch -c feature/new-feature

# Switch to existing branch
git switch main

# Rename current branch
git branch -m new-name

# Rename any branch
git branch -m old-name new-name

# Delete local branch
git branch -d branch-name     # Safe delete
git branch -D branch-name     # Force delete

# Delete remote branch
git push origin --delete branch-name

# Prune deleted remote branches
git fetch --prune

# List branches with last commit info
git branch -vv

# Find branches containing commit
git branch --contains <commit>

# Find branches merged into main
git branch --merged main
```

### History Investigation

```bash
# Search commit messages
git log --grep="fix"

# Search code changes
git log -S "functionName" --source --all

# Show commits that changed a file
git log --follow -- path/to/file

# Show who changed each line
git blame path/to/file

# Show blame with copies/renames
git blame -C -C -C path/to/file

# Find when bug was introduced
git bisect start
git bisect bad HEAD
git bisect good v1.0.0
# Test and mark: git bisect good/bad
git bisect reset

# Show commit graph
git log --oneline --graph --all
```

### Cleanup & Maintenance

```bash
# Remove untracked files (dry run)
git clean -n

# Remove untracked files
git clean -f

# Remove untracked files and directories
git clean -fd

# Remove ignored files too
git clean -fdX

# Garbage collection
git gc

# Prune unreachable objects
git prune

# Verify repository integrity
git fsck
```

### Advanced Operations

```bash
# Create fixup commit for later squashing
git commit --fixup=<commit-hash>

# Squash fixup commits automatically
git rebase -i --autosquash main

# Find lost commits
git reflog

# Restore deleted branch from reflog
git checkout -b recovered-branch HEAD@{5}

# Split a commit
git rebase -i HEAD~3
# Mark commit as 'edit'
git reset HEAD~1
git add -p  # Stage partial changes
git commit -m "First part"
git add -p
git commit -m "Second part"
git rebase --continue

# Combine repositories (keeping history)
git remote add other-repo <url>
git fetch other-repo
git merge other-repo/main --allow-unrelated-histories
```

## Workflow Patterns

### Feature Branch Workflow
```bash
# Start feature
git switch main
git pull
git switch -c feature/my-feature

# Work on feature
git add -p
git commit -m "feat: add something"

# Keep up with main
git fetch origin
git rebase origin/main

# Push (first time)
git push -u origin feature/my-feature

# Push (after rebase, force required)
git push --force-with-lease

# Clean up after merge
git switch main
git pull
git branch -d feature/my-feature
```

### Hotfix Workflow
```bash
# Create hotfix from production
git switch production
git pull
git switch -c hotfix/critical-fix

# Fix and test
git commit -m "fix: critical issue"

# Merge to production
git switch production
git merge hotfix/critical-fix
git push

# Merge to main
git switch main
git merge hotfix/critical-fix
git push

# Cleanup
git branch -d hotfix/critical-fix
```

## Output Format

```markdown
## Git Workflow Execution

### Operation: [Rebase/Cherry-pick/Merge/etc.]

### Current State
```
Branch: feature/my-feature
Behind main by: 5 commits
Uncommitted changes: 2 files
```

### Steps Executed
1. `git stash` - Saved uncommitted changes
2. `git fetch origin` - Updated refs
3. `git rebase origin/main` - Rebased onto main

### Conflicts Resolved
| File | Resolution |
|------|------------|
| src/api.ts | Accepted theirs, manually merged config |
| package.json | Combined both versions |

### Final State
```
Branch: feature/my-feature
Ahead of main by: 3 commits
Clean working tree
```

### Next Steps
```bash
# Push rebased branch
git push --force-with-lease

# Or create PR
gh pr create
```
```

## Tips

- **--force-with-lease**: Safer than --force, fails if remote has new commits
- **Interactive rebase**: Use for cleaning up before PR, never on shared branches
- **Reflog**: Your safety net - commits are recoverable for ~30 days
- **Stash before rebase**: Avoid complications with uncommitted changes
- **Bisect**: Automate with `git bisect run ./test-script.sh`
- **Blame**: Use `-w` to ignore whitespace, `-M` to follow code movement
