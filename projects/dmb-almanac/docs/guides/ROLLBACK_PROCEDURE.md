# Emergency Rollback Procedure

## When to Rollback

### P0 - Critical (immediate)
- Site down / 5xx errors
- Critical security vulnerability
- Data loss/corruption
- Error rate >5%
- Critical user flow broken (auth, payments)
- Service Worker infinite refresh loop

### P1 - High (within 30 min)
- Error rate 1-5%
- Major feature broken affecting >50% users
- Performance degradation >30%
- Database data inconsistency

### P2 - Medium (within 2 hrs)
- Non-critical feature broken
- Performance degradation 15-30%
- Visual bugs affecting UX
- Analytics/monitoring broken

## Method 1: GitHub Actions (Recommended)

### Step 1: Identify Target
```bash
git log --oneline -10
cat deployments/production-latest.json
```

### Step 2: Execute
- GitHub Actions > "Emergency Rollback" workflow > Run workflow
- Fill: Environment=`production`, Rollback to=commit SHA (or blank for prev), Reason

### Step 3: Monitor
- Watch workflow execution in GitHub Actions
- Monitor deployment logs
- Check health check job completion

### Step 4: Verify
- Visit https://dmbalmanac.com
- Test critical user flows
- Check error monitoring dashboard
- Verify Service Worker functioning

## Method 2: Vercel CLI

### List Deployments
```bash
cd app
vercel ls --prod
```

### Promote Previous
```bash
vercel promote <deployment-url> --prod   # specific deployment
vercel rollback --prod                   # previous deployment
```

### Verify
```bash
vercel ls --prod
curl -I https://dmbalmanac.com
```

## Method 3: Manual Deploy (last resort)

```bash
git log --oneline              # find last good commit
git checkout <commit-sha>
cd app
npm ci
bash scripts/build-wasm.sh
vercel --prod
git checkout main              # return after success
```

## Post-Rollback Checklist

### Within 5 Minutes
- [ ] Site accessible
- [ ] Homepage loads
- [ ] Search works
- [ ] Navigation works
- [ ] Visualizations render
- [ ] Error rate normal
- [ ] Service Worker functioning
- [ ] No console errors

### Within 30 Minutes
- [ ] Notify team
- [ ] Update status page
- [ ] Post user announcement (if needed)
- [ ] Begin root cause analysis
- [ ] Create incident report

### Within 24 Hours
- [ ] Complete incident report
- [ ] Identify root cause
- [ ] Create fix plan
- [ ] Update tests to prevent recurrence
- [ ] Schedule hotfix (if needed)

## Incident Report Template

```markdown
# Incident Report: [Brief Description]

- **Date**: YYYY-MM-DD
- **Time**: HH:MM UTC
- **Duration**: X minutes
- **Severity**: P0/P1/P2
- **Affected Users**: X% or [group]

## Timeline
- HH:MM: Issue detected
- HH:MM: Rollback decision
- HH:MM: Rollback initiated
- HH:MM: Rollback completed
- HH:MM: Verification completed

## Impact
- Error rate: X%
- Users affected: ~X
- Downtime: X min
- Features broken: [list]

## Root Cause
[Explanation]

## Prevention
- [ ] Add test coverage for [scenario]
- [ ] Improve monitoring for [metric]
- [ ] Update deployment checklist
```

## Testing After Rollback

### Critical Paths
```bash
curl -I https://dmbalmanac.com   # expect HTTP 200
```
- /songs - search + verify results
- /shows - filter by year + click detail
- /visualizations - select viz, verify WASM renders
- PWA: SW registration, offline mode, push notifications

### Automated Smoke Tests
```bash
cd app
BASE_URL=https://dmbalmanac.com npm run test:e2e -- --grep="@smoke"
```

### Lighthouse
```bash
npx lighthouse https://dmbalmanac.com \
  --preset=desktop \
  --only-categories=performance,accessibility \
  --output=html \
  --output-path=./rollback-lighthouse-report.html
```

## Common Issues

### Service Worker Won't Update
- Users: hard refresh (Cmd+Shift+R / Ctrl+Shift+R) or clear SW in DevTools
- Prevention: ensure SW version updated in rollback

### Database Schema Mismatch
- Migrations must be backwards compatible
- May need separate DB rollback
- Consider DB-only fix without full app rollback

### WASM Module Mismatch
```bash
git checkout <rollback-commit>
cd app && bash scripts/build-wasm.sh && vercel --prod
```
- Prevention: include WASM build in rollback workflow

### Cache Issues
- Clear CDN cache
- Invalidate SW cache
- Bump SW version

## Monitoring During Rollback

### Key Metrics
- Error rate: target <0.1%
- Response time: target <500ms p95
- 5xx errors: target 0
- Active users: should remain stable

### Vercel Logs
```bash
vercel logs dmbalmanac.com --prod --follow
vercel logs dmbalmanac.com --prod | grep -i error
```

## Escalation (if rollback doesn't resolve)
1. Check DNS pointing to correct servers
2. Verify CDN config and cache
3. Check Vercel Status: https://vercel-status.com
4. Verify third-party services operational
5. Contact Vercel Support if platform issue

## Prevention

### Pre-Deployment
- Test in staging first
- Run full test suite
- Use feature flags for risky changes
- Deploy during low-traffic hours

### During Deployment
- Progressive rollout when possible
- Monitor error rates
- Have rollback plan ready
- Use automated health checks

### Post-Deployment
- Monitor 30 min after deploy
- On-call engineer ready
- Alerts on critical metrics
- Keep deployment window open for quick rollback
