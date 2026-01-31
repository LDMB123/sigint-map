# Emergency Rollback Procedure

This document provides step-by-step instructions for rolling back a problematic deployment.

## When to Rollback

### Immediate Rollback (P0 - Critical)
Execute rollback immediately if:
- Site is down or returning 5xx errors
- Critical security vulnerability discovered
- Data loss or corruption occurring
- Error rate >5% of requests
- Critical user flow completely broken (auth, payments, etc.)
- Service Worker causing infinite refresh loop

### Urgent Rollback (P1 - High Priority)
Execute rollback within 30 minutes if:
- Error rate >1% but <5%
- Major feature broken affecting >50% of users
- Performance degradation >30%
- Database issues causing data inconsistency
- Multiple user reports of critical issues

### Standard Rollback (P2 - Medium Priority)
Consider rollback within 2 hours if:
- Non-critical feature broken
- Performance degradation >15% but <30%
- Visual bugs affecting user experience
- Analytics or monitoring broken

## Rollback Methods

### Method 1: GitHub Actions (Recommended)

This is the safest and most auditable method.

#### Step 1: Identify Rollback Target

```bash
# View recent deployments
git log --oneline -10

# Check deployment history
cat deployments/production-latest.json
```

#### Step 2: Execute Rollback Workflow

1. Navigate to GitHub Actions in your repository
2. Select "Emergency Rollback" workflow
3. Click "Run workflow"
4. Fill in the form:
   - **Environment**: `production`
   - **Rollback to**: Leave empty for previous deployment, or specify commit SHA
   - **Reason**: Brief description of the issue
5. Click "Run workflow"

#### Step 3: Monitor Rollback

1. Watch the workflow execution in GitHub Actions
2. Monitor the deployment logs
3. Check the health check job completion

#### Step 4: Verify Rollback

1. Visit https://dmbalmanac.com
2. Test critical user flows
3. Check error monitoring dashboard
4. Verify Service Worker is functioning

### Method 2: Manual Vercel Rollback

If GitHub Actions is unavailable, use Vercel CLI.

#### Step 1: List Recent Deployments

```bash
cd app
vercel ls --prod
```

This shows recent production deployments with their URLs.

#### Step 2: Promote Previous Deployment

```bash
# Option A: Promote specific deployment by URL
vercel promote <deployment-url> --prod

# Option B: Rollback to previous deployment
vercel rollback --prod
```

#### Step 3: Verify Rollback

```bash
# Check current production URL
vercel ls --prod

# Test the site
curl -I https://dmbalmanac.com
```

### Method 3: Emergency Manual Deployment

If both GitHub Actions and Vercel rollback fail, deploy manually from a known-good commit.

#### Step 1: Checkout Previous Version

```bash
# Find the last known-good commit
git log --oneline

# Checkout that commit
git checkout <commit-sha>
```

#### Step 2: Execute Manual Deployment

```bash
cd app

# Install dependencies
npm ci

# Build WASM
npm run wasm:build

# Deploy to Vercel
vercel --prod
```

#### Step 3: Return to Main Branch

```bash
# After deployment succeeds
git checkout main
```

## Post-Rollback Checklist

### Immediate Actions (Within 5 Minutes)

- [ ] Verify site is accessible
- [ ] Test critical user flows:
  - [ ] Homepage loads
  - [ ] Search functionality works
  - [ ] Navigation works
  - [ ] Visualizations render
- [ ] Check error rate has returned to normal
- [ ] Verify Service Worker is functioning
- [ ] Check browser console for errors

### Within 30 Minutes

- [ ] Notify team of rollback completion
- [ ] Update status page (if applicable)
- [ ] Post announcement to users (if needed)
- [ ] Begin root cause analysis
- [ ] Create incident report

### Within 24 Hours

- [ ] Complete incident report
- [ ] Identify root cause
- [ ] Create fix plan
- [ ] Update tests to prevent recurrence
- [ ] Schedule hotfix deployment (if needed)

## Incident Response Template

Use this template when creating an incident report:

```markdown
# Incident Report: [Brief Description]

## Incident Summary
- **Date**: YYYY-MM-DD
- **Time**: HH:MM UTC
- **Duration**: X minutes
- **Severity**: P0/P1/P2
- **Affected Users**: X% or [specific user group]

## Timeline
- **HH:MM**: Issue first detected
- **HH:MM**: Rollback decision made
- **HH:MM**: Rollback initiated
- **HH:MM**: Rollback completed
- **HH:MM**: Verification completed

## Impact
- Error rate: X%
- Users affected: ~X
- Downtime: X minutes
- Features broken: [list]

## Root Cause
[Detailed explanation of what went wrong]

## Resolution
[Steps taken to resolve the issue]

## Prevention
- [ ] Add test coverage for [specific scenario]
- [ ] Improve monitoring for [specific metric]
- [ ] Update deployment checklist
- [ ] Add safeguard for [specific issue]

## Action Items
- [ ] [Action 1] - Assigned to [Person] - Due [Date]
- [ ] [Action 2] - Assigned to [Person] - Due [Date]

## Lessons Learned
[What we learned from this incident]
```

