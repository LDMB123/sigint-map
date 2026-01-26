# DMB Almanac Deployment Checklist

This checklist ensures safe, reliable deployments to production.

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing locally (`npm test`)
- [ ] No TypeScript errors (`npm run check`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Code reviewed and approved by at least one team member
- [ ] Branch is up-to-date with `main`

### Testing
- [ ] Unit tests updated for new features
- [ ] E2E smoke tests passing locally
- [ ] Manual testing completed for changed features
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile testing (iOS Safari, Android Chrome)
- [ ] Offline functionality verified (PWA features)

### WASM Modules
- [ ] WASM modules build successfully (`npm run wasm:build`)
- [ ] WASM module sizes within acceptable limits (<2MB per module)
- [ ] WASM functionality tested in development

### Environment Configuration
- [ ] Environment variables validated (`./scripts/validate-env.sh production`)
- [ ] VAPID keys configured correctly
- [ ] Push notification API key is secure and rotated regularly
- [ ] PUBLIC_SITE_URL is correct for environment
- [ ] Analytics IDs configured (if using)
- [ ] Sentry DSN configured (if using)

### Database & Data
- [ ] No database schema changes (or migration plan ready)
- [ ] Compressed data files are up-to-date
- [ ] Data verification completed
- [ ] No breaking changes to IndexedDB schema

### Service Worker
- [ ] Service Worker version bumped if cache strategy changed
- [ ] Service Worker tested in development
- [ ] No breaking changes to SW-client communication
- [ ] Cache invalidation strategy verified

### Performance
- [ ] Bundle size checked and within limits
  - [ ] JavaScript chunks <500KB
  - [ ] WASM modules <2MB
  - [ ] Total initial load <1MB (without WASM)
- [ ] Lighthouse scores meet targets locally
  - [ ] Performance: ≥90
  - [ ] Accessibility: ≥95
  - [ ] Best Practices: ≥90
  - [ ] SEO: ≥95
- [ ] Core Web Vitals acceptable
  - [ ] LCP <2.5s
  - [ ] FID <100ms
  - [ ] CLS <0.1

### Security
- [ ] No secrets in code or version control
- [ ] Dependencies audited (`npm audit`)
- [ ] Security headers configured
- [ ] HTTPS enforced
- [ ] Content Security Policy reviewed

### Documentation
- [ ] README updated if deployment process changed
- [ ] CHANGELOG updated with release notes
- [ ] Breaking changes documented
- [ ] Migration guide created (if needed)

## Deployment Process

### Staging Deployment
1. [ ] Merge PR to `main` branch
2. [ ] Automated staging deployment triggers
3. [ ] Wait for CI checks to pass
4. [ ] Verify staging deployment health
5. [ ] Run smoke tests on staging
6. [ ] Manual testing on staging environment
7. [ ] Lighthouse CI passes on staging

### Production Deployment
1. [ ] Verify staging deployment is stable (minimum 24 hours)
2. [ ] No critical issues in staging
3. [ ] Team notification: "Production deployment starting"
4. [ ] Trigger production workflow in GitHub Actions
5. [ ] Monitor deployment progress
6. [ ] Wait for health checks to pass

### Post-Deployment Verification
- [ ] Production site is accessible (https://dmbalmanac.com)
- [ ] Critical user flows tested:
  - [ ] Homepage loads
  - [ ] Song search works
  - [ ] Show browsing works
  - [ ] Visualizations render
  - [ ] PWA install prompt appears (if applicable)
  - [ ] Push notifications can be subscribed to
  - [ ] Offline mode works
- [ ] Service Worker registered successfully
- [ ] No JavaScript errors in browser console
- [ ] No 404s or broken links
- [ ] Analytics tracking working
- [ ] Performance meets targets (run Lighthouse)

### Monitoring (First 24 Hours)
- [ ] Error rate normal in Sentry (if configured)
- [ ] Performance metrics acceptable
- [ ] No spike in 404s or 5xx errors
- [ ] User engagement metrics normal
- [ ] No unusual support requests

## Rollback Criteria

Immediately rollback if:
- ❌ Error rate >5% of requests
- ❌ Critical user flows broken
- ❌ Performance degradation >30%
- ❌ Security vulnerability discovered
- ❌ Data loss or corruption
- ❌ Service Worker causing infinite refresh loop

Consider rollback if:
- ⚠️  Error rate >1% of requests
- ⚠️  Performance degradation >15%
- ⚠️  Negative user feedback spike
- ⚠️  Non-critical feature broken

## Rollback Procedure

See [ROLLBACK_PROCEDURE.md](./ROLLBACK_PROCEDURE.md) for detailed steps.

Quick rollback:
```bash
# Via GitHub Actions
# Navigate to Actions → Emergency Rollback → Run workflow

# Via CLI (if needed)
./scripts/rollback.sh production
```

## Post-Deployment Tasks

### Immediate (Within 1 Hour)
- [ ] Announcement posted (if user-facing changes)
- [ ] Team notified of successful deployment
- [ ] Deployment record created
- [ ] Git tag created for release

### Within 24 Hours
- [ ] Monitor error rates and performance
- [ ] Review analytics for anomalies
- [ ] Collect user feedback
- [ ] Update documentation if needed

### Within 1 Week
- [ ] Review deployment retrospective
- [ ] Update runbooks based on learnings
- [ ] Schedule VAPID key rotation (if >90 days old)
- [ ] Plan next release

## Emergency Contacts

- **DevOps Lead**: [Name/Slack]
- **Technical Lead**: [Name/Slack]
- **On-Call Engineer**: [PagerDuty/Slack]

## Useful Commands

```bash
# Validate environment
./scripts/validate-env.sh production

# Manual deployment (use GitHub Actions instead)
./scripts/deploy.sh production

# Check deployment status
vercel ls --prod

# View production logs
vercel logs dmbalmanac.com --prod

# Rollback
./scripts/rollback.sh production
```

## Additional Resources

- [CI/CD Workflows](.github/workflows/)
- [Rollback Procedure](./ROLLBACK_PROCEDURE.md)
- [Environment Setup](./app/.env.example)
- [Architecture Documentation](./.claude/docs/)
