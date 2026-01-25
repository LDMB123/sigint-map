# Skill: Triple-Check Critical

**ID**: `triple-check-critical`
**Category**: Accuracy
**Agent**: Consensus Builder

---

## When to Use
- Security-sensitive code
- Payment/financial logic
- Authentication/authorization
- Data deletion operations
- Production deployments
- Irreversible actions

## Triple-Check Process

### Check 1: Generate (Sonnet)
```typescript
const implementation = await sonnet(`
  Implement secure password validation:
  - Minimum 12 characters
  - At least 1 uppercase, 1 lowercase, 1 number, 1 special
  - No common passwords
  - No user info in password
`);
```

### Check 2: Review (Different Sonnet Instance)
```typescript
const review = await sonnet(`
  Review this security-critical code for:
  - Logic errors
  - Security vulnerabilities
  - Edge cases
  - OWASP compliance

  Code: ${implementation}

  Issues (JSON):
`);
```

### Check 3: Verify (Haiku Swarm)
```typescript
// Multiple independent verifications
const verifications = await Promise.all([
  haiku(`Does this code prevent SQL injection? ${code}`),
  haiku(`Does this code prevent XSS? ${code}`),
  haiku(`Does this code have proper error handling? ${code}`),
  haiku(`Does this code validate all inputs? ${code}`),
  haiku(`Does this code use secure defaults? ${code}`),
]);
```

## Critical Code Checklist

### Security
- [ ] Input validation on ALL user inputs
- [ ] Output encoding for display
- [ ] Parameterized queries (no SQL concat)
- [ ] Proper authentication checks
- [ ] Authorization on every endpoint
- [ ] Secure session management
- [ ] Sensitive data encrypted

### Financial
- [ ] Decimal precision correct
- [ ] Currency handling proper
- [ ] Transaction atomicity
- [ ] Idempotency keys used
- [ ] Audit logging enabled
- [ ] Rollback capability

### Data Operations
- [ ] Soft delete preferred
- [ ] Backup before delete
- [ ] Confirmation required
- [ ] Cascade effects understood
- [ ] Recovery plan exists

## Implementation

```typescript
async function tripleCheckCritical(
  code: string,
  category: 'security' | 'financial' | 'data'
): Promise<TripleCheckResult> {
  // Check 1: Static analysis
  const staticAnalysis = await sonnetAnalyze(code, category);
  if (staticAnalysis.critical.length > 0) {
    return { passed: false, stage: 1, issues: staticAnalysis.critical };
  }

  // Check 2: Independent review
  const review = await sonnetReview(code, category);
  if (review.issues.length > 0) {
    return { passed: false, stage: 2, issues: review.issues };
  }

  // Check 3: Multi-aspect verification
  const verifications = await haikuSwarmVerify(code, category);
  const failed = verifications.filter(v => !v.passed);
  if (failed.length > 0) {
    return { passed: false, stage: 3, issues: failed.map(f => f.reason) };
  }

  return { passed: true, confidence: 0.99 };
}
```

## Output Template
```yaml
triple_check_result:
  passed: true
  confidence: 0.99

  checks:
    static_analysis:
      passed: true
      warnings: []

    independent_review:
      passed: true
      suggestions:
        - "Consider adding rate limiting"

    multi_verification:
      passed: true
      aspects_verified:
        - sql_injection: safe
        - xss: safe
        - auth: proper
        - input_validation: complete
        - error_handling: adequate
```
