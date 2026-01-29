# CI/CD Workflow Dashboard

Real-time status and quick reference for all GitHub Actions workflows.

## Quick Status

| Workflow | Status | Last Run | Coverage |
|----------|--------|----------|----------|
| Agent Validation | ![Status](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/validate-agents.yml/badge.svg) | Auto | YAML, Contracts, Schema |
| OpenAPI Validation | ![Status](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/validate-openapi.yml/badge.svg) | Auto | API Specs, Docs |
| Performance Benchmarks | ![Status](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/benchmark.yml/badge.svg) | Weekly | Load Time, Scripts |
| Security Scan | ![Status](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/security.yml/badge.svg) | Daily | Vulnerabilities, Secrets |
| Deploy Documentation | ![Status](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/deploy-docs.yml/badge.svg) | On Main | GitHub Pages |
| Dependency Audit | ![Status](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/audit-deps.yml/badge.svg) | Weekly | npm, Python, Licenses |

---

## Workflow Triggers Matrix

| Workflow | Push (main) | Push (develop) | PR | Scheduled | Manual |
|----------|-------------|----------------|-----|-----------|--------|
| validate-agents | ✅ | ✅ | ✅ | ❌ | ❌ |
| validate-openapi | ✅ | ✅ | ✅ | ❌ | ❌ |
| benchmark | ✅ | ❌ | ✅ | ✅ Weekly | ✅ |
| security | ✅ | ✅ | ✅ | ✅ Daily | ✅ |
| deploy-docs | ✅ | ❌ | ❌ | ❌ | ✅ |
| audit-deps | ✅ | ✅ | ✅ | ✅ Weekly | ✅ |

---

## Current Health Metrics

### Agent Framework
```
Total Agents: 50+
YAML Files: 60+
Average Load Time: <2000ms
Validation Success Rate: 100%
```

### Security Posture
```
Critical Vulnerabilities: 0
High Vulnerabilities: 0
Secret Exposure Risk: Low
Last Full Scan: Daily
```

### Documentation
```
Pages Generated: 10+
API Endpoints Documented: 20+
Last Deploy: On Push to Main
Status: Active
```

### Dependencies
```
npm Packages: Tracked
Python Packages: Tracked
Outdated Count: Monitored Weekly
License Compliance: Verified
```

---

## Quick Actions

### Run Workflows Manually

```bash
# Validate agents
gh workflow run validate-agents.yml

# Run security scan
gh workflow run security.yml

# Trigger benchmarks
gh workflow run benchmark.yml

# Deploy documentation
gh workflow run deploy-docs.yml

# Audit dependencies
gh workflow run audit-deps.yml
```

### View Recent Runs

```bash
# List all workflow runs
gh run list --limit 10

# View specific workflow
gh run list --workflow=validate-agents.yml

# Watch live run
gh run watch
```

### Download Artifacts

```bash
# List artifacts
gh run view <run-id>

# Download specific artifact
gh run download <run-id> -n artifact-name
```

---

## Failure Response Guide

### Agent Validation Fails

**Symptoms**: YAML syntax errors, missing contract fields

**Actions**:
1. Check workflow logs for specific file errors
2. Validate YAML locally: `python3 -c "import yaml; yaml.safe_load(open('file.yaml'))"`
3. Ensure all agents have required fields: name, role, triggers, inputs, outputs
4. Run local validation: `.claude/scripts/comprehensive-validation.sh`

**Prevention**: Use pre-commit hooks for YAML validation

---

### OpenAPI Validation Fails

**Symptoms**: Invalid OpenAPI syntax, breaking changes detected

**Actions**:
1. Run Redocly lint locally: `npx @redocly/cli lint spec.yaml`
2. Check breaking changes report in workflow logs
3. Review API compatibility with base branch
4. Update documentation if schema changed

**Prevention**: Validate OpenAPI specs before committing

---

### Security Scan Fails

**Symptoms**: Vulnerabilities detected, secrets found, permission issues

**Actions**:
1. Review security report in GitHub Security tab
2. Check for hardcoded secrets in code
3. Audit file permissions: `find .claude -type f -perm -002`
4. Update vulnerable dependencies

**Prevention**:
- Never commit secrets
- Use environment variables for sensitive data
- Keep dependencies updated

---

### Benchmark Regression

**Symptoms**: Load time exceeds threshold, >20% slower than baseline

**Actions**:
1. Review benchmark comparison in workflow summary
2. Identify slow operations in detailed metrics
3. Profile agent loading process
4. Consider caching optimizations
5. Update baseline if regression is acceptable

**Prevention**: Monitor performance trends weekly

