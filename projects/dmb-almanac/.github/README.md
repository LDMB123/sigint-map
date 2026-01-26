# GitHub Actions Workflows

This directory contains the CI/CD workflows for DMB Almanac.

## Workflows Overview

### 🔍 CI Workflow (`ci.yml`)

Runs on every pull request and commit to main/develop.

**Purpose**: Ensure code quality and catch issues early

**Checks**:
- Linting (ESLint)
- Type checking (TypeScript)
- Unit tests (Vitest)
- WASM compilation
- Full build
- Bundle size analysis
- Accessibility audit
- Security scanning

**Typical Duration**: 5-8 minutes

**Status Badge**:
```markdown
![CI](https://github.com/USERNAME/dmb-almanac/workflows/CI/badge.svg)
```

### 🚀 Preview Deployment (`deploy-preview.yml`)

Deploys every pull request to a unique preview URL.

**Purpose**: Test changes in production-like environment

**Features**:
- Unique URL per PR
- Auto-comments on PR
- Lighthouse CI
- Smoke tests
- Updated on every commit

**URL Pattern**: `https://dmb-almanac-git-<branch>-<org>.vercel.app`

### 🎯 Staging Deployment (`deploy-staging.yml`)

Auto-deploys main branch to staging environment.

**Purpose**: Pre-production validation

**Features**:
- Automatic deployment
- Comprehensive testing
- Performance monitoring
- Health checks

**URL**: `https://staging.dmbalmanac.com`

### 🌟 Production Deployment (`deploy-production.yml`)

Manual deployment to production environment.

**Purpose**: Deploy to live site with safety checks

**Features**:
- Manual approval required
- Pre-deployment validation
- Post-deployment verification
- Performance monitoring
- Automatic rollback preparation

**URL**: `https://dmbalmanac.com`

**How to Deploy**:
1. Navigate to Actions → Deploy Production
2. Click "Run workflow"
3. Select "production" environment
4. Click "Run workflow"
5. Monitor progress

### 🔄 Emergency Rollback (`rollback.yml`)

Manual rollback for emergency situations.

**Purpose**: Quickly revert to previous working version

**Features**:
- Rollback to any commit
- Health verification
- Incident tracking

**How to Rollback**:
1. Navigate to Actions → Emergency Rollback
2. Click "Run workflow"
3. Fill in:
   - Environment: production/staging
   - Rollback to: (leave empty for previous)
   - Reason: brief description
4. Click "Run workflow"

See [ROLLBACK_PROCEDURE.md](../ROLLBACK_PROCEDURE.md) for details.

## Required Secrets

Configure these in Settings → Secrets and variables → Actions:

### Vercel
- `VERCEL_TOKEN` - Vercel API token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID

### VAPID Keys (Web Push)
- `VITE_VAPID_PUBLIC_KEY_PREVIEW`
- `VITE_VAPID_PUBLIC_KEY_STAGING`
- `VITE_VAPID_PUBLIC_KEY_PRODUCTION`
- `VAPID_PRIVATE_KEY_STAGING`
- `VAPID_PRIVATE_KEY_PRODUCTION`
- `VAPID_SUBJECT_STAGING`
- `VAPID_SUBJECT_PRODUCTION`

### API Keys
- `PUSH_API_KEY_STAGING`
- `PUSH_API_KEY_PRODUCTION`

### Optional
- `LHCI_GITHUB_APP_TOKEN` - Lighthouse CI
- `VITE_SENTRY_DSN` - Sentry error tracking

## Workflow Triggers

| Workflow | Trigger | When |
|----------|---------|------|
| CI | `pull_request`, `push` | On every PR and commit to main/develop |
| Preview | `pull_request` | On every PR to main |
| Staging | `push` to `main` | On merge to main |
| Production | `workflow_dispatch` | Manual only |
| Rollback | `workflow_dispatch` | Manual only (emergency) |

## Environment Variables

Workflows use different environment variables based on target environment:

### Preview
```bash
VITE_VAPID_PUBLIC_KEY=${{ secrets.VITE_VAPID_PUBLIC_KEY_PREVIEW }}
PUBLIC_SITE_URL=https://preview-${{ github.event.pull_request.number }}.dmbalmanac.com
```

### Staging
```bash
VITE_VAPID_PUBLIC_KEY=${{ secrets.VITE_VAPID_PUBLIC_KEY_STAGING }}
VAPID_PRIVATE_KEY=${{ secrets.VAPID_PRIVATE_KEY_STAGING }}
VAPID_SUBJECT=${{ secrets.VAPID_SUBJECT_STAGING }}
PUSH_API_KEY=${{ secrets.PUSH_API_KEY_STAGING }}
PUBLIC_SITE_URL=https://staging.dmbalmanac.com
```