## Testing After Rollback

### Critical Paths to Test

1. **Homepage**
   ```bash
   curl -I https://dmbalmanac.com
   # Expect: HTTP 200
   ```

2. **Song Search**
   - Navigate to /songs
   - Perform search
   - Verify results load

3. **Show Browsing**
   - Navigate to /shows
   - Filter by year
   - Click on show detail

4. **Visualizations**
   - Navigate to /visualizations
   - Select a visualization
   - Verify WASM loads and renders

5. **PWA Features**
   - Check Service Worker registration
   - Test offline mode
   - Verify push notifications

### Automated Smoke Tests

```bash
cd app

# Run smoke tests against production
BASE_URL=https://dmbalmanac.com npm run test:e2e -- --grep="@smoke"
```

### Performance Verification

```bash
# Run Lighthouse against production
npx lighthouse https://dmbalmanac.com \
  --preset=desktop \
  --only-categories=performance,accessibility \
  --output=html \
  --output-path=./rollback-lighthouse-report.html
```

## Common Issues and Solutions

### Service Worker Won't Update

**Symptom**: Users still seeing broken version after rollback

**Solution**:
```javascript
// Have users hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
// Or clear Service Worker in DevTools → Application → Service Workers
```

**Prevention**: Ensure Service Worker version is properly updated in rollback

### Database Schema Mismatch

**Symptom**: App breaks due to schema changes in rolled-back version

**Solution**:
- Database migrations should always be backwards compatible
- If not possible, may need to rollback database as well
- Consider deploying database fix without full app rollback

**Prevention**: Always make migrations backwards compatible

### WASM Module Mismatch

**Symptom**: WASM modules don't load after rollback

**Solution**:
```bash
# Rebuild WASM modules for rollback version
git checkout <rollback-commit>
cd app
npm run wasm:build
vercel --prod
```

**Prevention**: Ensure WASM build is part of rollback workflow

### Cache Issues

**Symptom**: Users seeing cached broken version

**Solution**:
- CDN cache needs to be cleared
- Service Worker cache needs to be invalidated
- May need to bump Service Worker version

**Prevention**: Implement proper cache invalidation in deployments

## Monitoring During Rollback

### Key Metrics to Watch

```bash
# Error Rate (target: <0.1%)
# Check in Sentry or monitoring dashboard

# Response Time (target: <500ms p95)
# Check in performance monitoring

# 5xx Errors (target: 0)
# Check in Vercel logs

# Active Users
# Check in analytics - should remain stable
```

### Vercel Logs

```bash
# Stream production logs
vercel logs dmbalmanac.com --prod --follow

# Check for errors
vercel logs dmbalmanac.com --prod | grep -i error
```

## Communication Templates

### Internal Team Notification

```
🚨 Production Rollback in Progress

Environment: Production
Issue: [Brief description]
Impact: [User impact]
Status: Rollback initiated at [TIME]

Next Update: [TIME] (15 minutes)
```

### User Communication (if needed)

```
We've identified an issue affecting [feature] and are currently
resolving it. You may experience [specific impact] for the next
few minutes. We'll update you when resolved.
```

### Resolution Notification

```
✅ Issue Resolved

The issue affecting [feature] has been resolved. Everything
should be working normally now. Thank you for your patience.
```

## Escalation

If rollback doesn't resolve the issue:

1. **Check DNS**: Ensure DNS is pointing to correct servers
2. **Check CDN**: Verify CDN configuration and cache
3. **Check Vercel Status**: https://vercel-status.com
4. **Check Dependencies**: Verify third-party services are operational
5. **Contact Vercel Support**: If platform issue suspected

## Prevention Strategies

### Pre-Deployment
- Always test in staging first
- Run full test suite before deploying
- Use feature flags for risky changes
- Deploy during low-traffic hours

### Deployment Process
- Use progressive rollout when possible
- Monitor error rates during deployment
- Have rollback plan ready before deploying
- Use automated health checks

### Post-Deployment
- Monitor for at least 30 minutes after deployment
- Have on-call engineer ready
- Set up alerts for critical metrics
- Keep deployment window open for quick rollback

## Additional Resources

- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [GitHub Actions Workflows](.github/workflows/)
- [Environment Configuration](./app/.env.example)
- [Vercel Documentation](https://vercel.com/docs)
