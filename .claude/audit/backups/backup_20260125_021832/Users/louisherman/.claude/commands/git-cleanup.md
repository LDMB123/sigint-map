# Git Repository Cleanup

Clean up and maintain the git repository.

## Target: $ARGUMENTS

## Branch Cleanup

### List Merged Branches
```bash
# Local branches merged into main
git branch --merged main | grep -v "main"

# Remote branches merged into main
git branch -r --merged main | grep -v "main"
```

### Delete Merged Branches
```bash
# Delete local merged branches (except main/master)
git branch --merged main | grep -v "main\|master" | xargs -n 1 git branch -d

# Delete remote merged branches
git branch -r --merged main | grep -v "main\|master" | sed 's/origin\///' | xargs -n 1 git push origin --delete
```

### Find Stale Branches
```bash
# Branches with no commits in 3 months
git for-each-ref --sort=-committerdate --format='%(refname:short) %(committerdate:relative)' refs/heads/ | \
  grep -E '(months|year)'
```

### Prune Remote Tracking
```bash
# Remove references to deleted remote branches
git fetch --prune

# Or configure auto-prune
git config --global fetch.prune true
```

## Large File Cleanup

### Find Large Files
```bash
# Largest files in current tree
git ls-files -z | xargs -0 -I{} sh -c 'echo "$(git cat-file -s :"{}" 2>/dev/null || echo 0) {}"' | sort -rn | head -20

# Largest files in history
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  awk '/^blob/ {print $3, $4}' | sort -rn | head -20
```

### Remove Large Files from History
```bash
# Using git-filter-repo (recommended)
pip install git-filter-repo
git filter-repo --strip-blobs-bigger-than 10M

# Or remove specific file
git filter-repo --path path/to/large-file.zip --invert-paths
```

## Repository Maintenance

### Garbage Collection
```bash
# Standard cleanup
git gc

# Aggressive cleanup (slower but more thorough)
git gc --aggressive --prune=now

# Check repository size
du -sh .git
```

### Optimize Repository
```bash
# Repack objects
git repack -a -d --depth=250 --window=250

# Verify integrity
git fsck --full
```

## Common Cleanup Tasks

### Remove Untracked Files
```bash
# Preview what would be deleted
git clean -n -d

# Delete untracked files and directories
git clean -f -d

# Including ignored files
git clean -f -d -x
```

### Reset to Clean State
```bash
# Discard all local changes
git reset --hard HEAD
git clean -f -d

# Reset to remote state
git fetch origin
git reset --hard origin/main
```

## Output Format

```markdown
## Repository Cleanup Report

### Branch Summary
| Type | Count | Action |
|------|-------|--------|
| Local merged | 12 | Safe to delete |
| Remote merged | 8 | Safe to delete |
| Stale (>3 months) | 5 | Review needed |

### Branches to Delete
```bash
# Local (safe - already merged)
git branch -d feature/old-feature feature/another-old

# Remote (safe - already merged)
git push origin --delete feature/old-feature
```

### Large Files
| File | Size | In History | Action |
|------|------|------------|--------|
| dump.sql | 150MB | Yes | Remove from history |
| image.png | 5MB | No | Add to .gitignore |

### Repository Stats
- **Size before**: 500MB
- **Size after**: 120MB
- **Commits**: 1,234
- **Contributors**: 5

### Cleanup Commands
```bash
# Step 1: Delete merged branches
git branch --merged main | grep -v "main" | xargs git branch -d

# Step 2: Prune remotes
git fetch --prune

# Step 3: Garbage collect
git gc --aggressive
```

### Recommendations
1. Add pre-commit hook to prevent large files
2. Set up branch protection rules
3. Configure auto-delete on PR merge
```

## Prevention

### Pre-commit Hook for Large Files
```bash
#!/bin/sh
# .git/hooks/pre-commit

MAX_FILE_SIZE=5242880  # 5MB

for file in $(git diff --cached --name-only); do
  if [ -f "$file" ]; then
    size=$(wc -c < "$file")
    if [ $size -gt $MAX_FILE_SIZE ]; then
      echo "Error: $file is too large ($size bytes)"
      exit 1
    fi
  fi
done
```

### .gitignore Additions
```gitignore
# Large files that shouldn't be committed
*.sql
*.dump
*.zip
*.tar.gz
node_modules/
```
