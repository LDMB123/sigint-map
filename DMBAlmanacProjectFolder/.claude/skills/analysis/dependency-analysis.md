# Skill: Dependency Analysis

**ID**: `dependency-analysis`
**Category**: Analysis
**Agent**: Dependency Analyzer

---

## When to Use
- Auditing project dependencies
- Finding unused packages
- Checking for security vulnerabilities
- Optimizing bundle size

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| manifest | string | yes | Path to package.json |
| include_dev | boolean | no | Include devDependencies |

## Steps

### 1. Check for Vulnerabilities
```bash
npm audit --json > audit-report.json
```

### 2. Find Unused Dependencies
```bash
npx depcheck
```

### 3. Analyze Bundle Impact
```bash
npx bundle-phobia package-name
```

### 4. Check for Duplicates
```bash
npm ls --all | grep -E "├|└" | sort | uniq -d
```

## Output Template
```markdown
# Dependency Analysis Report

## Security Issues
- **Critical**: 0
- **High**: 2
- **Medium**: 5

## Unused Dependencies
- lodash (can be replaced with native methods)
- moment (use date-fns instead)

## Bundle Impact (top 5)
1. react-dom: 128KB
2. lodash: 71KB
3. axios: 45KB

## Recommendations
1. Remove unused dependencies
2. Fix high severity vulnerabilities
3. Consider lighter alternatives
```

## Common Issues
- Indirect dependencies may appear unused
- Some packages are build-time only
- Peer dependencies need special handling
