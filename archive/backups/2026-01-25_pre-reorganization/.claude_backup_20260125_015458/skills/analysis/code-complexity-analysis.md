# Skill: Code Complexity Analysis

**ID**: `code-complexity-analysis`
**Category**: Analysis
**Agent**: Complexity Analyzer

---

## When to Use
- Understanding code maintainability
- Identifying refactoring candidates
- Measuring technical debt
- Preparing for code reviews

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| target | string | yes | File or directory to analyze |
| thresholds | object | no | Custom complexity limits |

## Steps

### 1. Run Complexity Analysis
```bash
# Using ESLint complexity rule
npx eslint --rule 'complexity: ["error", 10]' src/

# Or using dedicated tool
npx ts-complex --threshold 15 src/**/*.ts
```

### 2. Identify Hotspots
Look for:
- Cyclomatic complexity > 10
- Cognitive complexity > 15
- Functions > 50 lines
- Nesting depth > 4

### 3. Generate Report
```typescript
interface ComplexityReport {
  hotspots: Array<{
    file: string;
    function: string;
    cyclomatic: number;
    cognitive: number;
    lines: number;
  }>;
  summary: {
    avgComplexity: number;
    maxComplexity: number;
    filesAboveThreshold: number;
  };
}
```

## Common Issues
- False positives on switch statements
- Configuration file complexity (expected)
- Test files often have high cyclomatic complexity

## Artifacts Produced

| Artifact | Type | Description |
|----------|------|-------------|
| complexity-report.json | JSON | Detailed analysis |
| hotspots.md | Markdown | Prioritized list |
