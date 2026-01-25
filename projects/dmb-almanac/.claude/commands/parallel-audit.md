# Parallel Audit

Run multiple audit types simultaneously for comprehensive codebase analysis.

## Usage
```
/parallel-audit                    - Run all audits
/parallel-audit [audit1,audit2]    - Run specific audits
/parallel-audit --fast             - Quick audits only (skip deep analysis)
```

## Instructions

You are a parallel audit coordinator. When invoked, run multiple audits concurrently for efficiency.

### Available Audits

| Audit | Focus Area | Time |
|-------|------------|------|
| security | Vulnerabilities, secrets, injection | ~2min |
| performance | Speed, memory, bundle size | ~3min |
| accessibility | WCAG compliance, a11y | ~2min |
| types | TypeScript strictness | ~1min |
| dependencies | Outdated, vulnerable, unused | ~1min |
| code-quality | Complexity, duplication, patterns | ~2min |
| tests | Coverage, quality, gaps | ~2min |
| documentation | Missing docs, outdated | ~1min |

### Step 1: Initialize Parallel Audits

Run these audits concurrently (not sequentially):

```
[Security]     -> npm audit, secret scanning, OWASP checks
[Performance]  -> bundle analysis, lighthouse, profiling
[Accessibility]-> axe-core, WCAG checklist
[Types]        -> tsc --strict, type coverage
[Dependencies] -> outdated check, unused detection
[Code Quality] -> complexity metrics, lint rules
[Tests]        -> coverage report, mutation testing
[Documentation]-> missing JSDoc, stale comments
```

### Step 2: Aggregate Results

Collect findings from all audits and:
1. De-duplicate overlapping issues
2. Prioritize by severity and impact
3. Group related issues together
4. Calculate overall health score

### Step 3: Prioritized Output

**Priority Matrix**:
| Severity | Impact | Priority |
|----------|--------|----------|
| Critical | High | P0 - Fix immediately |
| High | High | P1 - Fix this sprint |
| High | Low | P2 - Schedule soon |
| Medium | * | P3 - Backlog |
| Low | * | P4 - Nice to have |

### Audit Depth Levels

**Fast Mode** (`--fast`):
- Static analysis only
- No runtime checks
- Skip deep dependency trees
- ~5 minutes total

**Standard Mode** (default):
- Full static analysis
- Sample runtime checks
- Top-level dependency audit
- ~15 minutes total

**Deep Mode** (`--deep`):
- Complete static + runtime analysis
- Full dependency tree audit
- Mutation testing
- ~30+ minutes total

## Response Format

```
## Parallel Audit Report

### Overall Health Score: [X]/100

| Audit | Score | Critical | High | Medium | Low |
|-------|-------|----------|------|--------|-----|
| Security | /100 | [n] | [n] | [n] | [n] |
| Performance | /100 | [n] | [n] | [n] | [n] |
| Accessibility | /100 | [n] | [n] | [n] | [n] |
| Types | /100 | [n] | [n] | [n] | [n] |
| Dependencies | /100 | [n] | [n] | [n] | [n] |
| Code Quality | /100 | [n] | [n] | [n] | [n] |
| Tests | /100 | [n] | [n] | [n] | [n] |
| Documentation | /100 | [n] | [n] | [n] | [n] |

### P0 - Critical (Fix Immediately)

#### [Issue Title]
- **Audit**: [which audit found it]
- **Location**: [file:line]
- **Issue**: [description]
- **Fix**: [solution]

### P1 - High Priority

| Issue | Audit | Location | Quick Fix |
|-------|-------|----------|-----------|
| [issue] | [audit] | [file] | [fix] |

### P2 - Medium Priority

[List format with brief descriptions]

### P3/P4 - Backlog

[Collapsed or summarized list]

### Quick Wins (< 30 min effort)
1. [ ] [Task with high impact/effort ratio]
2. [ ] [Task with high impact/effort ratio]
3. [ ] [Task with high impact/effort ratio]

### Audit Details

<details>
<summary>Security Audit Details</summary>

[Detailed security findings]

</details>

<details>
<summary>Performance Audit Details</summary>

[Detailed performance findings]

</details>

[... other audits ...]

### Recommended Action Plan

**Week 1**: [P0 and critical P1 items]
**Week 2**: [Remaining P1 items]
**Week 3-4**: [P2 items]
**Ongoing**: [P3/P4 as capacity allows]

### Commands to Re-run Specific Audits
```bash
# Security only
npm audit && npx snyk test

# Performance only
npm run build -- --analyze

# Full re-audit
/parallel-audit
```
```
