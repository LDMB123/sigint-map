---
name: sveltekit-eslint-baseline-audit
description: Audit current ESLint configuration and establish baseline metrics
trigger: /eslint-audit
used_by: [code-quality-engineer, full-stack-developer]
---

# ESLint Baseline Audit

Analyze current ESLint configuration to identify violations, gaps, and optimization opportunities for SvelteKit projects.

## When to Use
- Starting ESLint enforcement for a new project
- After upgrading ESLint, TypeScript, or plugins
- Before implementing stricter linting rules
- Periodic code quality review (quarterly)
- Onboarding new team members to code standards

## Required Inputs
- `eslint.config.mjs` (or `.eslintrc.*`)
- `package.json` for ESLint dependencies
- SvelteKit codebase to analyze (`src/`, `routes/`)

## Step-by-Step Procedure

### 1. Inventory Current Configuration

```bash
# Read current config
cat eslint.config.mjs

# List ESLint dependencies
grep -E "eslint|@typescript-eslint|svelte" package.json

# Check ESLint version
npx eslint --version

# Check TypeScript version (affects type-aware rules)
npx tsc --version
```

### 2. Run Lint and Capture Baseline

```bash
# Create reports directory
mkdir -p .reports/eslint

# Run lint with JSON output for analysis
npx eslint . --format=json > .reports/eslint/baseline.json

# Get human-readable summary
npx eslint . --format=stylish 2>&1 | tee .reports/eslint/baseline.txt

# Count violations by rule (top 20)
npx eslint . --format=json | jq -r '.[] | .messages[] | .ruleId' | sort | uniq -c | sort -rn | head -20

# Count violations by severity
npx eslint . --format=json | jq '[.[] | .messages[] | .severity] | group_by(.) | map({severity: .[0], count: length})'

# Breakdown by file type
npx eslint "src/**/*.svelte" --format=json | jq '[.[] | .messages | length] | add'
npx eslint "src/**/*.ts" --format=json | jq '[.[] | .messages | length] | add'
```

### 3. Identify Missing Rule Categories

Check for presence of essential SvelteKit/TypeScript rule categories:

| Category | Plugin/Config | Check Command | Importance |
|----------|--------------|---------------|------------|
| Svelte | eslint-plugin-svelte | `grep "eslint-plugin-svelte" package.json` | Critical |
| TypeScript | @typescript-eslint | `grep "@typescript-eslint" package.json` | Critical |
| Accessibility | eslint-plugin-jsx-a11y | `grep "jsx-a11y" package.json` | High |
| Import order | eslint-plugin-import | `grep "eslint-plugin-import" package.json` | Medium |
| Prettier compat | eslint-config-prettier | `grep "eslint-config-prettier" package.json` | Medium |
| Security | eslint-plugin-security | `grep "eslint-plugin-security" package.json` | High |

### 4. Test Rule Candidates

```bash
# Test a rule without enabling it permanently
npx eslint . --rule 'no-console: warn' 2>&1 | head -50

# Check violation count for a specific rule
npx eslint . --rule 'no-console: warn' --format=json | jq '[.[] | .messages | length] | add'

# Test TypeScript-specific rule
npx eslint . --rule '@typescript-eslint/no-explicit-any: warn' --format=json | jq '[.[] | .messages | length] | add'

# Test Svelte-specific rule
npx eslint "src/**/*.svelte" --rule 'svelte/no-at-html-tags: warn' --format=json | jq '[.[] | .messages | length] | add'
```

### 5. Analyze Ignored Files

```bash
# Check what's being ignored
cat eslint.config.mjs | grep -A 10 "ignores"

# Find Svelte files that should be linted
find src -name "*.svelte" | wc -l

# Find TypeScript files
find src -name "*.ts" -o -name "*.svelte" | wc -l

# Verify files are actually being linted
npx eslint src --ext .ts,.svelte --format=json | jq 'length'
```

### 6. Check for Rule Conflicts and Overrides

