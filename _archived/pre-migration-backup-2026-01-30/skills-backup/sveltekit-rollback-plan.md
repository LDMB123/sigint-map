---
name: sveltekit-rollback-plan
description: Generate comprehensive rollback plan for SvelteKit changes
trigger: /rollback-plan
used_by: [full-stack-developer, devops-engineer, system-architect]
---

# Rollback Plan Generator

Create reversible change strategy before implementing modifications to SvelteKit applications.

## When to Use
- Before any implementation batch or significant feature
- For high-risk changes (routing, database, auth)
- Before production deployments
- Gate requirement for all changes touching user data
- Before refactoring sessions

## Required Inputs
- Files to be changed (routes, components, configs)
- Nature of changes (feature, refactor, migration)
- Dependencies affected (database, APIs, services)
- Deployment environment (dev, staging, production)

## Step-by-Step Procedure

### 1. Create Git Checkpoint

```bash
# Ensure working directory is clean
git status

# Create a named commit before changes
git add .
git commit -m "checkpoint: before [batch-name] changes

[Brief description of planned changes]
"

# Note the commit hash
git rev-parse HEAD
# Example output: abc123def456789

# Tag the checkpoint for easy reference
git tag checkpoint-[batch-name]

# Create a backup branch (optional but recommended for high-risk changes)
git checkout -b backup/[batch-name]
git checkout main  # or your working branch
```

### 2. Document File Backup Points

```markdown
# Rollback Points: [Batch Name]

**Created**: [YYYY-MM-DD HH:MM]
**Branch**: [current-branch-name]
**Risk Level**: [Low/Medium/High/Critical]

## Git Checkpoint
- **Commit**: `abc123def456789`
- **Tag**: `checkpoint-[batch-name]`
- **Branch**: `main` (or feature branch)
- **Backup Branch**: `backup/[batch-name]`
- **Date**: [timestamp]

## Files to be Modified

| File | Type | Risk | Backup Location |
|------|------|------|-----------------|
| src/routes/+page.svelte | Route | Medium | Git commit |
| src/lib/db/schema.ts | Database | High | Git + manual backup |
| src/hooks.server.ts | Server hook | High | Git + manual backup |
| vite.config.ts | Config | Low | Git commit |
| src/lib/components/Navigation.svelte | Component | Low | Git commit |
```

### 3. Create Manual Backups (For Critical Files)

```bash
# Create backup directory structure
mkdir -p .backups/[batch-name]/{routes,lib,config}

# Backup critical files
# Database schemas
cp src/lib/db/schema.ts .backups/[batch-name]/lib/
cp src/lib/db/migrations/*.sql .backups/[batch-name]/lib/

# Server-side logic
cp src/hooks.server.ts .backups/[batch-name]/
cp src/app.d.ts .backups/[batch-name]/

# Critical routes
cp src/routes/+layout.svelte .backups/[batch-name]/routes/
cp src/routes/+page.server.ts .backups/[batch-name]/routes/

# Environment configs
cp .env .backups/[batch-name]/
cp svelte.config.js .backups/[batch-name]/config/

# Create backup manifest
cat > .backups/[batch-name]/MANIFEST.txt <<EOF
Backup created: $(date)
Git checkpoint: $(git rev-parse HEAD)
Branch: $(git branch --show-current)

Files backed up:
$(find .backups/[batch-name] -type f)
EOF
```

### 4. Document Database Rollback (If Applicable)

```markdown
## Database Rollback Strategy

### For Migration-based Changes

**Forward Migration**: `src/lib/db/migrations/001_add_user_preferences.sql`
**Rollback Migration**: `src/lib/db/migrations/001_add_user_preferences_down.sql`

```sql
-- Rollback SQL
DROP TABLE IF EXISTS user_preferences;
-- Add any data restoration needed
```

**Rollback Commands**:
```bash
# If using Prisma
npx prisma migrate resolve --rolled-back 001_add_user_preferences

# If using custom migrations
npx tsx scripts/rollback-migration.ts 001

# Manual rollback
sqlite3 data/app.db < src/lib/db/migrations/001_add_user_preferences_down.sql
```

### For IndexedDB Changes (Client-side)

**Dexie Version Before**: v1
**Dexie Version After**: v2

**Rollback Strategy**:
- Clear IndexedDB and force re-sync from server
- Or revert to previous Dexie schema version

```javascript
// Emergency IndexedDB clear
await db.delete();
await db.open();
```
```

