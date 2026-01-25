# Skill: Structured Outputs

**ID**: `structured-outputs`
**Category**: Prompting
**Agent**: Token Optimizer

---

## When to Use
- Parsing responses programmatically
- Reducing response token usage
- Improving consistency
- Enabling automation

## Benefits of Structured Outputs

| Aspect | Prose | Structured | Improvement |
|--------|-------|------------|-------------|
| Tokens | 500 | 100 | 80% fewer |
| Parsing | Manual | Automatic | 100% reliable |
| Consistency | Variable | Guaranteed | Predictable |
| Automation | Hard | Easy | Scriptable |

## Structured Output Patterns

### 1. JSON Response
```
Prompt: "Review code. Return JSON:
{
  issues: [{line: number, type: string, issue: string, fix: string}],
  score: number,
  summary: string
}"

Response:
{
  "issues": [
    {"line": 15, "type": "security", "issue": "SQL injection", "fix": "Use parameterized query"}
  ],
  "score": 75,
  "summary": "1 critical issue found"
}
```

### 2. YAML Response (More Readable)
```
Prompt: "Analyze dependencies. Return YAML:
dependencies:
  used: [list]
  unused: [list]
  outdated: [{name, current, latest}]
  vulnerabilities: [{name, severity, fix}]"

Response:
dependencies:
  used:
    - react
    - typescript
  unused:
    - lodash
  outdated:
    - name: axios
      current: 0.21.0
      latest: 1.6.0
  vulnerabilities:
    - name: axios
      severity: high
      fix: "npm update axios"
```

### 3. Markdown Tables
```
Prompt: "Compare options. Return as markdown table:
| Option | Pros | Cons | Recommendation |"

Response:
| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| Redux | Mature, DevTools | Boilerplate | Large apps |
| Zustand | Simple, Small | Less ecosystem | Small-medium |
| Jotai | Atomic, Flexible | Learning curve | Complex state |
```

### 4. Checklist Format
```
Prompt: "Security audit. Return checklist:
- [x/] item: status"

Response:
- [x] Input validation: All user inputs sanitized
- [ ] SQL injection: Found in /api/users
- [x] XSS prevention: Using DOMPurify
- [ ] CSRF tokens: Missing on forms
```

### 5. Diff Format
```
Prompt: "Show changes needed. Return as diff:"

Response:
```diff
- const data = query(`SELECT * FROM users WHERE id = ${id}`);
+ const data = query(`SELECT * FROM users WHERE id = ?`, [id]);
```
```

## Schema Definitions

### Code Review Schema
```typescript
interface CodeReviewResponse {
  issues: Array<{
    line: number;
    column?: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
    type: 'security' | 'performance' | 'quality' | 'a11y';
    message: string;
    fix: string;
  }>;
  metrics: {
    complexity: number;
    maintainability: number;
    testability: number;
  };
  summary: string;
}
```

### Analysis Schema
```typescript
interface AnalysisResponse {
  findings: Array<{
    category: string;
    items: string[];
    severity: string;
  }>;
  recommendations: string[];
  nextSteps: string[];
}
```

## Quick Reference

```yaml
output_formats:
  data: "JSON"
  config: "YAML"
  comparison: "Markdown table"
  changes: "Diff"
  checklist: "- [x/] item: status"
  list: "Numbered or bullet"
  code: "```language\ncode\n```"

tips:
  - Always specify format in prompt
  - Provide example structure
  - Use schemas for complex outputs
  - Request "only" the format (no prose)
```
