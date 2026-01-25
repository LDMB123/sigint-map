# Skill: Git Rollback Plan

**ID**: `git-rollback-plan`
**Category**: Operations
**Agent**: Any Orchestrator

---

## When to Use

- Before any high-risk deployment
- Before major refactoring
- Before database migrations
- Before any irreversible change
- As part of release management

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| change_description | string | Yes | What is being changed |
| risk_level | string | No | low, medium, high, critical |
| affected_systems | string[] | No | Systems impacted by change |

---

## Steps

### Step 1: Identify Current State

```bash
# Record current commit
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "Current commit: $CURRENT_COMMIT"

# Record current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

# List recent commits
git log --oneline -10

# Check for uncommitted changes
git status
```

### Step 2: Create Rollback Point

```bash
# Option A: Tag the current state
git tag -a rollback-point-$(date +%Y%m%d-%H%M) -m "Rollback point before [change]"

# Option B: Create rollback branch
git branch rollback/pre-[change-name] HEAD

# Push tag/branch to remote for safety
git push origin rollback-point-* --tags
git push origin rollback/*
```

### Step 3: Document Rollback Commands

```bash
# Immediate rollback (soft - preserves changes)
git reset --soft $CURRENT_COMMIT

# Full rollback (hard - discards changes)
git reset --hard $CURRENT_COMMIT

# If already pushed, create revert commit
git revert HEAD~N..HEAD --no-commit
git commit -m "Revert: [change description]"

# Or revert a specific commit
git revert <commit-hash> --no-commit
git commit -m "Revert: [specific change]"
```

### Step 4: Verify Rollback Works

```bash
# Test rollback in a separate worktree
git worktree add ../test-rollback $CURRENT_COMMIT
cd ../test-rollback

# Run verification (customize per project)
npm install && npm test   # Node/SvelteKit
cargo build && cargo test # Rust
make test                 # Generic

# Clean up test worktree
cd ..
git worktree remove test-rollback
```

---

## Rollback Decision Matrix

| Condition | Action | Command |
|-----------|--------|---------|
| Not yet pushed | Reset | `git reset --hard <commit>` |
| Pushed, no others pulled | Force push (dangerous) | `git push --force-with-lease` |
| Pushed, others may have pulled | Revert commit | `git revert <commits>` |
| Deployment failed | Deploy previous tag | Platform-specific |
| Database changed | Run down migration | Framework-specific |

---

## Platform-Specific Rollback

### Vercel
```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback <deployment-url>
```

### Netlify
```bash
# Via Netlify CLI
netlify deploy --prod --dir=<previous-build>

# Or via dashboard: Deploys > ... > Publish deploy
```

### Docker/Kubernetes
```bash
# Rollback Kubernetes deployment
kubectl rollout undo deployment/<name>

# Rollback to specific revision
kubectl rollout undo deployment/<name> --to-revision=<N>

# Docker: tag and run previous image
docker run <previous-image-tag>
```

---

## Risk Level Guidelines

| Risk | Criteria | Required Steps |
|------|----------|----------------|
| **Low** | Easily reversible, no data changes | Tag, basic verification |
| **Medium** | Some state changes, limited scope | Tag, branch, test rollback |
| **High** | Data migrations, many systems | Full plan, tested rollback, communication |
| **Critical** | Production data, external dependencies | War room, staged rollout, instant rollback ready |

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Rollback tag | Git remote | Point-in-time marker |
| Rollback branch | Git remote | Pre-change branch |
| Rollback script | ./scripts/rollback.sh | Executable rollback |
| Rollback doc | ./docs/rollback.md | Human-readable plan |

---

## Output Template

```markdown
## Rollback Plan

### Change
**Description**: [what is being changed]
**Risk Level**: [low/medium/high/critical]
**Date**: [YYYY-MM-DD]

### Pre-Change State
- **Commit**: `abc123def`
- **Tag**: `rollback-point-20250121-1430`
- **Branch**: `main` at `abc123def`

### Rollback Commands

#### Immediate Rollback (before push)
\`\`\`bash
git reset --hard abc123def
\`\`\`

#### Rollback After Push
\`\`\`bash
git revert HEAD~N..HEAD --no-commit
git commit -m "Revert: [change description]"
git push origin main
\`\`\`

### Verification Steps
1. [ ] Run test suite
2. [ ] Check application starts
3. [ ] Verify critical functionality
4. [ ] Monitor error rates

### Communication
- Notify: [list of stakeholders]
- Slack channel: #deployments
- Status page: [if applicable]

### Approvals
- [ ] Change reviewed by: ___
- [ ] Rollback plan reviewed by: ___
- [ ] Ready to proceed: ___
```