```bash
# Count eslint-disable comments (indicates problematic rules)
grep -r "eslint-disable" src/ --include="*.ts" --include="*.svelte" | wc -l

# List all disable comments with context
grep -rn "eslint-disable" src/ --include="*.ts" --include="*.svelte"

# Find files with multiple disables (candidates for override)
grep -r "eslint-disable" src/ --include="*.ts" --include="*.svelte" | cut -d: -f1 | sort | uniq -c | sort -rn | head -10

# Check for @ts-ignore comments (indicates type issues)
grep -r "@ts-ignore" src/ --include="*.ts" --include="*.svelte" | wc -l
```

### 7. Analyze Auto-Fixable Violations

```bash
# Count auto-fixable violations
npx eslint . --format=json | jq '[.[] | .messages[] | select(.fix != null)] | length'

# Get breakdown by fixable rules
npx eslint . --format=json | jq -r '.[] | .messages[] | select(.fix != null) | .ruleId' | sort | uniq -c | sort -rn
```

## Expected Artifacts

| Artifact | Location | Purpose |
|----------|----------|---------|
| Baseline JSON | `.reports/eslint/baseline.json` | Machine-readable violations |
| Baseline text | `.reports/eslint/baseline.txt` | Human-readable summary |
| Audit report | `.reports/eslint/audit-report.md` | Analysis and recommendations |
| Rule test results | `.reports/eslint/rule-tests.json` | Candidate rule violation counts |

## Output Template

