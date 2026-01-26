---
name: workflow
version: 1.0.0
description: Fast lookup guide for all CI/CD workflows.
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: mcp
complexity: intermediate
tags:
  - mcp
  - chromium-143
  - apple-silicon

target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2

philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."

prerequisites: []
related_skills: []
see_also: []

minimum_example_count: 3
requires_testing: true
performance_critical: false

# Migration metadata
migrated_from: .github/WORKFLOW_QUICK_REFERENCE.md
migration_date: 2026-01-25
---

# GitHub Actions Workflow Quick Reference

Fast lookup guide for all CI/CD workflows.

## Workflow Files

| File | Purpose | Trigger |
|------|---------|---------|
| `validate-agents.yml` | YAML + contract validation | Push/PR |
| `validate-openapi.yml` | API spec validation | Push/PR |
| `benchmark.yml` | Performance testing | Push/PR/Schedule |
| `security.yml` | Security scanning | Push/PR/Daily |
| `deploy-docs.yml` | Documentation deploy | Main push |
| `audit-deps.yml` | Dependency audit | Push/PR/Weekly |

---

## Common Commands

### Run Workflows
```bash
gh workflow run <workflow-file.yml>
gh workflow run validate-agents.yml
```

### View Status
```bash
gh run list
gh run list --workflow=security.yml
gh run watch
```

### Artifacts
```bash
gh run download <run-id>
gh run download <run-id> -n artifact-name
```

### Debug
```bash
gh run view <run-id> --log
gh run rerun <run-id> --failed
```

---

## Validation Checklist

### Before Committing
- [ ] YAML files validated locally
- [ ] No secrets in code
- [ ] Tests pass (if applicable)
- [ ] Documentation updated

### Before Merging PR
- [ ] All workflows passing
- [ ] No security vulnerabilities
- [ ] Performance benchmarks acceptable
- [ ] Dependencies audited

---

## Quick Fixes

### YAML Errors
```bash
python3 -c "import yaml; yaml.safe_load(open('file.yaml'))"
```

### npm Vulnerabilities
```bash
cd .claude
npm audit fix
```

### Outdated Packages
```bash
cd .claude
npm update
```

### Validate OpenAPI
```bash
npx @redocly/cli lint spec.yaml
```

---

## Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| Load Time | <5000ms | Fail |
| Performance Regression | >20% | Alert |
| Critical Vulnerabilities | 0 | Fail |
| High Vulnerabilities | ≤5 | Warn |

---

## Schedules

- **Daily 2 AM UTC**: Security scan
- **Weekly Monday 8 AM UTC**: Dependency audit
- **Weekly Sunday Midnight UTC**: Performance benchmarks

---

## Artifacts Retention

- Reports: 30 days
- Benchmarks: 90 days
- Documentation: 90 days

---

## Support Resources

- Full Docs: `.github/workflows/README.md`
- Dashboard: `.github/WORKFLOWS_DASHBOARD.md`
- Issues: GitHub Issues with `workflow` label