### Production
```bash
VITE_VAPID_PUBLIC_KEY=${{ secrets.VITE_VAPID_PUBLIC_KEY_PRODUCTION }}
VAPID_PRIVATE_KEY=${{ secrets.VAPID_PRIVATE_KEY_PRODUCTION }}
VAPID_SUBJECT=${{ secrets.VAPID_SUBJECT_PRODUCTION }}
PUSH_API_KEY=${{ secrets.PUSH_API_KEY_PRODUCTION }}
PUBLIC_SITE_URL=https://dmbalmanac.com
```

## Caching Strategy

Workflows use caching to speed up builds:

- **npm dependencies**: Cached by `actions/setup-node`
- **Rust toolchain**: Cached by `actions-rust-lang/setup-rust-toolchain`
- **WASM builds**: Custom cache for `wasm/target` and `wasm/*/pkg`

Cache keys include file hashes for automatic invalidation.

## Performance Budgets

Enforced in `lighthouserc.json`:

- **Performance Score**: ≥90
- **Accessibility Score**: ≥95
- **Best Practices Score**: ≥90
- **SEO Score**: ≥95
- **First Contentful Paint**: <2000ms
- **Largest Contentful Paint**: <2500ms
- **Cumulative Layout Shift**: <0.1
- **Total Blocking Time**: <300ms

Bundle size limits:
- JavaScript chunks: <500KB
- WASM modules: <2MB per module

## Troubleshooting

### Workflow Fails

1. Check workflow logs in Actions tab
2. Look for specific job that failed
3. Review error messages
4. Try reproducing locally:
   ```bash
   npm ci
   npm run wasm:build
   npm run build
   npm test
   npm run check
   npm run lint
   ```

### WASM Build Fails

- Ensure Rust toolchain is up to date
- Check wasm-pack version
- Try building locally:
  ```bash
  cd app
  npm run wasm:build
  ```

### Deployment Fails

- Validate environment variables:
  ```bash
  ./scripts/validate-env.sh production
  ```
- Check Vercel logs
- Verify Vercel token hasn't expired

### Tests Fail on CI

- Check for race conditions
- Review screenshots/videos in artifacts
- Increase timeouts if needed
- Run locally with CI flag:
  ```bash
  CI=true npm test
  ```

## Monitoring Workflows

### GitHub Actions Dashboard

View workflow runs at:
```
https://github.com/USERNAME/dmb-almanac/actions
```

### Status Checks

Required status checks (configure in branch protection):
- CI Success
- Lint & Type Check
- Unit Tests
- Build

### Notifications

Configure notifications in GitHub settings:
- Email on workflow failure
- Slack integration (optional)
- Discord integration (optional)

## Best Practices

### For Developers

- ✅ Ensure CI passes before requesting review
- ✅ Test preview deployment before merging
- ✅ Monitor staging after merge
- ✅ Keep PRs small for faster CI runs

### For Reviewers

- ✅ Check CI status before approving
- ✅ Test preview deployment
- ✅ Review bundle size changes
- ✅ Verify performance metrics

### For Deployers

- ✅ Use deployment checklist
- ✅ Deploy during low-traffic hours
- ✅ Monitor for 30 minutes after deploy
- ✅ Have rollback plan ready

## Workflow Maintenance

### Regular Tasks

- **Weekly**: Review failed workflows
- **Monthly**: Update dependencies in workflows
- **Quarterly**: Rotate VAPID keys
- **Annually**: Review and optimize workflow performance

### Updating Workflows

1. Create branch for workflow changes
2. Test changes in PR (CI will run)
3. Merge only after verification
4. Monitor first few runs after merge

### Adding New Checks

To add a new check to CI:

1. Add job to `ci.yml`
2. Make it part of `ci-success` dependencies
3. Configure appropriate timeout
4. Test in PR

Example:
```yaml
new-check:
  name: New Check
  runs-on: ubuntu-latest
  timeout-minutes: 10
  steps:
    - uses: actions/checkout@v4
    - run: npm run new-check

# Add to ci-success needs:
ci-success:
  needs:
    - lint-and-type-check
    - unit-tests
    - build
    - new-check  # Add here
```

## Additional Resources

- [CI/CD Guide](../CI_CD_GUIDE.md)
- [Deployment Checklist](../DEPLOYMENT_CHECKLIST.md)
- [Rollback Procedure](../ROLLBACK_PROCEDURE.md)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Documentation](https://vercel.com/docs)