```markdown
# ESLint Baseline Audit Report

**Audit Date**: [YYYY-MM-DD HH:MM]
**ESLint Version**: [version]
**TypeScript Version**: [version]
**Config Format**: Flat config (eslint.config.mjs)
**Project Type**: SvelteKit

## Current Configuration

### Extends
- eslint-plugin-svelte
- @typescript-eslint/recommended
- [list other configs]

### Ignores
- .svelte-kit/**
- build/**
- dist/**
- .env
- .env.*
- [other ignored paths]

### Custom Rules
- [list custom rule configurations]

## Baseline Metrics

| Metric | Count | Notes |
|--------|-------|-------|
| Files linted | X | Includes .svelte, .ts files |
| Total errors | X | Severity level 2 |
| Total warnings | X | Severity level 1 |
| Auto-fixable violations | X | Can be fixed with --fix |
| eslint-disable comments | X | Manual overrides in code |
| @ts-ignore comments | X | Type system bypasses |

## Top Violation Rules

| Rule | Count | Severity | Fixable | Priority |
|------|-------|----------|---------|----------|
| @typescript-eslint/no-explicit-any | X | error | No | High |
| svelte/no-at-html-tags | X | warning | No | Medium |
| no-console | X | warning | No | Low |
| [other rules] | X | error/warning | Yes/No | High/Medium/Low |

## File Type Breakdown

| File Type | Files | Errors | Warnings |
|-----------|-------|--------|----------|
| .svelte | X | X | X |
| .ts | X | X | X |
| .server.ts | X | X | X |

## Missing Rule Categories

| Category | Status | Plugin Required | Recommendation |
|----------|--------|-----------------|----------------|
| Svelte a11y | Missing | eslint-plugin-svelte (a11y rules) | **Add** - Critical for accessibility |
| jsx-a11y | Missing | eslint-plugin-jsx-a11y | Consider if using JSX in Svelte |
| Import order | Missing | eslint-plugin-import | **Add** - Improves consistency |
| Prettier compat | Missing | eslint-config-prettier | **Add** if using Prettier |
| Security | Missing | eslint-plugin-security | **Add** - Prevents common vulnerabilities |

## Recommended Rule Additions

### High Priority (Add as errors)
- `svelte/valid-compile` - Ensure Svelte code compiles
- `@typescript-eslint/no-explicit-any` - Enforce type safety
- `@typescript-eslint/no-unused-vars` - Prevent dead code
- `svelte/no-at-html-tags` - Prevent XSS vulnerabilities
- `no-console` (production only) - Clean production logs

### Medium Priority (Add as warnings)
- `import/order` - Consistent import organization
- `import/no-duplicates` - Avoid duplicate imports
- `svelte/no-unused-svelte-ignore` - Clean up unnecessary ignores
- `@typescript-eslint/no-floating-promises` - Prevent unhandled promises

### Low Priority (Consider for style)
- `prefer-const` - Immutability preference
- `svelte/prefer-destructuring` - Cleaner prop usage
- `@typescript-eslint/consistent-type-imports` - Type import style

## Override Recommendations

| Files/Paths | Rules to Relax | Reason |
|-------------|----------------|--------|
| `src/**/*.test.ts` | `@typescript-eslint/no-explicit-any` | Test flexibility |
| `*.config.*` | `@typescript-eslint/no-var-requires` | CommonJS configs |
| `scripts/**` | `no-console` | Scripts need output |
| `src/routes/**/+*.server.ts` | [specific rules] | Server-specific patterns |

## Rollout Strategy

### Phase 1: Foundation (Week 1)
1. Install missing critical plugins
2. Add high-priority rules as **warnings**
3. Fix auto-fixable violations
4. Document expected violations

### Phase 2: Incremental Fixes (Weeks 2-4)
1. Fix violations by file/component
2. Create PRs for each rule category
3. Upgrade warnings to errors as violations are fixed
4. Add override configurations where appropriate

### Phase 3: Maintenance (Ongoing)
1. Add medium/low priority rules
2. Review eslint-disable comments quarterly
3. Update rules with ESLint upgrades
4. Monitor new rule releases

## Violation Categories by Priority

### P0: Fix Immediately (Blocking)
- Svelte compilation errors
- TypeScript type errors exposed by linting
- Security vulnerabilities
- **Count**: X violations

### P1: Fix This Sprint
- Accessibility violations
- Unhandled promises
- Explicit `any` usage
- **Count**: X violations

### P2: Fix Within Month
- Import organization
- Console statements in production code
- Unused variables
- **Count**: X violations

### P3: Technical Debt
- Style inconsistencies
- Legacy eslint-disable comments
- Prefer-const opportunities
- **Count**: X violations

## Success Criteria
- [x] Current config fully documented
- [x] Baseline metrics captured in JSON/text
- [x] Missing plugins identified
- [x] Recommendations prioritized by impact
- [x] Override strategy defined
- [x] Rollout phases planned
- [ ] Phase 1 rules added
- [ ] Auto-fixable violations resolved
- [ ] Team reviewed and approved plan

## Next Actions
1. **Immediate**: Install missing critical plugins (svelte, security)
2. **Week 1**: Add high-priority rules as warnings
3. **Week 2**: Run `eslint --fix` on auto-fixable violations
4. **Week 3**: Create fix PRs for P0/P1 violations
5. **Month 1**: Upgrade warnings to errors after cleanup

## Notes
- ESLint config is flat config format (eslint.config.mjs)
- TypeScript-aware rules require tsconfig.json
- Svelte rules require Svelte compiler integration
- Prettier integration recommended to avoid style conflicts
```

## Success Criteria
- Current ESLint configuration fully documented
- Baseline metrics captured (total violations, by rule, by file type)
- Missing critical plugins identified (Svelte, security, accessibility)
- Violations categorized by priority and fixability
- Override strategy defined for test files and configs
- Phased rollout plan created
- Audit report saved to `.reports/eslint/audit-report.md`

## Common Issues

### Issue: Too many violations to fix at once
**Solution**: Use phased approach - add rules as warnings first, fix incrementally, then upgrade to errors

### Issue: TypeScript rules not working
**Solution**: Ensure `parserOptions.project` points to `tsconfig.json` in ESLint config

### Issue: Svelte files not being linted
**Solution**: Verify `eslint-plugin-svelte` is installed and files match `**/*.svelte` pattern

### Issue: Conflicting rules between ESLint and Prettier
**Solution**: Install `eslint-config-prettier` to disable conflicting rules
