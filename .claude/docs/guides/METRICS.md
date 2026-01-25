# Performance Metrics & Baseline Tracking

**Repository**: ClaudeCodeProjects
**Last Updated**: 2026-01-25

---

## Overview

This repository tracks performance metrics to monitor UAF efficiency, prevent regressions, and ensure optimal system performance over time.

**Baseline Location**: `.claude/metrics/baseline.json`
**Benchmark History**: `.claude/benchmarks/history.txt`
**Workflow**: `.github/workflows/benchmark.yml`

---

## Baseline Metrics

### Current Baseline
**Created**: 2026-01-25
**Commit**: 90514a1
**Health Score**: 100/100

### Tracked Metrics

#### 1. Repository Health
- **Health score**: 100/100 (target: ≥95)
- **File organization**: 563 files organized into 30+ categories
- **Documentation coverage**: 835 markdown files
- **Structure validation**: 7/7 checks passing

#### 2. UAF Performance
- **Total agents**: 465 across 49 categories
- **Total skills**: 150 commands
- **Agent load time**: <5000ms threshold
- **YAML parsing time**: Measured in CI
- **Validation time**: Measured in CI
- **Total framework load**: Complete startup time

#### 3. DMB Almanac Build
- **Test count**: 162 tests
- **Test pass rate**: 100% (target: ≥95%)
- **Lint errors**: 0 (target: 0)
- **Build success**: Yes
- **Build time**: Measured during builds
- **Bundle size**: Production bundle size in KB

#### 4. Validation Metrics
- **Structure checks passing**: 7/7
- **Stale references**: 0 (target: 0)
- **Validation script**: `.claude/scripts/validate-structure.sh`

#### 5. CI/CD Health
- **Active workflows**: 8
- **Workflow success rate**: Tracked in GitHub Actions
- **Deployment frequency**: Tracked in deployment summaries

---

## Benchmark Workflow

### File: `.github/workflows/benchmark.yml`

#### On Main Branch
The benchmark workflow runs automatically when code is pushed to the main branch:

1. **Runs benchmarks** - Measures UAF load time, parsing, validation
2. **Compares to baseline** - Checks if performance improved
3. **Updates baseline** - If performance improved or first run
4. **Logs to history** - Appends entry to `.claude/benchmarks/history.txt`

#### On Pull Requests
The benchmark workflow runs on all PRs:

1. **Runs benchmarks** - Measures PR performance
2. **Compares against baseline** - Calculates performance delta
3. **Fails if regression** - Blocks merge if >20% slower than baseline
4. **Reports delta** - Shows performance impact in PR checks

---

## Manual Baseline Update

### Update UAF Metrics (via CI)
UAF benchmarks run automatically in GitHub Actions:

```bash
# Push to main triggers benchmark.yml
git push origin main

# View results in GitHub Actions tab
# Baseline auto-updates if performance improved
```

### Update DMB Almanac Metrics (Manual)
```bash
# Navigate to app directory
cd projects/dmb-almanac/app/

# Run build and capture timing
time npm run build

# Run tests
npm run test

# Update baseline.json manually with results
# Edit .claude/metrics/baseline.json
# - build_time_seconds: <time from build>
# - bundle_size_kb: <size of build/ directory>
```

### Validate Baseline JSON
```bash
# Check JSON syntax
cat .claude/metrics/baseline.json | jq .

# Expected: Valid JSON with no errors
```

---

## Regression Detection

### Threshold: 20% Slower Than Baseline

**What Triggers Regression**:
- UAF load time >20% slower than baseline
- Test pass rate drops below 95%
- Health score drops below 95

**What Happens**:
1. PR check fails with "Performance regression detected"
2. Detailed metrics shown in workflow logs
3. PR blocked from merging until fixed

**How to Fix**:
1. Investigate performance issue in PR changes
2. Optimize slow code paths
3. Push fix and rerun checks
4. OR: Update baseline if intentional (document reason)

### Example Scenario
```
Baseline UAF load time: 2500ms
PR UAF load time: 3100ms
Delta: +600ms (+24%)
Result: ❌ REGRESSION (exceeds 20% threshold)
Action: PR blocked until optimized or baseline updated
```

---

## History Tracking

**File**: `.claude/benchmarks/history.txt`

### Format
```
YYYY-MM-DD HH:MM:SS | Commit | Branch | Load Time (ms) | Notes
```

### Example Entries
```
2026-01-25 00:00:00 | 90514a1 | main | PENDING | Baseline created
2026-01-26 10:30:00 | abc1234 | main | 2847 | Normal operation
2026-01-27 14:15:00 | def5678 | feature-x | 3102 | Added 15 new agents
2026-01-28 09:45:00 | ghi9012 | main | 2765 | Optimized YAML parsing
```