### 5. Document Rollback Steps

```markdown
## Rollback Procedures

### Option 1: Git Revert Specific Files (Recommended for Partial Rollback)
```bash
# Revert specific files to checkpoint
git checkout abc123def456 -- src/routes/+page.svelte
git checkout abc123def456 -- src/lib/components/Navigation.svelte

# Verify changes
git diff

# Test
npm run dev

# Commit the revert
git commit -m "rollback: revert [component-name] changes"
```

### Option 2: Revert Entire Commit (For Complete Batch Rollback)
```bash
# Find the commit to revert
git log --oneline -10

# Revert the commit (creates a new commit)
git revert [commit-hash]

# Or revert multiple commits
git revert [commit-hash1]^..[commit-hash2]

# Resolve any conflicts, then
git add .
git revert --continue
```

### Option 3: Hard Reset (DESTRUCTIVE - Use with Caution)
```bash
# Only use if you haven't pushed to remote
git reset --hard abc123def456

# If you've already pushed, you'll need force push
# WARNING: Only do this on feature branches, NEVER on main
git push --force-with-lease origin feature/[branch-name]
```

### Option 4: Manual File Restore
```bash
# Restore from backups
cp .backups/[batch-name]/lib/schema.ts src/lib/db/
cp .backups/[batch-name]/routes/+layout.svelte src/routes/

