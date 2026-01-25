---
name: eslint-baseline-audit
description: Audit current ESLint configuration and identify gaps
trigger: /eslint-audit
used_by: [eslint-steward, lead-orchestrator]
---

# ESLint Baseline Audit

Analyze current ESLint configuration to identify missing rules and optimization opportunities.

## When to Use
- Starting ESLint enforcement for a program
- After upgrading ESLint or plugins
- Periodic rule effectiveness review

## Required Inputs
- `eslint.config.mjs` (or `.eslintrc.*`)
- `package.json` for ESLint dependencies
- Codebase to analyze

## Step-by-Step Procedure

### 1. Inventory Current Configuration

```bash
# Read current config
cat eslint.config.mjs

# List ESLint dependencies
grep -E "eslint|@typescript-eslint" package.json

# Check ESLint version
npx eslint --version
```

### 2. Run Lint and Capture Baseline

```bash
# Run lint with JSON output for analysis
npx eslint . --format=json > .migration/lint-baseline.json

# Get summary
npx eslint . --format=stylish 2>&1 | tail -20

# Count errors by rule
npx eslint . --format=json | jq -r '.[] | .messages[] | .ruleId' | sort | uniq -c | sort -rn | head -20
```

### 3. Identify Missing Rule Categories

Check for presence of:

| Category | Plugin/Config | Check Command |
|----------|--------------|---------------|
| Accessibility | eslint-plugin-jsx-a11y | `grep "jsx-a11y" package.json` |
| React Hooks | eslint-plugin-react-hooks | Included in Next.js config |
| TypeScript | @typescript-eslint | Included in Next.js config |
| Import order | eslint-plugin-import | `grep "eslint-plugin-import" package.json` |
| Prettier compat | eslint-config-prettier | `grep "eslint-config-prettier" package.json` |

### 4. Test Rule Candidates

```bash
# Test a rule without enabling
npx eslint . --rule 'rule-name: warn' 2>&1 | head -50

# Check violation count
npx eslint . --rule 'rule-name: warn' --format=json | jq '[.[] | .messages | length] | add'
```

### 5. Analyze Ignored Files

```bash
# Check what's being ignored
cat eslint.config.mjs | grep -A 10 "globalIgnores"

# Find files that should be linted but aren't
find src -name "*.ts" -o -name "*.tsx" | wc -l
npx eslint src --ext .ts,.tsx --format=json | jq 'length'
```

### 6. Check for Rule Conflicts

```bash
# Look for disabled rules
grep -r "eslint-disable" src/ --include="*.ts" --include="*.tsx" | wc -l

# List all disable comments
grep -rn "eslint-disable" src/ --include="*.ts" --include="*.tsx"
```

### 7. Document Findings

## Expected Artifacts

| Artifact | Location |
|----------|----------|
| Baseline lint output | `.migration/lint-baseline.json` |
| Audit report | `.migration/reports/eslint-audit.md` |
| Rule recommendations | Section in audit report |

## Output Template

```markdown
## ESLint Baseline Audit Report

**Audit Date**: [timestamp]
**ESLint Version**: [version]
**Config Format**: Flat config (eslint.config.mjs)

### Current Configuration

**Extends**:
- eslint-config-next/core-web-vitals
- eslint-config-next/typescript

**Ignores**:
- .next/**
- out/**
- build/**
- next-env.d.ts

### Baseline Metrics

| Metric | Count |
|--------|-------|
| Files linted | X |
| Total errors | X |
| Total warnings | X |
| eslint-disable comments | X |

### Top Error Rules

| Rule | Count | Fixable |
|------|-------|---------|
| rule-name | X | Yes/No |

### Missing Rule Categories

| Category | Status | Recommendation |
|----------|--------|----------------|
| jsx-a11y | Missing | Add eslint-plugin-jsx-a11y |
| Import order | Missing | Add eslint-plugin-import |
| Prettier | Missing | Add eslint-config-prettier if using Prettier |

### Recommended Rule Additions

#### High Priority
- `jsx-a11y/*` - WCAG compliance
- `@typescript-eslint/no-explicit-any` - Type safety

#### Medium Priority
- `import/order` - Consistent imports
- `import/no-duplicates` - Avoid duplicate imports

#### Low Priority
- `prefer-const` - Minor code style

### Override Recommendations

| Files | Rules to Relax | Reason |
|-------|---------------|--------|
| tests/** | no-explicit-any | Test flexibility |
| *.config.* | no-require-imports | Config files |

### Next Steps
1. Install missing plugins
2. Add high-priority rules as warnings
3. Fix violations in dedicated PRs
4. Upgrade to errors after cleanup
```

## Success Criteria
- Current config fully documented
- Baseline metrics captured
- Missing rules identified
- Recommendations prioritized
- Override strategy defined