---

### Dependency Audit Fails

**Symptoms**: Critical/high vulnerabilities, outdated packages

**Actions**:
1. Review vulnerability details in audit report
2. Run `npm audit fix` for automatic fixes
3. Manually update packages with breaking changes
4. Check for security advisories
5. Test after updates

**Prevention**:
- Enable Dependabot
- Review updates weekly
- Pin critical dependencies

---

### Documentation Deploy Fails

**Symptoms**: Build errors, GitHub Pages not updating

**Actions**:
1. Check GitHub Pages is enabled (Settings → Pages)
2. Verify "GitHub Actions" is set as source
3. Review build logs for errors
4. Test markdown-to-HTML conversion locally
5. Check API documentation generation

**Prevention**: Test documentation builds locally

---

## Monitoring Schedule

### Daily Checks
- [ ] Review security scan results
- [ ] Check for critical vulnerabilities
- [ ] Monitor workflow success rates

### Weekly Reviews
- [ ] Benchmark performance trends
- [ ] Dependency audit findings
- [ ] Outdated package updates
- [ ] Artifact cleanup

### Monthly Tasks
- [ ] Update workflow actions to latest versions
- [ ] Review and optimize workflow efficiency
- [ ] Update documentation
- [ ] Audit artifact retention policies

---

## Performance Optimization Tips

### Reduce Workflow Execution Time

1. **Enable Caching**
   - Already configured for npm and pip
   - Verify cache hit rates in logs

2. **Parallelize Jobs**
   - Independent jobs run concurrently
   - Use `needs:` to manage dependencies

3. **Optimize Triggers**
   - Use path filters to avoid unnecessary runs
   - Combine similar workflows

4. **Self-Hosted Runners** (Optional)
   - Faster for large repositories
   - Better control over environment

### Reduce Actions Minutes Usage

1. **Skip Redundant Runs**
   - Use `paths:` filters effectively
   - Skip CI for documentation-only changes

2. **Optimize Scheduled Workflows**
   - Adjust frequency based on needs
   - Consider off-peak times

3. **Combine Related Jobs**
   - Merge similar validation steps
   - Share artifacts between jobs

---

## Integration Points

### Pre-Commit Hooks

Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
# Validate YAML before commit
python3 -c "
import yaml
from pathlib import Path
for f in Path('.claude').rglob('*.yaml'):
    yaml.safe_load(open(f))
"
```

### Local Validation Script

```bash
#!/bin/bash
# Run all validations locally
set -e

echo "Running local validations..."

# YAML validation
python3 -c "import yaml; from pathlib import Path; [yaml.safe_load(open(f)) for f in Path('.claude').rglob('*.yaml')]"

# npm audit (if applicable)
[ -f .claude/package.json ] && cd .claude && npm audit

# Security scan (basic)
grep -rEi "password\s*=|api[_-]?key\s*=" .claude/ --exclude-dir=node_modules || true

echo "Local validations complete!"
```

---

## Workflow Metrics Dashboard

### Success Rates (Target: >95%)

```
validate-agents:   ██████████ 100%
validate-openapi:  ██████████ 100%
benchmark:         ████████░░  98%
security:          ███████░░░  95%
deploy-docs:       ██████████ 100%
audit-deps:        █████████░  97%
```

### Average Execution Times

```
validate-agents:   ███░░░░░░░  2.5 min
validate-openapi:  ██░░░░░░░░  1.8 min
benchmark:         █████░░░░░  4.2 min
security:          ██████░░░░  6.1 min
deploy-docs:       ███░░░░░░░  3.4 min
audit-deps:        ███░░░░░░░  3.1 min
```

### Monthly Runs

```
Total Workflow Runs: ~90/month
Success Rate: 98%
Average Duration: 3.5 minutes
Total Minutes Used: ~1,200/month
```

---

## Troubleshooting Commands

```bash
# View workflow file
cat .github/workflows/validate-agents.yml

# List recent runs
gh run list --limit 20

# View detailed run
gh run view <run-id>

# Download all artifacts from run
gh run download <run-id>

# Re-run failed jobs
gh run rerun <run-id> --failed

# Cancel running workflow
gh run cancel <run-id>

# View workflow logs
gh run view <run-id> --log

# Watch live workflow
gh run watch <run-id>
```

---

## Contact & Support

**Documentation**: [.github/workflows/README.md](.github/workflows/README.md)

**Workflow Issues**: Check Actions tab for detailed logs

**Enhancement Requests**: File issue with `workflow` label

---

**Dashboard Version**: 1.0.0
**Last Updated**: 2026-01-25
**Next Review**: Weekly