# Restore entire directory
cp -r .backups/[batch-name]/routes/* src/routes/

# Verify restoration
git status
git diff
```

### Option 5: Deploy Previous Version (Production Rollback)
```bash
# Find previous deployment commit
git log --oneline -10

# Deploy previous version
git checkout [previous-stable-commit]
npm run build
# Deploy via your platform (Vercel, Netlify, etc.)

# Or rollback via platform CLI
vercel rollback [deployment-url]
```
```

### 6. Test Rollback Procedure (Dry Run)

```bash
# Create a test branch to verify rollback works
git checkout -b test-rollback-[batch-name]

# Simulate the changes
# [make changes here]

# Test rollback
git checkout abc123def456 -- src/routes/+page.svelte

# Verify it compiles and works
npm run build
npm run check
npm test

# Verify app runs
npm run dev
# Manually test key flows

# Clean up test branch
git checkout main
git branch -D test-rollback-[batch-name]
```

### 7. Document Dependencies and Impact

```markdown
## Dependency Impact Analysis

### Files Depending on Changes

| Changed File | Dependent Files | Rollback Impact |
|--------------|----------------|-----------------|
| src/lib/db/schema.ts | All +page.server.ts files using DB | Must clear client caches |
| src/routes/+layout.svelte | All child routes | Layout will revert, check for breaking changes |
| src/hooks.server.ts | All server-side requests | Session handling may change |
| src/lib/components/Button.svelte | 15+ components using Button | Visual changes across app |

### External Dependencies

| Dependency | Type | Rollback Action |
|------------|------|-----------------|
| Database schema | SQLite/PostgreSQL | Run rollback migration |
| IndexedDB schema | Dexie.js | Clear client storage or version rollback |
| API endpoints | External service | Revert API integration code |
| Environment variables | .env | Restore previous .env values |
| Third-party packages | npm | Run `npm install` from checkpoint |

### Deployment Dependencies

| Environment | Dependency | Rollback Action |
|-------------|-----------|-----------------|
| Production | Vercel deployment | Rollback via Vercel dashboard or CLI |
| Database | Planetscale/Neon | Revert schema migration |
| CDN | Cloudflare | Clear cache after rollback |
| Auth | Clerk/Auth.js | Verify auth flow still works |
```

### 8. Identify Rollback Triggers

```markdown
## Rollback Decision Matrix

### Immediate Rollback (P0 - Execute Immediately)
- [ ] Build fails (`npm run build` errors)
- [ ] Critical tests fail (>50% of test suite)
- [ ] App doesn't start (`npm run dev` crashes)
- [ ] 500 errors on production homepage
- [ ] Authentication completely broken (users can't log in)
- [ ] Data loss or corruption detected
- [ ] Security vulnerability introduced

**Action**: Execute Option 3 (Hard Reset) or Option 5 (Deploy Previous Version)

### High Priority Rollback (P1 - Rollback Within 1 Hour)
- [ ] Core user flow broken (e.g., can't view content)
- [ ] Accessibility completely broken (screen reader non-functional)
- [ ] Performance degraded >50% (LCP goes from 1s to 2s+)
- [ ] Database migrations failing
- [ ] Significant visual regression on key pages
- [ ] Mobile experience broken

**Action**: Execute Option 1 (Selective Revert) or Option 2 (Commit Revert)

### Consider Rollback (P2 - Investigate First, Rollback if Can't Fix in 2 Hours)
- [ ] Minor visual regression (spacing, colors)
- [ ] Edge case interaction issue
- [ ] Non-critical feature broken
- [ ] Performance degraded 10-20%
- [ ] Failing tests on non-critical paths
- [ ] Console errors (not affecting functionality)

**Action**: Attempt fix first. If fix takes >2 hours, rollback and create ticket

### Continue with Fix (P3 - Create Bug Ticket)
- [ ] Minor visual difference from design
- [ ] Non-critical lint warnings
- [ ] TypeScript warnings (not errors)
- [ ] Accessibility improvements needed (but not broken)
- [ ] Performance could be better (but meets targets)

**Action**: Create issue, continue with forward fix
```

### 9. Define Verification Steps

```markdown
## Post-Rollback Verification Checklist

### Build & Test
- [ ] `npm run build` succeeds
- [ ] `npm run check` passes (TypeScript/Svelte)
- [ ] `npm test` passes (unit tests)
- [ ] `npm run test:e2e` passes (if applicable)
- [ ] `npm run lint` has no new errors

### Manual Testing
- [ ] Homepage loads correctly
- [ ] Navigation works
- [ ] User authentication flow works
- [ ] Key user journeys complete successfully
- [ ] Mobile responsive design intact
- [ ] Database queries return expected data
- [ ] Forms submit and validate correctly

### Performance
- [ ] Lighthouse score > [target] (e.g., 90)
- [ ] LCP < [target] (e.g., 2.5s)
- [ ] No console errors in browser

### Data Integrity
- [ ] Database schema matches expected state
- [ ] No orphaned records from migration
- [ ] User data intact (no data loss)
- [ ] IndexedDB/localStorage state valid

### Deployment
- [ ] Production deployment successful
- [ ] No 500 errors in logs
- [ ] CDN cache cleared (if applicable)
- [ ] SSL certificates valid
```

## Rollback Plan Template

```markdown
# Rollback Plan: [Batch Name]

**Created**: [YYYY-MM-DD HH:MM]
**Author**: [developer-name or agent-name]
**Risk Level**: [Low/Medium/High/Critical]
**Environment**: [dev/staging/production]

## Summary
[1-2 sentence description of changes being made]

## Checkpoint Information

| Item | Value |
|------|-------|
| Git Commit | `abc123def456789` |
| Git Tag | `checkpoint-[batch-name]` |
| Branch | `feature/[batch-name]` or `main` |
| Backup Branch | `backup/[batch-name]` |
| Date | [YYYY-MM-DD HH:MM] |
| Last Known Good Deployment | [deployment-url or commit] |

## Files Changed

| File | Type of Change | Risk Level | Backup Method |
|------|---------------|-----------|---------------|
| src/routes/+layout.svelte | Layout refactor | Medium | Git + manual |
| src/lib/db/schema.ts | Database schema | High | Git + manual + SQL backup |
| src/hooks.server.ts | Auth logic | High | Git + manual |
| vite.config.ts | Build config | Low | Git only |

## Database Changes

**Schema Changes**: [Yes/No]
**Data Migration**: [Yes/No]

**Forward Migration**: `src/lib/db/migrations/XXX_[name].sql`
**Rollback Migration**: `src/lib/db/migrations/XXX_[name]_down.sql`

**Rollback Command**:
```bash
npx tsx scripts/rollback-migration.ts XXX
```

## Rollback Commands

### Quick Rollback (Single File)
```bash
git checkout abc123def456 -- [file-path]
npm run build
npm test
```

### Full Batch Rollback (Recommended)
```bash
# Option A: Revert commit
git revert [batch-commit-hash]

# Option B: Hard reset (if not pushed)
git reset --hard abc123def456

# Option C: Restore from tag
git checkout checkpoint-[batch-name]
```

### Manual Restore (If Git Fails)
```bash
cp -r .backups/[batch-name]/* src/
npm run build
```

### Database Rollback
```bash
# Run down migration
sqlite3 data/app.db < src/lib/db/migrations/XXX_down.sql

# Or restore from backup
cp .backups/[batch-name]/app.db.backup data/app.db
```

### Production Rollback
```bash
# Vercel
vercel rollback [deployment-url]

# Or redeploy previous commit
git checkout [previous-commit]
git push origin main --force-with-lease
```

## Verification After Rollback

```bash
# Build
npm run build

# Type check
npm run check

# Test
npm test
npm run test:e2e

# Lint
npm run lint

# Manual test
npm run dev
# Navigate to http://localhost:5173
# Test key user flows
```

## Dependencies to Consider

### Files Dependent on Changes
- [list of files that import or use changed files]

### External Dependencies
- [ ] Database migration state
- [ ] Environment variables
- [ ] Third-party API integrations
- [ ] CDN cache
- [ ] IndexedDB schema version

### Rollback May Require Also Reverting
- [list of related changes that may need rollback]

## Rollback Triggers

| Condition | Priority | Action |
|-----------|----------|--------|
| Build fails | P0 | Immediate rollback |
| Tests fail (>50%) | P0 | Immediate rollback |
| Auth broken | P0 | Immediate rollback |
| Homepage 500 error | P0 | Immediate rollback |
| Core flow broken | P1 | Rollback within 1 hour |
| Performance >50% worse | P1 | Rollback within 1 hour |
| Visual regression | P2 | Investigate first, rollback if can't fix in 2h |
| Minor style issue | P3 | Continue with fix |

## Communication Plan

### If Rollback Executed
1. [ ] Notify team in Slack/Discord
2. [ ] Update status page (if production)
3. [ ] Create post-mortem ticket
4. [ ] Document what went wrong
5. [ ] Plan forward fix

### Stakeholders to Notify
- [ ] Engineering team
- [ ] Product manager
- [ ] QA team
- [ ] Users (if production issue)

## Post-Rollback Actions

1. [ ] Verify all rollback verification steps
2. [ ] Create bug report with details
3. [ ] Analyze what went wrong
4. [ ] Update tests to catch issue
5. [ ] Plan revised implementation approach
6. [ ] Schedule post-mortem meeting (if P0/P1)

## Notes
[Any additional context, warnings, or special considerations]

## Approval
- [ ] Plan reviewed by [team-lead/architect]
- [ ] Backup verified to be restorable
- [ ] Rollback procedure tested (dry run)
- [ ] Team notified of planned changes
```

## Expected Artifacts

| Artifact | Location | Purpose |
|----------|----------|---------|
| Rollback plan | `.backups/[batch-name]/ROLLBACK_PLAN.md` | Comprehensive rollback guide |
| File backups | `.backups/[batch-name]/` | Manual file restoration |
| Git checkpoint | Tag: `checkpoint-[batch-name]` | Git-based rollback point |
| Backup branch | `backup/[batch-name]` | Full branch backup |
| Backup manifest | `.backups/[batch-name]/MANIFEST.txt` | List of backed up files |
| Database backup | `.backups/[batch-name]/db.backup` | Database restoration point |

## Success Criteria
- [x] Git checkpoint created and tagged
- [x] All changed files documented with risk levels
- [x] Manual backups created for high-risk files
- [x] Database rollback strategy defined (if applicable)
- [x] Rollback commands ready and tested (dry run)
- [x] Verification steps defined
- [x] Dependencies mapped
- [x] Rollback triggers clearly defined
- [x] Team notified of planned changes
- [ ] Dry run rollback tested successfully
- [ ] Plan reviewed and approved

## Common Issues

### Issue: Can't rollback because of database migration
**Solution**: Always create down migrations. If missing, manually write SQL to reverse schema changes

### Issue: Rollback creates merge conflicts
**Solution**: Use `git revert` instead of `git reset` to create a new commit that undoes changes

### Issue: Production already deployed with bad code
**Solution**: Use platform-specific rollback (Vercel rollback, Netlify redeploy) to instantly restore previous version

### Issue: IndexedDB schema changed, can't rollback
**Solution**: Clear client storage and force re-sync from server, or implement schema versioning with Dexie.js

### Issue: Environment variables changed
**Solution**: Keep `.env` versions in `.backups/` directory and restore as part of rollback process
