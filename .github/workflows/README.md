# GitHub Actions Workflows Documentation

Comprehensive CI/CD pipelines for automated validation, testing, and deployment.

## Status Badges

![Validate Agents](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/validate-agents.yml/badge.svg)
![Validate OpenAPI](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/validate-openapi.yml/badge.svg)
![Performance Benchmarks](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/benchmark.yml/badge.svg)
![Security Scan](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/security.yml/badge.svg)
![Deploy Docs](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/deploy-docs.yml/badge.svg)
![Dependency Audit](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/audit-deps.yml/badge.svg)

## Workflows Overview

### 1. Agent Validation Workflow (`validate-agents.yml`)

**Purpose**: Validates the entire agent framework including YAML syntax, collaboration contracts, and schema compliance.

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main`
- Changes to `.claude/agents/**/*.yaml` or `.claude/config/**/*.yaml`

**Jobs**:
- `yaml-validation`: Validates all YAML files for syntax errors
- `contract-validation`: Ensures agents have required fields (name, role, triggers, inputs, outputs)
- `schema-validation`: Runs test suite if package.json exists
- `markdown-lint`: Lints documentation files
- `summary`: Generates comprehensive validation report

**Success Criteria**:
- All YAML files parse successfully
- All agents have required contract fields
- Tests pass (if configured)
- Documentation follows markdown standards

---

### 2. OpenAPI Validation Workflow (`validate-openapi.yml`)

**Purpose**: Validates OpenAPI specifications, detects breaking changes, and generates API documentation.

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main`
- Changes to `.claude/api/**/*.yaml` or agent API specs

**Jobs**:
- `validate-openapi`: Validates OpenAPI 3.1 syntax using Redocly CLI
- `generate-docs`: Generates HTML documentation from specs (main branch only)
- `security-scan`: Runs OWASP API security audit
- `summary`: Aggregates validation results

**Artifacts**:
- API documentation HTML files (30-day retention)

**Breaking Change Detection**:
- Compares PR version against base branch
- Reports API compatibility issues

---

### 3. Performance Benchmarks Workflow (`benchmark.yml`)

**Purpose**: Measures agent framework performance and detects regressions.

**Triggers**:
- Push to `main` branch
- Pull requests to `main`
- Weekly schedule (Sunday at midnight UTC)
- Manual dispatch

**Jobs**:
- `agent-performance`: Benchmarks agent discovery, parsing, and validation
- `script-performance`: Tests shell script execution times
- `summary`: Generates performance comparison report

**Metrics Tracked**:
- Agent file discovery time
- YAML parsing time
- Validation time
- Total framework load time
- Per-agent average time

**Performance Thresholds**:
- Maximum load time: 5000ms (5 seconds)
- Regression alert: >20% slower than baseline

**Artifacts**:
- Benchmark results JSON (90-day retention)
- Script benchmark report (30-day retention)

---

### 4. Security Scan Workflow (`security.yml`)

**Purpose**: Comprehensive security scanning including filesystem, secrets, dependencies, and code analysis.

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main`
- Daily schedule (2 AM UTC)
- Manual dispatch

**Jobs**:
- `filesystem-scan`: Trivy filesystem security scan
- `secret-scanning`: TruffleHog + custom pattern detection
- `dependency-security`: npm and Python dependency audits
- `code-scanning`: CodeQL static analysis
- `permissions-audit`: Checks for dangerous file permissions
- `summary`: Security status report

**Security Patterns Detected**:
- Hardcoded passwords, API keys, tokens
- Private keys (RSA, DSA, EC, OpenSSH)
- AWS access keys
- GitHub personal access tokens

**Compliance**:
- Results uploaded to GitHub Security tab
- SARIF format for integration with GitHub Advanced Security

---

### 5. Documentation Deployment Workflow (`deploy-docs.yml`)

**Purpose**: Builds and deploys documentation to GitHub Pages.

**Triggers**:
- Push to `main` branch
- Changes to `.claude/docs/**` or `.claude/**/*.md`
- Manual dispatch

**Jobs**:
- `build-docs`: Generates documentation site from markdown
- `deploy`: Deploys to GitHub Pages
- `summary`: Deployment status report

**Generated Content**:
- Agent catalog index
- Converted markdown to HTML
- API documentation (if OpenAPI specs exist)
- Navigation hub

**Artifacts**:
- Complete documentation site (90-day retention)

**GitHub Pages Setup Required**:
1. Enable GitHub Pages in repository settings
2. Set source to "GitHub Actions"
3. Configure custom domain (optional)

---

### 6. Dependency Audit Workflow (`audit-deps.yml`)

**Purpose**: Audits npm and Python dependencies for vulnerabilities, outdated packages, and license compliance.

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main`
- Weekly schedule (Monday at 8 AM UTC)
- Changes to package.json, package-lock.json, or requirements.txt
- Manual dispatch

**Jobs**:
- `npm-audit`: Security audit of npm dependencies
- `outdated-check`: Identifies outdated packages
- `python-audit`: Safety and pip-audit for Python packages
- `license-check`: License compliance verification
- `summary`: Comprehensive audit report

**Vulnerability Thresholds**:
- Critical vulnerabilities: Immediate failure
- High vulnerabilities: Fails if >5 found
- Moderate/Low: Reported but doesn't fail build