### Viewing History
```bash
# View complete history
cat .claude/benchmarks/history.txt

# View last 10 entries
tail -10 .claude/benchmarks/history.txt

# View baseline updates only (main branch)
grep "| main |" .claude/benchmarks/history.txt
```

---

## Performance Thresholds

### Current Thresholds (in baseline.json)
```json
{
  "thresholds": {
    "uaf_load_time_max_ms": 5000,
    "regression_threshold_percent": 20,
    "health_score_min": 95,
    "test_pass_rate_min": 95
  }
}
```

### Threshold Definitions

**UAF Load Time Max**: 5000ms
- Absolute maximum acceptable load time
- Fails build if exceeded
- Prevents catastrophic performance degradation

**Regression Threshold**: 20%
- Relative to baseline
- Fails PRs that slow system significantly
- Balances sensitivity with noise

**Health Score Min**: 95/100
- Minimum repository health score
- Current: 100/100 ✅
- Tracks organizational quality

**Test Pass Rate Min**: 95%
- Minimum passing test percentage
- Current: 100% (162/162) ✅
- Ensures code quality

---

## Metrics Dashboard (Future)

### Planned Features
- **Visual timeline** - Chart of load times over commits
- **Trend analysis** - Detect gradual performance degradation
- **Category breakdown** - Performance by agent category
- **Alert thresholds** - Slack/email on regressions
- **Monthly reports** - Automated performance summaries

### Current Access
- **GitHub Actions** - View workflow logs for latest metrics
- **Baseline JSON** - Current state in `.claude/metrics/baseline.json`
- **History file** - Complete log in `.claude/benchmarks/history.txt`

---

## Integration with Other Systems

### Pre-Commit Hooks
Pre-commit hooks validate structure but don't measure performance:
- Structure validation (<1s)
- Path reference checks (<1s)
- No performance benchmarking

### CI Workflows
Multiple workflows contribute to metrics:
- `benchmark.yml` - UAF performance
- `structure-validation.yml` - Structure health
- `validate-agents.yml` - Agent validation
- `security.yml` - Security scanning
- `audit-deps.yml` - Dependency health

### Future Integrations
- **Lighthouse CI** - DMB Almanac web vitals
- **Bundle analyzer** - Automatic bundle size tracking
- **Test coverage** - Coverage percentage in baseline
- **Security scores** - Vulnerability counts

---

## Troubleshooting

### Baseline Not Updating
**Problem**: Pushed to main but baseline.json unchanged

**Causes**:
1. Performance didn't improve (baseline only updates if faster)
2. Workflow didn't run (check Actions tab)
3. Baseline file permissions issue

**Solution**:
```bash
# Check workflow ran
# GitHub Actions tab → benchmark workflow → latest run

# Manually update baseline if needed
# Edit .claude/metrics/baseline.json
# Update commit, date, and performance metrics
```

### False Regression Detection
**Problem**: PR flagged as regression but performance acceptable

**Causes**:
1. Legitimate performance trade-off
2. Different CI runner specs (rare)
3. External factors (network, GitHub load)

**Solution**:
```bash
# Option 1: Optimize if possible
# Option 2: Update baseline with justification

# To update baseline:
# 1. Document reason in PR description
# 2. Get approval from reviewer
# 3. Merge PR (new baseline created on main)
```

### Metrics Not Populated
**Problem**: baseline.json shows null for UAF metrics

**Expected**: First benchmark run populates these
**Action**: Wait for next push to main, workflow will populate

---

## Best Practices

### When to Update Baseline
✅ **Do update** when:
- Performance genuinely improved
- Major optimization implemented
- Intentional trade-off with approval

❌ **Don't update** when:
- Quick fix to bypass regression check
- No clear reason for performance change
- Haven't investigated root cause

### Monitoring Frequency
- **Daily**: Check GitHub Actions for failures
- **Weekly**: Review benchmark history trends
- **Monthly**: Analyze overall performance patterns
- **Quarterly**: Audit thresholds for relevance

### Documentation
- Document all baseline updates in commit messages
- Include context for performance changes in PRs
- Keep this METRICS.md file updated
- Archive old baselines if major changes

---

## Quick Reference

### View Current Baseline
```bash
cat .claude/metrics/baseline.json | jq .
```

### View Benchmark History
```bash
tail -20 .claude/benchmarks/history.txt
```

### Run Structure Validation
```bash
.claude/scripts/validate-structure.sh
```

### Check Workflow Status
```bash
# Visit GitHub repository
# Click "Actions" tab
# View latest workflow runs
```

---

**Questions?** See [Development Guide](./DEVELOPMENT.md) for CI/CD workflows and git practices.

**Related Docs**:
- [Master Documentation Index](../../../docs/INDEX.md)
- [Development Guide](./DEVELOPMENT.md)
- [Project Structure](../../../docs/PROJECT_STRUCTURE.md)
