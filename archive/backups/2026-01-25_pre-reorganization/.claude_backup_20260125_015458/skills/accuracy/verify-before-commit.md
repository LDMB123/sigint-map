# Skill: Verify Before Commit

**ID**: `verify-before-commit`
**Category**: Accuracy
**Agent**: First-Pass Validator

---

## When to Use
- Before committing any generated code
- Before returning any answer
- After making changes
- Before merging PRs

## Verification Pipeline

### Stage 1: Syntax Check (Local, Free)
```bash
# TypeScript
npx tsc --noEmit

# ESLint
npx eslint src/ --max-warnings 0

# Prettier
npx prettier --check src/
```

### Stage 2: Type Check (Local, Free)
```bash
npx tsc --noEmit --strict
```

### Stage 3: Test Run (Local, Free)
```bash
npm test -- --passWithNoTests
```

### Stage 4: Logic Validation (Haiku, Cheap)
```typescript
// Haiku validates logic without running
const validation = await haiku(`
  Check this code for logic errors:
  - Null pointer issues
  - Off-by-one errors
  - Missing error handling
  - Race conditions

  Code: ${code}

  Issues found (JSON array):
`);
```

### Stage 5: Completeness Check (Haiku, Cheap)
```typescript
// Haiku verifies requirements met
const completeness = await haiku(`
  Requirements:
  ${requirements}

  Implementation:
  ${code}

  Missing requirements (list or "none"):
`);
```

## Quick Verification Checklist

```markdown
## Before Commit Checklist
- [ ] Syntax valid (tsc/eslint)
- [ ] Types correct (strict mode)
- [ ] Tests pass
- [ ] No console.log/debug left
- [ ] Error handling present
- [ ] Edge cases covered
- [ ] Documentation updated
```

## Automated Verification

```typescript
async function verifyBeforeCommit(code: string): Promise<VerificationResult> {
  const results = {
    syntax: await checkSyntax(code),
    types: await checkTypes(code),
    tests: await runTests(),
    logic: await haikuValidateLogic(code),
    completeness: await haikuCheckCompleteness(code),
  };

  const passed = Object.values(results).every(r => r.passed);

  return {
    passed,
    results,
    blockers: Object.entries(results)
      .filter(([_, r]) => !r.passed)
      .map(([name, r]) => ({ stage: name, issues: r.issues })),
  };
}
```

## Output Template
```yaml
verification_result:
  passed: false

  stages:
    syntax: passed
    types: passed
    tests: passed
    logic: failed
    completeness: passed

  blockers:
    - stage: logic
      issues:
        - "Potential null dereference at line 45"
        - "Missing await on async call at line 67"

  recommendation: "Fix logic issues before committing"
```
