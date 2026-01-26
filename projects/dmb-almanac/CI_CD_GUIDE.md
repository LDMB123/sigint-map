# CI/CD Guide for DMB Almanac

Complete guide to the continuous integration and deployment pipeline for DMB Almanac.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Workflows](#workflows)
- [Environments](#environments)
- [Setup Instructions](#setup-instructions)
- [Deployment Process](#deployment-process)
- [Monitoring & Alerts](#monitoring--alerts)
- [Troubleshooting](#troubleshooting)

## Overview

The DMB Almanac uses a multi-stage CI/CD pipeline with GitHub Actions and Vercel for automated testing, building, and deployment.

### Key Features

- **Automated Testing**: Runs on every PR and commit
- **Performance Budgets**: Enforced via Lighthouse CI
- **Accessibility Checks**: Automated a11y audits
- **Progressive Deployments**: Preview → Staging → Production
- **One-Click Rollback**: Emergency rollback via GitHub Actions
- **WASM Support**: Builds Rust-based WASM modules
- **Security Scanning**: Dependency and secret scanning

### Pipeline Stages

```
┌─────────────┐
│  Pull       │
│  Request    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  CI Checks (Parallel)           │
│  • Lint & Type Check            │
│  • Unit Tests                   │
│  • WASM Build                   │
│  • Build Application            │
│  • Bundle Analysis              │
│  • Accessibility Audit          │
│  • Security Audit               │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Preview Deployment             │
│  • Deploy to Vercel             │
│  • Lighthouse CI                │
│  • Smoke Tests                  │
└──────┬──────────────────────────┘
       │
       ▼ (on merge to main)
┌─────────────────────────────────┐
│  Staging Deployment             │
│  • Deploy to Staging            │
│  • Smoke Tests                  │
│  • Performance Check            │
│  • Health Monitoring            │
└──────┬──────────────────────────┘
       │
       ▼ (manual approval)
┌─────────────────────────────────┐
│  Production Deployment          │
│  • Pre-deployment Checks        │
│  • Deploy to Production         │
│  • Smoke Tests                  │
│  • Health Monitoring            │
│  • Performance Validation       │
│  • Prepare Rollback             │
└─────────────────────────────────┘
```

## Architecture

### Technology Stack

- **CI/CD Platform**: GitHub Actions
- **Hosting Platform**: Vercel
- **Build Tools**: Vite, SvelteKit
- **WASM Compiler**: Rust + wasm-pack
- **Testing**: Vitest (unit), Playwright (E2E)
- **Performance**: Lighthouse CI
- **Accessibility**: axe-core

### Workflow Files

```
.github/workflows/
├── ci.yml                    # Main CI pipeline
├── deploy-preview.yml        # PR preview deployments
├── deploy-staging.yml        # Staging deployments
├── deploy-production.yml     # Production deployments
└── rollback.yml             # Emergency rollback
```

## Workflows

### 1. CI Workflow (`ci.yml`)

**Triggers**: Pull requests and pushes to main/develop

**Jobs**:
- **lint-and-type-check**: ESLint, TypeScript type checking
- **unit-tests**: Runs Vitest unit tests
- **build-wasm**: Compiles Rust WASM modules
- **build**: Builds complete application
- **bundle-analysis**: Checks bundle sizes
- **accessibility-audit**: Runs axe accessibility tests
- **security-audit**: npm audit + secret scanning

**Performance**:
- Jobs run in parallel for speed
- WASM build cached between runs
- Typical completion time: ~5-8 minutes

### 2. Preview Deployment (`deploy-preview.yml`)

**Triggers**: Pull requests to main

**Jobs**:
- **deploy-preview**: Builds and deploys to Vercel preview URL
- **lighthouse-ci**: Runs Lighthouse performance tests
- **smoke-tests**: Runs critical E2E tests

**Features**:
- Unique URL per PR
- Auto-comments on PR with preview link
- Updated on every commit
- Cleaned up on PR close

### 3. Staging Deployment (`deploy-staging.yml`)

**Triggers**: Commits to main branch

**Jobs**:
- **deploy-staging**: Deploys to staging environment
- **smoke-tests**: Comprehensive E2E testing
- **performance-check**: Lighthouse audit
- **health-check**: API and route verification

**Staging URL**: `https://staging.dmbalmanac.com`

### 4. Production Deployment (`deploy-production.yml`)

**Triggers**: Manual workflow dispatch only

**Jobs**:
- **pre-deployment-checks**: Validates deployment conditions
- **deploy-production**: Builds and deploys to production
- **smoke-tests**: Critical path verification
- **health-monitoring**: Multi-route health checks
- **performance-validation**: Production Lighthouse audit
- **prepare-rollback**: Creates rollback point

**Production URL**: `https://dmbalmanac.com`

**Safety Features**:
- Manual approval required
- Pre-deployment validation
- Automatic health checks
- Rollback preparation
- Git tag creation

### 5. Rollback Workflow (`rollback.yml`)

**Triggers**: Manual workflow dispatch (emergency only)

**Jobs**:
- **validate-rollback**: Validates rollback target
- **execute-rollback**: Deploys previous version
- **verify-rollback**: Tests deployment health
- **post-rollback**: Creates incident report

**Usage**: See [ROLLBACK_PROCEDURE.md](./ROLLBACK_PROCEDURE.md)

## Environments

### Preview Environment
- **Purpose**: Test PRs before merge
- **URL Pattern**: `https://dmb-almanac-*.vercel.app`
- **Lifetime**: Duration of PR
- **Environment Variables**: Preview-specific VAPID keys

### Staging Environment
- **Purpose**: Pre-production validation
- **URL**: `https://staging.dmbalmanac.com`
- **Deployment**: Auto-deploy from main branch
- **Environment Variables**: Staging-specific credentials
- **Data**: Production-like test data

### Production Environment
- **Purpose**: Live user-facing site
- **URL**: `https://dmbalmanac.com`
- **Deployment**: Manual approval required
- **Environment Variables**: Production secrets
- **Data**: Real production data

## Setup Instructions

### Prerequisites

1. **GitHub Repository Secrets**

```bash
# Vercel credentials
VERCEL_TOKEN                    # Vercel API token
VERCEL_ORG_ID                   # Vercel organization ID
VERCEL_PROJECT_ID               # Vercel project ID

# VAPID keys for each environment
VITE_VAPID_PUBLIC_KEY_PREVIEW
VITE_VAPID_PUBLIC_KEY_STAGING
VITE_VAPID_PUBLIC_KEY_PRODUCTION

VAPID_PRIVATE_KEY_STAGING
VAPID_PRIVATE_KEY_PRODUCTION

VAPID_SUBJECT_STAGING
VAPID_SUBJECT_PRODUCTION

# API keys
PUSH_API_KEY_STAGING
PUSH_API_KEY_PRODUCTION

# Optional: Analytics and monitoring
LHCI_GITHUB_APP_TOKEN          # Lighthouse CI token
VITE_SENTRY_DSN                # Sentry error tracking
```

2. **Generate VAPID Keys**

```bash
cd app
npx web-push generate-vapid-keys
```

Save the output to GitHub Secrets.

3. **Generate API Keys**

```bash
openssl rand -base64 32
```

### Local Development Setup

1. **Clone Repository**

```bash
git clone <repository-url>
cd dmb-almanac/app
```

2. **Install Dependencies**

```bash
npm ci
```

3. **Setup Environment Variables**

```bash
cp .env.example .env
# Edit .env with your keys
```

4. **Build WASM Modules**

```bash
npm run wasm:build
```

5. **Start Development Server**

```bash
npm run dev
```

### Vercel Setup

1. **Link Project**

```bash
cd app
vercel link
```

2. **Configure Environments**

```bash
# Set preview environment variables
vercel env add VITE_VAPID_PUBLIC_KEY preview

# Set staging environment variables
vercel env add VITE_VAPID_PUBLIC_KEY preview
vercel env add VAPID_PRIVATE_KEY preview

# Set production environment variables
vercel env add VITE_VAPID_PUBLIC_KEY production
vercel env add VAPID_PRIVATE_KEY production
```

## Deployment Process

### Deploying a Feature

1. **Create Feature Branch**

```bash
git checkout -b feature/my-feature
```

2. **Develop and Test Locally**

```bash
npm run dev
npm test
npm run check
npm run lint
```

3. **Create Pull Request**

```bash
git push origin feature/my-feature
# Create PR in GitHub
```

4. **Automated Checks**
   - CI workflow runs automatically
   - Preview deployment created
   - Lighthouse CI validates performance
   - Smoke tests verify critical paths

5. **Review and Merge**
   - Code review by team
   - All checks must pass
   - Merge to main

6. **Staging Deployment**
   - Automatically deploys to staging
   - Team validates on staging
   - Monitor for 24+ hours

7. **Production Deployment**
   - Navigate to Actions → Deploy Production
   - Click "Run workflow"
   - Select "production" environment
   - Click "Run workflow"
   - Monitor deployment progress

### Manual Deployment (Emergency)

```bash
cd app
./scripts/deploy.sh production
```

See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for full checklist.

## Monitoring & Alerts

### Key Metrics

1. **Error Rate**
   - Target: <0.1%
   - Alert threshold: >1%
   - Critical threshold: >5%

2. **Performance**
   - LCP: <2.5s
   - FID: <100ms
   - CLS: <0.1
   - Lighthouse Performance: >90

3. **Availability**
   - Target: 99.9% uptime
   - Health check every 5 minutes

4. **Bundle Sizes**
   - JS chunks: <500KB
   - WASM modules: <2MB per module
   - Total initial load: <1MB (excluding WASM)

### Monitoring Tools

- **Vercel Analytics**: Real-time metrics
- **Lighthouse CI**: Performance trends
- **GitHub Actions**: Build and deploy status
- **Sentry** (optional): Error tracking
- **Google Analytics** (optional): User behavior

### Setting Up Alerts

Configure alerts in your monitoring service for:
- Error rate >1%
- Response time p95 >1s
- Build failures
- Deployment failures

## Troubleshooting

### Common Issues

#### CI Build Fails

**Symptom**: CI workflow failing on build step

**Solutions**:
```bash
# Check locally first
npm ci
npm run wasm:build
npm run build

# View detailed logs in GitHub Actions
```

#### WASM Build Fails

**Symptom**: WASM modules fail to compile

**Solutions**:
```bash
# Ensure Rust toolchain is installed
rustup update

# Check wasm-pack version
wasm-pack --version

# Try building individually
cd wasm/dmb-transform
wasm-pack build --target web --release
```

#### Deployment Fails

**Symptom**: Vercel deployment fails

**Solutions**:
```bash
# Check environment variables
./scripts/validate-env.sh production

# Try deploying locally
vercel --prod

# Check Vercel logs
vercel logs dmbalmanac.com --prod
```

#### Tests Fail on CI but Pass Locally

**Symptom**: E2E tests fail in CI

**Solutions**:
- Increase timeouts for CI environment
- Check for race conditions
- Review screenshots/videos from failed tests
- Run tests in headless mode locally:
  ```bash
  npm run test:e2e
  ```

#### Performance Budget Exceeded

**Symptom**: Lighthouse CI fails due to bundle size

**Solutions**:
```bash
# Analyze bundle
npm run build
npx vite-bundle-visualizer

# Check for large dependencies
npm run analyze

# Review chunk sizes
du -sh build/_app/immutable/chunks/*
```

### Debug Commands

```bash
# View deployment logs
vercel logs dmbalmanac.com --prod --follow

# Check build output locally
npm run build
ls -lh build/

# Test service worker
npm run preview
# Open http://localhost:4173 in browser
# Check Application → Service Workers in DevTools

# Run specific test
npm run test:e2e -- --grep "homepage loads"

# Debug Playwright test
npm run test:e2e:debug
```

### Getting Help

1. Check workflow logs in GitHub Actions
2. Review [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
3. Check [ROLLBACK_PROCEDURE.md](./ROLLBACK_PROCEDURE.md)
4. Contact DevOps team
5. Check Vercel status: https://vercel-status.com

## Best Practices

### Development

- ✅ Always create feature branches
- ✅ Test locally before pushing
- ✅ Keep PRs small and focused
- ✅ Write tests for new features
- ✅ Run `npm run check` before committing

### Deployment

- ✅ Deploy to staging first
- ✅ Monitor staging for 24+ hours
- ✅ Use deployment checklist
- ✅ Deploy during low-traffic hours
- ✅ Have rollback plan ready

### Monitoring

- ✅ Watch error rates after deployment
- ✅ Check performance metrics
- ✅ Review user feedback
- ✅ Set up alerts for critical metrics
- ✅ Document incidents

### Security

- ✅ Rotate VAPID keys every 90 days
- ✅ Never commit secrets
- ✅ Use environment-specific credentials
- ✅ Run security audits regularly
- ✅ Keep dependencies updated

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Documentation](https://vercel.com/docs)
- [Playwright Documentation](https://playwright.dev)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- [ROLLBACK_PROCEDURE.md](./ROLLBACK_PROCEDURE.md)