**Artifacts**:
- npm audit report (30-day retention)
- Outdated packages report (30-day retention)
- Python security report (30-day retention)
- License compliance report (30-day retention)

---

## Workflow Best Practices

### Caching Strategy

All workflows utilize caching to improve performance:

- **Node.js**: `actions/setup-node@v4` with `cache: 'npm'`
- **Python**: `actions/setup-python@v5` with `cache: 'pip'`
- **Dependencies**: Cached using package lock files

### Error Handling

- Workflows use `continue-on-error: true` for non-critical steps
- `if: always()` ensures summary jobs run even on failures
- Proper exit codes for threshold violations

### Parallel Execution

Jobs are designed for parallel execution where possible:

```
yaml-validation → [contract-validation, schema-validation] → summary
```

### Artifact Management

- Short retention (30 days) for reports and logs
- Long retention (90 days) for benchmarks and documentation
- Automatic cleanup prevents storage bloat

---

## Setup Instructions

### 1. Repository Configuration

Update badge URLs in this README:
```markdown
![Workflow Name](https://github.com/USERNAME/REPO/actions/workflows/FILE.yml/badge.svg)
```

### 2. Required Secrets (Optional)

No secrets required for basic functionality. For enhanced features:

- `CODECOV_TOKEN`: For code coverage uploads (optional)
- Custom deployment tokens (if deploying elsewhere)

### 3. Enable GitHub Pages

For documentation deployment:
1. Go to repository Settings → Pages
2. Source: "GitHub Actions"
3. Save configuration

### 4. Branch Protection Rules (Recommended)

Configure branch protection for `main`:
- Require status checks to pass
- Select workflows: `validate-agents`, `security`, `npm-audit`
- Require branches to be up to date

### 5. Notification Configuration

Configure GitHub notifications for workflow failures:
1. Repository Settings → Notifications
2. Set up Slack/email integrations (optional)

---

## Manual Workflow Execution

All workflows support manual triggering:

```bash
# Via GitHub CLI
gh workflow run validate-agents.yml
gh workflow run benchmark.yml
gh workflow run security.yml

# View workflow runs
gh run list --workflow=validate-agents.yml
```

Or use the GitHub Actions UI:
1. Actions tab → Select workflow
2. Click "Run workflow"
3. Choose branch and trigger

---

## Troubleshooting

### Common Issues

**Issue**: YAML validation fails
- **Solution**: Run `python3 -c "import yaml; yaml.safe_load(open('file.yaml'))"`

**Issue**: npm audit not running
- **Solution**: Ensure `.claude/package.json` exists

**Issue**: Documentation not deploying
- **Solution**: Check GitHub Pages is enabled with "GitHub Actions" source

**Issue**: Benchmark regression false positive
- **Solution**: Baseline may be stale, manually update `.claude/benchmarks/baseline.json`

### Debug Mode

Enable workflow debugging:
```bash
# Set repository secret
ACTIONS_STEP_DEBUG=true
ACTIONS_RUNNER_DEBUG=true
```

---

## Maintenance

### Weekly Tasks
- Review dependency audit reports
- Check for security vulnerabilities
- Monitor performance benchmarks

### Monthly Tasks
- Update workflow actions to latest versions
- Review and clean up old artifacts
- Update documentation

### Quarterly Tasks
- Review and update performance thresholds
- Audit workflow efficiency
- Update security scanning tools

---

## Workflow Dependency Graph

```
Push/PR Event
│
├─→ validate-agents.yml (parallel validation jobs)
├─→ validate-openapi.yml (API validation + docs)
├─→ security.yml (security scans)
└─→ audit-deps.yml (dependency checks)

Main Push Event
│
├─→ benchmark.yml (performance tracking)
└─→ deploy-docs.yml (GitHub Pages deployment)

Scheduled Events
│
├─→ security.yml (daily at 2 AM)
├─→ audit-deps.yml (weekly Monday 8 AM)
└─→ benchmark.yml (weekly Sunday midnight)
```

---

## Performance Metrics

### Typical Execution Times

| Workflow | Average Duration | Max Duration |
|----------|------------------|--------------|
| validate-agents | 2-3 minutes | 5 minutes |
| validate-openapi | 1-2 minutes | 3 minutes |
| benchmark | 3-5 minutes | 8 minutes |
| security | 5-7 minutes | 12 minutes |
| deploy-docs | 3-4 minutes | 6 minutes |
| audit-deps | 2-4 minutes | 8 minutes |

### Total Monthly Actions Minutes

Estimated for active development:
- Push events: ~40 runs/month × 15 min = 600 minutes
- PR events: ~20 runs/month × 15 min = 300 minutes
- Scheduled: ~30 runs/month × 10 min = 300 minutes
- **Total**: ~1,200 minutes/month

---

## Contributing

When adding new workflows:

1. Follow existing naming conventions
2. Include comprehensive job summaries
3. Add artifact retention policies
4. Update this README
5. Test with sample data before merging

---

## Support

For issues or questions:
- Check workflow run logs in Actions tab
- Review this documentation
- File an issue in the repository

---

**Last Updated**: 2026-01-25
**Workflows Version**: 1.0.0
**Maintained By**: Parallel Coordinator Agent
